/**
 * Single home for the in-memory fallback stores.
 *
 * These previously lived inside route modules (`routes/auth.js` exported
 * `memoryUsers`, `routes/profile.js` exported `memoryProfiles`), which meant
 * middleware imported from routes and `utils/dataStore` imported from routes
 * too — a circular graph that ESM tolerates but that breaks in confusing ways
 * the moment import order changes. Hoisting the state into a leaf module removes
 * the cycle entirely.
 *
 * Purpose of the fallback: the app stays demoable if MongoDB is unreachable
 * mid-presentation. It is NOT a persistence layer — everything is lost on restart,
 * which is why /api/ready reports `degraded` while it is in use.
 */

/** email -> user, and userId -> user (same object under two keys) */
export const memoryUsers = new Map();

/** userId -> fitness profile */
export const memoryProfiles = new Map();

/** userId -> WorkoutPlan[] */
export const memoryWorkouts = new Map();

/** userId -> DietPlan[] */
export const memoryDiets = new Map();

/** userId -> Progress[] */
export const memoryProgress = new Map();

/** userId -> subscription */
export const memorySubscriptions = new Map();

/** orderId -> payment record */
export const memoryPayments = new Map();

export const memoryStoreSummary = () => ({
  users: memoryUsers.size,
  profiles: memoryProfiles.size,
  workouts: memoryWorkouts.size,
  diets: memoryDiets.size,
  progress: memoryProgress.size,
  subscriptions: memorySubscriptions.size,
  payments: memoryPayments.size,
});
