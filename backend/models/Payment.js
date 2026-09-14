import mongoose from "mongoose";

/** Legacy payment model retained for existing records; new payments use PaymentRequest. */
const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "paid", "failed", "refunded"], default: "created", index: true },
  },
  { timestamps: true }
);

// Backs the payment-history query.
paymentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Payment", paymentSchema);
