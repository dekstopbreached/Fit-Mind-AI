import express from "express";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import { OpenAI } from "openai";
import authMiddleware from "../middleware/auth.js";
import requirePremium, { requirePremiumForRegeneration } from "../middleware/requirePremium.js";
import Message from "../models/Message.js";
import {
  getProfile,
  getActiveWorkoutPlan,
  saveWorkoutPlan,
  getActiveDietPlan,
  saveDietPlan,
  getProgressLogs,
  getUserSubscription,
} from "../utils/dataStore.js";

const router = express.Router();
const configuredProvider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
const geminiApiKey = process.env.GEMINI_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

const provider =
  configuredProvider === "openai" && openaiApiKey
    ? "openai"
    : geminiApiKey
      ? "gemini"
      : configuredProvider === "openai"
        ? "openai"
        : "gemini";

const openAIClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
const geminiClient = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// Public status check
router.get("/status", (req, res) => {
  try {
    res.json({
      provider,
      configuredProvider,
      hasOpenAI: !!openaiApiKey,
      hasGemini: !!geminiApiKey,
      openaiModel,
      geminiModel,
    });
  } catch (e) {
    res.status(500).json({ error: "Could not read AI status" });
  }
});

const buildPrompt = (content, user) =>
  `You are FitMind AI, an elite adaptive fitness and performance coach.\nUser: ${user?.name || "User"} (${user?.email || "unknown"})\n${content}\nProvide structured, science-backed, encouraging guidance. Avoid claiming to be a medical doctor.`;

const parseOpenAIResponse = (response) => {
  if (!response?.choices) return "";
  return response.choices[0]?.message?.content || "";
};

const parseGeminiResponse = (response) => {
  if (!response) return "";
  return (
    response.text ||
    response.candidates
      ?.flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || "")
      .join("") ||
    ""
  );
};

const callOpenAI = async (prompt) => {
  if (!openaiApiKey) throw new Error("OpenAI API key is missing");
  const response = await openAIClient.chat.completions.create({
    model: openaiModel || "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices?.[0]?.message?.content || "";
};

const callGemini = async (prompt) => {
  if (!geminiApiKey) throw new Error("Gemini API key is missing");
  const response = await geminiClient.models.generateContent({
    model: geminiModel,
    contents: prompt,
  });
  return parseGeminiResponse(response);
};

const generateText = async (prompt) => {
  const primaryProvider = provider;
  const fallbackProvider = provider === "openai" ? "gemini" : "openai";

  const tryProvider = async (prov) => {
    if (prov === "openai") return callOpenAI(prompt);
    return callGemini(prompt);
  };

  try {
    return await tryProvider(primaryProvider);
  } catch (primaryError) {
    console.error(`Primary AI provider '${primaryProvider}' failed:`, primaryError);
    if ((fallbackProvider === "openai" && openaiApiKey) || (fallbackProvider === "gemini" && geminiApiKey)) {
      try {
        return await tryProvider(fallbackProvider);
      } catch (fallbackError) {
        console.error(`Fallback AI provider '${fallbackProvider}' also failed:`, fallbackError);
        throw fallbackError;
      }
    }
    throw primaryError;
  }
};

const cleanAndParseJSON = (rawText) => {
  if (!rawText) return null;
  let cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch (e) {
        console.error("Failed substring JSON parse:", e);
      }
    }
    console.error("JSON parsing error on AI output:", err);
    return null;
  }
};

router.use(authMiddleware);

/*
 * Entitlement map — the paywall the pricing page actually sells.
 *
 * `requirePremium` was imported here but never applied to a single route, so
 * every "Premium" AI feature was free and the upgrade bought nothing.
 *
 *   free      : first workout/diet generation, plan history, morning motivation
 *   premium   : regeneration, progress analysis, adaptive re-planning
 */

// --- 1. AI WORKOUT GENERATION (first plan free, regeneration is Premium) ---
router.post("/workout", requirePremiumForRegeneration("workout"), async (req, res) => {
  try {
    const profile = await getProfile(req.user._id);
    if (!profile) {
      return res.status(400).json({ message: "Please complete your fitness onboarding profile first." });
    }

    const prompt = `
Generate a structured, personalized weekly workout plan for a user with the following profile:
- Goal: ${profile.fitnessGoal}
- Experience: ${profile.workoutExperience}
- Available Days/Week: ${profile.workoutDaysPerWeek}
- Location: ${profile.workoutLocation}
- Equipment Available: ${Array.isArray(profile.availableEquipment) ? profile.availableEquipment.join(", ") : "Bodyweight"}
- Height: ${profile.heightCm} cm, Weight: ${profile.weightKg} kg, Age: ${profile.age}

RETURN ONLY VALID JSON. Do not include markdown or extra text outside JSON.
Root Object Structure:
{
  "goal": "${profile.fitnessGoal}",
  "weeklySchedule": [
    {
      "day": "Monday",
      "focus": "Chest & Triceps",
      "isRestDay": false,
      "exercises": [
        {
          "name": "Push-ups or Barbell Press",
          "sets": 3,
          "reps": "10-12",
          "restSeconds": 60,
          "notes": "Keep core tight."
        }
      ]
    }
  ]
}
Include all 7 days of the week (Monday through Sunday) in weeklySchedule. Mark appropriate non-training days with isRestDay: true and empty exercises array.
`;

    let raw = "";
    try {
      raw = await generateText(buildPrompt(prompt, req.user));
    } catch (e) {
      console.warn("AI service call failed, generating fallback workout plan:", e);
    }

    let parsed = cleanAndParseJSON(raw);

    if (!parsed || !Array.isArray(parsed.weeklySchedule) || parsed.weeklySchedule.length === 0) {
      const isGym = profile.workoutLocation === "gym";
      parsed = {
        goal: profile.fitnessGoal,
        weeklySchedule: [
          {
            day: "Monday",
            focus: "Upper Body Push",
            isRestDay: false,
            exercises: [
              { name: isGym ? "Bench Press" : "Push-ups", sets: 3, reps: "10-12", restSeconds: 60, notes: "Control the tempo" },
              { name: isGym ? "Overhead Shoulder Press" : "Pike Push-ups", sets: 3, reps: "10-12", restSeconds: 60, notes: "Keep shoulders active" },
              { name: isGym ? "Tricep Pushdowns" : "Bench Dips", sets: 3, reps: "12-15", restSeconds: 45, notes: "Full lock out" },
            ],
          },
          {
            day: "Tuesday",
            focus: "Lower Body & Core",
            isRestDay: false,
            exercises: [
              { name: isGym ? "Barbell Squats" : "Bodyweight Squats", sets: 4, reps: "12-15", restSeconds: 75, notes: "Depth below parallel" },
              { name: isGym ? "Romanian Deadlifts" : "Glute Bridges", sets: 3, reps: "10-12", restSeconds: 60, notes: "Hinge at hips" },
              { name: "Plank Hold", sets: 3, reps: "45 sec", restSeconds: 45, notes: "Brace abdominal wall" },
            ],
          },
          { day: "Wednesday", focus: "Rest & Active Recovery", isRestDay: true, exercises: [] },
          {
            day: "Thursday",
            focus: "Upper Body Pull",
            isRestDay: false,
            exercises: [
              { name: isGym ? "Lat Pulldowns" : "Inverted Rows / Band Pulls", sets: 4, reps: "10-12", restSeconds: 60, notes: "Squeeze shoulder blades" },
              { name: isGym ? "Dumbbell Rows" : "Single Arm Rows", sets: 3, reps: "10-12", restSeconds: 60, notes: "Keep torso steady" },
              { name: "Bicep Curls", sets: 3, reps: "12-15", restSeconds: 45, notes: "Strict form" },
            ],
          },
          {
            day: "Friday",
            focus: "Full Body Conditioning",
            isRestDay: false,
            exercises: [
              { name: "Dumbbell/Kettlebell Swings", sets: 3, reps: "15-20", restSeconds: 45, notes: "Explosive hip drive" },
              { name: "Walking Lunges", sets: 3, reps: "12 per leg", restSeconds: 60, notes: "Upright chest" },
              { name: "Mountain Climbers", sets: 3, reps: "30 sec", restSeconds: 30, notes: "Fast feet" },
            ],
          },
          { day: "Saturday", focus: "Rest & Mobility", isRestDay: true, exercises: [] },
          { day: "Sunday", focus: "Rest & Recovery", isRestDay: true, exercises: [] },
        ],
      };
    }

    const newPlan = await saveWorkoutPlan(req.user._id, {
      version: 1,
      goal: profile.fitnessGoal,
      weeklySchedule: parsed.weeklySchedule,
      adaptationNotes: "Initial AI personalized workout plan generated based on body metrics and equipment.",
    });

    res.json({ plan: newPlan });
  } catch (error) {
    console.error("Error generating workout plan:", error);
    res.status(500).json({ message: "Failed to generate AI workout plan: " + error.message });
  }
});

// --- 2. AI DIET GENERATION (first plan free, regeneration is Premium) ---
router.post("/diet", requirePremiumForRegeneration("diet"), async (req, res) => {
  try {
    const profile = await getProfile(req.user._id);
    if (!profile) {
      return res.status(400).json({ message: "Please complete your fitness onboarding profile first." });
    }

    const prompt = `
Generate a personalized daily nutrition plan for a user with:
- Calorie Target: ${profile.targetCalories} kcal
- Protein Target: ${profile.targetProteinGrams} g
- Goal: ${profile.fitnessGoal}
- Dietary Preference: ${profile.dietaryPreference}
- Dietary Restrictions: ${Array.isArray(profile.dietaryRestrictions) ? profile.dietaryRestrictions.join(", ") : "None"}
- Allergies: ${Array.isArray(profile.allergies) ? profile.allergies.join(", ") : "None"}

RETURN ONLY VALID JSON. Do not include markdown or extra text outside JSON.
Root Object Structure:
{
  "targetCalories": ${profile.targetCalories},
  "targetProteinGrams": ${profile.targetProteinGrams},
  "targetCarbsGrams": ${Math.round((profile.targetCalories * 0.45) / 4)},
  "targetFatsGrams": ${Math.round((profile.targetCalories * 0.25) / 9)},
  "meals": [
    {
      "mealType": "Breakfast",
      "name": "High-Protein Oatmeal Bowl",
      "calories": 450,
      "proteinGrams": 30,
      "carbsGrams": 55,
      "fatsGrams": 10,
      "description": "Oats cooked with whey protein powder, chia seeds, and sliced banana.",
      "alternatives": ["Greek Yogurt parfait with berries & almonds"]
    },
    {
      "mealType": "Lunch",
      "name": "Grilled Chicken & Quinoa Salad",
      "calories": 600,
      "proteinGrams": 45,
      "carbsGrams": 60,
      "fatsGrams": 15,
      "description": "150g grilled chicken breast, 1 cup cooked quinoa, mixed greens, olive oil dressing.",
      "alternatives": ["Tofu/Paneer Quinoa Bowl"]
    },
    {
      "mealType": "Snack",
      "name": "Whey Shake & Apple",
      "calories": 250,
      "proteinGrams": 25,
      "carbsGrams": 30,
      "fatsGrams": 3,
      "description": "1 scoop protein powder shaken in water/almond milk with 1 fresh apple.",
      "alternatives": ["Boiled eggs & rice cakes"]
    },
    {
      "mealType": "Dinner",
      "name": "Baked Salmon / Tofu with Sweet Potato",
      "calories": 550,
      "proteinGrams": 40,
      "carbsGrams": 50,
      "fatsGrams": 18,
      "description": "150g salmon or seasoned tofu, baked sweet potato, steamed broccoli.",
      "alternatives": ["Lean turkey breast or Paneer stir fry"]
    }
  ]
}
`;

    let raw = "";
    try {
      raw = await generateText(buildPrompt(prompt, req.user));
    } catch (e) {
      console.warn("AI service call failed, generating fallback diet plan:", e);
    }

    let parsed = cleanAndParseJSON(raw);

    if (!parsed || !Array.isArray(parsed.meals) || parsed.meals.length === 0) {
      const isVeg = profile.dietaryPreference === "vegetarian" || profile.dietaryPreference === "vegan";
      parsed = {
        targetCalories: profile.targetCalories,
        targetProteinGrams: profile.targetProteinGrams,
        targetCarbsGrams: Math.round((profile.targetCalories * 0.45) / 4),
        targetFatsGrams: Math.round((profile.targetCalories * 0.25) / 9),
        meals: [
          {
            mealType: "Breakfast",
            name: isVeg ? "Oatmeal with Plant Protein & Nuts" : "Eggs & Whole Wheat Toast",
            calories: Math.round(profile.targetCalories * 0.25),
            proteinGrams: Math.round(profile.targetProteinGrams * 0.25),
            carbsGrams: 45,
            fatsGrams: 12,
            description: "Nutritious start with complex carbs and quality protein.",
            alternatives: ["Greek Yogurt Parfait"],
          },
          {
            mealType: "Lunch",
            name: isVeg ? "Paneer/Tofu Brown Rice Bowl" : "Grilled Chicken & Brown Rice",
            calories: Math.round(profile.targetCalories * 0.35),
            proteinGrams: Math.round(profile.targetProteinGrams * 0.35),
            carbsGrams: 65,
            fatsGrams: 15,
            description: "Balanced meal with lean protein, fiber, and healthy fats.",
            alternatives: ["Lentil Dal with Quinoa"],
          },
          {
            mealType: "Snack",
            name: "Protein Shake & Whole Fruit",
            calories: Math.round(profile.targetCalories * 0.15),
            proteinGrams: Math.round(profile.targetProteinGrams * 0.15),
            carbsGrams: 25,
            fatsGrams: 4,
            description: "Mid-day recovery boost.",
            alternatives: ["Handful of almonds & boiled egg"],
          },
          {
            mealType: "Dinner",
            name: isVeg ? "Chickpea & Vegetable Curry with Chapati" : "Lean Fish / Chicken Stir-fry",
            calories: Math.round(profile.targetCalories * 0.25),
            proteinGrams: Math.round(profile.targetProteinGrams * 0.25),
            carbsGrams: 40,
            fatsGrams: 14,
            description: "Light evening meal to support overnight muscle repair.",
            alternatives: ["Tofu stir-fry with steamed greens"],
          },
        ],
      };
    }

    const newPlan = await saveDietPlan(req.user._id, {
      version: 1,
      targetCalories: parsed.targetCalories || profile.targetCalories,
      targetProteinGrams: parsed.targetProteinGrams || profile.targetProteinGrams,
      targetCarbsGrams: parsed.targetCarbsGrams || 200,
      targetFatsGrams: parsed.targetFatsGrams || 60,
      meals: parsed.meals,
      adaptationNotes: "Initial AI personalized nutrition plan generated based on caloric & macro requirements.",
    });

    res.json({ plan: newPlan });
  } catch (error) {
    console.error("Error generating diet plan:", error);
    res.status(500).json({ message: "Failed to generate AI diet plan: " + error.message });
  }
});

// --- 3. AI PROGRESS ANALYSIS (Premium) ---
router.post("/analyze-progress", requirePremium, async (req, res) => {
  try {
    const profile = await getProfile(req.user._id);
    const workoutPlan = await getActiveWorkoutPlan(req.user._id);
    const recentLogs = await getProgressLogs(req.user._id, 14);

    const totalLogs = recentLogs.length;
    const completedWorkouts = recentLogs.filter((l) => l.workoutCompleted).length;
    const consistencyPct = totalLogs > 0 ? Math.round((completedWorkouts / totalLogs) * 100) : 0;

    const weights = recentLogs.filter((l) => l.weightKg).map((l) => l.weightKg);
    const weightTrend = weights.length >= 2
      ? weights[0] < weights[weights.length - 1] ? "losing weight" : weights[0] > weights[weights.length - 1] ? "gaining weight" : "stable weight"
      : "insufficient data";

    const prompt = `
Analyze the user's progress for their fitness plan:
- Goal: ${profile?.fitnessGoal || "General Fitness"}
- Plan Version: ${workoutPlan?.version || 1}
- 14-Day Logged Days: ${totalLogs}
- Workout Completion Consistency: ${consistencyPct}%
- Weight Trend: ${weightTrend}
- User Notes: ${recentLogs.map((l) => l.notes).filter(Boolean).join("; ") || "None"}

Provide a concise, encouraging 3-bullet insight summary explaining:
1. Consistency & Momentum analysis
2. Progression & Recovery assessment
3. Strategic adjustment recommendation
`;

    let insightText = "";
    try {
      insightText = await generateText(buildPrompt(prompt, req.user));
    } catch (e) {
      insightText = `Great job logging your workouts! Your consistency over the past period is ${consistencyPct}%. Keep pushing progressive overload while protecting your recovery.`;
    }

    res.json({
      consistencyPct,
      completedWorkouts,
      totalLogs,
      weightTrend,
      currentVersion: workoutPlan?.version || 1,
      insight: insightText,
      needsPlanAdaptation: consistencyPct >= 60 || totalLogs >= 7,
    });
  } catch (error) {
    console.error("Error analyzing progress:", error);
    res.status(500).json({ message: "Failed to analyze progress" });
  }
});

// --- 4. THE ADAPTIVE AI ENGINE (VERSIONED PLAN UPDATE v1 -> v2) — Premium ---
router.post("/adapt-plan", requirePremium, async (req, res) => {
  try {
    const sub = await getUserSubscription(req.user._id);
    const isPremium = sub && sub.tier === "premium" && sub.status === "active";

    const currentWorkout = await getActiveWorkoutPlan(req.user._id);
    const currentDiet = await getActiveDietPlan(req.user._id);
    const currentVersion = currentWorkout?.version || 1;

    if (!isPremium && currentVersion >= 2) {
      return res.status(403).json({
        message: "Continuous AI Plan Adaptations require FitMind Premium.",
        code: "PREMIUM_REQUIRED",
        isPremium: false,
      });
    }

    const profile = await getProfile(req.user._id);
    const recentLogs = await getProgressLogs(req.user._id, 14);
    const completedWorkouts = recentLogs.filter((l) => l.workoutCompleted).length;
    const userFeedback = req.body.userFeedback || "Focus on progressive overload and slight volume increase.";

    const nextVersion = currentVersion + 1;

    const adaptPrompt = `
You are the FitMind AI Adaptive Engine updating a user's fitness plan from Version ${currentVersion} to Version ${nextVersion}.
- Goal: ${profile?.fitnessGoal || "Muscle Gain"}
- Recent 14-Day Workout Completion: ${completedWorkouts} sessions
- Adaptation Rationale/User Feedback: ${userFeedback}

Generate an adapted Version ${nextVersion} weekly workout plan that applies progressive overload (increased sets/reps or updated exercise variations) and adjusts nutrition macros appropriately.

RETURN ONLY VALID JSON.
Root Object Structure:
{
  "adaptationNotes": "Version ${nextVersion} Adaptation: Increased progressive overload on compound lifts by 1 set per exercise based on your ${completedWorkouts} completed sessions.",
  "weeklySchedule": [
    {
      "day": "Monday",
      "focus": "Upper Body Strength (v${nextVersion})",
      "isRestDay": false,
      "exercises": [
        { "name": "Barbell Bench Press", "sets": 4, "reps": "8-10", "restSeconds": 90, "notes": "Add 2.5kg if previous reps were easy" },
        { "name": "Incline Dumbbell Press", "sets": 3, "reps": "10-12", "restSeconds": 60, "notes": "Focus on stretch at bottom" }
      ]
    }
  ],
  "diet": {
    "targetCalories": ${(profile?.targetCalories || 2200) + 100},
    "targetProteinGrams": ${(profile?.targetProteinGrams || 150) + 5},
    "targetCarbsGrams": 240,
    "targetFatsGrams": 65,
    "meals": [
      {
        "mealType": "Breakfast",
        "name": "Power Oatmeal with Almond Butter",
        "calories": 500,
        "proteinGrams": 35,
        "carbsGrams": 60,
        "fatsGrams": 14,
        "description": "Adapted V${nextVersion} formula with extra complex carbs for training energy.",
        "alternatives": ["Egg white & avocado toast"]
      }
    ]
  }
}
Include all 7 days of the week in weeklySchedule.
`;

    let raw = "";
    try {
      raw = await generateText(buildPrompt(adaptPrompt, req.user));
    } catch (e) {
      console.warn("AI service call failed during plan adaptation:", e);
    }

    let parsed = cleanAndParseJSON(raw);

    const adaptationNotes = parsed?.adaptationNotes || `Version ${nextVersion} Adaptation: Updated progressive volume and caloric targets to prevent plateaus based on your recent training logs.`;

    let adaptedSchedule = parsed?.weeklySchedule;
    if (!Array.isArray(adaptedSchedule) || adaptedSchedule.length === 0) {
      adaptedSchedule = (currentWorkout?.weeklySchedule || []).map((day) => ({
        day: day.day,
        focus: day.isRestDay ? day.focus : `${day.focus} (Progression v${nextVersion})`,
        isRestDay: day.isRestDay,
        exercises: (day.exercises || []).map((ex) => ({
          name: ex.name,
          sets: Math.min(5, ex.sets + 1),
          reps: ex.reps,
          restSeconds: ex.restSeconds,
          notes: `V${nextVersion} Progression: Focus on progressive overload. ${ex.notes || ""}`,
        })),
      }));
    }

    const newWorkoutPlan = await saveWorkoutPlan(req.user._id, {
      version: nextVersion,
      goal: profile?.fitnessGoal || "General Fitness",
      weeklySchedule: adaptedSchedule,
      adaptationNotes,
    });

    const newDietPlan = await saveDietPlan(req.user._id, {
      version: nextVersion,
      targetCalories: parsed?.diet?.targetCalories || (profile?.targetCalories || 2200) + 100,
      targetProteinGrams: parsed?.diet?.targetProteinGrams || (profile?.targetProteinGrams || 150) + 5,
      targetCarbsGrams: parsed?.diet?.targetCarbsGrams || 240,
      targetFatsGrams: parsed?.diet?.targetFatsGrams || 65,
      meals: parsed?.diet?.meals || currentDiet?.meals || [],
      adaptationNotes,
    });

    res.json({
      success: true,
      message: `Plan successfully adapted to Version ${nextVersion}!`,
      version: nextVersion,
      workoutPlan: newWorkoutPlan,
      dietPlan: newDietPlan,
      adaptationNotes,
    });
  } catch (error) {
    console.error("Error adapting fitness plan:", error);
    res.status(500).json({ message: "Failed to adapt fitness plan: " + error.message });
  }
});

// --- 5. AI CHAT ASSISTANT ---
router.post("/chat", async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ message: "Question is required" });

  try {
    const profile = await getProfile(req.user._id);
    const workoutPlan = await getActiveWorkoutPlan(req.user._id);

    try {
      await Message.create({ userId: req.user._id, role: "user", content: question, provider });
    } catch (e) {}

    const contextPrompt = `
User Context:
- Fitness Goal: ${profile?.fitnessGoal || "General Fitness"}
- Weight: ${profile?.weightKg || "Unknown"} kg, Height: ${profile?.heightCm || "Unknown"} cm
- Active Workout Plan: Version ${workoutPlan?.version || 1}

User Question: ${question}

Provide a helpful, precise, non-medical coaching response.
`;

    let content;
    try {
      content = await generateText(buildPrompt(contextPrompt, req.user));
    } catch (providerError) {
      console.error("AI chat provider failed:", providerError);
      content = `I can still help with your current plan. You are following a Version ${workoutPlan?.version || 1} ${profile?.fitnessGoal || "fitness"} program. Try asking about exercise form, recovery, nutrition, or how to progress your next session.`;
    }

    const assistantContent =
      (typeof content === "string" && content.trim()) ||
      "FitMind AI could not generate a response.";
    try {
      await Message.create({ userId: req.user._id, role: "assistant", content: assistantContent, provider });
    } catch (e) {}

    res.json({ content: assistantContent, messageId: Date.now() });
  } catch (error) {
    console.error("AI chat error:", error);
    res.status(500).json({ message: "AI request failed: " + error.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const messages = await Message.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
      return res.json({ messages: messages.reverse() });
    }
    res.json({ messages: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load history" });
  }
});

router.get("/morning", async (req, res) => {
  try {
    const profile = await getProfile(req.user._id);
    const content = await generateText(
      buildPrompt(
        `Create a brief, high-energy 1-sentence morning motivation quote for a user targeting ${profile?.fitnessGoal || "fitness"}.`,
        req.user
      )
    );
    res.json({ content: content || "Good morning! Let's crush today's training." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "AI request failed", error: error?.message });
  }
});

export default router;
