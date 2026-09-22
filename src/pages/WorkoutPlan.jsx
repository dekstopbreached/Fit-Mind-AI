import { useEffect, useState } from "react";
import {
  Dumbbell,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  Flame,
  ChevronRight,
  History,
  Info,
  Calendar,
} from "lucide-react";
import api from "../api/axios.js";

export default function WorkoutPlanPage() {
  const [plan, setPlan] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDay, setSelectedDay] = useState(0);
  const [completedExercises, setCompletedExercises] = useState({});

  const fetchWorkoutPlan = async (version = null) => {
    setLoading(true);
    try {
      const url = version ? `/workout?version=${version}` : "/workout";
      const res = await api.get(url);
      setPlan(res.data.plan);
      setHistory(res.data.history || []);
      // Select first non-rest day or day 0
      if (res.data.plan?.weeklySchedule) {
        const firstActive = res.data.plan.weeklySchedule.findIndex((d) => !d.isRestDay);
        setSelectedDay(firstActive !== -1 ? firstActive : 0);
      }
    } catch (err) {
      console.error("Error fetching workout plan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkoutPlan();
  }, []);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setErrorMessage("");
    try {
      const res = await api.post("/ai/adapt-plan", {
        userFeedback: "Create a fresh workout variation with progressive overload and different exercise variations.",
      });
      setPlan(res.data.workoutPlan);
      await fetchWorkoutPlan(res.data.version);
    } catch (err) {
      console.error("Error regenerating workout plan:", err);
      setErrorMessage(err.response?.data?.message || "Could not regenerate your plan. Please try again.");
    } finally {
      setRegenerating(false);
    }
  };

  const toggleExerciseCheck = (exIndex) => {
    const key = `${selectedDay}_${exIndex}`;
    setCompletedExercises((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted text-sm">Loading your AI workout schedule...</p>
      </div>
    );
  }

  if (!plan || !plan.weeklySchedule) {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto my-12">
        <Dumbbell className="w-12 h-12 text-brand-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold">No Active Workout Plan Found</h2>
        <p className="text-muted text-sm mt-1 mb-6">
          Complete your fitness onboarding to generate your custom AI workout schedule.
        </p>
        <button onClick={handleRegenerate} className="btn-primary px-6 py-2.5 mx-auto">
          Generate AI Workout Plan
        </button>
      </div>
    );
  }

  const currentDaySchedule = plan.weeklySchedule[selectedDay] || plan.weeklySchedule[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="card p-6 md:p-8 relative overflow-hidden bg-gradient-to-r from-brand-900/40 via-brand-800/20 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="chip bg-brand-500/20 text-brand-600 dark:text-brand-300 font-semibold text-xs uppercase tracking-wider">
                <Sparkles size={12} className="inline mr-1" />
                AI Workout Plan v{plan.version}
              </span>
              {history.length > 1 && (
                <span className="chip bg-[var(--surface-border)] text-muted text-xs">
                  <History size={12} className="inline mr-1" />
                  {history.length} Versions Stored
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {plan.goal} Training Program
            </h1>
            <p className="text-sm text-muted mt-1 max-w-xl">
              {plan.adaptationNotes || "Structured workout split tailored to your equipment and experience."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {history.length > 1 && (
              <select
                onChange={(e) => fetchWorkoutPlan(e.target.value)}
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
              Regenerate Plan
            </button>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* Days Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {plan.weeklySchedule.map((day, idx) => {
          const isSelected = selectedDay === idx;
          return (
            <button
              key={day.day}
              onClick={() => setSelectedDay(idx)}
              className={`flex-1 min-w-[110px] p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                isSelected
                  ? "bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20"
                  : "card hover:bg-brand-500/5 text-soft"
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{day.day}</div>
              <div className="text-sm font-bold truncate mt-1">{day.isRestDay ? "Rest Day" : day.focus}</div>
              <div className="text-[10px] opacity-70 mt-2">
                {day.isRestDay ? "Recovery" : `${day.exercises?.length || 0} Exercises`}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day View */}
      <div className="card p-6">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[var(--surface-border)]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">
              {currentDaySchedule.day} Workout
            </div>
            <h2 className="text-xl font-bold mt-0.5">{currentDaySchedule.focus}</h2>
          </div>
          {currentDaySchedule.isRestDay ? (
            <span className="chip bg-green-500/15 text-green-600 dark:text-green-300 font-medium">
              🌿 Rest & Recovery Day
            </span>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Clock size={14} />
              Est. ~45-60 mins
            </div>
          )}
        </div>

        {currentDaySchedule.isRestDay ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto text-2xl">
              🧘
            </div>
            <h3 className="text-lg font-semibold">Active Recovery & Muscle Repair</h3>
            <p className="text-sm text-muted max-w-md mx-auto">
              Rest days are when muscle tissue rebuilds and adapts. Focus on hydration, light stretching, mobility work, and 8 hours of sleep.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentDaySchedule.exercises.map((ex, exIdx) => {
              const isChecked = completedExercises[`${selectedDay}_${exIdx}`];
              return (
                <div
                  key={exIdx}
                  className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isChecked
                      ? "bg-brand-500/5 border-brand-500/30 opacity-75"
                      : "bg-[var(--surface-bg)] border-[var(--surface-border)] hover:border-brand-500/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleExerciseCheck(exIdx)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition mt-0.5 ${
                        isChecked
                          ? "bg-brand-500 text-white shadow"
                          : "border-2 border-[var(--surface-border)] hover:border-brand-500"
                      }`}
                    >
                      {isChecked && <CheckCircle2 size={16} />}
                    </button>
                    <div>
                      <div className="font-semibold text-base flex items-center gap-2">
                        {ex.name}
                        {isChecked && <span className="text-xs text-brand-600 dark:text-brand-300">Completed</span>}
                      </div>
                      {ex.notes && <p className="text-xs text-muted mt-1">{ex.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs sm:text-sm font-medium self-end sm:self-center">
                    <div className="chip bg-brand-500/10 text-brand-700 dark:text-brand-300">
                      {ex.sets} Sets × {ex.reps} Reps
                    </div>
                    <div className="flex items-center gap-1 text-muted">
                      <Clock size={12} />
                      {ex.restSeconds}s rest
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
