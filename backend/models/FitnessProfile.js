import mongoose from "mongoose";

const fitnessProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    heightCm: { type: Number, required: true },
    weightKg: { type: Number, required: true },
    fitnessGoal: {
      type: String,
      enum: ["Weight Loss", "Muscle Gain", "Strength", "Endurance", "General Fitness"],
      required: true,
    },
    activityLevel: {
      type: String,
      enum: ["sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"],
      required: true,
    },
    workoutExperience: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    workoutLocation: {
      type: String,
      enum: ["gym", "home", "outdoor"],
      default: "gym",
    },
    availableEquipment: [{ type: String }],
    workoutDaysPerWeek: { type: Number, default: 4 },
    dietaryPreference: {
      type: String,
      enum: ["anything", "vegetarian", "vegan", "keto", "paleo", "high_protein"],
      default: "anything",
    },
    dietaryRestrictions: [{ type: String }],
    allergies: [{ type: String }],
    bmi: { type: Number },
    bmr: { type: Number },
    tdee: { type: Number },
    targetCalories: { type: Number },
    targetProteinGrams: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model("FitnessProfile", fitnessProfileSchema);
