import express from "express";
import mongoose from "mongoose";
import authMiddleware from "../middleware/auth.js";
import { memoryProfiles } from "../utils/memoryStore.js";
import FitnessProfile from "../models/FitnessProfile.js";

const router = express.Router();

// The in-memory fallback map now lives in utils/memoryStore.js so that middleware
// and the data layer can read it without importing from a route module (which
// created a circular import). Re-exported here for backwards compatibility.
export { memoryProfiles };

export const calculateFitnessMetrics = (data) => {
  const { age, gender, heightCm, weightKg, fitnessGoal, activityLevel } = data;

  const heightM = heightCm / 100;
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

  let bmrBase = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === "male") bmrBase += 5;
  else if (gender === "female") bmrBase -= 161;
  else bmrBase -= 78;
  const bmr = Math.round(bmrBase);

  const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  const multiplier = activityMultipliers[activityLevel] || 1.375;
  const tdee = Math.round(bmr * multiplier);

  let targetCalories = tdee;
  if (fitnessGoal === "Weight Loss") targetCalories = Math.max(1200, tdee - 500);
  else if (fitnessGoal === "Muscle Gain") targetCalories = tdee + 300;
  else if (fitnessGoal === "Strength") targetCalories = tdee + 200;

  let proteinRatio = 1.6;
  if (fitnessGoal === "Muscle Gain" || fitnessGoal === "Strength") proteinRatio = 2.0;
  else if (fitnessGoal === "Weight Loss") proteinRatio = 1.8;
  const targetProteinGrams = Math.round(weightKg * proteinRatio);

  return { bmi, bmr, tdee, targetCalories, targetProteinGrams };
};

router.use(authMiddleware);

// Get profile
router.get("/", async (req, res) => {
  try {
    const userId = req.user._id.toString();
    if (mongoose.connection.readyState === 1) {
      const profile = await FitnessProfile.findOne({ userId: req.user._id });
      if (profile) return res.json({ profile });
    }

    const profile = memoryProfiles.get(userId) || null;
    res.json({ profile });
  } catch (error) {
    console.error("Error fetching fitness profile:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// Create/Update profile
router.post("/", async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const {
      age,
      gender,
      heightCm,
      weightKg,
      fitnessGoal,
      activityLevel,
      workoutExperience,
      workoutLocation,
      availableEquipment,
      workoutDaysPerWeek,
      dietaryPreference,
      dietaryRestrictions,
      allergies,
    } = req.body;

    if (!age || !gender || !heightCm || !weightKg || !fitnessGoal || !activityLevel) {
      return res.status(400).json({ message: "Missing required body metrics or fitness goal" });
    }

    const calculated = calculateFitnessMetrics({
      age: Number(age),
      gender,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      fitnessGoal,
      activityLevel,
    });

    const profileData = {
      userId: req.user._id,
      age: Number(age),
      gender,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      fitnessGoal,
      activityLevel,
      workoutExperience: workoutExperience || "beginner",
      workoutLocation: workoutLocation || "gym",
      availableEquipment: availableEquipment || ["dumbbells", "bodyweight"],
      workoutDaysPerWeek: Number(workoutDaysPerWeek) || 4,
      dietaryPreference: dietaryPreference || "anything",
      dietaryRestrictions: dietaryRestrictions || [],
      allergies: allergies || [],
      ...calculated,
    };

    if (mongoose.connection.readyState === 1) {
      try {
        const profile = await FitnessProfile.findOneAndUpdate(
          { userId: req.user._id },
          profileData,
          { new: true, upsert: true }
        );
        memoryProfiles.set(userId, profile);
        return res.json({ profile, metrics: calculated });
      } catch (err) {
        console.warn("Mongo profile save failed, using memory store fallback:", err.message);
      }
    }

    memoryProfiles.set(userId, profileData);
    res.json({ profile: profileData, metrics: calculated });
  } catch (error) {
    console.error("Error saving fitness profile:", error);
    res.status(500).json({ message: "Failed to save profile" });
  }
});

export default router;
