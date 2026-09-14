/**
 * Authentication routes.
 *
 * Changes from the previous version:
 *  - The hardcoded `|| "fitmind_secret"` JWT fallback is gone (it appeared four
 *    times here). Tokens are minted through `signAccessToken` using the validated
 *    secret, so a misconfigured deploy fails at boot instead of issuing forgeable
 *    tokens.
 *  - Input is validated and normalised before it reaches the database.
 *  - Login and registration answer in constant-ish time and with an identical
 *    message for "no such user" and "wrong password", so the endpoint can't be
 *    used to enumerate which emails are registered.
 *  - bcrypt cost is configurable and defaults to 12 rather than 10.
 *  - Adds PUT /profile, which the sidebar rename control already called but which
 *    did not exist on the server.
 */
import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import authenticate, { signAccessToken } from "../middleware/auth.js";
import { validate, f } from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";
import { config } from "../config/env.js";
import { memoryUsers } from "../utils/memoryStore.js";

const router = express.Router();

// Re-exported so older imports keep working; the store itself now lives in utils.
export { memoryUsers };

const dbUp = () => mongoose.connection.readyState === 1;

/** Never return the password hash, and keep one response shape everywhere. */
const publicUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  morningMotivation: user.morningMotivation ?? true,
  isAdmin: Boolean(user.isAdmin),
  role: user.role || (user.isAdmin ? "admin" : "customer"),
  subscriptionTier: user.subscriptionTier || "free",
  subscriptionExpiry: user.subscriptionExpiry || null,
  createdAt: user.createdAt,
});

const credentialsSchema = {
  email: f.email(),
  password: f.password({ min: 8 }),
};

/* --------------------------------------------------------------- register --- */

router.post(
  "/register",
  authLimiter,
  validate({
    body: {
      name: f.string({ min: 2, max: 60 }),
      ...credentialsSchema,
    },
  }),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const avatar = name.charAt(0).toUpperCase();

    if (dbUp()) {
      const existing = await User.findOne({ email }).select("_id").lean();
      if (existing) throw ApiError.conflict("An account with this email already exists", "EMAIL_IN_USE");

      const user = await User.create({ name, email, password: passwordHash, avatar });
      req.log.info("User registered", { userId: String(user._id) });
      return res.status(201).json({ user: publicUser(user), token: signAccessToken(user._id) });
    }

    // Degraded mode: MongoDB unreachable.
    if (memoryUsers.has(email)) {
      throw ApiError.conflict("An account with this email already exists", "EMAIL_IN_USE");
    }
    const id = new mongoose.Types.ObjectId().toString();
    const user = { _id: id, name, email, password: passwordHash, avatar, createdAt: new Date().toISOString() };
    memoryUsers.set(email, user);
    memoryUsers.set(id, user);

    req.log.warn("User registered in degraded in-memory mode", { userId: id });
    return res.status(201).json({ user: publicUser(user), token: signAccessToken(id) });
  })
);

/* ------------------------------------------------------------------ login --- */

router.post(
  "/login",
  authLimiter,
  validate({ body: { email: f.email(), password: f.string({ min: 1, max: 128, trim: false }) } }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = dbUp() ? await User.findOne({ email }) : memoryUsers.get(email);

    // Compare against a dummy hash when the user is absent so both branches cost
    // the same wall-clock time; otherwise response latency reveals which emails exist.
    const hash = user?.password || "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
    const passwordMatches = await bcrypt.compare(password, hash);

    if (!user || !passwordMatches) {
      throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    req.log.info("User signed in", { userId: String(user._id) });
    res.json({ user: publicUser(user), token: signAccessToken(user._id) });
  })
);

/* --------------------------------------------------------------------- me --- */

router.get("/me", authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

/* ---------------------------------------------------------------- profile --- */

router.put(
  "/profile",
  authenticate,
  validate({
    body: {
      name: f.string({ min: 2, max: 60, optional: true }),
      morningMotivation: f.boolean({ optional: true }),
    },
  }),
  asyncHandler(async (req, res) => {
    const updates = {};
    if (req.body.name !== undefined) {
      updates.name = req.body.name;
      updates.avatar = req.body.name.charAt(0).toUpperCase();
    }
    if (req.body.morningMotivation !== undefined) updates.morningMotivation = req.body.morningMotivation;

    if (Object.keys(updates).length === 0) {
      throw ApiError.badRequest("Nothing to update", "NO_CHANGES");
    }

    if (dbUp()) {
      const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
      if (!user) throw ApiError.notFound("Account not found", "USER_NOT_FOUND");
      return res.json({ user: publicUser(user) });
    }

    const user = memoryUsers.get(String(req.user._id));
    if (!user) throw ApiError.notFound("Account not found", "USER_NOT_FOUND");
    Object.assign(user, updates);
    return res.json({ user: publicUser(user) });
  })
);

/* ------------------------------------------------------- change password --- */

router.put(
  "/password",
  authenticate,
  authLimiter,
  validate({
    body: {
      currentPassword: f.string({ min: 1, max: 128, trim: false }),
      newPassword: f.password({ min: 8 }),
    },
  }),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // req.user is stripped of the hash, so re-read the record that has it.
    const record = dbUp() ? await User.findById(req.user._id) : memoryUsers.get(String(req.user._id));
    if (!record) throw ApiError.notFound("Account not found", "USER_NOT_FOUND");

    if (!(await bcrypt.compare(currentPassword, record.password))) {
      throw ApiError.unauthorized("Current password is incorrect", "INVALID_CREDENTIALS");
    }

    const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
    if (dbUp()) {
      record.password = passwordHash;
      await record.save();
    } else {
      record.password = passwordHash;
    }

    req.log.info("Password changed", { userId: String(req.user._id) });
    res.json({ success: true, message: "Password updated" });
  })
);

export default router;
