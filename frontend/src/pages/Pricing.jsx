import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { createCheckoutSession } from "../lib/api";
import AppLayout from "../components/ui/AppLayout";

const ACCENT = "#e03535";

const plans = [
  {
    id: "creator",
    name: "Creator",
    price: "$49",
    period: "/mo",
    episodes: 5,
    features: ["5 episodes/month", "Full 8-stage pipeline", "Hosted APIs — no keys needed", "Trend research"],
    cta: "Start free trial",
  },
  {
    id: "studio",
    name: "Studio",
    price: "$99",
    period: "/mo",
    episodes: 11,
    features: ["11 episodes/month", "Full 8-stage pipeline", "Hosted APIs — no keys needed", "Trend research", "Priority support"],
    oneShot: true,
    cta: "Start free trial",
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$179",
    period: "/mo",
    episodes: 30,
    features: ["30 episodes/month", "Full 8-stage pipeline", "Hosted APIs — no keys needed", "Trend research", "Priority support", "Multiple channels (coming soon)"],
    oneShot: true,
    cta: "Start free trial",
  },
];


export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const handlePlanCTA = async (planId) => {
    if (!user) { navigate("/signup"); return; }
    setLoading(planId);
    setError(null);
    try {
      const { url } = await createCheckoutSession(planId);
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
        <div style={{ fontSize: "13px", color: "#555", marginBottom: "32px" }}>7-day free trial on all plans. No credit card required to start.</div>

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
              style={{ border: `1px solid ${p.highlight ? ACCENT : "#222"}`, borderRadius: "10px", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "20px", background: "#1a1a1a", position: "relative", height: "100%" }}
            >
              {p.highlight && (
                <div style={{ position: "absolute", top: "-11px", left: "50%", transform: "translateX(-50%)", background: ACCENT, color: "#fff", fontSize: "10px", fontWeight: "700", padding: "3px 12px", borderRadius: "20px", whiteSpace: "nowrap", letterSpacing: "0.5px" }}>
                  MOST POPULAR
                </div>
              )}
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff", marginBottom: "8px" }}>{p.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                  <span style={{ fontSize: "28px", fontWeight: "700", color: p.highlight ? ACCENT : "#fff" }}>{p.price}</span>
                  <span style={{ fontSize: "13px", color: "#555" }}>{p.period}</span>
                </div>
              </div>
              {p.oneShot && (
                <div style={{ background: "rgba(224,53,53,0.07)", border: "1px solid rgba(224,53,53,0.2)", borderRadius: "8px", padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ fontSize: "14px", lineHeight: 1, marginTop: "1px" }}>⚡</span>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: ACCENT, marginBottom: "2px" }}>One Shot Mode</div>
                    <div style={{ fontSize: "11px", color: "#888", lineHeight: "1.4" }}>Enter a topic — Forge generates research, script, titles, voice cast, and image prompts in one go.</div>
                  </div>
                </div>
              )}
              <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                {p.features.map((f, i) => (
                  <li key={i} style={{ fontSize: "13px", color: i === 0 ? "#fff" : "#888", fontWeight: i === 0 ? "600" : "400" }}>{f}</li>
                ))}
              </ul>
              <button
                onClick={() => handlePlanCTA(p.id)}
                disabled={!!loading}
                style={{ background: loading === p.id ? "#2a2a2a" : p.highlight ? ACCENT : "#222", color: loading === p.id ? "#555" : "#fff", border: `1px solid ${p.highlight ? ACCENT : "#333"}`, borderRadius: "6px", padding: "11px 0", fontSize: "13px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                {loading === p.id ? "Redirecting..." : p.cta}
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "8px", fontSize: "12px", color: "#333", maxWidth: "860px" }}>
          Trial ends after 7 days. Cancel anytime from Settings before being charged.
        </div>
      </div>
    </AppLayout>
  );
}
