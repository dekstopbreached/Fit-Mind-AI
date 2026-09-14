/**
 * FitMind AI — API server.
 *
 * Middleware order in this file is load-bearing:
 *
 *   1. requestContext    assigns the request id everything else logs against
 *   2. securityHeaders   set before any handler can short-circuit the response
 *   3. cors              rejects disallowed origins before work is done
 *   4. globalLimiter     cheap backstop ahead of body parsing
 *   5. express.json      with a size limit
 *   6. routes
 *   7. notFound → errorHandler   always last
 */
import express from "express";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import { config, configWarnings, assertConfigValid } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDatabase, disconnectDatabase, databaseStatus } from "./config/db.js";
import { securityHeaders, corsMiddleware, requestContext } from "./middleware/security.js";
import { globalLimiter, aiLimiter } from "./middleware/rateLimit.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { memoryStoreSummary } from "./utils/memoryStore.js";

import authRoutes from "./routes/auth.js";
import habitRoutes from "./routes/habits.js";
import logRoutes from "./routes/logs.js";
import aiRoutes from "./routes/ai.js";
import profileRoutes from "./routes/profile.js";
import workoutRoutes from "./routes/workout.js";
import dietRoutes from "./routes/diet.js";
import progressRoutes from "./routes/progress.js";
import paymentRoutes from "./routes/payments.js";
import adminRoutes from "./routes/admin.js";
import { startSubscriptionExpiryJob } from "./jobs/expireSubscriptions.js";

// Refuse to start on invalid configuration instead of failing later, per request.
assertConfigValid();
configWarnings.forEach((warning) => logger.warn(warning));

const app = express();
const startedAt = Date.now();

/* --------------------------------------------------------------- pipeline --- */

// Render/Railway/Fly terminate TLS upstream. Without this, req.ip is the proxy's
// address and every visitor shares one rate-limit bucket.
if (config.trustProxy) app.set("trust proxy", 1);
app.disable("x-powered-by");
app.disable("etag"); // no conditional-GET caching on authenticated JSON

app.use(requestContext);
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(globalLimiter);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use("/uploads", express.static(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "uploads")));

/* ----------------------------------------------------------------- probes --- */

/**
 * Liveness — "is the process up?". Must stay dependency-free and always 200, or
 * the platform will restart a server that is merely waiting on its database.
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "FitMind AI API",
    version: "2.1.0",
    environment: config.nodeEnv,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness — "can it serve real traffic?". Returns 503 when MongoDB is down so
 * dashboards show the truth; the API still answers from the in-memory fallback.
 */
app.get("/api/ready", (req, res) => {
  const db = databaseStatus();
  const ready = db.connected;
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "degraded",
    database: db,
    payments: { configured: true, mode: "manual-approval" },
    ai: { provider: config.ai.provider, configured: Boolean(config.ai.geminiApiKey || config.ai.openaiApiKey) },
    ...(ready ? {} : { fallbackStore: memoryStoreSummary() }),
  });
});

/* ----------------------------------------------------------------- routes --- */

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/workout", workoutRoutes);
app.use("/api/diet", dietRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/ai", aiLimiter, aiRoutes); // per-user throttle: each call costs money
app.use("/api/payments", paymentRoutes);
app.use("/api/subscription", paymentRoutes);
app.use("/api/admin", adminRoutes);

// Retained from v1; the frontend still uses these for the habit tracker.
app.use("/api/habits", habitRoutes);
app.use("/api/logs", logRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

/* ------------------------------------------------------------------- boot --- */

const server = app.listen(config.port, "0.0.0.0", () => {
  logger.info("FitMind AI API listening", {
    port: config.port,
    environment: config.nodeEnv,
    corsOrigins: config.corsOrigins,
    paymentsEnabled: true,
  });
});

// Don't block listening on the database: the health check must answer immediately
// so the platform marks the deploy live, and the API degrades rather than dying.
connectDatabase().catch((error) => logger.error("Database bootstrap failed", { error: error.message }));
startSubscriptionExpiryJob();

// Keep sockets from being held open forever behind a proxy.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 70_000;
server.requestTimeout = 30_000;

/* --------------------------------------------------------------- shutdown --- */

/**
 * Graceful shutdown. Render sends SIGTERM on every deploy; without this, in-flight
 * requests are severed mid-response and Mongo connections are left dangling.
 */
let shuttingDown = false;
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received — shutting down`);

  const force = setTimeout(() => {
    logger.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 15_000);
  force.unref();

  server.close(async () => {
    try {
      await disconnectDatabase();
    } catch (error) {
      logger.error("Error closing database", { error: error.message });
    }
    clearTimeout(force);
    logger.info("Shutdown complete");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { error: reason instanceof Error ? reason.message : String(reason) });
});

process.on("uncaughtException", (error) => {
  // Process state is unknowable after this; log, then let the platform restart us.
  logger.error("Uncaught exception — exiting", { error: error.message, stack: error.stack });
  shutdown("uncaughtException").finally(() => process.exit(1));
});

export { app, server, mongoose };
export default app;
