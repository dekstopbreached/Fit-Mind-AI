import express from "express";
import authMiddleware from "../middleware/auth.js";
import Progress from "../models/Progress.js";
import FitnessProfile from "../models/FitnessProfile.js";

const router = express.Router();

router.use(authMiddleware);

// Get progress logs for charts and history
router.get("/", async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));
    const startDateStr = startDate.toISOString().split("T")[0];

    const logs = await Progress.find({
      userId: req.user._id,
      date: { $gte: startDateStr },
    }).sort({ date: 1 });

    const profile = await FitnessProfile.findOne({ userId: req.user._id });

    // Calculate streaks & consistency
    const totalDaysLogged = logs.length;
    const completedWorkouts = logs.filter((l) => l.workoutCompleted).length;
    const consistencyPct = totalDaysLogged > 0 ? Math.round((completedWorkouts / Math.min(totalDaysLogged, 30)) * 100) : 0;

    // Weight trend
    const weights = logs.filter((l) => l.weightKg).map((l) => ({ date: l.date, weight: l.weightKg }));
    const currentWeight = weights.length > 0 ? weights[weights.length - 1].weight : profile?.weightKg || null;
    const startingWeight = weights.length > 0 ? weights[0].weight : profile?.weightKg || null;
    const weightChange = currentWeight && startingWeight ? parseFloat((currentWeight - startingWeight).toFixed(1)) : 0;

    res.json({
      logs,
      summary: {
        totalDaysLogged,
        completedWorkouts,
        consistencyPct,
        currentWeight,
        startingWeight,
        weightChange,
        targetWeight: profile?.fitnessGoal === "Weight Loss" ? (profile.weightKg - 5) : profile?.fitnessGoal === "Muscle Gain" ? (profile.weightKg + 3) : profile?.weightKg,
      },
    });
  } catch (error) {
    console.error("Error fetching progress logs:", error);
    res.status(500).json({ message: "Failed to fetch progress logs" });
  }
});

// Create or update daily progress log
router.post("/", async (req, res) => {
  try {
    const { date, weightKg, workoutCompleted, completionPercentage, exerciseLogs, notes, energyLevel } = req.body;
    const targetDate = date || new Date().toISOString().split("T")[0];

    const progressData = {
      userId: req.user._id,
      date: targetDate,
    };

    if (weightKg !== undefined && weightKg !== "") progressData.weightKg = Number(weightKg);
    if (workoutCompleted !== undefined) progressData.workoutCompleted = Boolean(workoutCompleted);
    if (completionPercentage !== undefined) progressData.completionPercentage = Number(completionPercentage);
    if (exerciseLogs) progressData.exerciseLogs = exerciseLogs;
    if (notes !== undefined) progressData.notes = notes;
    if (energyLevel) progressData.energyLevel = Number(energyLevel);

    const log = await Progress.findOneAndUpdate(
      { userId: req.user._id, date: targetDate },
      progressData,
      { new: true, upsert: true }
    );

    // If weight logged, update current weight in profile too for consistency
    if (weightKg) {
      await FitnessProfile.findOneAndUpdate(
        { userId: req.user._id },
        { weightKg: Number(weightKg) }
      );
    }

    res.json({ log });
  } catch (error) {
    console.error("Error saving progress log:", error);
    res.status(500).json({ message: "Failed to save progress log" });
  }
});

export default router;
