import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Activity,
  Target,
  Dumbbell,
  Utensils,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Flame,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import api from "../api/axios.js";

const STEPS = [
  { id: 1, title: "Personal Info", icon: User },
  { id: 2, title: "Body Metrics", icon: Activity },
  { id: 3, title: "Fitness Goal", icon: Target },
  { id: 4, title: "Activity Level", icon: Flame },
  { id: 5, title: "Nutrition", icon: Utensils },
  { id: 6, title: "Equipment & Days", icon: Dumbbell },
];

const GOALS = [
  { id: "Weight Loss", label: "Weight Loss", desc: "Burn fat & maintain lean muscle mass", icon: "🔥" },
  { id: "Muscle Gain", label: "Muscle Gain", desc: "Hypertrophy & build strength", icon: "💪" },
  { id: "Strength", label: "Maximum Strength", desc: "Heavy compound lift progression", icon: "🏋️" },
  { id: "Endurance", label: "Stamina & Cardio", desc: "Improve cardiovascular endurance", icon: "🏃" },
  { id: "General Fitness", label: "General Fitness", desc: "Overall health, mobility & energy", icon: "⚡" },
];

const ACTIVITIES = [
  { id: "sedentary", label: "Sedentary", desc: "Desk job, little to no exercise" },
  { id: "lightly_active", label: "Lightly Active", desc: "Light exercise 1-3 days/week" },
  { id: "moderately_active", label: "Moderately Active", desc: "Moderate exercise 3-5 days/week" },
  { id: "very_active", label: "Very Active", desc: "Hard exercise 6-7 days/week" },
  { id: "extra_active", label: "Extra Active", desc: "Physical job or intense daily training" },
];

const EQUIPMENT_OPTIONS = ["Dumbbells", "Barbell", "Bodyweight", "Resistance Bands", "Cables", "Kettlebells", "Pull-up Bar"];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    age: 25,
    gender: "male",
    heightCm: 175,
    weightKg: 70,
    fitnessGoal: "Muscle Gain",
    activityLevel: "moderately_active",
    workoutExperience: "intermediate",
    workoutLocation: "gym",
    availableEquipment: ["Dumbbells", "Barbell", "Bodyweight"],
    workoutDaysPerWeek: 4,
    dietaryPreference: "anything",
    dietaryRestrictions: "",
    allergies: "",
  });

  // Calculate preview live metrics
  const calculatePreview = () => {
    const { age, gender, heightCm, weightKg, fitnessGoal, activityLevel } = formData;
    const heightM = heightCm / 100;
    const bmi = (weightKg / (heightM * heightM)).toFixed(1);

    let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
    if (gender === "male") bmr += 5;
    else if (gender === "female") bmr -= 161;

    const multMap = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extra_active: 1.9 };
    const tdee = Math.round(bmr * (multMap[activityLevel] || 1.375));

    let targetCalories = tdee;
    if (fitnessGoal === "Weight Loss") targetCalories = tdee - 500;
    else if (fitnessGoal === "Muscle Gain") targetCalories = tdee + 300;
    else if (fitnessGoal === "Strength") targetCalories = tdee + 200;

    const targetProtein = Math.round(weightKg * (fitnessGoal === "Muscle Gain" ? 2.0 : 1.8));

    return { bmi, bmr: Math.round(bmr), tdee, targetCalories, targetProtein };
  };

  const preview = calculatePreview();

  const handleNext = () => {
    if (step < 6) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleEquipment = (item) => {
    setFormData((prev) => {
      const exists = prev.availableEquipment.includes(item);
      return {
        ...prev,
        availableEquipment: exists
          ? prev.availableEquipment.filter((e) => e !== item)
          : [...prev.availableEquipment, item],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      setGenerating("Saving body metrics & fitness profile...");
      await api.post("/profile", {
        ...formData,
        dietaryRestrictions: formData.dietaryRestrictions
          ? formData.dietaryRestrictions.split(",").map((s) => s.trim())
          : [],
        allergies: formData.allergies ? formData.allergies.split(",").map((s) => s.trim()) : [],
      });

      setGenerating("Generating personalized AI Workout Plan...");
      await api.post("/ai/workout");

      setGenerating("Generating personalized AI Nutrition & Diet Plan...");
      await api.post("/ai/diet");

      setGenerating("Finalizing your FitMind AI dashboard...");
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (err) {
      console.error("Onboarding submission error:", err);
      setError(err.response?.data?.message || "Failed to initialize AI plans. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] py-10 px-4 flex flex-col justify-center items-center">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles size={14} />
            FitMind AI Onboarding Assessment
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Let's Personalize Your AI Fitness Coach
          </h1>
          <p className="text-muted mt-2 text-sm max-w-lg mx-auto">
            Provide your metrics so our AI engine can calculate exact energy requirements and build your baseline training split.
          </p>
        </div>

        {/* Progress Bar & Steps */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-6 gap-2">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isDone = s.id < step;
              return (
                <button
                  key={s.id}
                  onClick={() => s.id < step && setStep(s.id)}
                  disabled={s.id > step}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl transition text-xs font-medium ${
                    isActive
                      ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                      : isDone
                      ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                      : "text-muted opacity-50"
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              );
            })}
          </div>
          <div className="w-full bg-[var(--surface-border)] h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-brand-500 h-full transition-all duration-300"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Container */}
        <div className="card p-6 md:p-8 relative overflow-hidden shadow-xl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="font-semibold text-lg">{generating}</div>
              <p className="text-sm text-muted">FitMind AI is assembling your multi-day workout split & macro targets...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* STEP 1: Personal Info */}
              {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-xl font-bold">Step 1: Personal Information</h2>
                    <p className="text-sm text-muted mt-1">Select your age and gender for metabolic calculations.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Age (years)</label>
                      <input
                        type="number"
                        min="14"
                        max="90"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                        className="input w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Gender</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["male", "female", "other"].map((g) => (
                          <button
                            type="button"
                            key={g}
                            onClick={() => setFormData({ ...formData, gender: g })}
                            className={`py-3 rounded-xl border text-sm font-medium capitalize transition ${
                              formData.gender === g
                                ? "bg-brand-500 text-white border-brand-500 shadow-md"
                                : "border-[var(--surface-border)] hover:bg-brand-500/5"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Body Metrics */}
              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-xl font-bold">Step 2: Body Metrics</h2>
                    <p className="text-sm text-muted mt-1">Enter your current height and weight.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Height (cm)</label>
                      <input
                        type="number"
                        min="100"
                        max="250"
                        value={formData.heightCm}
                        onChange={(e) => setFormData({ ...formData, heightCm: Number(e.target.value) })}
                        className="input w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Weight (kg)</label>
                      <input
                        type="number"
                        min="30"
                        max="250"
                        step="0.5"
                        value={formData.weightKg}
                        onChange={(e) => setFormData({ ...formData, weightKg: Number(e.target.value) })}
                        className="input w-full"
                        required
                      />
                    </div>
                  </div>

                  {/* Live Estimate Card */}
                  <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-xs text-muted">Est. BMI</div>
                      <div className="text-lg font-bold text-brand-600 dark:text-brand-300">{preview.bmi}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted">Est. BMR</div>
                      <div className="text-lg font-bold text-brand-600 dark:text-brand-300">{preview.bmr} kcal</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted">Est. TDEE</div>
                      <div className="text-lg font-bold text-brand-600 dark:text-brand-300">{preview.tdee} kcal</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted">Est. Target</div>
                      <div className="text-lg font-bold text-brand-600 dark:text-brand-300">{preview.targetCalories} kcal</div>
                    </div>
                  </div>
                  <p className="text-xs text-faint text-center">
                    Note: Metrics are baseline algorithmic estimations for program generation and not medical advice.
                  </p>
                </div>
              )}

              {/* STEP 3: Fitness Goal */}
              {step === 3 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-xl font-bold">Step 3: Primary Fitness Goal</h2>
                    <p className="text-sm text-muted mt-1">What is your main objective for the next 8-12 weeks?</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {GOALS.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => setFormData({ ...formData, fitnessGoal: g.id })}
                        className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                          formData.fitnessGoal === g.id
                            ? "bg-brand-500/10 border-brand-500 ring-2 ring-brand-500/30"
                            : "border-[var(--surface-border)] hover:bg-brand-500/5"
                        }`}
                      >
                        <span className="text-2xl">{g.icon}</span>
                        <div>
                          <div className="font-semibold text-sm">{g.label}</div>
                          <div className="text-xs text-muted mt-1">{g.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: Activity & Experience */}
              {step === 4 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-xl font-bold">Step 4: Activity Level & Experience</h2>
                    <p className="text-sm text-muted mt-1">Select your daily activity and training experience.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Daily Activity Level</label>
                    <div className="space-y-2">
                      {ACTIVITIES.map((a) => (
                        <div
                          key={a.id}
                          onClick={() => setFormData({ ...formData, activityLevel: a.id })}
                          className={`p-3 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                            formData.activityLevel === a.id
                              ? "bg-brand-500/10 border-brand-500"
                              : "border-[var(--surface-border)] hover:bg-brand-500/5"
                          }`}
                        >
                          <div>
                            <div className="font-medium text-sm">{a.label}</div>
                            <div className="text-xs text-muted">{a.desc}</div>
                          </div>
                          {formData.activityLevel === a.id && <CheckCircle2 size={18} className="text-brand-500" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Workout Experience</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["beginner", "intermediate", "advanced"].map((exp) => (
                        <button
                          type="button"
                          key={exp}
                          onClick={() => setFormData({ ...formData, workoutExperience: exp })}
                          className={`py-2.5 rounded-xl border text-sm font-medium capitalize transition ${
                            formData.workoutExperience === exp
                              ? "bg-brand-500 text-white border-brand-500 shadow-md"
                              : "border-[var(--surface-border)] hover:bg-brand-500/5"
                          }`}
                        >
                          {exp}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Nutrition */}
              {step === 5 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-xl font-bold">Step 5: Nutrition & Dietary Preferences</h2>
                    <p className="text-sm text-muted mt-1">Configure diet structure and restriction preferences.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Dietary Preference</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {["anything", "vegetarian", "vegan", "keto", "paleo", "high_protein"].map((pref) => (
                        <button
                          type="button"
                          key={pref}
                          onClick={() => setFormData({ ...formData, dietaryPreference: pref })}
                          className={`py-2.5 rounded-xl border text-sm font-medium capitalize transition ${
                            formData.dietaryPreference === pref
                              ? "bg-brand-500 text-white border-brand-500 shadow-md"
                              : "border-[var(--surface-border)] hover:bg-brand-500/5"
                          }`}
                        >
                          {pref.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Dietary Restrictions (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Gluten-free, Lactose-intolerant"
                        value={formData.dietaryRestrictions}
                        onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                        className="input w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Allergies (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Nuts, Shellfish"
                        value={formData.allergies}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                        className="input w-full text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: Equipment & Availability */}
              {step === 6 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-xl font-bold">Step 6: Workout Location & Equipment</h2>
                    <p className="text-sm text-muted mt-1">Where will you train and what equipment do you have access to?</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Primary Location</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["gym", "home", "outdoor"].map((loc) => (
                          <button
                            type="button"
                            key={loc}
                            onClick={() => setFormData({ ...formData, workoutLocation: loc })}
                            className={`py-2.5 rounded-xl border text-sm font-medium capitalize transition ${
                              formData.workoutLocation === loc
                                ? "bg-brand-500 text-white border-brand-500 shadow-md"
                                : "border-[var(--surface-border)] hover:bg-brand-500/5"
                            }`}
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Available Training Days/Week</label>
                      <div className="flex items-center gap-2">
                        {[3, 4, 5, 6].map((days) => (
                          <button
                            type="button"
                            key={days}
                            onClick={() => setFormData({ ...formData, workoutDaysPerWeek: days })}
                            className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition ${
                              formData.workoutDaysPerWeek === days
                                ? "bg-brand-500 text-white border-brand-500 shadow-md"
                                : "border-[var(--surface-border)] hover:bg-brand-500/5"
                            }`}
                          >
                            {days} Days
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Available Equipment (select all that apply)</label>
                    <div className="flex flex-wrap gap-2">
                      {EQUIPMENT_OPTIONS.map((item) => {
                        const selected = formData.availableEquipment.includes(item);
                        return (
                          <button
                            type="button"
                            key={item}
                            onClick={() => toggleEquipment(item)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${
                              selected
                                ? "bg-brand-500 text-white border-brand-500 shadow"
                                : "border-[var(--surface-border)] text-muted hover:bg-brand-500/5"
                            }`}
                          >
                            {selected ? "✓ " : "+ "} {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="mt-8 pt-6 border-t border-[var(--surface-border)] flex items-center justify-between">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="btn-secondary px-5 py-2.5 text-sm flex items-center gap-1"
                  >
                    <ChevronLeft size={16} />
                    Back
                  </button>
                ) : <div />}

                {step < 6 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn-primary px-6 py-2.5 text-sm flex items-center gap-1"
                  >
                    Next Step
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn-primary px-8 py-3 text-base flex items-center gap-2 shadow-lg shadow-brand-500/30"
                  >
                    <Zap size={18} />
                    Create My AI Plan
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
