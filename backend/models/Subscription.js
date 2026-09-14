import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    tier: { type: String, enum: ["free", "premium"], default: "free" },
    status: { type: String, enum: ["active", "cancelled", "expired"], default: "active" },
    source: { type: String, enum: ["payment_request", "admin_grant"], default: "payment_request" },
    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);
