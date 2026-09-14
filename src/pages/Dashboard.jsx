import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Dumbbell,
  Utensils,
  TrendingUp,
  Zap,
  Flame,
  CheckCircle2,
  ArrowRight,
  Target,
  Award,
  Crown,
  Bot,
  Activity,
  Calendar,
} from "lucide-react";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [dietPlan, setDietPlan] = useState(null);
  const [progressSummary, setProgressSummary] = useState(null);
  const [subscription, setSubscription] = useState({ isPremium: false });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [profRes, workRes, dietRes, progRes, subRes] = await Promise.allSettled([
        api.get("/profile"),
        api.get("/workout"),
        api.get("/diet"),
        api.get("/progress?days=14"),
        api.get("/subscription/status"),
      ]);

      if (profRes.status === "fulfilled") setProfile(profRes.value.data.profile);
      if (workRes.status === "fulfilled") setWorkoutPlan(workRes.value.data.plan);
      if (dietRes.status === "fulfilled") setDietPlan(dietRes.value.data.plan);
      if (progRes.status === "fulfilled") setProgressSummary(progRes.value.data.summary);
      if (subRes.status === "fulfilled") setSubscription(subRes.value.data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted text-sm">Synchronizing your adaptive AI dashboard...</p>
      </div>
    );
  }

  // Check if profile exists; if not, suggest onboarding
  if (!profile) {
    return (
      <div className="card p-10 text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-brand-500/15 text-brand-500 flex items-center justify-center mx-auto text-3xl">
          ⚡
        </div>
        <h2 className="text-2xl font-bold">Welcome to FitMind AI V2!</h2>
        <p className="text-muted text-sm leading-relaxed">
          Complete your 2-minute fitness assessment to unlock your personalized AI workout schedule, macro targets, and adaptive progress coaching.
        </p>
        <Link to="/onboarding" className="btn-primary px-8 py-3 mx-auto inline-flex items-center gap-2">
          Start Fitness Assessment <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  // Get Today's Day Name
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = dayNames[new Date().getDay()];
  const todayWorkout = workoutPlan?.weeklySchedule?.find(
    (d) => d.day.toLowerCase() === todayName.toLowerCase()
  ) || workoutPlan?.weeklySchedule?.[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="card p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-brand-900/40 via-brand-950/20 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="chip bg-brand-500/20 text-brand-600 dark:text-brand-300 font-semibold text-xs uppercase tracking-wider">
                <Sparkles size={12} className="inline mr-1" />
                Adaptive AI Coach v{workoutPlan?.version || 1}
              </span>
              {subscription.isPremium ? (
                <span className="chip bg-amber-500/20 text-amber-500 font-bold text-xs">
                  <Crown size={12} className="inline mr-1 fill-amber-500" /> PREMIUM UNLOCKED
                </span>
              ) : (
                <span className="chip bg-[var(--surface-border)] text-muted text-xs">FREE PLAN</span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Welcome back, {user?.name || "Athlete"}!
            </h1>
            <p className="text-sm text-muted mt-1">
              Goal: <strong className="text-foreground">{profile.fitnessGoal}</strong> · Program Version: <strong>v{workoutPlan?.version || 1}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/progress" className="btn-primary px-5 py-2.5 text-xs flex items-center gap-1.5 shadow-md">
              <Zap size={14} />
              Adapt Plan (v{workoutPlan?.version || 1} → v{(workoutPlan?.version || 1) + 1})
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      {subscription.paymentRequest?.status === "pending" && !subscription.isPremium && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm font-semibold">
          Payment under review. Your Premium access will appear here after an admin approves the payment.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Body Weight</div>
          <div className="text-2xl font-bold text-brand-600 dark:text-brand-300">{profile.weightKg} kg</div>
          <div className="text-[11px] text-faint mt-1">BMI: {profile.bmi}</div>
        </div>

        <div className="card p-5">
          <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Daily Calorie Target</div>
          <div className="text-2xl font-bold text-emerald-500">{profile.targetCalories} kcal</div>
          <div className="text-[11px] text-faint mt-1">BMR: {profile.bmr} kcal</div>
        </div>

        <div className="card p-5">
          <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Protein Target</div>
          <div className="text-2xl font-bold text-blue-500">{profile.targetProteinGrams} g</div>
          <div className="text-[11px] text-faint mt-1">~2.0g per kg</div>
        </div>

        <div className="card p-5">
          <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Logging Consistency</div>
          <div className="text-2xl font-bold text-purple-500">{progressSummary?.consistencyPct || 0}%</div>
          <div className="text-[11px] text-faint mt-1">14-Day Trajectory</div>
        </div>
      </div>

      {/* Main Grid: Today's Plan & AI Insights */}
      <div className="grid md:grid-cols-12 gap-6">
        {/* Today's Workout */}
        <div className="md:col-span-7 card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--surface-border)]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                Today ({todayName})
              </div>
              <h2 className="text-lg font-bold mt-0.5">
                {todayWorkout ? todayWorkout.focus : "Full Body Conditioning"}
              </h2>
            </div>
            <Link to="/workout" className="text-xs text-brand-600 dark:text-brand-300 font-semibold hover:underline flex items-center gap-1">
              Full Schedule <ArrowRight size={12} />
            </Link>
          </div>

          {todayWorkout?.isRestDay ? (
            <div className="py-8 text-center space-y-2">
              <div className="text-3xl">🌿</div>
              <h3 className="font-semibold text-base">Rest & Active Recovery</h3>
              <p className="text-xs text-muted max-w-xs mx-auto">
                No intense heavy lifting today. Prioritize hydration and light walking.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(todayWorkout?.exercises || []).slice(0, 4).map((ex, idx) => (
                <div key={idx} className="p-3 rounded-xl glass flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-300 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-sm">{ex.name}</div>
                      {ex.notes && <div className="text-xs text-muted">{ex.notes}</div>}
                    </div>
                  </div>
                  <div className="chip bg-brand-500/10 text-brand-700 dark:text-brand-300 text-xs">
                    {ex.sets} × {ex.reps}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <Link to="/progress" className="btn-primary w-full py-2.5 text-xs font-semibold justify-center">
              Log Today's Workout Progress
            </Link>
          </div>
        </div>

        {/* AI Insight & Next Action Side */}
        <div className="md:col-span-5 space-y-6">
          {/* AI Insight Box */}
          <div className="card p-6 relative overflow-hidden bg-gradient-to-br from-brand-950/40 via-brand-900/30 to-transparent border-brand-500/20">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300 mb-2">
              <Sparkles size={14} />
              FitMind AI Coaching Insight
            </div>
            <p className="text-xs text-soft leading-relaxed">
              "Your training consistency is solid over recent sessions. To optimize muscle hypertrophy, focus on strict 60-second rest intervals between compound sets."
            </p>
            <div className="mt-4 pt-3 border-t border-[var(--surface-border)] flex items-center justify-between text-xs">
              <span className="text-muted">Next Action:</span>
              <Link to="/workout" className="font-semibold text-brand-600 dark:text-brand-300 hover:underline">
                Complete {todayName}'s Session →
              </Link>
            </div>
          </div>

          {/* Premium Upgrade CTA (If Free user) */}
          {!subscription.isPremium && (
            <div className="card p-6 border-amber-500/30 bg-gradient-to-r from-amber-950/20 to-transparent">
              <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider mb-1">
                <Crown size={14} className="fill-amber-500" />
                Upgrade to FitMind Premium
              </div>
              <h3 className="font-bold text-base mt-1">Unlock Unlimited AI Plan Adaptations</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Experience automatic weekly plan versioning ($v_1 \rightarrow v_2$), 24/7 AI chat coach, and admin-reviewed access.
              </p>
              <Link to="/pricing" className="btn-primary w-full py-2.5 text-xs font-semibold mt-4 justify-center">
                View payment options
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
