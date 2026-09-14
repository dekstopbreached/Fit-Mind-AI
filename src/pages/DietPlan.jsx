import { useEffect, useState } from "react";
import {
  Utensils,
  Sparkles,
  RefreshCw,
  Flame,
  PieChart,
  CheckCircle2,
  History,
  Apple,
} from "lucide-react";
import api from "../api/axios.js";

export default function DietPlanPage() {
  const [plan, setPlan] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchDietPlan = async (version = null) => {
    setLoading(true);
    try {
      const url = version ? `/diet?version=${version}` : "/diet";
      const res = await api.get(url);
      setPlan(res.data.plan);
      setHistory(res.data.history || []);
    } catch (err) {
      console.error("Error fetching diet plan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDietPlan();
  }, []);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await api.post("/ai/diet");
      setPlan(res.data.plan);
      fetchDietPlan();
    } catch (err) {
      console.error("Error regenerating diet plan:", err);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted text-sm">Calculating macro ratios and loading your AI diet plan...</p>
      </div>
    );
  }

  if (!plan || !plan.meals) {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto my-12">
        <Utensils className="w-12 h-12 text-brand-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold">No Active Diet Plan Found</h2>
        <p className="text-muted text-sm mt-1 mb-6">
          Complete your fitness onboarding assessment to generate your personalized nutrition plan.
        </p>
        <button onClick={handleRegenerate} className="btn-primary px-6 py-2.5 mx-auto">
          Generate AI Diet Plan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="card p-6 md:p-8 relative overflow-hidden bg-gradient-to-r from-emerald-900/30 via-emerald-800/10 to-transparent border-emerald-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="chip bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-semibold text-xs uppercase tracking-wider">
                <Sparkles size={12} className="inline mr-1" />
                AI Nutrition Plan v{plan.version}
              </span>
              {history.length > 1 && (
                <span className="chip bg-[var(--surface-border)] text-muted text-xs">
                  <History size={12} className="inline mr-1" />
                  {history.length} Versions
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Personalized Macro & Meal Plan
            </h1>
            <p className="text-sm text-muted mt-1 max-w-xl">
              {plan.adaptationNotes || "Caloric & macronutrient split tailored to support your performance and goal."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {history.length > 1 && (
              <select
                onChange={(e) => fetchDietPlan(e.target.value)}
                value={plan.version}
                className="input py-2 px-3 text-xs bg-[var(--surface-bg)]"
              >
                {history.map((h) => (
                  <option key={h.version} value={h.version}>
                    Version {h.version} ({new Date(h.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} />
              Regenerate Diet
            </button>
          </div>
        </div>
      </div>

      {/* Macro Target Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Daily Calories</div>
          <div className="text-2xl font-bold text-brand-600 dark:text-brand-300">{plan.targetCalories} kcal</div>
          <div className="text-[11px] text-faint mt-1">Total Daily Target</div>
        </div>

        <div className="card p-5">
          <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Protein Target</div>
          <div className="text-2xl font-bold text-blue-500">{plan.targetProteinGrams} g</div>
          <div className="text-[11px] text-faint mt-1">~{Math.round((plan.targetProteinGrams * 4 / plan.targetCalories) * 100)}% of calories</div>
        </div>

        <div className="card p-5">
          <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Carbohydrates</div>
          <div className="text-2xl font-bold text-amber-500">{plan.targetCarbsGrams} g</div>
          <div className="text-[11px] text-faint mt-1">~{Math.round((plan.targetCarbsGrams * 4 / plan.targetCalories) * 100)}% of calories</div>
        </div>

        <div className="card p-5">
          <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Healthy Fats</div>
          <div className="text-2xl font-bold text-rose-500">{plan.targetFatsGrams} g</div>
          <div className="text-[11px] text-faint mt-1">~{Math.round((plan.targetFatsGrams * 9 / plan.targetCalories) * 100)}% of calories</div>
        </div>
      </div>

      {/* Meal Breakdown List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Daily Meal Structure</h2>

        <div className="grid md:grid-cols-2 gap-4">
          {plan.meals.map((meal, idx) => (
            <div key={idx} className="card p-5 relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="chip bg-brand-500/10 text-brand-600 dark:text-brand-300 font-semibold text-xs">
                    {meal.mealType}
                  </span>
                  <span className="text-xs font-bold text-muted">{meal.calories} kcal</span>
                </div>

                <h3 className="font-bold text-lg">{meal.name}</h3>
                {meal.description && <p className="text-xs text-muted mt-1 leading-relaxed">{meal.description}</p>}

                {/* Macro pill list */}
                <div className="flex items-center gap-2 mt-4 text-xs font-medium">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500">
                    P: {meal.proteinGrams}g
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500">
                    C: {meal.carbsGrams}g
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500">
                    F: {meal.fatsGrams}g
                  </span>
                </div>
              </div>

              {meal.alternatives && meal.alternatives.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--surface-border)]">
                  <div className="text-[11px] font-semibold uppercase text-muted mb-1">Healthy Alternatives</div>
                  <div className="text-xs text-soft">
                    {meal.alternatives.map((alt, aIdx) => (
                      <span key={aIdx} className="inline-block mr-2 text-brand-600 dark:text-brand-300">
                        • {alt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
