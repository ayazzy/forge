import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { saveChannelProfile, getChannelProfile } from "../lib/api";
import AppLayout from "../components/ui/AppLayout";

const ACCENT = "#e03535";

const labelStyle = { fontSize: "11px", fontWeight: "600", letterSpacing: "0.3px", color: "#888", textTransform: "uppercase", display: "block", marginBottom: "6px" };
const inputStyle = { width: "100%", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "9px 12px", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#222", color: "#fff", fontFamily: "inherit" };
const section = { background: "#1a1a1a", border: "1px solid #222", borderRadius: "10px", padding: "24px", marginBottom: "16px" };
const sectionTitle = { fontSize: "11px", fontWeight: "600", letterSpacing: "1.5px", textTransform: "uppercase", color: "#555", marginBottom: "20px" };

export default function Settings() {
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getChannelProfile().then(data => {
      if (data) {
        setChannelName(data.channel_name || "");
        setDescription(data.description || "");
      }
    }).catch(() => {});
  }, []);

  const handleSaveChannel = async () => {
    setSaving(true);
    try {
      await saveChannelProfile({ channel_name: channelName, description });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save channel settings:", e);
    } finally {
      setSaving(false);
    }
  };

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
            <button
              style={{ background: saved ? "#0a2a1a" : ACCENT, color: saved ? "#4ade80" : "#fff", border: saved ? "1px solid #14532d" : "none", borderRadius: "6px", padding: "10px 20px", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}
              onClick={handleSaveChannel}
              disabled={saving}
            >
              {saving ? "Saving..." : saved ? "✓ Saved" : "Save Channel Settings"}
            </button>
            <div style={{ fontSize: "11px", color: "#555", fontStyle: "italic" }}>
              To regenerate your full production template (research prompts, script style, image aesthetic), go through{" "}
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
              <input readOnly value="user@example.com" style={{ ...inputStyle, color: "#555" }} />
            </div>
            <div>
              <button
                style={{ background: "none", border: "1px solid #333", color: "#888", padding: "8px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" }}
                onClick={() => console.log("Change password")}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Plan */}
        <div style={section}>
          <div style={sectionTitle}>Plan</div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <div style={{ background: ACCENT, color: "#fff", fontSize: "11px", fontWeight: "700", padding: "4px 10px", borderRadius: "4px", letterSpacing: "0.5px" }}>PRO</div>
            <button
              style={{ background: "none", border: "1px solid #333", color: "#888", padding: "8px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" }}
              onClick={() => console.log("Manage billing")}
            >
              Manage Billing
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { label: "Claude Calls", used: 0, limit: 500 },
              { label: "ElevenLabs Characters", used: 0, limit: 100000 },
              { label: "Images", used: 0, limit: 200 },
            ].map((m) => (
              <div key={m.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#888" }}>{m.label}</span>
                  <span style={{ fontSize: "12px", color: "#555" }}>{m.used.toLocaleString()} / {m.limit.toLocaleString()}</span>
                </div>
                <div style={{ height: "3px", background: "#2a2a2a", borderRadius: "2px" }}>
                  <div style={{ height: "100%", width: `${(m.used / m.limit) * 100}%`, background: ACCENT, borderRadius: "2px" }} />
                </div>
              </div>
            ))}
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
              { label: "ElevenLabs API Key", placeholder: "sk_..." },
              { label: "Ideogram API Key", placeholder: "..." },
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
