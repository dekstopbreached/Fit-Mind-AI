import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    avatar: { type: String },
    morningMotivation: { type: Boolean, default: true },
    // isAdmin kept for backward compatibility with existing middleware/routes.
    // role mirrors it and is the forward-looking field.
    isAdmin: { type: Boolean, default: false },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    // Denormalized cache of the Subscription document for fast /auth/me reads.
    // The Subscription collection remains authoritative; these are synced on
    // approve/grant/revoke/expiry events.
    subscriptionTier: { type: String, enum: ["free", "premium"], default: "free" },
    subscriptionExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
