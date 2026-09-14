import mongoose from "mongoose";

const habitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "General" },
    frequency: { type: String, default: "daily" },
    targetDays: { type: Number, default: 7 },
    scheduledDays: { type: [Number], default: undefined },
    color: { type: String, default: "#6366f1" },
    icon: { type: String, default: "🎯" },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Habit", habitSchema);
