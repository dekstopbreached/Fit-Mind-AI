import { useEffect, useState } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import {
  Check, X, Search, Users, CreditCard, LayoutDashboard,
  TrendingUp, Crown, ShieldCheck, Clock, RefreshCw, UserCheck,
  UserX, ShieldAlert, AlertCircle,
} from "lucide-react";
import api from "../api/axios.js";

/* ------------------------------------------------------------------ Overview --- */

function AdminOverview() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/analytics")
      .then((r) => setAnalytics(r.data))
      .catch(() => setError("Could not load analytics."))
      .finally(() => setLoading(false));
  }, []);

  const stats = analytics
    ? [
        { label: "Total Users", value: analytics.totalUsers ?? "-", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
        { label: "Free Users", value: analytics.freeUsers ?? "-", icon: TrendingUp, color: "text-slate-400", bg: "bg-slate-500/10" },
        { label: "Premium Users", value: analytics.premiumUsers ?? "-", icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10" },
        { label: "Pending Requests", value: analytics.pendingRequests ?? "-", icon: Clock, color: "text-orange-400", bg: "bg-orange-500/10" },
        { label: "Revenue Estimate", value: `₹${analytics.revenueEstimate?.toLocaleString() ?? 0}`, icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck size={22} className="text-amber-400" />
          Admin Overview
        </h1>
        <p className="text-muted text-sm mt-1">Platform health and subscription metrics.</p>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-sm">{error}</div>}

      {loading ? (
        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-24 bg-amber-500/5" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card p-5 border-amber-500/10 hover:border-amber-500/25 transition">
              <div className={`w-9 h-9 rounded-xl ${bg} ${color} flex items-center justify-center mb-3`}>
                <Icon size={18} />
              </div>
              <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      {analytics && (
        <div className="card p-6 border-amber-500/10">
          <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-400" />
            Conversion Rate
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-800/60 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-700"
                style={{
                  width: analytics.totalUsers > 0
                    ? `${Math.round((analytics.premiumUsers / analytics.totalUsers) * 100)}%`
                    : "0%",
                }}
              />
            </div>
            <span className="text-sm font-bold text-amber-400 w-12 shrink-0">
              {analytics.totalUsers > 0
                ? `${Math.round((analytics.premiumUsers / analytics.totalUsers) * 100)}%`
                : "0%"}
            </span>
          </div>
          <p className="text-xs text-muted mt-2">
            {analytics.premiumUsers} premium out of {analytics.totalUsers} total users
          </p>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------- Payment Requests --- */

function AdminPayments() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const uploadsBaseUrl = api.defaults.baseURL?.replace(/\/api\/?$/, "") ?? "";

  const load = () =>
    api.get("/admin/payment-requests")
      .then((r) => setRequests(r.data.paymentRequests || []))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const review = async (id, status) => {
    try {
      await api.patch(`/admin/payment-requests/${id}`, { status });
      setMessage({ text: `Payment ${status} successfully.`, type: status === "approved" ? "success" : "error" });
      load();
    } catch (e) {
      setMessage({ text: e?.response?.data?.error?.message || "Action failed.", type: "error" });
    }
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard size={22} className="text-amber-400" />
            Payment Requests
          </h1>
          <p className="text-muted text-sm mt-1">
            {requests.length} pending request{requests.length !== 1 ? "s" : ""} awaiting review.
          </p>
        </div>
        <button onClick={load} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {message.text && (
        <div className={`p-3 rounded-xl text-sm font-medium ${
          message.type === "success"
            ? "bg-green-500/10 border border-green-500/20 text-green-400"
            : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          {message.text}
        </div>
      )}

      <div className="card border-amber-500/10">
        {loading ? (
          <div className="p-12 text-center text-muted text-sm">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="text-3xl">✅</div>
            <p className="font-semibold">All clear — no pending requests</p>
            <p className="text-muted text-sm">New payment submissions will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-amber-500/10">
            {requests.map((req) => (
              <div key={req._id} className="p-5 flex flex-wrap items-start gap-5 justify-between hover:bg-amber-500/5 transition">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{req.userId?.name}</span>
                    <span className="text-muted text-sm">{req.userId?.email}</span>
                    <span className="tier-badge-free">Free</span>
                  </div>
                  <div className="text-sm text-muted flex items-center gap-3 flex-wrap">
                    <span>₹{req.amount}</span>
                    {req.utrId && <span>UTR: <span className="font-mono text-amber-300">{req.utrId}</span></span>}
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(req.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {req.screenshotUrl && (
                    <a
                      href={`${uploadsBaseUrl}${req.screenshotUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-amber-400 underline hover:text-amber-300 inline-flex items-center gap-1"
                    >
                      View payment screenshot ↗
                    </a>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition"
                    onClick={() => review(req._id, "approved")}
                  >
                    <Check size={15} /> Approve
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition"
                    onClick={() => review(req._id, "rejected")}
                  >
                    <X size={15} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Users Table --- */

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState({ id: "", text: "", type: "" });

  const load = (q = search) =>
    api.get(`/admin/users?search=${encodeURIComponent(q)}`)
      .then((r) => setUsers(r.data.users || []))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const notify = (id, text, type = "success") => {
    setActionMsg({ id, text, type });
    setTimeout(() => setActionMsg({ id: "", text: "", type: "" }), 3000);
  };

  const togglePremium = async (user, active) => {
    try {
      await api.patch(`/admin/users/${user._id}/premium`, { enabled: !active });
      notify(user._id, `${!active ? "Premium granted" : "Premium revoked"} for ${user.name}.`, !active ? "success" : "warn");
      load();
    } catch (e) {
      notify(user._id, e?.response?.data?.error?.message || "Action failed.", "error");
    }
  };

  const toggleAdmin = async (user) => {
    try {
      await api.patch(`/admin/users/${user._id}/role`, { isAdmin: !user.isAdmin });
      notify(user._id, `${user.name} ${!user.isAdmin ? "promoted to admin" : "demoted to customer"}.`);
      load();
    } catch (e) {
      notify(user._id, e?.response?.data?.error?.message || "Action failed.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users size={22} className="text-amber-400" />
            Users
          </h1>
          <p className="text-muted text-sm mt-1">{users.length} user{users.length !== 1 ? "s" : ""} found.</p>
        </div>
        <label className="flex items-center gap-2 input max-w-xs">
          <Search size={15} className="text-muted shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="bg-transparent outline-none w-full text-sm"
          />
        </label>
      </div>

      <div className="card border-amber-500/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-amber-500/15 text-left">
                <th className="py-3 px-4 text-xs uppercase tracking-wider text-muted font-semibold">User</th>
                <th className="py-3 px-4 text-xs uppercase tracking-wider text-muted font-semibold">Role</th>
                <th className="py-3 px-4 text-xs uppercase tracking-wider text-muted font-semibold">Subscription</th>
                <th className="py-3 px-4 text-xs uppercase tracking-wider text-muted font-semibold">Expiry</th>
                <th className="py-3 px-4 text-xs uppercase tracking-wider text-muted font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted text-sm">Loading…</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted text-sm">No users found.</td>
                </tr>
              ) : (
                users.map((user) => {
                  const sub = user.subscription;
                  const isActive =
                    sub?.tier === "premium" &&
                    sub?.status === "active" &&
                    new Date(sub.currentPeriodEnd) > new Date();

                  return (
                    <>
                      <tr
                        key={user._id}
                        className="border-t border-amber-500/10 hover:bg-amber-500/5 transition"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/40 to-orange-600/40 text-amber-200 font-bold flex items-center justify-center text-xs shrink-0">
                              {user.avatar || user.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold">{user.name}</div>
                              <div className="text-muted text-xs">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {user.isAdmin ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full">
                              <ShieldCheck size={11} /> Admin
                            </span>
                          ) : (
                            <span className="tier-badge-free">Customer</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isActive ? (
                            <span className="tier-badge-premium">
                              <Crown size={11} className="fill-amber-400" /> Premium
                            </span>
                          ) : (
                            <span className="tier-badge-free">Free</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted text-xs">
                          {sub?.currentPeriodEnd
                            ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => togglePremium(user, isActive)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                isActive
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                                  : "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                              }`}
                            >
                              {isActive ? <><UserX size={12} /> Revoke Premium</> : <><UserCheck size={12} /> Grant Premium</>}
                            </button>
                            <button
                              onClick={() => toggleAdmin(user)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition"
                            >
                              {user.isAdmin ? <><ShieldAlert size={12} /> Remove Admin</> : <><ShieldCheck size={12} /> Make Admin</>}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {actionMsg.id === user._id && actionMsg.text && (
                        <tr key={`msg-${user._id}`}>
                          <td colSpan={5} className={`px-4 py-2 text-xs ${
                            actionMsg.type === "error" ? "text-rose-400" :
                            actionMsg.type === "warn" ? "text-amber-400" : "text-green-400"
                          }`}>
                            {actionMsg.text}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Root (404) --- */

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b border-amber-500/15 pb-3" aria-label="Admin sections">
        <NavLink
          to="."
          end
          className={({ isActive }) => `inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? "bg-amber-500/15 text-amber-300" : "text-muted hover:bg-amber-500/10 hover:text-amber-200"}`}
        >
          <LayoutDashboard size={15} /> Overview
        </NavLink>
        <NavLink
          to="payments"
          className={({ isActive }) => `inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? "bg-amber-500/15 text-amber-300" : "text-muted hover:bg-amber-500/10 hover:text-amber-200"}`}
        >
          <CreditCard size={15} /> Payment Requests
        </NavLink>
        <NavLink
          to="users"
          className={({ isActive }) => `inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? "bg-amber-500/15 text-amber-300" : "text-muted hover:bg-amber-500/10 hover:text-amber-200"}`}
        >
          <Users size={15} /> Users
        </NavLink>
      </nav>

      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="users" element={<AdminUsers />} />
      </Routes>
    </div>
  );
}
