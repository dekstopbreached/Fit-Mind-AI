/**
 * Tiny declarative request validator.
 *
 * Replaces the ad-hoc `if (!name || !email)` checks that were scattered through
 * the routes. Validation now happens before a handler runs, unknown keys are
 * stripped (so a client can't smuggle `isPremium: true` into a profile update),
 * and every failure returns the same shape:
 *
 *   { error: { code: "VALIDATION_ERROR", details: { fields: { email: "..." } } } }
 *
 * Deliberately dependency-free — the rule set an app this size needs is ~120
 * lines, and it keeps the deploy artifact small.
 */
import { ApiError } from "./errorHandler.js";

const isMissing = (value) => value === undefined || value === null || value === "";

/** Field rule builders. Each returns { parse(value, fieldName) -> parsedValue }. */
export const f = {
  string: ({
    min = 0,
    max = 5000,
    pattern,
    trim = true,
    lowercase = false,
    optional = false,
    fallback,
    label,
  } = {}) => ({
    optional,
    fallback,
    parse(value, name) {
      const field = label || name;
      if (typeof value !== "string") value = String(value);
      if (trim) value = value.trim();
      if (lowercase) value = value.toLowerCase();
      if (value.length < min) throw `${field} must be at least ${min} characters`;
      if (value.length > max) throw `${field} must be at most ${max} characters`;
      if (pattern && !pattern.test(value)) throw `${field} is not in a valid format`;
      return value;
    },
  }),

  email: ({ optional = false } = {}) => ({
    optional,
    parse(value, name) {
      const email = String(value).trim().toLowerCase();
      // Intentionally pragmatic rather than RFC-complete: catches typos, accepts real addresses.
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) || email.length > 254) {
        throw `${name} must be a valid email address`;
      }
      return email;
    },
  }),

  password: ({ min = 8, max = 128 } = {}) => ({
    optional: false,
    parse(value, name) {
      const password = String(value);
      if (password.length < min) throw `${name} must be at least ${min} characters`;
      if (password.length > max) throw `${name} must be at most ${max} characters`;
      // bcrypt silently truncates past 72 bytes; reject rather than mislead the user.
      if (Buffer.byteLength(password, "utf8") > 72) throw `${name} must be at most 72 bytes`;
      return password;
    },
  }),

  number: ({ min = -Infinity, max = Infinity, integer = false, optional = false, fallback } = {}) => ({
    optional,
    fallback,
    parse(value, name) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) throw `${name} must be a number`;
      if (integer && !Number.isInteger(parsed)) throw `${name} must be a whole number`;
      if (parsed < min) throw `${name} must be at least ${min}`;
      if (parsed > max) throw `${name} must be at most ${max}`;
      return parsed;
    },
  }),

  boolean: ({ optional = false, fallback } = {}) => ({
    optional,
    fallback,
    parse(value, name) {
      if (typeof value === "boolean") return value;
      if (value === "true" || value === "1" || value === 1) return true;
      if (value === "false" || value === "0" || value === 0) return false;
      throw `${name} must be true or false`;
    },
  }),

  oneOf: (values, { optional = false, fallback } = {}) => ({
    optional,
    fallback,
    parse(value, name) {
      if (!values.includes(value)) throw `${name} must be one of: ${values.join(", ")}`;
      return value;
    },
  }),

  isoDate: ({ optional = false, fallback } = {}) => ({
    optional,
    fallback,
    parse(value, name) {
      const text = String(value).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text))) {
        throw `${name} must be a date formatted YYYY-MM-DD`;
      }
      return text;
    },
  }),

  /** Escape hatch for nested objects/arrays we only size-check. */
  passthrough: ({ optional = true, fallback } = {}) => ({
    optional,
    fallback,
    parse: (value) => value,
  }),
};

const parseSection = (schema, input, errors, prefix) => {
  const output = {};
  for (const [name, rule] of Object.entries(schema)) {
    const value = input?.[name];

    if (isMissing(value)) {
      if (rule.optional) {
        if (rule.fallback !== undefined) output[name] = rule.fallback;
        continue;
      }
      errors[`${prefix}${name}`] = `${name} is required`;
      continue;
    }

    try {
      output[name] = rule.parse(value, name);
    } catch (problem) {
      errors[`${prefix}${name}`] = typeof problem === "string" ? problem : `${name} is invalid`;
    }
  }
  return output;
};

/**
 * @param {{ body?: object, query?: object, params?: object }} schema
 * Replaces req.body/query/params with the parsed, whitelisted result.
 */
export const validate = (schema) => (req, res, next) => {
  const errors = {};

  if (schema.body) req.body = parseSection(schema.body, req.body, errors, "body.");
  if (schema.query) req.query = parseSection(schema.query, req.query, errors, "query.");
  if (schema.params) req.params = parseSection(schema.params, req.params, errors, "params.");

  if (Object.keys(errors).length > 0) {
    return next(ApiError.badRequest("Validation failed", "VALIDATION_ERROR", { fields: errors }));
  }
  return next();
};

export default validate;
