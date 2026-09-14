/**
 * JWT authentication.
 *
 * What changed and why it matters:
 *
 *  1. REMOVED the "default mock user fallback". Previously any token that merely
 *     *parsed* was granted a synthetic `Demo Athlete` identity even when no such
 *     user existed. Combined with (2) that was a full authentication bypass.
 *
 *  2. REMOVED the hardcoded `|| "fitmind_secret"` signing-secret fallback. That
 *     string is in the public repo, so anyone could mint a token for any userId.
 *     The secret now comes from validated config and the process refuses to boot
 *     without it.
 *
 *  3. Tokens are checked against the actual user record every request, so a
 *     deleted account stops working immediately.
 */
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import { config } from "../config/env.js";
import { memoryUsers } from "../utils/memoryStore.js";
import { ApiError, asyncHandler } from "./errorHandler.js";

const extractToken = (req) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (!token || !/^Bearer$/i.test(scheme)) return null;
  return token.trim();
};

/** Verifies the JWT and loads the owning user onto `req.user`. */
export const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized("Missing bearer token", "TOKEN_MISSING");

  // jwt.verify throws TokenExpiredError / JsonWebTokenError; errorHandler maps both.
  const payload = jwt.verify(token, config.jwtSecret, {
    algorithms: ["HS256"], // pin the algorithm so a token can't claim `alg: none`
    issuer: "fitmind-ai",
  });

  if (!payload?.userId) throw ApiError.unauthorized("Malformed token payload", "TOKEN_INVALID");

  if (mongoose.connection.readyState === 1) {
    const user = await User.findById(payload.userId).select("-password").lean();
    if (user) {
      req.user = user;
      return next();
    }
    // Connected to Mongo and the user genuinely isn't there → reject.
    // (Do not fall through to memory: that would resurrect deleted accounts.)
    throw ApiError.unauthorized("Account no longer exists", "USER_NOT_FOUND");
  }

  // Degraded mode only: MongoDB is down, so consult the in-memory register.
  const fallbackUser = memoryUsers.get(payload.userId);
  if (!fallbackUser) throw ApiError.unauthorized("Session cannot be verified right now", "USER_NOT_FOUND");

  const { password, ...safeUser } = fallbackUser;
  req.user = safeUser;
  return next();
});

/**
 * Attaches `req.user` when a valid token is present but never rejects.
 * Useful for endpoints that tailor a response for signed-in users yet stay public.
 */
export const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  if (!extractToken(req)) return next();
  try {
    await new Promise((resolve, reject) =>
      authenticate(req, res, (error) => (error ? reject(error) : resolve()))
    );
  } catch {
    req.user = undefined;
  }
  return next();
});

/** Signs an access token. Centralised so claims stay consistent across routes. */
export const signAccessToken = (userId) =>
  jwt.sign({ userId: String(userId) }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.jwtExpiresIn,
    issuer: "fitmind-ai",
  });

export default authenticate;
