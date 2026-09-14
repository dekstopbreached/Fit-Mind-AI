import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  Activity,
  Bot,
  Crown,
  LogOut,
  Settings,
  Moon,
  Sun,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import Modal from "./Modal.jsx";
import api from "../api/axios.js";
import BrandLogo from "./BrandLogo.jsx";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/workout", label: "AI Workout Plan", icon: Dumbbell },
  { to: "/diet", label: "AI Nutrition Plan", icon: Utensils },
  { to: "/progress", label: "Progress & Adaptive", icon: Activity },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
  { to: "/pricing", label: "Upgrade Premium", icon: Crown },
];

export default function Sidebar() {
  const { user, logout, updateUser } = useAuth();
  const { theme, toggle } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put("/auth/profile", { name });
      updateUser(res.data.user);
      setSettingsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="hidden md:flex md:flex-col w-64 fixed inset-y-0 left-0 z-30 glass border-r border-[var(--surface-border)]">
      <div className="px-6 py-5 border-b border-[var(--surface-border)]">
        <div className="flex items-center gap-2.5">
          <BrandLogo className="w-9 h-9 rounded-xl shadow-lg shadow-brand-500/30" />
          <div className="font-bold text-lg tracking-tight">FitMind AI</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {[...nav, ...(user?.isAdmin ? [{ to: "/admin", label: "Admin Panel", icon: ShieldCheck }] : [])].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-gradient-to-r from-brand-500/20 to-brand-500/5 text-brand-300 ring-1 ring-brand-500/30 font-semibold"
                  : "text-soft hover:bg-[var(--surface-hover)]"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--surface-border)] space-y-1">
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-soft hover:bg-[var(--surface-hover)] transition"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings size={16} />
          Settings
        </button>

        <div className="px-2 py-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-md">
            {user?.avatar || user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{user?.name}</div>
            <div className="text-[10px] text-faint truncate">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-lg text-soft hover:bg-[var(--surface-hover)]"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <div className="space-y-6">
          <div>
            <label className="label text-xs font-semibold uppercase">Display Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="border-t border-[var(--surface-border)] pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon size={18} className="text-amber-400" />
                ) : (
                  <Sun size={18} className="text-yellow-500" />
                )}
                <div>
                  <label className="label text-xs font-semibold uppercase">Theme</label>
                  <p className="text-[11px] text-faint">
                    {theme === "dark" ? "Dark Mode" : "Light Mode"}
                  </p>
                </div>
              </div>
              <button
                onClick={toggle}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                  theme === "dark" ? "bg-brand-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    theme === "dark" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary text-xs" onClick={() => setSettingsOpen(false)}>
              Close
            </button>
            <button className="btn-primary text-xs" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>
    </aside>
  );
}
