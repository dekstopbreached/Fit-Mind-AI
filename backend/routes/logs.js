import express from "express";
import authMiddleware from "../middleware/auth.js";
import Log from "../models/Log.js";
import Habit from "../models/Habit.js";

const router = express.Router();
router.use(authMiddleware);

router.post("/", async (req, res) => {
  const { habitId, date } = req.body;
  const completedDate = date || new Date().toISOString().slice(0, 10);
  const habit = await Habit.findOne({ _id: habitId, userId: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found" });

  const log = await Log.findOneAndUpdate(
    { habitId: habit._id, completedDate },
    { userId: req.user._id, habitId: habit._id, completedDate },
    { upsert: true, new: true }
  );
  res.json(log);
});

router.delete("/", async (req, res) => {
  const { habitId, date } = req.body;
  const completedDate = date || new Date().toISOString().slice(0, 10);
  await Log.deleteOne({ habitId, completedDate, userId: req.user._id });
  res.json({ message: "Unmarked" });
});

router.get("/today", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const logs = await Log.find({ userId: req.user._id, completedDate: today });
  res.json(logs);
});

router.get("/range", async (req, res) => {
  const { start, end } = req.query;
  const logs = await Log.find({
    userId: req.user._id,
    completedDate: { $gte: start, $lte: end },
  });
  res.json(logs);
});

router.get("/heatmap", async (req, res) => {
  const days = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    const count = await Log.countDocuments({ userId: req.user._id, completedDate: key });
    days.push({ date: key, count });
  }
  res.json(days);
});

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

router.get("/stats", async (req, res) => {
  await seedDefaultFitnessHabits(req.user._id);
  const start = new Date();
  start.setDate(start.getDate() - 29);
  const startKey = start.toISOString().slice(0, 10);
  const habits = await Habit.find({ userId: req.user._id, isArchived: false });
  const logs = await Log.find({ userId: req.user._id, completedDate: { $gte: startKey } });

  const perHabit = await Promise.all(
    habits.map(async (h) => {
      const hLogs = logs.filter((log) => String(log.habitId) === String(h._id));
      const sortedKeys = [...new Set(hLogs.map((log) => log.completedDate))].sort();
      let current = 0;
      const todayKey = new Date().toISOString().slice(0, 10);
      let cursor = new Date();
      if (!sortedKeys.includes(todayKey)) cursor.setDate(cursor.getDate() - 1);
      while (sortedKeys.includes(cursor.toISOString().slice(0, 10))) {
        current += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      let longest = 0;
      let run = 0;
      let prev = null;
      for (const key of sortedKeys) {
        if (prev) {
          const diff = (new Date(key) - new Date(prev)) / (1000 * 60 * 60 * 24);
          run = diff === 1 ? run + 1 : 1;
        } else {
          run = 1;
        }
        longest = Math.max(longest, run);
        prev = key;
      }
      return {
        habitId: h._id,
        name: h.name,
        icon: h.icon,
        color: h.color,
        category: h.category,
        completions30d: hLogs.length,
        currentStreak: current,
        longestStreak: longest,
      };
    })
  );

  res.json({ perHabit, days: Array.from({ length: 30 }, (_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (29 - i));
      return day.toISOString().slice(0, 10);
    }) });
});

router.get("/stats/:id", async (req, res) => {
  const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found" });
  const logs = await Log.find({ habitId: habit._id, userId: req.user._id }).sort({ completedDate: -1 });

  const keys = logs.map((l) => l.completedDate);
  let current = 0;
  const todayKey = new Date().toISOString().slice(0, 10);
  let cursor = new Date();
  if (!keys.includes(todayKey)) cursor.setDate(cursor.getDate() - 1);
  while (keys.includes(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  let longest = 0;
  let run = 0;
  let prev = null;
  for (const key of [...new Set(keys)].sort()) {
    if (prev) {
      const diff = (new Date(key) - new Date(prev)) / (1000 * 60 * 60 * 24);
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = key;
  }

  res.json({
    habit: habit,
    totalCompletions: keys.length,
    currentStreak: current,
    longestStreak: longest,
    completionRate: keys.length > 0 ? Math.round((keys.length / 30) * 100) : 0,
    monthly: {},
  });
});

export default router;
