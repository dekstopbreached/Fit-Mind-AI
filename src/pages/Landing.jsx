import { Link, Navigate } from "react-router-dom";
import {
  Sparkles,
  Flame,
  BarChart3,
  Brain,
  CheckCircle2,
  ArrowRight,
  Target,
  Activity,
  Dumbbell,
  Utensils,
  Zap,
  Crown,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import OrbitingHabits from "../components/OrbitingHabits.jsx";
import BrandLogo from "../components/BrandLogo.jsx";

export default function Landing() {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-[var(--surface-bg)]">
      {/* Navbar */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandLogo className="w-9 h-9 rounded-xl shadow-lg shadow-brand-500/30" />
          <span className="font-bold text-xl tracking-tight">FitMind AI</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm font-medium">
            Log in
          </Link>
          <Link to="/register" className="btn-primary text-sm font-semibold px-4 py-2">
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-10 md:pt-16 pb-16">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 chip mb-5 bg-brand-500/15 text-brand-700 dark:text-brand-300 font-semibold text-xs uppercase tracking-wider">
              <Sparkles size={14} />
              Adaptive fitness coaching
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.08]">
              Your Fitness Plan Should{" "}
              <span className="bg-gradient-to-br from-brand-400 to-purple-600 bg-clip-text text-transparent">
                Adapt to You.
              </span>
            </h1>
            <p className="mt-5 text-soft text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
              FitMind AI creates personalized workout and nutrition plans, tracks your progress, and continuously evolves your training split ($v_1 \rightarrow v_2 \rightarrow v_n$) as you get stronger.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link to="/register" className="btn-primary px-6 py-3.5 text-base font-semibold shadow-xl shadow-brand-500/30 flex items-center gap-2">
                Start Your AI Fitness Journey
                <ArrowRight size={18} />
              </Link>
              <Link to="/pricing" className="btn-secondary px-6 py-3.5 text-base font-semibold flex items-center gap-2">
                <Crown size={16} className="text-amber-500" />
                Explore Premium
              </Link>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-center">
            <OrbitingHabits />
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="max-w-6xl mx-auto px-6 py-12 border-t divider">
        <div className="card p-8 md:p-10 bg-gradient-to-r from-red-950/20 via-transparent to-transparent border-red-500/20">
          <div className="max-w-3xl">
            <span className="chip bg-red-500/15 text-red-400 font-semibold text-xs uppercase tracking-wider mb-3">
              The Problem With Generic Apps
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Static PDF workout plans stop working after 3 weeks.
            </h2>
            <p className="mt-3 text-soft text-sm leading-relaxed">
              Most fitness applications generate a single workout routine once and never update it. When your body adapts, progress stalls and plateaus set in. FitMind AI solves this by introducing a <strong>continuous adaptive feedback engine</strong> that evolves your workouts and nutrition automatically.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold tracking-tight">How FitMind AI Works</h2>
          <p className="mt-2 text-muted text-sm">
            4 simple steps to continuous, data-driven fitness progression.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: "01", title: "Tell Us About Yourself", desc: "Complete our 2-minute body metrics assessment (age, height, weight, goal, equipment)." },
            { step: "02", title: "Get Your AI Plan", desc: "Our engine computes exact BMR/TDEE targets and builds your Version 1 training split." },
            { step: "03", title: "Track Your Progress", desc: "Log completed workout sessions, body weight trends, and energy levels." },
            { step: "04", title: "Let AI Adapt Your Plan", desc: "Our Adaptive Engine updates your routine to Version v2 to keep you progressing." },
          ].map((s, idx) => (
            <div key={idx} className="card p-6 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="text-3xl font-black text-brand-500/30 mb-3">{s.step}</div>
                <h3 className="font-bold text-base mb-1">{s.title}</h3>
                <p className="text-xs text-soft leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t divider">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Powered by Advanced Fitness AI</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Dumbbell, title: "AI Workout Planning", desc: "Structured exercise schedules tailored to your equipment, location, and training experience." },
            { icon: Utensils, title: "AI Nutrition Planning", desc: "Caloric and macronutrient breakdowns with meal suggestions and healthy alternatives." },
            { icon: Zap, title: "Adaptive Coaching Engine", desc: "Automatic plan versioning ($v_1 \\rightarrow v_2$) based on logged consistency and progress." },
            { icon: BarChart3, title: "Progress Analytics", desc: "Dynamic weight trend line charts, completion percentages, and consistency tracking." },
            { icon: Brain, title: "AI Fitness Assistant", desc: "24/7 contextual chat assistant answering questions about form, diet, and recovery." },
            { icon: Crown, title: "Reviewed Premium Access", desc: "Pay by QR code and receive premium access after admin approval." },
          ].map((f, i) => (
            <div key={i} className="card p-6">
              <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-300 flex items-center justify-center mb-3">
                <f.icon size={20} />
              </div>
              <h3 className="font-bold text-base">{f.title}</h3>
              <p className="text-xs text-soft mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 text-center text-xs text-faint border-t divider">
        FitMind AI V2 © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
