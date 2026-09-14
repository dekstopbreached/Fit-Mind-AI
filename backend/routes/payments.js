import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import authenticate from "../middleware/auth.js";
import { validate, f } from "../middleware/validate.js";
import { paymentLimiter } from "../middleware/rateLimit.js";
import { ApiError, asyncHandler } from "../middleware/errorHandler.js";
import { config } from "../config/env.js";
import PaymentRequest from "../models/PaymentRequest.js";
import { getEntitlement } from "../utils/dataStore.js";

const router = express.Router();
const uploadRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../uploads");
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadRoot,
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => callback(null, /^image\/(png|jpeg|webp)$/.test(file.mimetype)),
});

const publicPaymentConfig = {
  amountINR: config.manualPayment.amountINR,
  currency: "INR",
  periodDays: config.manualPayment.periodDays,
  qrImageUrl: config.manualPayment.qrImageUrl,
  paymentHandle: config.manualPayment.paymentHandle,
};

router.post(
  "/requests",
  authenticate,
  paymentLimiter,
  upload.single("screenshot"),
  validate({ body: { utrId: f.string({ max: 120, optional: true }) } }),
  asyncHandler(async (req, res) => {
    const existing = await PaymentRequest.findOne({ userId: req.user._id, status: "pending" }).lean();
    if (existing) throw ApiError.conflict("You already have a payment under review", "PAYMENT_REQUEST_PENDING");

    const paymentRequest = await PaymentRequest.create({
      userId: req.user._id,
      utrId: req.body.utrId,
      amount: config.manualPayment.amountINR,
      screenshotUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
    });
    res.status(201).json({ paymentRequest, message: "Payment under review" });
  })
);

router.get(
  "/status",
  authenticate,
  asyncHandler(async (req, res) => {
    const { subscription, isPremium, expired } = await getEntitlement(req.user._id);
    const paymentRequest = await PaymentRequest.findOne({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ isPremium, expired, subscription, paymentRequest, pricing: publicPaymentConfig });
  })
);

export default router;
