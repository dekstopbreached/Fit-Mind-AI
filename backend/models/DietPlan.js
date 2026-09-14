import mongoose from "mongoose";

const mealSchema = new mongoose.Schema({
  mealType: { type: String, required: true }, // Breakfast, Lunch, Snack, Dinner
  name: { type: String, required: true },
  calories: { type: Number, required: true },
  proteinGrams: { type: Number, default: 0 },
  carbsGrams: { type: Number, default: 0 },
  fatsGrams: { type: Number, default: 0 },
  description: { type: String, default: "" },
  alternatives: [{ type: String }],
});

const dietPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    targetCalories: { type: Number, required: true },
    targetProteinGrams: { type: Number, required: true },
    targetCarbsGrams: { type: Number, default: 0 },
    targetFatsGrams: { type: Number, default: 0 },
    meals: [mealSchema],
    adaptationNotes: { type: String, default: "Initial personalized AI nutrition plan generated." },
  },
  { timestamps: true }
);

export default mongoose.model("DietPlan", dietPlanSchema);
