/**
 * Data access layer with a MongoDB-first / in-memory-fallback strategy.
 *
 * Every read and write goes through here so route handlers never branch on
 * `mongoose.connection.readyState` themselves. Previously `requirePremium` and
 * `routes/payments.js` talked to Mongoose directly, which meant entitlement
 * checks threw while the rest of the app happily served from memory.
 */
import mongoose from "mongoose";
import FitnessProfile from "../models/FitnessProfile.js";
import WorkoutPlan from "../models/WorkoutPlan.js";
import DietPlan from "../models/DietPlan.js";
import Progress from "../models/Progress.js";
import Subscription from "../models/Subscription.js";
import Payment from "../models/Payment.js";
import { logger } from "../config/logger.js";
import {
  memoryProfiles,
  memoryWorkouts,
  memoryDiets,
  memoryProgress,
  memorySubscriptions,
  memoryPayments,
} from "./memoryStore.js";

// Re-exported for backwards compatibility with existing imports.
export { memoryWorkouts, memoryDiets, memoryProgress, memorySubscriptions, memoryPayments };

const dbUp = () => mongoose.connection.readyState === 1;
const newId = () => new mongoose.Types.ObjectId().toString();

/** Runs a Mongo operation, logging and falling back instead of throwing. */
const tryMongo = async (label, operation) => {
  if (!dbUp()) return { ok: false, value: null };
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    logger.warn(`Mongo ${label} failed, using in-memory fallback`, { error: error.message });
    return { ok: false, value: null };
  }
};

/* ----------------------------------------------------------------- profile --- */

export const getProfile = async (userId) => {
  const { ok, value } = await tryMongo("getProfile", () => FitnessProfile.findOne({ userId }));
  if (ok && value) return value;
  return memoryProfiles.get(String(userId)) || null;
};

/* ------------------------------------------------------------ workout plan --- */

export const getActiveWorkoutPlan = async (userId, version = null) => {
  const { ok, value } = await tryMongo("getActiveWorkoutPlan", () => {
    const query = { userId };
    if (version) query.version = Number(version);
    else query.isActive = true;
    return WorkoutPlan.findOne(query).sort({ version: -1 });
  });
  if (ok && value) return value;

  const plans = memoryWorkouts.get(String(userId)) || [];
  if (version) return plans.find((plan) => plan.version === Number(version)) || null;
  return plans.find((plan) => plan.isActive) || plans[plans.length - 1] || null;
};

export const saveWorkoutPlan = async (userId, planData) => {
  const { ok, value } = await tryMongo("saveWorkoutPlan", async () => {
    await WorkoutPlan.updateMany({ userId, isActive: true }, { isActive: false });
    return WorkoutPlan.create({ userId, ...planData });
  });
  if (ok && value) return value;

  const plans = memoryWorkouts.get(String(userId)) || [];
  plans.forEach((plan) => (plan.isActive = false));
  const created = { _id: newId(), userId, isActive: true, createdAt: new Date().toISOString(), ...planData };
  plans.push(created);
  memoryWorkouts.set(String(userId), plans);
  return created;
};

/* --------------------------------------------------------------- diet plan --- */

export const getActiveDietPlan = async (userId, version = null) => {
  const { ok, value } = await tryMongo("getActiveDietPlan", () => {
    const query = { userId };
    if (version) query.version = Number(version);
    else query.isActive = true;
    return DietPlan.findOne(query).sort({ version: -1 });
  });
  if (ok && value) return value;

  const plans = memoryDiets.get(String(userId)) || [];
  if (version) return plans.find((plan) => plan.version === Number(version)) || null;
  return plans.find((plan) => plan.isActive) || plans[plans.length - 1] || null;
};

export const saveDietPlan = async (userId, planData) => {
  const { ok, value } = await tryMongo("saveDietPlan", async () => {
    await DietPlan.updateMany({ userId, isActive: true }, { isActive: false });
    return DietPlan.create({ userId, ...planData });
  });
  if (ok && value) return value;

  const plans = memoryDiets.get(String(userId)) || [];
  plans.forEach((plan) => (plan.isActive = false));
  const created = { _id: newId(), userId, isActive: true, createdAt: new Date().toISOString(), ...planData };
  plans.push(created);
  memoryDiets.set(String(userId), plans);
  return created;
};

/* ---------------------------------------------------------------- progress --- */

export const getProgressLogs = async (userId, days = 30) => {
  const { ok, value } = await tryMongo("getProgressLogs", () => {
    const start = new Date();
    start.setDate(start.getDate() - Number(days));
    return Progress.find({ userId, date: { $gte: start.toISOString().split("T")[0] } }).sort({ date: 1 });
  });
  if (ok && value) return value;
  return memoryProgress.get(String(userId)) || [];
};

export const saveProgressLog = async (userId, progressData) => {
  const { ok, value } = await tryMongo("saveProgressLog", () =>
    Progress.findOneAndUpdate(
      { userId, date: progressData.date },
      { userId, ...progressData },
      { new: true, upsert: true }
    )
  );
  if (ok && value) return value;

  const logs = memoryProgress.get(String(userId)) || [];
  const record = { _id: newId(), userId, ...progressData };
  const index = logs.findIndex((log) => log.date === progressData.date);
  if (index === -1) logs.push(record);
  else logs[index] = record;
  memoryProgress.set(String(userId), logs);
  return record;
};

/* ------------------------------------------------------------ entitlement --- */

export const FREE_SUBSCRIPTION = Object.freeze({ tier: "free", status: "active", currentPeriodEnd: null });

export const getUserSubscription = async (userId) => {
  const { ok, value } = await tryMongo("getUserSubscription", () => Subscription.findOne({ userId }));
  if (ok && value) return value;
  return memorySubscriptions.get(String(userId)) || { ...FREE_SUBSCRIPTION };
};

export const saveSubscription = async (userId, subscriptionData) => {
  const { ok, value } = await tryMongo("saveSubscription", () =>
    Subscription.findOneAndUpdate({ userId }, { userId, ...subscriptionData }, { new: true, upsert: true })
  );
  if (ok && value) return value;

  const existing = memorySubscriptions.get(String(userId)) || {};
  const merged = { _id: existing._id || newId(), userId, ...existing, ...subscriptionData };
  memorySubscriptions.set(String(userId), merged);
  return merged;
};

/**
 * Premium is only real if the paid period has not lapsed.
 *
 * The previous check was `tier === "premium" && status === "active"`, which never
 * looked at `currentPeriodEnd` — so a one-off ₹499 payment granted premium forever.
 */
export const isSubscriptionActive = (subscription) => {
  if (!subscription) return false;
  if (subscription.tier !== "premium") return false;
  if (subscription.status !== "active") return false;
  if (!subscription.currentPeriodEnd) return true;
  return new Date(subscription.currentPeriodEnd).getTime() > Date.now();
};

/** Convenience read used by the middleware and the /status endpoint. */
export const getEntitlement = async (userId) => {
  const subscription = await getUserSubscription(userId);
  const isPremium = isSubscriptionActive(subscription);
  const expired = subscription?.tier === "premium" && !isPremium;
  return { subscription, isPremium, expired };
};

/* ---------------------------------------------------------------- payments --- */

export const createPaymentRecord = async (paymentData) => {
  const { ok, value } = await tryMongo("createPaymentRecord", () => Payment.create(paymentData));
  if (ok && value) return value;

  const record = { _id: newId(), createdAt: new Date().toISOString(), ...paymentData };
  memoryPayments.set(record.orderId, record);
  return record;
};

export const findPaymentByOrderId = async (orderId) => {
  const { ok, value } = await tryMongo("findPaymentByOrderId", () => Payment.findOne({ orderId }));
  if (ok && value) return value;
  return memoryPayments.get(orderId) || null;
};

export const updatePaymentByOrderId = async (orderId, update) => {
  const { ok, value } = await tryMongo("updatePaymentByOrderId", () =>
    Payment.findOneAndUpdate({ orderId }, update, { new: true })
  );
  if (ok && value) return value;

  const existing = memoryPayments.get(orderId);
  if (!existing) return null;
  const merged = { ...existing, ...update, updatedAt: new Date().toISOString() };
  memoryPayments.set(orderId, merged);
  return merged;
};

export const listPaymentsForUser = async (userId, limit = 20) => {
  const { ok, value } = await tryMongo("listPaymentsForUser", () =>
    Payment.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean()
  );
  if (ok && value) return value;

  return [...memoryPayments.values()]
    .filter((payment) => String(payment.userId) === String(userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
};

