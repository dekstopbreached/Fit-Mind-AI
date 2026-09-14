import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  Users,
  LogOut,
  ShieldCheck,
  Moon,
  Sun,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import BrandLogo from "./BrandLogo.jsx";

const adminNav = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/payments", label: "Payment Requests", icon: CreditCard },
  { to: "/admin/users", label: "Users", icon: Users },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen admin-panel">
      {/* Admin Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 fixed inset-y-0 left-0 z-30 admin-sidebar">
        {/* Logo + Badge */}
        <div className="px-6 py-5 admin-sidebar-header">
          <div className="flex items-center gap-2.5 mb-3">
            <BrandLogo className="w-9 h-9 rounded-xl shadow-lg shadow-amber-500/30" />
            <div className="font-bold text-lg tracking-tight">FitMind AI</div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 w-fit">
            <ShieldCheck size={13} className="text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Admin Panel
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {adminNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30 font-semibold"
                    : "text-soft hover:bg-amber-500/10 hover:text-amber-200"
                }`
              }
            >
              <Icon size={18} />
              {label}
              <ChevronRight size={14} className="ml-auto opacity-40" />
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-amber-500/20 space-y-1">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-soft hover:bg-amber-500/10 transition"
          >
            {theme === "dark" ? <Moon size={16} className="text-amber-400" /> : <Sun size={16} className="text-yellow-500" />}
            {theme === "dark" ? "Dark Mode" : "Light Mode"}
          </button>

          <div className="px-2 py-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold flex items-center justify-center text-xs shadow-md">
              {user?.avatar || user?.name?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{user?.name}</div>
              <div className="text-[10px] text-amber-400/70 truncate">Admin</div>
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="p-1.5 rounded-lg text-soft hover:text-amber-300 hover:bg-amber-500/10 transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 admin-sidebar-header border-b border-amber-500/20 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <BrandLogo className="w-7 h-7 rounded-lg" />
          <span className="font-bold text-sm">FitMind AI</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md ml-1">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          {adminNav.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `text-xs font-medium transition ${
                  isActive ? "text-amber-300" : "text-soft"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <button onClick={logout} className="p-1.5 rounded-lg text-soft hover:text-amber-300">
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="md:ml-64 px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
