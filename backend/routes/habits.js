import express from "express";
import Habit from "../models/Habit.js";
import Log from "../models/Log.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware);

const seedDefaultFitnessHabits = async (userId) => {
  const defaults = [
    {
      name: "Chest & Triceps",
      description: "Push day: bench press, incline press, tricep dips.",
      category: "Fitness",
      frequency: "weekly",
      targetDays: 1,
      scheduledDays: [1],
      color: "#f97316",
      icon: "🏋️",
    },
    {
      name: "Back & Biceps",
      description: "Pull day: deadlifts, rows, bicep curls.",
      category: "Fitness",
      frequency: "weekly",
      targetDays: 1,
      scheduledDays: [2],
      color: "#22c55e",
      icon: "💪",
    },
    {
      name: "Legs",
      description: "Leg day: squats, lunges, hamstring curls.",
      category: "Fitness",
      frequency: "weekly",
      targetDays: 1,
      scheduledDays: [3],
      color: "#fb7185",
      icon: "🦵",
    },
    {
      name: "Shoulders & Arms",
      description: "Upper body day: shoulder press, lateral raises, arm work.",
      category: "Fitness",
      frequency: "weekly",
      targetDays: 1,
      scheduledDays: [4],
      color: "#818cf8",
      icon: "🔥",
    },
    {
      name: "Full Body / Cardio",
      description: "Full-body circuit or cardio conditioning.",
      category: "Fitness",
      frequency: "weekly",
      targetDays: 1,
      scheduledDays: [5],
      color: "#facc15",
      icon: "🚴",
    },
  ];

  for (const item of defaults) {
    const exists = await Habit.findOne({ userId, name: item.name });
    if (!exists) {
      await Habit.create({ ...item, userId });
    }
  }
};

router.get("/", async (req, res) => {
  const includeArchived = req.query.includeArchived === "true";
  await seedDefaultFitnessHabits(req.user._id);
  const habits = await Habit.find({ userId: req.user._id, ...(includeArchived ? {} : { isArchived: false }) }).sort({ createdAt: -1 });
  res.json(habits);
});

router.post("/", async (req, res) => {
  const payload = { ...req.body, userId: req.user._id };
  const habit = await Habit.create(payload);
  res.json(habit);
});

router.put("/:id", async (req, res) => {
  const habit = await Habit.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
  );
  if (!habit) return res.status(404).json({ message: "Habit not found" });
  res.json(habit);
});

router.delete("/:id", async (req, res) => {
  const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found" });
  await Log.deleteMany({ habitId: habit._id });
  res.json({ message: "Deleted" });
});

router.put("/:id/archive", async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found" });
  habit.isArchived = !habit.isArchived;
  await habit.save();
  res.json(habit);
});

router.post("/:id/logs", async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found" });
  const completedDate = req.body.date || new Date().toISOString().slice(0, 10);
  const log = await Log.findOneAndUpdate(
    { habitId: habit._id, completedDate },
    { userId: req.user._id, habitId: habit._id, completedDate },
    { upsert: true, new: true }
  );
  res.json(log);
});

router.get("/:id/logs", async (req, res) => {
  const logs = await Log.find({ habitId: req.params.id, userId: req.user._id }).sort({ completedDate: -1 });
  res.json(logs);
});

router.get("/stats", async (req, res) => {
  await seedDefaultFitnessHabits(req.user._id);
  const habits = await Habit.find({ userId: req.user._id, isArchived: false });
  const logs = await Log.find({ userId: req.user._id });
  res.json({ habits, logs });
});

export default router;
