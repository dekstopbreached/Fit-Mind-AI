import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, default: "" },
    meta: { type: Object, default: {} },
    provider: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
