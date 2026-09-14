import mongoose from "mongoose";

const paymentRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    screenshotUrl: { type: String },
    utrId: { type: String, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 1 },
    reason: { type: String, trim: true, maxlength: 500 },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

paymentRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });

export default mongoose.model("PaymentRequest", paymentRequestSchema);