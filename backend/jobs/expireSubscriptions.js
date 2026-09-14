import cron from "node-cron";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import { logger } from "../config/logger.js";

export const expireSubscriptions = async () => {
  const now = new Date();

  // Find expired premium subscriptions
  const expired = await Subscription.find({
    tier: "premium",
    status: "active",
    currentPeriodEnd: { $lte: now },
  }).lean();

  if (!expired.length) return;

  const expiredIds = expired.map((s) => s._id);
  const userIds = expired.map((s) => s.userId);

  // Update Subscription documents (authoritative)
  const result = await Subscription.updateMany(
    { _id: { $in: expiredIds } },
    { $set: { tier: "free", status: "expired" } }
  );

  // Sync denormalized User fields so /auth/me reflects the change immediately
  await User.updateMany(
    { _id: { $in: userIds } },
    { $set: { subscriptionTier: "free", subscriptionExpiry: null } }
  );

  logger.info("Expired premium subscriptions downgraded to free", {
    count: result.modifiedCount,
    userIds: userIds.map(String),
  });
};

// Run daily at 2 AM
export const startSubscriptionExpiryJob = () => {
  cron.schedule("0 2 * * *", () =>
    expireSubscriptions().catch((error) =>
      logger.error("Subscription expiry job failed", { error: error.message })
    )
  );
};
