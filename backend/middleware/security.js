/**
 * Security headers + CORS allowlist + request context.
 *
 * Written without `helmet` on purpose: for a JSON API helmet's job is setting a
 * handful of static response headers, and keeping the dependency count low means
 * a measurably faster cold start on Render's free tier. The header set below
 * mirrors helmet's API defaults.
 */
import crypto from "crypto";
import { config } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ApiError } from "./errorHandler.js";

/** Equivalent of helmet's defaults, minus the browser-page directives an API never needs. */
export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Origin-Agent-Cluster", "?1");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  // API responses are never documents; block any embedded content outright.
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; sandbox");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  // HSTS only over TLS, and only in production — setting it on localhost breaks http://
  if (config.isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  // Don't advertise the stack.
  res.removeHeader("X-Powered-By");
  next();
};

/**
 * CORS with an explicit allowlist.
 *
 * The previous `app.use(cors())` reflected any origin, meaning any website could
 * call this API with a user's token attached. Requests without an Origin header
 * (curl, uptime pingers, server-to-server) are allowed through
 * because CORS is a browser-enforced policy and blocking them buys nothing.
 */
export const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin?.replace(/\/$/, "");

  if (origin) {
    const allowed = config.corsOrigins.includes(origin) || config.corsOrigins.includes("*");

    // Vercel preview deployments get fresh subdomains per commit, so allow the
    // project's own preview pattern rather than forcing a redeploy each time.
    const isVercelPreview =
      /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) &&
      config.corsOrigins.some((entry) => entry.endsWith(".vercel.app"));

    if (!allowed && !isVercelPreview) {
      logger.warn("Blocked cross-origin request", { origin, path: req.originalUrl });
      return next(ApiError.forbidden(`Origin ${origin} is not allowed`, "CORS_ORIGIN_DENIED"));
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,X-Request-Id");
  res.setHeader("Access-Control-Expose-Headers", "X-Request-Id,RateLimit-Remaining,RateLimit-Reset");
  res.setHeader("Access-Control-Max-Age", "600");

  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
};

/**
 * Assigns each request an ID and a bound logger, then logs the outcome once.
 * The ID comes back in every error response, so "it failed" becomes a grep-able
 * single line in the Render log stream.
 */
export const requestContext = (req, res, next) => {
  req.id = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  req.log = logger.child({ requestId: req.id });

  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    // Health checks fire constantly on a hosted service; don't drown the logs.
    const isProbe = req.path === "/api/health" || req.path === "/api/ready";
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : isProbe ? "debug" : "info";
    req.log[level]("request", {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      userId: req.user?._id?.toString(),
    });
  });

  next();
};
