import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { createCheckoutSession, createPackCheckoutSession } from "../lib/api";
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
    cta: "Start free trial",
  },
];

const packs = [
  { id: "pack_1", label: "1 episode", price: "$9" },
  { id: "pack_3", label: "3 episodes", price: "$24" },
  { id: "pack_5", label: "5 episodes", price: "$38" },
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

  const handlePackCTA = async (packId) => {
    if (!user) { navigate("/signup"); return; }
    setLoading(packId);
    setError(null);
    try {
      const { url } = await createPackCheckoutSession(packId);
      window.location.href = url;
    } catch (e) {
      setError(e.message);
      setLoading(null);
    }
  };

  return (
    <AppLayout>
      <div style={{ padding: "32px 40px", width: "100%" }}>
        <div style={{ fontSize: "20px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>Pricing</div>
        <div style={{ fontSize: "13px", color: "#555", marginBottom: "32px" }}>7-day free trial on all plans. No credit card required to start.</div>

        {error && (
          <div style={{ background: "#2a1515", border: "1px solid #3a1515", borderRadius: "6px", padding: "10px 14px", fontSize: "12px", color: ACCENT, marginBottom: "16px", maxWidth: "860px" }}>
            {error}
          </div>
        )}

        {/* Plans */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", maxWidth: "860px", marginBottom: "40px" }}>
          {plans.map((p) => (
            <div
              key={p.id}
              style={{ border: `1px solid ${p.highlight ? ACCENT : "#222"}`, borderRadius: "10px", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "20px", background: "#1a1a1a", position: "relative" }}
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

        {/* Episode packs */}
        <div style={{ maxWidth: "860px" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>Need more episodes?</div>
          <div style={{ fontSize: "12px", color: "#555", marginBottom: "16px" }}>One-time purchase. Credits never expire and stack on top of your monthly allowance.</div>
          <div style={{ display: "flex", gap: "12px" }}>
            {packs.map((pack) => (
              <div
                key={pack.id}
                style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: "10px", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1 }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff", marginBottom: "2px" }}>{pack.label}</div>
                  <div style={{ fontSize: "12px", color: "#555" }}>one-time</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "18px", fontWeight: "700", color: "#fff" }}>{pack.price}</span>
                  <button
                    onClick={() => handlePackCTA(pack.id)}
                    disabled={!!loading}
                    style={{ background: loading === pack.id ? "#2a2a2a" : "#222", color: loading === pack.id ? "#555" : "#888", border: "1px solid #333", borderRadius: "6px", padding: "7px 14px", fontSize: "12px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                  >
                    {loading === pack.id ? "..." : "Buy →"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "24px", fontSize: "12px", color: "#333", maxWidth: "860px" }}>
          Trial ends after 7 days. Cancel anytime from Settings before being charged.
        </div>
      </div>
    </AppLayout>
  );
}
