import express from "express";
import authMiddleware from "../middleware/auth.js";
import DietPlan from "../models/DietPlan.js";

const router = express.Router();

router.use(authMiddleware);

// Get active diet plan for user (or specific version if requested)
router.get("/", async (req, res) => {
  try {
    const { version } = req.query;
    const query = { userId: req.user._id };
    if (version) query.version = Number(version);
    else query.isActive = true;

    const plan = await DietPlan.findOne(query).sort({ version: -1 });
    const allVersions = await DietPlan.find({ userId: req.user._id }).select("version createdAt adaptationNotes isActive targetCalories targetProteinGrams");

    res.json({ plan, history: allVersions });
  } catch (error) {
    console.error("Error fetching diet plan:", error);
    res.status(500).json({ message: "Failed to fetch diet plan" });
  }
});

export default router;
