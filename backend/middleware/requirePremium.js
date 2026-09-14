/**
 * Premium entitlement gate.
 *
 * Three fixes over the previous version:
 *  1. Reads through `dataStore` instead of hitting Mongoose directly, so the gate
 *     behaves consistently when the database is unavailable rather than 500ing.
 *  2. Honours `currentPeriodEnd` — a lapsed subscription now loses access instead
 *     of staying premium forever after a single ₹499 charge.
 *  3. Distinguishes "never subscribed" from "expired" so the frontend can show
 *     a renew prompt rather than a first-time upsell.
 */
import { getEntitlement, getActiveWorkoutPlan, getActiveDietPlan } from "../utils/dataStore.js";
import { ApiError, asyncHandler } from "./errorHandler.js";

export const requirePremium = asyncHandler(async (req, res, next) => {
  if (!req.user) throw ApiError.unauthorized();

  const { subscription, isPremium, expired } = await getEntitlement(req.user._id);

  if (!isPremium) {
    throw ApiError.forbidden(
      expired
        ? "Your FitMind Premium subscription has expired. Renew to continue adaptive coaching."
        : "FitMind Premium is required for this feature.",
      expired ? "PREMIUM_EXPIRED" : "PREMIUM_REQUIRED",
      {
        isPremium: false,
        expired,
        expiredAt: expired ? subscription.currentPeriodEnd : undefined,
        upgradeUrl: "/pricing",
      }
    );
  }

  req.subscription = subscription;
  return next();
});

/**
 * Freemium gate for plan generation.
 *
 * The first workout/diet plan is free — onboarding calls these endpoints
 * immediately after signup, so paywalling them would break the funnel. Every
 * *re*generation requires Premium, which is what "plan regeneration" means as a
 * paid feature and gives the pricing page something concrete to sell.
 *
 * @param {"workout" | "diet"} planType
 */
export const requirePremiumForRegeneration = (planType) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user) throw ApiError.unauthorized();

    const existing =
      planType === "workout"
        ? await getActiveWorkoutPlan(req.user._id)
        : await getActiveDietPlan(req.user._id);

    // Nothing to regenerate yet: this is the free first-run generation.
    if (!existing) return next();

    const { subscription, isPremium, expired } = await getEntitlement(req.user._id);
    if (!isPremium) {
      throw ApiError.forbidden(
        expired
          ? "Your Premium subscription has expired. Renew to regenerate your plan."
          : `You already have a ${planType} plan. Regenerating plans is a FitMind Premium feature.`,
        expired ? "PREMIUM_EXPIRED" : "PREMIUM_REQUIRED",
        { isPremium: false, expired, feature: `${planType}_regeneration`, upgradeUrl: "/pricing" }
      );
    }

    req.subscription = subscription;
    return next();
  });

export default requirePremium;
