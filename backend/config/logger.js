/**
 * Zero-dependency structured logger.
 *
 * Production emits one JSON object per line — which is exactly what Render's log
 * drain, CloudWatch, Datadog, etc. expect — while development prints a compact
 * human-readable line. Keeping this dependency-free means no extra cold-start
 * weight on Render's free tier, where boot time is what users actually feel.
 */
import { config } from "./env.js";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
const threshold = LEVELS[config.logLevel] ?? LEVELS.info;

const SECRET_PATTERN = /(secret|password|token|authorization|signature|apikey|api_key|key_secret)/i;

/** Recursively replaces secret-ish values so credentials never reach the log stream. */
const redact = (value, depth = 0) => {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((entry) => redact(entry, depth + 1));

  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (SECRET_PATTERN.test(key)) output[key] = "[redacted]";
    else if (entry instanceof Error) output[key] = { message: entry.message, name: entry.name };
    else output[key] = redact(entry, depth + 1);
  }
  return output;
};

const write = (level, message, context) => {
  if (LEVELS[level] < threshold) return;

  const payload = { level, time: new Date().toISOString(), msg: message, ...redact(context || {}) };
  const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;

  if (config.isProduction) {
    stream.write(`${JSON.stringify(payload)}\n`);
    return;
  }

  const tag = level.toUpperCase().padEnd(5);
  const extra = context && Object.keys(context).length ? ` ${JSON.stringify(redact(context))}` : "";
  stream.write(`${tag} ${message}${extra}\n`);
};

export const logger = {
  debug: (message, context) => write("debug", message, context),
  info: (message, context) => write("info", message, context),
  warn: (message, context) => write("warn", message, context),
  error: (message, context) => write("error", message, context),
  /** Returns a logger that stamps every line with the same fields (e.g. requestId). */
  child: (bindings) => ({
    debug: (message, context) => write("debug", message, { ...bindings, ...context }),
    info: (message, context) => write("info", message, { ...bindings, ...context }),
    warn: (message, context) => write("warn", message, { ...bindings, ...context }),
    error: (message, context) => write("error", message, { ...bindings, ...context }),
  }),
};

export default logger;
