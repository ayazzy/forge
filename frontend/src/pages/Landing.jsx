import { Link } from "react-router-dom";

const ACCENT = "#e03535";

const features = [
  { title: "Research", desc: "AI-generated historical briefs with character profiles, key dates, and authentic details." },
  { title: "Script", desc: "Full 15-minute narration scripts with mood analysis, hook scoring, and retention editing." },
  { title: "Voiceover", desc: "Multi-voice ElevenLabs generation with segment control and ZIP download." },
  { title: "Sound Design", desc: "Music cues, ambient layers, and sound effects timed to your script." },
  { title: "Images", desc: "Midjourney prompts or auto-generated Ideogram images keyed to mood and pacing." },
  { title: "Metadata", desc: "YouTube titles, descriptions, tags, and chapter markers optimized for search." },
];

const plans = [
  {
    name: "Free",
    price: "$0/month",
    features: ["Bring your own API keys", "Full pipeline access", "3 episodes saved", "No trend research", "Watermarked exports"],
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: "$49/month",
    features: ["Hosted API (no keys needed)", "Full pipeline access", "Unlimited episodes", "Trend research", "No watermark", "Priority support"],
    cta: "Start Pro",
    highlight: true,
  },
  {
    name: "Studio",
    price: "$99/month",
    features: ["Everything in Pro", "Higher usage limits", "Multiple channel templates", "Team seats (coming soon)"],
    cta: "Start Studio",
  },
];

export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#111", fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #e4e4e7", padding: "0 32px", display: "flex", alignItems: "center", height: "56px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" }}>Forge</div>
        <div style={{ flex: 1 }} />
        <Link to="/login" style={{ fontSize: "13px", color: "#52525b", textDecoration: "none", marginRight: "20px" }}>Log in</Link>
        <Link to="/signup" style={{ background: ACCENT, color: "#fff", fontSize: "12px", fontWeight: "600", padding: "8px 16px", borderRadius: "6px", textDecoration: "none" }}>Sign up</Link>
      </div>

      {/* Hero */}
      <div style={{ padding: "80px 32px", maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: "42px", fontWeight: "700", lineHeight: "1.2", marginBottom: "20px" }}>
          Build your channel on autopilot
        </div>
        <div style={{ fontSize: "18px", color: "#52525b", lineHeight: "1.6", marginBottom: "36px" }}>
          AI-powered video production pipeline — research, script, voiceover, images, sound, and metadata in one place.
        </div>
        <Link to="/signup" style={{ background: ACCENT, color: "#fff", fontSize: "14px", fontWeight: "600", padding: "14px 32px", borderRadius: "8px", textDecoration: "none", display: "inline-block" }}>
          Get Started Free
        </Link>
      </div>

      {/* Features */}
      <div style={{ padding: "60px 32px", background: "#f4f4f5" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase", color: "#71717a", marginBottom: "32px", textAlign: "center" }}>Pipeline Stages</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {features.map((f, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e4e4e7", padding: "20px 24px", borderRadius: "8px" }}>
                <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: ACCENT, marginBottom: "8px" }}>
                  {String(i).padStart(2, "0")} — {f.title}
                </div>
                <div style={{ fontSize: "13px", color: "#52525b", lineHeight: "1.6" }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ padding: "60px 32px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "2px", textTransform: "uppercase", color: "#71717a", marginBottom: "32px", textAlign: "center" }}>Pricing</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {plans.map((p) => (
              <div key={p.name} style={{ border: `1px solid ${p.highlight ? ACCENT : "#e4e4e7"}`, borderRadius: "8px", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "4px" }}>{p.name}</div>
                  <div style={{ fontSize: "22px", fontWeight: "700", color: p.highlight ? ACCENT : "#111" }}>{p.price}</div>
                </div>
                <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {p.features.map((f, i) => (
                    <li key={i} style={{ fontSize: "13px", color: "#52525b" }}>{f}</li>
                  ))}
                </ul>
                <Link to="/signup" style={{ background: p.highlight ? ACCENT : "#fff", color: p.highlight ? "#fff" : "#111", border: `1px solid ${p.highlight ? ACCENT : "#e4e4e7"}`, borderRadius: "6px", padding: "10px 0", textAlign: "center", textDecoration: "none", fontSize: "13px", fontWeight: "600", marginTop: "auto" }}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e4e4e7", padding: "24px 32px", textAlign: "center", fontSize: "12px", color: "#a1a1aa" }}>
        © 2026 Forge
      </div>
    </div>
  );
}
