import { useEffect, useState } from "react";
import { CheckCircle2, Copy, CreditCard, ShieldCheck, Sparkles, Star, UploadCloud } from "lucide-react";
import api from "../api/axios.js";

export default function PricingPage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [pricing, setPricing] = useState({ amountINR: 499, periodDays: 30, paymentHandle: "ayushbhardwaj1600@okhdfcbank", qrImageUrl: "/payment-qr.png" });
  const [utrId, setUtrId] = useState("");
  const [screenshot, setScreenshot] = useState(null);

  const checkStatus = async () => {
    try {
      const res = await api.get("/subscription/status");
      setPaymentStatus(res.data);
      if (res.data.pricing) setPricing(res.data.pricing);
    } catch (error) {
      setStatusMsg(error?.response?.data?.error?.message || "Could not load payment details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { checkStatus(); }, []);

  const submitPayment = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setStatusMsg("");
    try {
      const formData = new FormData();
      if (utrId.trim()) formData.append("utrId", utrId.trim());
      if (screenshot) formData.append("screenshot", screenshot);
      const res = await api.post("/payments/requests", formData);
      setPaymentStatus((current) => ({ ...current, paymentRequest: res.data.paymentRequest }));
      setStatusMsg("Payment under review. We will update your premium access after approval.");
      setUtrId("");
      setScreenshot(null);
      event.target.reset();
    } catch (error) {
      setStatusMsg(error?.response?.data?.error?.message || "Could not submit your payment for review.");
    } finally {
      setProcessing(false);
    }
  };

  const copyHandle = async () => {
    await navigator.clipboard?.writeText(pricing.paymentHandle);
    setStatusMsg("Payment handle copied.");
  };

  if (loading) return <div className="py-20 text-center text-muted">Loading payment details...</div>;
  const request = paymentStatus?.paymentRequest;
  const isPremium = paymentStatus?.isPremium;

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-300 text-xs font-semibold uppercase tracking-wider"><Star size={14} /> FitMind Premium</div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Unlock Your Full Adaptive AI Coach</h1>
        <p className="text-muted text-sm leading-relaxed">Unlock adaptive plans, detailed analytics, unlimited regeneration, and contextual AI coaching.</p>
      </div>

      {statusMsg && <div className="p-4 rounded-2xl text-sm font-semibold text-center max-w-xl mx-auto bg-brand-500/10 border border-brand-500/30 text-brand-600 dark:text-brand-300">{statusMsg}</div>}

      <div className="grid md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
        <div className="card p-8 flex flex-col justify-between border-[var(--surface-border)]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">FREE TIER</div>
            <div className="text-3xl font-bold">₹0 <span className="text-xs font-normal text-muted">/ forever</span></div>
            <ul className="mt-6 space-y-3 text-sm text-soft"><li>✓ Fitness assessment and BMI/BMR estimates</li><li>✓ Initial AI workout and diet plans</li><li>✓ Basic progress logging</li></ul>
          </div>
          <button disabled className="btn-secondary w-full py-3 text-sm mt-8 opacity-70">{isPremium ? "Included Free Tier" : "Current Active Plan"}</button>
        </div>

        <div className="card p-8 border-brand-500 shadow-2xl shadow-brand-500/20 bg-gradient-to-b from-brand-900/30 via-brand-950/20 to-transparent">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300 mb-2">PREMIUM ADAPTIVE COACH</div>
          <div className="text-4xl font-bold">₹{pricing.amountINR} <span className="text-xs font-normal text-muted">/ {pricing.periodDays} days</span></div>
          <p className="text-xs text-muted mt-2">Manual payment review keeps access tied to a verified payment.</p>
          <ul className="mt-6 space-y-3 text-sm font-medium"><li className="flex gap-2"><Sparkles size={16} className="text-brand-500" /> 24/7 contextual AI fitness assistant</li><li className="flex gap-2"><CheckCircle2 size={16} className="text-brand-500" /> Unlimited plan regeneration</li><li className="flex gap-2"><ShieldCheck size={16} className="text-brand-500" /> Admin-reviewed payment approval</li></ul>

          {isPremium ? <div className="mt-8 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-center font-bold text-sm"><CheckCircle2 size={18} className="inline mr-2" />Premium access active</div> : request?.status === "pending" ? <div className="mt-8 p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-center font-semibold text-sm">Payment under review</div> : request?.status === "rejected" ? <div className="mt-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"><strong>Payment request rejected.</strong>{request.reason ? ` ${request.reason}` : " You can submit a new request after checking your payment details."}</div> : (
            <form onSubmit={submitPayment} className="mt-8 pt-6 border-t border-[var(--surface-border)] space-y-4">
              <div className="rounded-xl bg-white p-4 text-center"><img src={pricing.qrImageUrl} alt="Payment QR code" className="mx-auto w-48 h-48 object-contain" /><p className="text-slate-700 text-sm mt-3">Pay ₹{pricing.amountINR} to</p><button type="button" onClick={copyHandle} className="text-slate-900 font-bold inline-flex items-center gap-2">{pricing.paymentHandle}<Copy size={14} /></button></div>
              <label className="block text-sm">Transaction / UTR ID <span className="text-muted">(optional)</span><input value={utrId} onChange={(event) => setUtrId(event.target.value)} className="input mt-1 w-full" placeholder="Enter the payment reference" /></label>
              <label className="block text-sm"><span className="inline-flex items-center gap-2">Payment screenshot <span className="text-muted">(optional)</span></span><span className="input mt-1 w-full flex items-center gap-2 cursor-pointer"><UploadCloud size={16} /><span className="truncate">{screenshot?.name || "Choose an image"}</span><input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => setScreenshot(event.target.files?.[0] || null)} /></span></label>
              <button type="submit" disabled={processing} className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"><CreditCard size={18} />{processing ? "Submitting..." : "I've Paid"}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
