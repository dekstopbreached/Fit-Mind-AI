/**
 * Error handling: one typed error class, one handler, one response shape.
 *
 * Before this, every route did its own try/catch and leaked raw `error.message`
 * to the client — which is how database strings and stack details end up in a
 * judge's browser console. Now routes throw `ApiError` (or anything at all) and
 * this layer decides what the client is allowed to see.
 */
import { logger } from "../config/logger.js";
import { config } from "../config/env.js";

export class ApiError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} message Client-safe message
   * @param {string} [code] Stable machine-readable code the frontend can branch on
   * @param {object} [details] Extra client-safe context (e.g. field validation errors)
   */
  constructor(status, message, code = undefined, details = undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.expected = true; // distinguishes "handled" errors from genuine crashes
  }

  static badRequest(message, code = "BAD_REQUEST", details) {
    return new ApiError(400, message, code, details);
  }
  static unauthorized(message = "Authentication required", code = "UNAUTHORIZED") {
    return new ApiError(401, message, code);
  }
  static forbidden(message = "Not allowed", code = "FORBIDDEN", details) {
    return new ApiError(403, message, code, details);
  }
  static notFound(message = "Resource not found", code = "NOT_FOUND") {
    return new ApiError(404, message, code);
  }
  static conflict(message, code = "CONFLICT") {
    return new ApiError(409, message, code);
  }
  static tooManyRequests(message = "Too many requests", code = "RATE_LIMITED", details) {
    return new ApiError(429, message, code, details);
  }
  static unavailable(message, code = "SERVICE_UNAVAILABLE") {
    return new ApiError(503, message, code);
  }
}

/** Wraps an async route handler so rejected promises reach the error handler. */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: { message: `Route ${req.method} ${req.originalUrl} does not exist`, code: "ROUTE_NOT_FOUND" },
    requestId: req.id,
  });
};

/** Translates known third-party error shapes into clean client responses. */
const normalise = (error) => {
  if (error instanceof ApiError) return error;

  // Mongoose schema validation
  if (error.name === "ValidationError" && error.errors) {
    const fields = Object.fromEntries(
      Object.entries(error.errors).map(([field, detail]) => [field, detail.message])
    );
    return ApiError.badRequest("Validation failed", "VALIDATION_ERROR", { fields });
  }
  // Bad ObjectId in a route param
  if (error.name === "CastError") {
    return ApiError.badRequest(`Invalid value for "${error.path}"`, "INVALID_ID");
  }
  // Unique index violation
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "value";
    return ApiError.conflict(`That ${field} is already in use`, "DUPLICATE_KEY");
  }
  // JWT library
  if (error.name === "TokenExpiredError") {
    return ApiError.unauthorized("Session expired, please sign in again", "TOKEN_EXPIRED");
  }
  if (error.name === "JsonWebTokenError") {
    return ApiError.unauthorized("Invalid session token", "TOKEN_INVALID");
  }
  // Malformed JSON body
  if (error.type === "entity.parse.failed") {
    return ApiError.badRequest("Request body is not valid JSON", "INVALID_JSON");
  }
  if (error.type === "entity.too.large") {
    return new ApiError(413, "Request body is too large", "PAYLOAD_TOO_LARGE");
  }
  return null;
};

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
export const errorHandler = (error, req, res, next) => {
  const known = normalise(error);
  const status = known?.status ?? 500;
  const log = req.log || logger;

  if (status >= 500) {
    log.error("Unhandled request failure", {
      method: req.method,
      path: req.originalUrl,
      error: error.message,
      stack: error.stack,
    });
  } else {
    log.warn("Request rejected", {
      method: req.method,
      path: req.originalUrl,
      status,
      code: known?.code,
      error: error.message,
    });
  }

  const body = {
    error: {
      // Never echo an unknown error's message: that is where internals leak.
      message: known?.message ?? "Something went wrong on our end",
      code: known?.code ?? "INTERNAL_ERROR",
      ...(known?.details ? { details: known.details } : {}),
    },
    requestId: req.id,
  };

  // Legacy clients read `message` at the top level; keep both so nothing breaks.
  body.message = body.error.message;

  if (!config.isProduction && status >= 500) body.error.stack = error.stack;

  res.status(status).json(body);
};

export default errorHandler;
