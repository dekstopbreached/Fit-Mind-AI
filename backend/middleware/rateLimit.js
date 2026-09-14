/**
 * Fixed-window rate limiting, in-process.
 *
 * Render's free/starter tier runs a single instance, so an in-process counter is
 * accurate there and needs no Redis. If the service is ever scaled to multiple
 * instances, swap the `hits` Map for a Redis store — the middleware signature
 * stays the same.
 *
 * Emits the draft IETF `RateLimit-*` headers so the frontend can back off politely.
 */
import { ApiError } from "./errorHandler.js";

const buckets = new Map();

/** Periodically drops expired windows so the Map can't grow without bound. */
const sweep = () => {
  const now = Date.now();
  for (const [bucketName, hits] of buckets) {
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
    if (hits.size === 0) buckets.delete(bucketName);
  }
};
const sweeper = setInterval(sweep, 60_000);
sweeper.unref(); // never hold the process open

/**
 * @param {object} options
 * @param {string} options.name  Bucket name (keeps limiters independent)
 * @param {number} options.windowMs
 * @param {number} options.max   Requests allowed per window
 * @param {string} [options.message]
 * @param {(req: import('express').Request) => string} [options.keyGenerator]
 */
export const rateLimit = ({ name, windowMs, max, message, keyGenerator }) => {
  if (!buckets.has(name)) buckets.set(name, new Map());
  const hits = buckets.get(name);

  // Authenticated users are limited per account; everyone else per IP. Falling
  // back to IP alone would let one shared office NAT lock out a whole team.
  const defaultKey = (req) => req.user?._id?.toString() || req.ip || "unknown";
  const resolveKey = keyGenerator || defaultKey;

  return (req, res, next) => {
    const key = resolveKey(req);
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(resetSeconds));

    if (entry.count > max) {
      res.setHeader("Retry-After", String(resetSeconds));
      return next(
        ApiError.tooManyRequests(message || "Too many requests, please slow down", "RATE_LIMITED", {
          retryAfterSeconds: resetSeconds,
        })
      );
    }

    return next();
  };
};

/** Broad backstop for the whole API. Generous enough that normal use never sees it. */
export const globalLimiter = rateLimit({
  name: "global",
  windowMs: 60_000,
  max: 300,
});

/**
 * Login/register: the endpoints worth brute-forcing. Keyed on IP *and* the
 * submitted email so attacking many passwords for one account is throttled even
 * when the attacker rotates IPs.
 */
export const authLimiter = rateLimit({
  name: "auth",
  windowMs: 15 * 60_000,
  max: 12,
  message: "Too many authentication attempts. Wait 15 minutes and try again.",
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email || "").toLowerCase()}`,
});

/** AI generation costs real money per call — the tightest limit in the app. */
export const aiLimiter = rateLimit({
  name: "ai",
  windowMs: 60_000,
  max: 12,
  message: "AI request limit reached. Please wait a minute before generating again.",
});

/** Order creation writes a DB row each time; stop anyone spamming orphan orders. */
export const paymentLimiter = rateLimit({
  name: "payments",
  windowMs: 10 * 60_000,
  max: 15,
  message: "Too many payment attempts. Please wait a few minutes.",
});

