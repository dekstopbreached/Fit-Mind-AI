import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  Activity,
  Bot,
  Crown,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import BrandLogo from "./BrandLogo.jsx";

export default function MobileNav() {
  const { user, logout } = useAuth();

  return (
    <>
      <div className="md:hidden sticky top-0 z-20 glass border-b border-[var(--surface-border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrandLogo className="w-8 h-8 rounded-lg shadow-md shadow-brand-500/30" />
          <div className="font-bold text-base">FitMind AI</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center">
            {user?.avatar || user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <button onClick={logout} className="p-2 rounded-lg text-soft hover:bg-[var(--surface-hover)]">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-[var(--surface-border)] flex justify-around py-2">
        {[
          { to: "/dashboard", label: "Home", icon: LayoutDashboard },
          { to: "/workout", label: "Workout", icon: Dumbbell },
          { to: "/diet", label: "Diet", icon: Utensils },
          { to: "/progress", label: "Progress", icon: Activity },
          { to: "/assistant", label: "AI Coach", icon: Bot },
          { to: "/pricing", label: "Premium", icon: Crown },
        ].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] ${
                isActive ? "text-brand-300 font-bold" : "text-faint"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
