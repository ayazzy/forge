import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { saveChannelProfile, getChannelProfile, getUsage, getBilling, createPortalSession } from "../lib/api";
import AppLayout from "../components/ui/AppLayout";

const ACCENT = "#e03535";

const labelStyle = { fontSize: "11px", fontWeight: "600", letterSpacing: "0.3px", color: "#888", textTransform: "uppercase", display: "block", marginBottom: "6px" };
const inputStyle = { width: "100%", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "9px 12px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#222", color: "#fff", fontFamily: "inherit" };
const section = { background: "#1a1a1a", border: "1px solid #222", borderRadius: "10px", padding: "24px", marginBottom: "16px" };
const sectionTitle = { fontSize: "11px", fontWeight: "600", letterSpacing: "1.5px", textTransform: "uppercase", color: "#555", marginBottom: "20px" };

export default function Settings() {
  const { user } = useAuth();
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState(2);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [billing, setBilling] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    getChannelProfile().then(data => {
      if (data) {
        setChannelName(data.channel_name || "");
        setDescription(data.description || "");
        setWeeklyGoal(data.weekly_goal ?? 2);
      }
    }).catch(() => {});

    getUsage().then(setUsage).catch(() => {}).finally(() => setLoadingUsage(false));
    getBilling().then(setBilling).catch(() => {});
  }, []);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (e) {
      console.error("Portal error:", e);
    } finally {
      setPortalLoading(false);
    }
  };

  const planLabel = billing?.plan ? billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1) : 'Free';
  const isTrialing = billing?.subscription_status === 'trialing';
  const trialDaysLeft = billing?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(billing.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;
  const isPaid = billing?.plan && billing.plan !== 'free';

  const handleSaveChannel = async () => {
    setSaving(true);
    try {
      await saveChannelProfile({ channel_name: channelName, description, weekly_goal: Number(weeklyGoal) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save channel settings:", e);
    } finally {
      setSaving(false);
    }
  };

  const USAGE_METERS = [
    { label: "Claude Calls",       used: usage?.claude_calls || 0,            limit: 500,    key: "claude_calls" },
    { label: "Voice Characters",   used: usage?.elevenlabs_characters || 0,   limit: 100000, key: "elevenlabs_characters" },
    { label: "Images",             used: usage?.ideogram_generations || 0,    limit: 200,    key: "ideogram_generations" },
  ];

  return (
    <AppLayout>
      <div style={{ padding: "32px 40px", width: "100%" }}>
        <div style={{ fontSize: "20px", fontWeight: "700", color: "#fff", marginBottom: "28px" }}>Settings</div>

        {/* Channel */}
        <div style={section}>
          <div style={sectionTitle}>Channel</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Channel Name</label>
              <input style={inputStyle} value={channelName} onChange={e => setChannelName(e.target.value)} placeholder="e.g. Unraveled" />
            </div>
            <div>
              <label style={labelStyle}>Channel Description</label>
              <textarea
                style={{ ...inputStyle, minHeight: "100px", resize: "vertical", lineHeight: "1.6" }}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your channel — what you make, who your audience is, your style..."
              />
            </div>
            <div>
              <label style={labelStyle}>Weekly Episode Goal</label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input
                  type="number"
                  min="1"
                  max="20"
                  style={{ ...inputStyle, width: "80px" }}
                  value={weeklyGoal}
                  onChange={e => setWeeklyGoal(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <span style={{ fontSize: "13px", color: "#555" }}>episodes per week</span>
              </div>
            </div>
            <button
              style={{ background: saved ? "#0a2a1a" : ACCENT, color: saved ? "#4ade80" : "#fff", border: saved ? "1px solid #14532d" : "none", borderRadius: "6px", padding: "10px 20px", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}
              onClick={handleSaveChannel}
              disabled={saving}
            >
              {saving ? "Saving..." : saved ? "✓ Saved" : "Save Channel Settings"}
            </button>
            <div style={{ fontSize: "11px", color: "#555", fontStyle: "italic" }}>
              To regenerate your full production template, go through{" "}
              <Link to="/onboarding" style={{ color: ACCENT, textDecoration: "none" }}>onboarding</Link> again.
            </div>
          </div>
        </div>

        {/* Account */}
        <div style={section}>
          <div style={sectionTitle}>Account</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input readOnly value={user?.email || ""} style={{ ...inputStyle, color: "#555" }} />
            </div>
          </div>
        </div>

        {/* Plan & Usage */}
        <div style={section}>
          <div style={sectionTitle}>Plan & Usage</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <div style={{ background: isPaid ? ACCENT : "#333", color: "#fff", fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "4px", letterSpacing: "0.5px" }}>
              {planLabel.toUpperCase()}
            </div>
            {isTrialing && trialDaysLeft !== null && (
              <div style={{ fontSize: "12px", color: "#d97706" }}>
                Trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
              </div>
            )}
            <div style={{ flex: 1 }} />
            {isPaid ? (
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                style={{ background: "none", border: "1px solid #333", color: "#888", fontSize: "11px", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontFamily: "inherit" }}
              >
                {portalLoading ? "Loading..." : "Manage Billing →"}
              </button>
            ) : (
              <Link to="/pricing" style={{ fontSize: "11px", color: ACCENT, textDecoration: "none" }}>
                Upgrade →
              </Link>
            )}
          </div>

          {/* Episode balance */}
          {billing && (
            <div style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "16px", marginBottom: "20px", display: "flex", gap: "24px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#555", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Monthly episodes</div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#fff" }}>
                  {billing.monthly_remaining ?? "—"}
                  <span style={{ fontSize: "13px", color: "#555", fontWeight: "400" }}> / {billing.monthly_limit ?? "—"}</span>
                </div>
              </div>
              {billing.purchased_credits > 0 && (
                <div>
                  <div style={{ fontSize: "11px", color: "#555", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Purchased credits</div>
                  <div style={{ fontSize: "20px", fontWeight: "700", color: "#4ade80" }}>{billing.purchased_credits}</div>
                </div>
              )}
              <div style={{ flex: 1 }} />
              <Link to="/pricing" style={{ fontSize: "12px", color: "#555", textDecoration: "none", alignSelf: "center" }}>
                Buy more →
              </Link>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {USAGE_METERS.map((m) => {
              const pct = Math.min((m.used / m.limit) * 100, 100);
              const color = pct > 90 ? "#e03535" : pct > 70 ? "#d97706" : ACCENT;
              return (
                <div key={m.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#888" }}>{m.label}</span>
                    <span style={{ fontSize: "12px", color: loadingUsage ? "#333" : "#555" }}>
                      {loadingUsage ? "—" : `${m.used.toLocaleString()} / ${m.limit.toLocaleString()}`}
                    </span>
                  </div>
                  <div style={{ height: "3px", background: "#2a2a2a", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: loadingUsage ? "0%" : `${pct}%`, background: color, borderRadius: "2px", transition: "width 0.4s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* API Keys */}
        <div style={section}>
          <div style={sectionTitle}>API Keys (Free Tier)</div>
          <div style={{ fontSize: "12px", color: "#555", marginBottom: "20px", fontStyle: "italic", lineHeight: "1.6" }}>
            On the Pro plan, API keys are managed by Forge. These fields are only needed on the Free plan.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { label: "Anthropic API Key", placeholder: "sk-ant-..." },
              { label: "Voice API Key", placeholder: "sk_..." },
              { label: "Image API Key", placeholder: "..." },
            ].map((k) => (
              <div key={k.label}>
                <label style={labelStyle}>{k.label}</label>
                <input type="password" placeholder={k.placeholder} style={inputStyle} />
              </div>
            ))}
            <button
              style={{ background: ACCENT, color: "#fff", border: "none", borderRadius: "6px", padding: "10px 20px", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}
              onClick={() => console.log("Save keys")}
            >
              Save Keys
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
