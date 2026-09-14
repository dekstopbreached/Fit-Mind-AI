/**
 * Centralised, validated configuration.
 *
 * Every environment variable is read exactly once, here, and validated at boot.
 * Nothing else in the codebase touches `process.env` directly. This gives us:
 *   - fail-fast startup instead of a server that boots and then 500s at runtime
 *   - no hardcoded secret fallbacks (a default JWT secret is a forgeable-token bug)
 *   - one place to look when configuring Render / Vercel / Atlas
 */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load .env here, at the very first module that reads process.env, rather than in
// server.js. ESM evaluates all imports before the importing module's body runs, so
// a `dotenv.config()` call in server.js would execute *after* this file had already
// read (empty) values. The path is resolved from this file so the server starts
// correctly whether it is launched from backend/ or from the repository root.
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(backendRoot, ".env") });

const problems = [];
const warnings = [];

const raw = (key) => {
  const value = process.env[key];
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (trimmed === "") return undefined;
  // Treat unreplaced .env.example placeholders as "not set" rather than valid config.
  if (/^(your_|replace_with|changeme|<)/i.test(trimmed)) return undefined;
  if (trimmed.includes("your_")) return undefined;
  return trimmed;
};

const num = (key, fallback) => {
  const value = raw(key);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    problems.push(`${key} must be a number (received "${value}")`);
    return fallback;
  }
  return parsed;
};

const list = (key, fallback = []) => {
  const value = raw(key);
  if (value === undefined) return fallback;
  return value
    .split(",")
    .map((entry) => entry.trim().replace(/\/$/, ""))
    .filter(Boolean);
};

const nodeEnv = raw("NODE_ENV") || "development";
const isProduction = nodeEnv === "production";

/* ------------------------------------------------------------------ core --- */

const jwtSecret = raw("JWT_SECRET");
if (!jwtSecret) {
  problems.push(
    "JWT_SECRET is required. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
  );
} else if (jwtSecret.length < 32) {
  const message = `JWT_SECRET is only ${jwtSecret.length} characters; use at least 32 for a signing key.`;
  if (isProduction) problems.push(message);
  else warnings.push(message);
}

const mongoUri = raw("MONGO_URI");
if (!mongoUri && isProduction) {
  problems.push("MONGO_URI is required in production (use your MongoDB Atlas SRV string).");
}

/* ---------------------------------------------------------- manual payment --- */

const paymentHandle = raw("PAYMENT_HANDLE") || "your-upi-or-paypal-handle";
const qrImageUrl = raw("PAYMENT_QR_IMAGE_URL") || "/payment-qr.png";

/* -------------------------------------------------------------------- ai --- */

const aiProvider = (raw("AI_PROVIDER") || "gemini").toLowerCase();
const geminiApiKey = raw("GEMINI_API_KEY");
const openaiApiKey = raw("OPENAI_API_KEY");

if (!geminiApiKey && !openaiApiKey) {
  warnings.push("No AI provider key configured — AI routes will fall back to deterministic template plans.");
}

/* ------------------------------------------------------------------ cors --- */

const frontendUrl = (raw("FRONTEND_URL") || "http://localhost:5173").replace(/\/$/, "");
const corsOrigins = list("CORS_ORIGINS", [
  frontendUrl,
  ...(isProduction ? [] : ["http://localhost:5173", "http://localhost:5174", "http://localhost:4173", "http://localhost:3000"]),
]);

/* ----------------------------------------------------------------- build --- */

export const config = Object.freeze({
  nodeEnv,
  isProduction,
  port: num("PORT", 8000),
  logLevel: raw("LOG_LEVEL") || (isProduction ? "info" : "debug"),

  mongoUri: mongoUri || "mongodb://127.0.0.1:27017/fitmind",
  mongoConfigured: Boolean(mongoUri),

  jwtSecret,
  jwtExpiresIn: raw("JWT_EXPIRES_IN") || "30d",
  bcryptRounds: num("BCRYPT_ROUNDS", 12),

  frontendUrl,
  corsOrigins,
  trustProxy: raw("TRUST_PROXY") !== "false", // Render/Railway/Fly all sit behind a proxy

  manualPayment: Object.freeze({
    amountINR: num("PREMIUM_PRICE_INR", 499),
    periodDays: num("PREMIUM_PERIOD_DAYS", 30),
    paymentHandle,
    qrImageUrl,
  }),

  ai: Object.freeze({
    provider: aiProvider,
    geminiApiKey,
    geminiModel: raw("GEMINI_MODEL") || "gemini-2.5-flash",
    openaiApiKey,
    openaiModel: raw("OPENAI_MODEL") || "gpt-4o-mini",
  }),
});

export const configProblems = problems;
export const configWarnings = warnings;

/** Throws on misconfiguration so the process dies at boot rather than mid-request. */
export const assertConfigValid = () => {
  if (problems.length === 0) return;
  const detail = problems.map((p) => `  • ${p}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${detail}\n\nSee backend/.env.example for the full list.`);
};

export default config;
