import express from "express";
import authMiddleware from "../middleware/auth.js";
import { getActiveWorkoutPlan } from "../utils/dataStore.js";
import WorkoutPlan from "../models/WorkoutPlan.js";

const router = express.Router();

router.use(authMiddleware);

const seedDefaultWorkoutPlan = async (userId) => {
  const existingPlan = await WorkoutPlan.findOne({ userId });
  if (existingPlan) return; // Don't overwrite if user already has a plan

  const shreddedVTaperPlan = {
    userId,
    goal: "Shredded V-Taper",
    version: 1,
    isActive: true,
    adaptationNotes: "6-day push / pull / legs split. Recomp focus — Ayush Bhardwaj",
    weeklySchedule: [
      {
        day: "Day 1",
        focus: "Push — Chest / Shoulders / Triceps",
        isRestDay: false,
        exercises: [
          { name: "Incline DB press", sets: 4, reps: "8-10", restSeconds: 90, notes: "" },
          { name: "Flat barbell press", sets: 3, reps: "8", restSeconds: 90, notes: "" },
          { name: "Overhead press", sets: 3, reps: "8", restSeconds: 90, notes: "" },
          { name: "Lateral raises", sets: 4, reps: "15", restSeconds: 60, notes: "" },
          { name: "Cable flyes", sets: 3, reps: "12", restSeconds: 60, notes: "" },
          { name: "Upper limb machine (tricep)", sets: 3, reps: "12", restSeconds: 60, notes: "" },
        ],
      },
      {
        day: "Day 2",
        focus: "Pull — Back width + biceps",
        isRestDay: false,
        exercises: [
          { name: "Wide-grip pull-ups / lat pulldown", sets: 4, reps: "8-10", restSeconds: 90, notes: "" },
          { name: "Straight-arm pulldown", sets: 3, reps: "12", restSeconds: 90, notes: "" },
          { name: "Barbell row", sets: 4, reps: "8", restSeconds: 90, notes: "" },
          { name: "Seated cable row (wide)", sets: 3, reps: "10", restSeconds: 90, notes: "" },
          { name: "Face pulls", sets: 3, reps: "15", restSeconds: 60, notes: "" },
          { name: "Barbell curl", sets: 4, reps: "10", restSeconds: 60, notes: "" },
          { name: "Incline DB curl", sets: 3, reps: "12", restSeconds: 60, notes: "" },
          { name: "Upper limb curl machine", sets: 3, reps: "12", restSeconds: 60, notes: "" },
        ],
      },
      {
        day: "Day 3",
        focus: "Legs — Quad / glute focus",
        isRestDay: false,
        exercises: [
          { name: "Pendulum squat", sets: 4, reps: "10", restSeconds: 90, notes: "" },
          { name: "Romanian deadlift", sets: 3, reps: "10", restSeconds: 90, notes: "" },
          { name: "Glute machine", sets: 4, reps: "12", restSeconds: 90, notes: "" },
          { name: "Abductor machine", sets: 3, reps: "15", restSeconds: 60, notes: "" },
          { name: "Leg curl", sets: 3, reps: "12", restSeconds: 60, notes: "" },
          { name: "Calf raises", sets: 4, reps: "15", restSeconds: 60, notes: "" },
        ],
      },
      {
        day: "Day 4",
        focus: "Push — Variation",
        isRestDay: false,
        exercises: [
          { name: "Flat DB press", sets: 4, reps: "10", restSeconds: 90, notes: "" },
          { name: "Arnold press", sets: 3, reps: "10", restSeconds: 90, notes: "" },
          { name: "Cable lateral raise", sets: 4, reps: "15", restSeconds: 60, notes: "" },
          { name: "Decline press", sets: 3, reps: "10", restSeconds: 90, notes: "" },
          { name: "Overhead tricep extension", sets: 3, reps: "12", restSeconds: 60, notes: "" },
        ],
      },
      {
        day: "Day 5",
        focus: "Pull — Thickness + forearms",
        isRestDay: false,
        exercises: [
          { name: "Deadlift (moderate)", sets: 3, reps: "6", restSeconds: 120, notes: "" },
          { name: "Chin-ups (close grip)", sets: 4, reps: "8-10", restSeconds: 90, notes: "" },
          { name: "T-bar / chest-supported row", sets: 3, reps: "10", restSeconds: 90, notes: "" },
          { name: "Lat pulldown (close grip)", sets: 3, reps: "12", restSeconds: 60, notes: "" },
          { name: "Rear delt flyes", sets: 3, reps: "15", restSeconds: 60, notes: "" },
          { name: "Hammer curl", sets: 4, reps: "10", restSeconds: 60, notes: "" },
          { name: "Cable / concentration curl", sets: 3, reps: "12", restSeconds: 60, notes: "" },
          { name: "Wrist curl (palms up)", sets: 4, reps: "15", restSeconds: 60, notes: "" },
          { name: "Reverse wrist curl", sets: 3, reps: "15", restSeconds: 60, notes: "" },
          { name: "Farmer's carry", sets: 3, reps: "30-40 steps", restSeconds: 60, notes: "" },
        ],
      },
      {
        day: "Day 6",
        focus: "Legs + Abs — Glute / adductor + core",
        isRestDay: false,
        exercises: [
          { name: "Bulgarian split squat", sets: 3, reps: "10", restSeconds: 90, notes: "" },
          { name: "Glute machine", sets: 3, reps: "15", restSeconds: 90, notes: "" },
          { name: "Abductor machine", sets: 3, reps: "15", restSeconds: 60, notes: "" },
          { name: "Leg extension", sets: 3, reps: "15", restSeconds: 60, notes: "" },
          { name: "Abs machine (weighted)", sets: 4, reps: "15", restSeconds: 60, notes: "" },
          { name: "Hanging leg raise", sets: 3, reps: "15", restSeconds: 60, notes: "" },
          { name: "Plank", sets: 3, reps: "1 min", restSeconds: 60, notes: "" },
        ],
      },
      {
        day: "Day 7",
        focus: "Full rest",
        isRestDay: true,
        exercises: [],
      },
    ],
  };

  await WorkoutPlan.create(shreddedVTaperPlan);
};

router.get("/", async (req, res) => {
  try {
    const { version } = req.query;
    await seedDefaultWorkoutPlan(req.user._id);
    const plan = await getActiveWorkoutPlan(req.user._id, version);
    res.json({ plan, history: plan ? [{ version: plan.version, createdAt: plan.createdAt || new Date() }] : [] });
  } catch (error) {
    console.error("Error fetching workout plan:", error);
    res.status(500).json({ message: "Failed to fetch workout plan" });
  }
});

export default router;
