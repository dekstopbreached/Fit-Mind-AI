import express from "express";
import mongoose from "mongoose";
import authenticate from "../middleware/auth.js";
import requireAdmin from "../middleware/admin.js";
import { validate, f } from "../middleware/validate.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";
import PaymentRequest from "../models/PaymentRequest.js";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import { config } from "../config/env.js";

const router = express.Router();
router.use(authenticate, requireAdmin);

const userFields = "name email isAdmin role subscriptionTier subscriptionExpiry createdAt";

/* ---------------------------------------------------------------- analytics --- */

router.get("/analytics", asyncHandler(async (_req, res) => {
  const [totalUsers, premiumUsers, freeUsers, pendingRequests, revenue] = await Promise.all([
    User.countDocuments({}),
    Subscription.countDocuments({ tier: "premium", status: "active", currentPeriodEnd: { $gt: new Date() } }),
    User.countDocuments({ subscriptionTier: { $ne: "premium" } }),
    PaymentRequest.countDocuments({ status: "pending" }),
    PaymentRequest.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);
  res.json({
    totalUsers,
    premiumUsers,
    freeUsers,
    pendingRequests,
    revenueEstimate: revenue[0]?.total || 0,
  });
}));

/* -------------------------------------------------------- payment requests --- */

router.get("/payment-requests", asyncHandler(async (_req, res) => {
  const paymentRequests = await PaymentRequest.find({ status: "pending" })
    .populate("userId", userFields)
    .sort({ createdAt: -1 })
    .lean();
  res.json({ paymentRequests });
}));

router.patch(
  "/payment-requests/:id",
  validate({ body: { status: f.oneOf(["approved", "rejected"]), reason: f.string({ max: 500, optional: true }) } }),
  asyncHandler(async (req, res) => {
    const request = await PaymentRequest.findById(req.params.id);
    if (!request) throw ApiError.notFound("Payment request not found", "PAYMENT_REQUEST_NOT_FOUND");
    if (request.status !== "pending") throw ApiError.conflict("Payment request was already reviewed", "PAYMENT_REQUEST_REVIEWED");

    request.status = req.body.status;
    request.reason = req.body.reason;
    request.reviewedAt = new Date();
    await request.save();

    if (request.status === "approved") {
      const start = new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + config.manualPayment.periodDays);

      // Update the Subscription document (authoritative)
      await Subscription.findOneAndUpdate(
        { userId: request.userId },
        {
          userId: request.userId,
          tier: "premium",
          status: "active",
          source: "payment_request",
          currentPeriodStart: start,
          currentPeriodEnd: end,
        },
        { upsert: true, new: true }
      );

      // Sync denormalized fields on User for fast reads
      await User.findByIdAndUpdate(request.userId, {
        subscriptionTier: "premium",
        subscriptionExpiry: end,
      });
    }

    res.json({ paymentRequest: await request.populate("userId", userFields) });
  })
);

/* ---------------------------------------------------------------------- users --- */

router.get("/users", asyncHandler(async (req, res) => {
  const search = String(req.query.search || "").trim();
  const filter = search
    ? { $or: [{ name: new RegExp(search, "i") }, { email: new RegExp(search, "i") }] }
    : {};

  const users = await User.find(filter).select(userFields).sort({ createdAt: -1 }).lean();

  const subscriptions = await Subscription.find({
    userId: { $in: users.map((u) => u._id) },
  }).lean();

  const byUser = new Map(subscriptions.map((s) => [String(s.userId), s]));

  res.json({
    users: users.map((u) => ({
      ...u,
      subscription: byUser.get(String(u._id)) || null,
    })),
  });
}));

/* ------------------------------------------------------- grant/revoke premium --- */

router.patch(
  "/users/:id/premium",
  validate({ body: { enabled: f.boolean() } }),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      throw ApiError.badRequest("Invalid user id", "INVALID_USER_ID");

    const user = await User.findById(req.params.id).select(userFields);
    if (!user) throw ApiError.notFound("User not found", "USER_NOT_FOUND");

    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + config.manualPayment.periodDays);

    // Update Subscription document (authoritative)
    const subscription = await Subscription.findOneAndUpdate(
      { userId: user._id },
      req.body.enabled
        ? {
            userId: user._id,
            tier: "premium",
            status: "active",
            source: "admin_grant",
            currentPeriodStart: start,
            currentPeriodEnd: end,
          }
        : {
            userId: user._id,
            tier: "free",
            status: "cancelled",
            source: "admin_grant",
            currentPeriodEnd: new Date(),
          },
      { upsert: true, new: true }
    );

    // Sync denormalized User fields
    await User.findByIdAndUpdate(user._id, {
      subscriptionTier: req.body.enabled ? "premium" : "free",
      subscriptionExpiry: req.body.enabled ? end : null,
    });

    const updated = await User.findById(user._id).select(userFields).lean();
    res.json({ user: updated, subscription });
  })
);

/* ------------------------------------------------------------ change role --- */

router.patch(
  "/users/:id/role",
  validate({ body: { isAdmin: f.boolean() } }),
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id))
      throw ApiError.badRequest("Invalid user id", "INVALID_USER_ID");

    // Prevent self-demotion to avoid locking out the last admin.
    if (String(req.params.id) === String(req.user._id))
      throw ApiError.conflict("You cannot change your own admin status", "SELF_ROLE_CHANGE");

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isAdmin: req.body.isAdmin,
        role: req.body.isAdmin ? "admin" : "customer",
      },
      { new: true, runValidators: true }
    ).select(userFields);

    if (!user) throw ApiError.notFound("User not found", "USER_NOT_FOUND");

    res.json({ user });
  })
);

export default router;
