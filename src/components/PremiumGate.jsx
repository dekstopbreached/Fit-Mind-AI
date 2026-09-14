import { Link } from "react-router-dom";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * PremiumGate — wraps any UI section behind a subscription check.
 *
 * Free tier: children are blurred, a lock overlay with "Upgrade to Premium" CTA is shown.
 * Premium tier: children render normally, no overhead.
 *
 * Props:
 *   feature     — human-readable feature name shown in the overlay ("AI Chat", etc.)
 *   description — optional subtitle for the overlay
 *   children    — the content to gate; it's still rendered (but blurred) for free users
 *                 so admins/devs can see the layout even when not premium.
 *   inline      — if true, gate is rendered inline (no absolute overlay); useful for buttons.
 */
export default function PremiumGate({ feature, description, children, inline = false }) {
  const { isPremium } = useAuth();

  if (isPremium) return children;

  if (inline) {
    return (
      <Link
        to="/pricing"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-300 hover:border-amber-400/50 hover:bg-amber-500/25 transition"
      >
        <Lock size={14} />
        {feature} — Upgrade to unlock
        <ArrowRight size={14} />
      </Link>
    );
  }

  return (
    <div className="premium-gate-wrapper">
      {/* Blurred preview of actual content */}
      <div className="premium-gate-blur" aria-hidden="true">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="premium-gate-overlay">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
          <Lock size={26} className="text-amber-400" />
        </div>

        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Crown size={14} className="text-amber-400 fill-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Premium Feature
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">
            {feature}
          </h3>
          {description && (
            <p className="text-sm text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <Link
          to="/pricing"
          className="btn-primary px-6 py-2.5 text-sm mt-1 inline-flex items-center gap-2"
        >
          <Crown size={14} className="fill-slate-900" />
          Upgrade to Premium
          <ArrowRight size={14} />
        </Link>

        <p className="text-[11px] text-slate-500 mt-1">
          ₹{" "}· 30-day access · Instant activation after admin approval
        </p>
      </div>
    </div>
  );
}
