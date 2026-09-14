import mongoose from "mongoose";

const progressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // Format YYYY-MM-DD
    weightKg: { type: Number },
    workoutCompleted: { type: Boolean, default: false },
    completionPercentage: { type: Number, default: 0 },
    exerciseLogs: [
      {
        name: { type: String },
        setsCompleted: { type: Number },
        weightUsedKg: { type: Number },
        difficulty: { type: String, enum: ["easy", "moderate", "hard", "failed"] },
      },
    ],
    notes: { type: String, default: "" },
    energyLevel: { type: Number, min: 1, max: 5, default: 3 },
  },
  { timestamps: true }
);

progressSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model("Progress", progressSchema);
