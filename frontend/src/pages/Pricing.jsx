import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { createCheckoutSession, createPackCheckoutSession, getBilling } from "../lib/api";
import { trackEvent } from "../lib/analytics";
import AppLayout from "../components/ui/AppLayout";

const ACCENT = "#e03535";

const plans = [
  {
    id: "creator",
    name: "Creator",
    monthly: "$39",
    annual: "$29",
    episodes: 4,
    features: ["4 episodes/month", "Full 8-stage pipeline", "Hosted APIs — no keys needed", "Trend research"],
    cta: "Get started",
  },
  {
    id: "studio",
    name: "Studio",
    monthly: "$79",
    annual: "$59",
    episodes: 12,
    features: ["12 episodes/month", "Full 8-stage pipeline", "Hosted APIs — no keys needed", "Trend research", "Priority support"],
    oneShot: true,
    cta: "Get started",
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro",
    monthly: "$149",
    annual: "$119",
    episodes: 30,
    features: ["30 episodes/month", "Full 8-stage pipeline", "Hosted APIs — no keys needed", "Trend research", "Priority support", "Multiple channels (coming soon)"],
    oneShot: true,
    cta: "Get started",
  },
];

const packs = [
  { id: "pack_1", episodes: 1, price: "$8",  label: "1 Episode",  desc: "A single top-up credit." },
  { id: "pack_3", episodes: 3, price: "$20", label: "3 Episodes", desc: "Best for occasional overages." },
  { id: "pack_5", episodes: 5, price: "$30", label: "5 Episodes", desc: "Best value per episode." },
];

const REASON_MESSAGES = {
  canceled: "Your subscription has ended. Resubscribe below to continue making videos.",
  free_used: "You've made your first episode with Forge. Pick a plan to keep creating.",
  no_plan: "You need an active plan to use Forge. Get started below.",
};

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [packLoading, setPackLoading] = useState(null);
  const [packError, setPackError] = useState(null);
  const [billing, setBilling] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' | 'annual'
  const reason = searchParams.get("reason");
  const [reasonBannerDismissed, setReasonBannerDismissed] = useState(false);

  useEffect(() => {
    if (user) getBilling().then(setBilling).catch(() => {});
  }, [user]);

  const hasActivePlan = billing?.subscription_status === 'active' || billing?.subscription_status === 'trialing';
  const isAnnual = billingPeriod === 'annual';

  const handlePackCTA = async (packId) => {
    if (!user) { navigate("/signup"); return; }
    setPackLoading(packId);
    setPackError(null);
    try {
      const { url } = await createPackCheckoutSession(packId);
      window.location.href = url;
    } catch (e) {
      setPackError(e.message);
      setPackLoading(null);
    }
  };

  const handlePlanCTA = async (planId) => {
    if (!user) { navigate("/signup"); return; }
    trackEvent('Conversion', 'plan_cta_clicked', planId);
    setLoading(planId);
    setError(null);
    try {
      const { url } = await createCheckoutSession(planId, isAnnual);
      window.location.href = url;
    } catch (e) {
      setError(e.message);
      setLoading(null);
    }
  };

  return (
    <AppLayout>
      <div style={{ padding: "32px 40px", maxWidth: "960px", margin: "0 auto", width: "100%" }}>
        <div style={{ fontSize: "20px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>Pricing</div>
        <div style={{ fontSize: "14px", color: "#aaa", marginBottom: "24px" }}>Your first episode is on us. Subscribe to keep creating.</div>

        {/* Billing period toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <div style={{ display: "flex", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "3px" }}>
            <button
              onClick={() => setBillingPeriod('monthly')}
              style={{ background: !isAnnual ? "#2a2a2a" : "none", color: !isAnnual ? "#fff" : "#888", border: "none", borderRadius: "6px", padding: "6px 16px", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              style={{ background: isAnnual ? "#2a2a2a" : "none", color: isAnnual ? "#fff" : "#888", border: "none", borderRadius: "6px", padding: "6px 16px", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
            >
              Annual
            </button>
          </div>
          {isAnnual && (
            <div style={{ fontSize: "12px", color: ACCENT, fontWeight: "600", background: "rgba(224,53,53,0.1)", border: "1px solid rgba(224,53,53,0.2)", borderRadius: "20px", padding: "3px 10px" }}>
              Save ~25%
            </div>
          )}
        </div>

        {reason && REASON_MESSAGES[reason] && !reasonBannerDismissed && (
          <div style={{ background: "#2a1515", border: "1px solid #3a1515", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: ACCENT, marginBottom: "20px", maxWidth: "860px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ flex: 1 }}>{REASON_MESSAGES[reason]}</span>
            <button onClick={() => setReasonBannerDismissed(true)} style={{ background: "none", border: "none", color: ACCENT, cursor: "pointer", fontSize: "16px", padding: "0", fontFamily: "inherit", flexShrink: 0, opacity: 0.7 }}>×</button>
          </div>
        )}

        {error && (
          <div style={{ background: "#2a1515", border: "1px solid #3a1515", borderRadius: "6px", padding: "10px 14px", fontSize: "12px", color: ACCENT, marginBottom: "16px", maxWidth: "860px" }}>
            {error}
          </div>
        )}

        {/* Plans */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", maxWidth: "860px", marginBottom: "40px", alignItems: "stretch" }}>
          {plans.map((p) => (
            <div
              key={p.id}
              style={{ border: p.highlight ? `2px solid ${ACCENT}` : "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "20px", background: "#1a1a1a", position: "relative", height: "100%" }}
            >
              {p.highlight && (
                <div style={{ position: "absolute", top: "-11px", left: "50%", transform: "translateX(-50%)", background: ACCENT, color: "#fff", fontSize: "10px", fontWeight: "700", padding: "3px 12px", borderRadius: "20px", whiteSpace: "nowrap", letterSpacing: "0.5px" }}>
                  MOST POPULAR
                </div>
              )}
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff", marginBottom: "8px" }}>{p.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                  <span style={{ fontSize: "28px", fontWeight: "700", color: p.highlight ? ACCENT : "#fff" }}>
                    {isAnnual ? p.annual : p.monthly}
                  </span>
                  <span style={{ fontSize: "14px", color: "#888" }}>/mo</span>
                </div>
                {isAnnual && (
                  <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>billed annually</div>
                )}
              </div>
              {p.oneShot && (
                <div style={{ background: "rgba(224,53,53,0.07)", border: "1px solid rgba(224,53,53,0.2)", borderRadius: "8px", padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ fontSize: "14px", lineHeight: 1, marginTop: "1px" }}>⚡</span>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: ACCENT, marginBottom: "2px" }}>One Shot Mode</div>
                    <div style={{ fontSize: "12px", color: "#aaa", lineHeight: "1.4" }}>Enter a topic — Forge generates research, script, titles, voice cast, and image prompts in one go.</div>
                  </div>
                </div>
              )}
              <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                {p.features.map((f, i) => (
                  <li key={i} style={{ fontSize: "13px", color: i === 0 ? "#fff" : "#bbb", fontWeight: i === 0 ? "600" : "400", lineHeight: "1.9" }}>{f}</li>
                ))}
              </ul>
              <button
                onClick={() => handlePlanCTA(p.id)}
                disabled={!!loading}
                style={{ background: loading === p.id ? "#2a2a2a" : p.highlight ? ACCENT : "#222", color: loading === p.id ? "#555" : "#fff", border: `1px solid ${p.highlight ? ACCENT : "#333"}`, borderRadius: "8px", padding: "11px 0", fontSize: "13px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: p.highlight && !loading ? "0 4px 16px rgba(224,53,53,0.3)" : "none" }}
              >
                {loading === p.id ? "Redirecting..." : p.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Episode Packs — only shown to users with an active subscription */}
        {hasActivePlan && <div style={{ maxWidth: "860px", marginTop: "40px" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>Episode Packs</div>
          <div style={{ fontSize: "13px", color: "#aaa", marginBottom: "20px" }}>One-time credits — never expire. Stacks with your monthly allowance.</div>

          {packError && (
            <div style={{ background: "#2a1515", border: "1px solid #3a1515", borderRadius: "6px", padding: "10px 14px", fontSize: "12px", color: ACCENT, marginBottom: "14px" }}>
              {packError}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {packs.map(pk => (
              <div
                key={pk.id}
                style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "20px 20px", display: "flex", flexDirection: "column", gap: "12px" }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>{pk.label}</div>
                  <div style={{ fontSize: "11px", color: "#666" }}>{pk.desc}</div>
                </div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#fff" }}>{pk.price}</div>
                <button
                  onClick={() => handlePackCTA(pk.id)}
                  disabled={!!packLoading}
                  style={{
                    background: packLoading === pk.id ? "#2a2a2a" : "#222",
                    color: packLoading === pk.id ? "#555" : "#fff",
                    border: "1px solid #333",
                    borderRadius: "8px",
                    padding: "10px 0",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: packLoading ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {packLoading === pk.id ? "Redirecting..." : `Buy ${pk.label} →`}
                </button>
              </div>
            ))}
          </div>
        </div>}

        <div style={{ marginTop: "24px", fontSize: "13px", color: "#777", maxWidth: "860px" }}>
          Cancel anytime from Settings.
        </div>
      </div>
    </AppLayout>
  );
}
