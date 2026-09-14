import mongoose from "mongoose";

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sets: { type: Number, required: true, default: 3 },
  reps: { type: String, required: true, default: "10-12" },
  restSeconds: { type: Number, default: 60 },
  notes: { type: String, default: "" },
});

const dayScheduleSchema = new mongoose.Schema({
  day: { type: String, required: true }, // e.g. "Monday", "Day 1"
  focus: { type: String, required: true }, // e.g. "Chest & Triceps"
  isRestDay: { type: Boolean, default: false },
  exercises: [exerciseSchema],
});

const workoutPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    goal: { type: String, required: true },
    weeklySchedule: [dayScheduleSchema],
    adaptationNotes: { type: String, default: "Initial personalized AI plan generated." },
  },
  { timestamps: true }
);

export default mongoose.model("WorkoutPlan", workoutPlanSchema);
