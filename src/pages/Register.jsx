import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Sun, Moon, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import BrandLogo from "../components/BrandLogo.jsx";

export default function Register() {
  const { user, register } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (form.password.length < 8) {
      setErr("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      // Redirect to onboarding assessment after registration
      navigate("/onboarding", { replace: true });
    } catch (e) {
      setErr(e.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--surface-bg)]">

      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-6">
          <BrandLogo className="w-9 h-9 rounded-xl shadow-lg shadow-brand-500/30" />
          <span className="font-bold text-xl tracking-tight">FitMind AI</span>
        </Link>

        <div className="card p-7 shadow-xl">
          <h1 className="text-2xl font-bold">Start Your AI Fitness Journey</h1>
          <p className="text-sm text-muted mt-1">
            Create your account to unlock personalized workout splits and AI coaching.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                className="input w-full"
                value={form.name}
                onChange={set("name")}
                placeholder="Alex Johnson"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input w-full"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="alex@example.com"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input w-full"
                type="password"
                value={form.password}
                onChange={set("password")}
                placeholder="At least 8 characters"
                required
              />
              <p className="text-xs text-muted mt-1">Use at least 8 characters.</p>
            </div>
            {err && (
              <div className="text-sm text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {err}
              </div>
            )}
            <button
              type="submit"
              className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
              disabled={loading}
            >
              <Sparkles size={16} />
              {loading ? "Creating account..." : "Continue to Fitness Assessment"}
            </button>
          </form>

          <div className="text-center mt-5 text-sm text-soft">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-600 dark:text-brand-300 font-medium">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
