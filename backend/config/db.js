/**
 * MongoDB connection lifecycle.
 *
 * Two deliberate behaviours:
 *  1. Connection is attempted with retry/backoff instead of a single shot, because
 *     Atlas occasionally refuses the first connection while a paused cluster wakes.
 *  2. Failure does not kill the process. The app keeps serving via the in-memory
 *     fallback in utils/dataStore.js, and /api/ready reports degraded so the
 *     platform's health check tells the truth instead of hiding it.
 */
import mongoose from "mongoose";
import { config } from "./env.js";
import { logger } from "./logger.js";

const state = { attempts: 0, lastError: null };

export const isDatabaseConnected = () => mongoose.connection.readyState === 1;

export const databaseStatus = () => {
  const names = ["disconnected", "connected", "connecting", "disconnecting"];
  return {
    connected: isDatabaseConnected(),
    readyState: names[mongoose.connection.readyState] ?? "unknown",
    configured: config.mongoConfigured,
    attempts: state.attempts,
    lastError: state.lastError,
  };
};

export const connectDatabase = async ({ retries = 5, baseDelayMs = 1000 } = {}) => {
  // Fail fast per-operation rather than letting mongoose buffer commands for 10s
  // and turn a DB outage into a pile of hung HTTP requests.
  mongoose.set("bufferCommands", false);
  mongoose.set("strictQuery", true);

  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));
  mongoose.connection.on("error", (error) => {
    state.lastError = error.message;
    logger.error("MongoDB connection error", { error: error.message });
  });

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    state.attempts = attempt;
    try {
      await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 1,
        retryWrites: true,
      });
      state.lastError = null;
      logger.info("MongoDB connected", { database: mongoose.connection.name, attempt });
      return true;
    } catch (error) {
      state.lastError = error.message;
      const isLast = attempt === retries;
      logger.warn(`MongoDB connect attempt ${attempt}/${retries} failed`, { error: error.message });
      if (isLast) break;
      // Exponential backoff, capped so a cold Atlas cluster gets time without stalling boot forever.
      await new Promise((resolve) => setTimeout(resolve, Math.min(baseDelayMs * 2 ** (attempt - 1), 8000)));
    }
  }

  logger.error("MongoDB unavailable — serving in degraded in-memory mode", { lastError: state.lastError });
  return false;
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close(false);
  logger.info("MongoDB connection closed");
};

export default connectDatabase;
