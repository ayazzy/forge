import { Link } from "react-router-dom";

const ACCENT = "#e03535";

const plans = [
  {
    name: "Free",
    price: "$0/month",
    features: [
      "Bring your own API keys",
      "Full pipeline access",
      "3 episodes saved",
      "No trend research",
      "Watermarked exports",
    ],
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: "$49/month",
    features: [
      "Hosted API (no keys needed)",
      "Full pipeline access",
      "Unlimited episodes",
      "Trend research",
      "No watermark",
      "Priority support",
    ],
    cta: "Start Pro",
    highlight: true,
  },
  {
    name: "Studio",
    price: "$99/month",
    features: [
      "Everything in Pro",
      "Higher usage limits",
      "Multiple channel templates",
      "Team seats (coming soon)",
    ],
    cta: "Start Studio",
  },
];

export default function Pricing() {
  return (
    <div style={{ minHeight: "100vh", background: "#111", fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #222", padding: "0 32px", display: "flex", alignItems: "center", height: "56px" }}>
        <Link to="/" style={{ fontSize: "13px", fontWeight: "800", letterSpacing: "1.5px", textTransform: "uppercase", textDecoration: "none", color: ACCENT }}>Forge</Link>
        <div style={{ flex: 1 }} />
        <Link to="/" style={{ fontSize: "12px", color: "#555", textDecoration: "none" }}>← Back</Link>
      </div>

      <div style={{ padding: "60px 32px", maxWidth: "960px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "#fff", marginBottom: "12px" }}>Pricing</div>
          <div style={{ fontSize: "15px", color: "#555" }}>Start free. Scale when you're ready.</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {plans.map((p) => (
            <div key={p.name} style={{ border: `1px solid ${p.highlight ? ACCENT : "#222"}`, borderRadius: "10px", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "20px", background: "#1a1a1a" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff", marginBottom: "6px" }}>{p.name}</div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: p.highlight ? ACCENT : "#fff" }}>{p.price}</div>
              </div>
              <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                {p.features.map((f, i) => (
                  <li key={i} style={{ fontSize: "13px", color: "#888" }}>{f}</li>
                ))}
              </ul>
              <Link to="/signup" style={{ background: p.highlight ? ACCENT : "#222", color: p.highlight ? "#fff" : "#888", border: `1px solid ${p.highlight ? ACCENT : "#333"}`, borderRadius: "6px", padding: "10px 0", textAlign: "center", textDecoration: "none", fontSize: "13px", fontWeight: "600" }}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
