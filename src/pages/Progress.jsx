import { useEffect, useState } from "react";
import {
  TrendingUp,
  Award,
  Sparkles,
  Zap,
  CheckCircle2,
  Calendar,
  Weight,
  Flame,
  AlertCircle,
  Lock,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import api from "../api/axios.js";
import { Link } from "react-router-dom";

export default function ProgressPage() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logWeight, setLogWeight] = useState("");
  const [workoutDone, setWorkoutDone] = useState(true);
  const [energyLevel, setEnergyLevel] = useState(4);
  const [notes, setNotes] = useState("");
  const [submittingLog, setSubmittingLog] = useState(false);

  // Adaptive Engine state
  const [analyzing, setAnalyzing] = useState(false);
  const [adapting, setAdapting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [adaptationSuccess, setAdaptationSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchProgressData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/progress?days=30");
      setLogs(res.data.logs || []);
      setSummary(res.data.summary || null);
    } catch (err) {
      console.error("Error fetching progress logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgressData();
  }, []);

  const handleLogProgress = async (e) => {
    e.preventDefault();
    setSubmittingLog(true);
    setErrorMsg("");
    try {
      await api.post("/progress", {
        weightKg: logWeight ? Number(logWeight) : undefined,
        workoutCompleted: workoutDone,
        completionPercentage: workoutDone ? 100 : 0,
        energyLevel,
        notes,
      });
      setLogWeight("");
      setNotes("");
      fetchProgressData();
    } catch (err) {
      console.error("Error submitting progress log:", err);
      setErrorMsg("Failed to save progress log.");
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleAnalyzeProgress = async () => {
    setAnalyzing(true);
    setErrorMsg("");
    setAdaptationSuccess(null);
    try {
      const res = await api.post("/ai/analyze-progress");
      setAnalysisResult(res.data);
    } catch (err) {
      console.error("Error analyzing progress:", err);
      setErrorMsg("Failed to run AI progress analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAdaptPlan = async () => {
    setAdapting(true);
    setErrorMsg("");
    setAdaptationSuccess(null);
    try {
      const res = await api.post("/ai/adapt-plan", {
        userFeedback: notes || "Increase progressive overload based on recent workouts.",
      });
      setAdaptationSuccess(res.data);
      fetchProgressData();
    } catch (err) {
      console.error("Error adapting plan:", err);
      if (err.response?.status === 403) {
        setErrorMsg("Continuous AI Plan Adaptations require FitMind Premium. Please upgrade to unlock unlimited plan versioning!");
      } else {
        setErrorMsg(err.response?.data?.message || "Failed to adapt fitness plan.");
      }
    } finally {
      setAdapting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted text-sm">Aggregating progress metrics & analytics...</p>
      </div>
    );
  }

  // Format chart data
  const chartData = logs.map((l) => ({
    date: l.date.substring(5),
    weight: l.weightKg || null,
    completed: l.workoutCompleted ? 100 : 0,
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Progress Analytics & Adaptive Engine
        </h1>
        <p className="text-muted text-sm mt-1">
          Track your weight trend, log daily workouts, and let the FitMind AI engine adapt your training program.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Consistency Rate</div>
          <div className="text-2xl font-bold text-brand-600 dark:text-brand-300">
            {summary?.consistencyPct || 0}%
          </div>
          <div className="text-[11px] text-faint mt-1">Past 30 Days Logging</div>
        </div>

        <div className="card p-5">
          <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Current Weight</div>
          <div className="text-2xl font-bold text-blue-500">
            {summary?.currentWeight ? `${summary.currentWeight} kg` : "--"}
          </div>
          <div className="text-[11px] text-faint mt-1">
            {summary?.weightChange !== 0 && (
              <span className={summary?.weightChange < 0 ? "text-emerald-500 font-semibold" : "text-amber-500 font-semibold"}>
                {summary?.weightChange > 0 ? `+${summary.weightChange}` : summary?.weightChange} kg change
              </span>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Workouts Logged</div>
          <div className="text-2xl font-bold text-purple-500">{summary?.completedWorkouts || 0}</div>
          <div className="text-[11px] text-faint mt-1">Total Completed Sessions</div>
        </div>

        <div className="card p-5">
          <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Logged Days</div>
          <div className="text-2xl font-bold text-emerald-500">{summary?.totalDaysLogged || 0} Days</div>
          <div className="text-[11px] text-faint mt-1">Data points recorded</div>
        </div>
      </div>

      {/* --- THE ADAPTIVE AI ENGINE ACTION BOX --- */}
      <div className="card p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-brand-900/50 via-brand-950/40 to-brand-900/20 border-brand-500/30">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="chip bg-brand-500 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-brand-500/30">
              <Zap size={14} className="inline mr-1" />
              FitMind Adaptive AI Engine
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">
            Continuous AI Plan Adaptation
          </h2>
          <p className="text-sm text-soft mt-1 max-w-2xl leading-relaxed">
            The core differentiator of FitMind AI: your plans do not stay static. Our AI engine analyzes your consistency, weight trends, and workout performance to evolve your exercises and caloric targets from Version $v_1 \rightarrow v_2 \rightarrow v_n$.
          </p>

          {errorMsg && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} />
                {errorMsg}
              </div>
              {errorMsg.includes("Premium") && (
                <Link to="/pricing" className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap">
                  Upgrade to Premium
                </Link>
              )}
            </div>
          )}

          {adaptationSuccess && (
            <div className="mt-4 p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 space-y-2 animate-fade-in">
              <div className="font-bold text-base flex items-center gap-2">
                <CheckCircle2 size={20} />
                {adaptationSuccess.message}
              </div>
              <p className="text-xs text-soft">{adaptationSuccess.adaptationNotes}</p>
              <div className="pt-2 flex gap-3">
                <Link to="/workout" className="btn-primary text-xs py-2 px-4">
                  View Version {adaptationSuccess.version} Workout
                </Link>
                <Link to="/diet" className="btn-secondary text-xs py-2 px-4">
                  View Version {adaptationSuccess.version} Diet
                </Link>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={handleAnalyzeProgress}
              disabled={analyzing}
              className="btn-secondary px-5 py-2.5 text-sm flex items-center gap-2"
            >
              <Sparkles size={16} className={analyzing ? "animate-spin" : ""} />
              {analyzing ? "Analyzing Progress..." : "Run AI Progress Analysis"}
            </button>

            <button
              onClick={handleAdaptPlan}
              disabled={adapting}
              className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2 shadow-lg shadow-brand-500/30"
            >
              <Zap size={16} className={adapting ? "animate-spin" : ""} />
              {adapting ? "Adapting Plan..." : "Adapt Plan Now (Generate Next Version)"}
            </button>
          </div>

          {/* AI Analysis Output */}
          {analysisResult && !adaptationSuccess && (
            <div className="mt-6 p-5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-sm space-y-3 animate-fade-in">
              <div className="font-bold flex items-center justify-between text-brand-600 dark:text-brand-300">
                <span>AI Progress Report (Plan v{analysisResult.currentVersion})</span>
                <span className="chip bg-brand-500/20 text-xs">Consistency: {analysisResult.consistencyPct}%</span>
              </div>
              <p className="text-soft text-xs leading-relaxed whitespace-pre-line">{analysisResult.insight}</p>
            </div>
          )}
        </div>
      </div>

      {/* Log Entry & Analytics Grid */}
      <div className="grid md:grid-cols-12 gap-6">
        {/* Log Form */}
        <div className="md:col-span-5 card p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Calendar size={18} className="text-brand-500" />
            Log Today's Progress
          </h2>

          <form onSubmit={handleLogProgress} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Body Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 74.5"
                value={logWeight}
                onChange={(e) => setLogWeight(e.target.value)}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Workout Status
              </label>
              <button
                type="button"
                onClick={() => setWorkoutDone(!workoutDone)}
                className={`w-full py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition ${
                  workoutDone
                    ? "bg-emerald-500 text-white border-emerald-500 shadow"
                    : "border-[var(--surface-border)] text-muted hover:bg-brand-500/5"
                }`}
              >
                <CheckCircle2 size={18} />
                {workoutDone ? "Completed Today's Workout" : "Rest / Missed Session"}
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Energy Level (1 to 5)
              </label>
              <div className="flex justify-between gap-1">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    type="button"
                    key={lvl}
                    onClick={() => setEnergyLevel(lvl)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                      energyLevel === lvl
                        ? "bg-brand-500 text-white border-brand-500"
                        : "border-[var(--surface-border)] text-muted"
                    }`}
                  >
                    ⚡ {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Notes & RPE (optional)
              </label>
              <textarea
                placeholder="e.g. Bench felt strong, increased weight to 60kg on final set."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="input w-full text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submittingLog}
              className="btn-primary w-full py-2.5 text-sm font-semibold"
            >
              {submittingLog ? "Saving Log..." : "Save Progress Log"}
            </button>
          </form>
        </div>

        {/* Charts */}
        <div className="md:col-span-7 space-y-6">
          {/* Weight Trend Chart */}
          <div className="card p-6">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-500" />
              Weight Trend (Past 30 Days)
            </h3>
            {chartData.filter((d) => d.weight).length > 0 ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.filter((d) => d.weight)}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" stroke="#888" fontSize={11} />
                    <YAxis domain={["dataMin - 1", "dataMax + 1"]} stroke="#888" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e1e2d", borderRadius: "12px", border: "none" }} />
                    <Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-muted">
                Log your weight above to generate your dynamic trend chart.
              </div>
            )}
          </div>

          {/* Workout Consistency Bar Chart */}
          <div className="card p-6">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <Award size={18} className="text-emerald-500" />
              Workout Completion Tracking
            </h3>
            {chartData.length > 0 ? (
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" stroke="#888" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#888" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e1e2d", borderRadius: "12px", border: "none" }} />
                    <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-muted">
                No completion logs recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
