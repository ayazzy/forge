import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { saveChannelProfile, getChannelProfile, getUsage, getBilling, createPortalSession, deleteAccount } from "../lib/api";
import AppLayout from "../components/ui/AppLayout";

const ACCENT = "#e03535";

const TONES = [
  { value: "dark_serious",          label: "Dark & Serious" },
  { value: "neutral_educational",   label: "Neutral / Educational" },
  { value: "light_entertaining",    label: "Light & Entertaining" },
  { value: "dramatic_storytelling", label: "Dramatic Storytelling" },
  { value: "conversational",        label: "Conversational" },
];

const VIDEO_LENGTHS = [5, 8, 10, 12, 15, 20, 30];

const NOTIF_DEFAULTS = {
  pipeline_complete: true,
  weekly_digest: false,
  billing_alerts: true,
};

function loadNotifs() {
  try { return { ...NOTIF_DEFAULTS, ...JSON.parse(localStorage.getItem("forge_notifs") || "{}") }; }
  catch { return NOTIF_DEFAULTS; }
}

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Channel
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState(2);
  const [savingChannel, setSavingChannel] = useState(false);
  const [savedChannel, setSavedChannel] = useState(false);

  // Production defaults
  const [tone, setTone] = useState("neutral_educational");
  const [videoLength, setVideoLength] = useState(10);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [savedDefaults, setSavedDefaults] = useState(false);

  // Password
  const [passwordSent, setPasswordSent] = useState(false);
  const [sendingPassword, setSendingPassword] = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState(loadNotifs);
  const [savedNotifs, setSavedNotifs] = useState(false);

  // Usage
  const [usage, setUsage] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(true);

  // Billing
  const [billing, setBilling] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getChannelProfile().then(data => {
      if (data) {
        setChannelName(data.channel_name || "");
        setDescription(data.description || "");
        setWeeklyGoal(data.weekly_goal ?? 2);
        if (data.tone) setTone(data.tone);
        if (data.video_length) setVideoLength(data.video_length);
      }
    }).catch(() => {});
    getBilling().then(setBilling).catch(() => {});
    getUsage().then(setUsage).catch(() => {}).finally(() => setLoadingUsage(false));
  }, []);

  const handleSaveChannel = async () => {
    setSavingChannel(true);
    try {
      await saveChannelProfile({ channel_name: channelName, description, weekly_goal: Number(weeklyGoal) });
      setSavedChannel(true);
      setTimeout(() => setSavedChannel(false), 2500);
    } catch (e) { console.error(e); }
    finally { setSavingChannel(false); }
  };

  const handleSaveDefaults = async () => {
    setSavingDefaults(true);
    try {
      await saveChannelProfile({ tone, video_length: videoLength });
      setSavedDefaults(true);
      setTimeout(() => setSavedDefaults(false), 2500);
    } catch (e) { console.error(e); }
    finally { setSavingDefaults(false); }
  };

  const handleSendPasswordReset = async () => {
    setSendingPassword(true);
    try {
      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      setPasswordSent(true);
    } catch (e) { console.error(e); }
    finally { setSendingPassword(false); }
  };

  const handleSaveNotifs = () => {
    localStorage.setItem("forge_notifs", JSON.stringify(notifs));
    setSavedNotifs(true);
    setTimeout(() => setSavedNotifs(false), 2500);
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (e) { console.error(e); }
    finally { setPortalLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      await deleteAccount();
      await supabase.auth.signOut();
      navigate("/");
    } catch (e) {
      alert("Failed to delete account. Please contact support.");
    } finally {
      setDeleting(false);
    }
  };

  const planLabel = billing?.plan ? billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1) : "Free";
  const isTrialing = billing?.subscription_status === "trialing";
  const trialDaysLeft = billing?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(billing.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;
  const isPaid = billing?.plan && billing.plan !== "free";

  return (
    <AppLayout>
      <style>{`
        .s-input:focus { border-color: rgba(224,53,53,0.45) !important; box-shadow: 0 0 0 3px rgba(224,53,53,0.1) !important; outline: none; }
        .s-input { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .s-save-btn:hover:not(:disabled) { filter: brightness(1.1); }
        .s-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px !important; }
      `}</style>

      <div style={{ padding: "40px 48px", width: "100%", maxWidth: "760px", margin: "0 auto" }}>

        <div style={{ marginBottom: "36px" }}>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#fff" }}>Settings</div>
          <div style={{ fontSize: "14px", color: "#aaa", marginTop: "4px" }}>Manage your channel, account, and plan.</div>
        </div>

        {/* ── Channel ───────────────────────────────────────── */}
        <Section title="Channel" subtitle="Your channel identity — used across all pipeline stages.">
          <Field label="Channel Name">
            <input className="s-input" style={inputStyle} value={channelName} onChange={e => setChannelName(e.target.value)} placeholder="e.g. Unraveled" />
          </Field>
          <Field label="Channel Description">
            <textarea className="s-input" style={{ ...inputStyle, minHeight: "110px", resize: "vertical", lineHeight: "1.65" }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your channel — what you make, who your audience is, your tone and style…" />
          </Field>
          <Field label="Weekly Episode Goal">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input type="number" min="1" max="20" className="s-input" style={{ ...inputStyle, width: "88px" }} value={weeklyGoal} onChange={e => setWeeklyGoal(Math.max(1, parseInt(e.target.value) || 1))} />
              <span style={{ fontSize: "14px", color: "#aaa" }}>episodes per week</span>
            </div>
          </Field>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "4px" }}>
            <SaveButton saving={savingChannel} saved={savedChannel} onClick={handleSaveChannel} />
            <span style={{ fontSize: "13px", color: "#666" }}>
              To regenerate your production template,{" "}
              <Link to="/onboarding" style={{ color: ACCENT, textDecoration: "none" }}>run onboarding again</Link>.
            </span>
          </div>
        </Section>

        {/* ── Production Defaults ───────────────────────────── */}
        <Section title="Production Defaults" subtitle="Applied to every new episode in the pipeline.">
          <Field label="Content Tone">
            <select className="s-input s-select" style={inputStyle} value={tone} onChange={e => setTone(e.target.value)}>
              {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Target Video Length">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <select className="s-input s-select" style={{ ...inputStyle, width: "120px" }} value={videoLength} onChange={e => setVideoLength(Number(e.target.value))}>
                {VIDEO_LENGTHS.map(l => <option key={l} value={l}>{l} minutes</option>)}
              </select>
              <span style={{ fontSize: "13px", color: "#777" }}>≈ {Math.round(videoLength * 150).toLocaleString()} words</span>
            </div>
          </Field>
          <div style={{ marginTop: "4px" }}>
            <SaveButton saving={savingDefaults} saved={savedDefaults} onClick={handleSaveDefaults} />
          </div>
        </Section>

        {/* ── Account ───────────────────────────────────────── */}
        <Section title="Account" subtitle="Your login and security settings.">
          <Field label="Email address">
            <input readOnly value={user?.email || ""} style={{ ...inputStyle, color: "#777", cursor: "default", background: "#161616" }} />
          </Field>
          <Field label="Password">
            {passwordSent ? (
              <div style={{ fontSize: "14px", color: "#4ade80", padding: "10px 0" }}>
                ✓ Reset email sent to {user?.email}. Check your inbox.
              </div>
            ) : (
              <button
                onClick={handleSendPasswordReset}
                disabled={sendingPassword}
                style={{ background: "none", border: "1px solid #2a2a2a", color: "#aaa", borderRadius: "8px", padding: "10px 18px", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}
              >
                {sendingPassword ? "Sending…" : "Send password reset email"}
              </button>
            )}
          </Field>
        </Section>

        {/* ── Notifications ─────────────────────────────────── */}
        <Section title="Notifications" subtitle="Control which emails Forge sends you.">
          {[
            { key: "pipeline_complete", label: "Pipeline completion", desc: "Email when an episode finishes a stage" },
            { key: "weekly_digest",     label: "Weekly trend digest", desc: "Top trending topics for your channel every Monday" },
            { key: "billing_alerts",    label: "Billing alerts",      desc: "Receipts, renewal reminders, and plan changes" },
          ].map(n => (
            <div key={n.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "15px", color: "#ddd", fontWeight: "500", marginBottom: "2px" }}>{n.label}</div>
                <div style={{ fontSize: "13px", color: "#777" }}>{n.desc}</div>
              </div>
              <Toggle checked={notifs[n.key]} onChange={v => setNotifs(prev => ({ ...prev, [n.key]: v }))} />
            </div>
          ))}
          <div style={{ marginTop: "4px" }}>
            <SaveButton saving={false} saved={savedNotifs} onClick={handleSaveNotifs} label="Save Preferences" />
          </div>
        </Section>

        {/* ── Plan & Billing ────────────────────────────────── */}
        <Section title="Plan & Billing" subtitle="Your current plan and billing management.">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ background: isPaid ? ACCENT : "#252525", color: isPaid ? "#fff" : "#aaa", fontSize: "12px", fontWeight: "700", padding: "5px 12px", borderRadius: "6px", letterSpacing: "0.6px", textTransform: "uppercase" }}>
              {planLabel}
            </div>
            {isTrialing && trialDaysLeft !== null && (
              <div style={{ fontSize: "13px", color: "#d97706", background: "rgba(217,119,6,0.1)", padding: "4px 10px", borderRadius: "6px", fontWeight: "500" }}>
                Trial · {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining
              </div>
            )}
            <div style={{ flex: 1 }} />
            {isPaid ? (
              <button onClick={handleManageBilling} disabled={portalLoading} style={{ background: "none", border: "1px solid #333", color: "#aaa", fontSize: "13px", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", fontWeight: "500" }}>
                {portalLoading ? "Loading…" : "Manage Billing →"}
              </button>
            ) : (
              <Link to="/pricing" style={{ fontSize: "13px", color: ACCENT, textDecoration: "none", fontWeight: "600" }}>Upgrade →</Link>
            )}
          </div>
          {billing && (
            <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "20px 24px", display: "flex", gap: "32px", flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: "600" }}>Monthly Episodes</div>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#fff" }}>
                  {billing.monthly_remaining ?? "—"}
                  <span style={{ fontSize: "15px", color: "#555", fontWeight: "400" }}> / {billing.monthly_limit ?? "—"}</span>
                </div>
              </div>
              {billing.purchased_credits > 0 && (
                <div>
                  <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: "600" }}>Purchased Credits</div>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "#4ade80" }}>{billing.purchased_credits}</div>
                </div>
              )}
              <div style={{ flex: 1 }} />
              <Link to="/pricing" style={{ fontSize: "13px", color: "#777", textDecoration: "none", fontWeight: "500" }}>Buy more →</Link>
            </div>
          )}

          {/* Usage meters */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#999", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "16px" }}>
              Usage this month
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { label: "AI Calls",         key: "claude_calls",            limitKey: "claude_calls" },
                { label: "Voice Characters",  key: "elevenlabs_characters",   limitKey: "elevenlabs_characters" },
                { label: "Image Generations", key: "ideogram_generations",    limitKey: "ideogram_generations" },
              ].map(m => {
                const FALLBACK = { claude_calls: 300, elevenlabs_characters: 75000, ideogram_generations: 50 };
                const used = usage?.[m.key] || 0;
                const limit = usage?.limits?.[m.limitKey] || FALLBACK[m.limitKey];
                const pct = Math.min((used / limit) * 100, 100);
                const barColor = pct > 90 ? "#e03535" : pct > 70 ? "#d97706" : "#e03535";
                return (
                  <div key={m.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "7px" }}>
                      <span style={{ fontSize: "14px", color: "#ccc", fontWeight: "500" }}>{m.label}</span>
                      <span style={{ fontSize: "13px", color: loadingUsage ? "#333" : pct > 90 ? "#e03535" : "#777" }}>
                        {loadingUsage ? "—" : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
                      </span>
                    </div>
                    <div style={{ height: "4px", background: "#252525", borderRadius: "4px" }}>
                      <div style={{ height: "100%", width: loadingUsage ? "0%" : `${pct}%`, background: barColor, borderRadius: "4px", transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: "12px", color: "#555", marginTop: "14px" }}>
              Resets on the 1st of each month.
            </div>
          </div>
        </Section>

        {/* ── Danger Zone ───────────────────────────────────── */}
        <Section title="Danger Zone" subtitle="Permanent actions that cannot be undone.">
          <div style={{ background: "rgba(224,53,53,0.04)", border: "1px solid rgba(224,53,53,0.15)", borderRadius: "10px", padding: "20px 24px" }}>
            <div style={{ fontSize: "15px", color: "#fff", fontWeight: "600", marginBottom: "6px" }}>Delete account</div>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "20px", lineHeight: "1.6" }}>
              This permanently deletes your account, all episodes, and all production data. Your subscription will be cancelled. This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <input
                className="s-input"
                style={{ ...inputStyle, width: "200px", fontSize: "14px" }}
                placeholder='Type "DELETE" to confirm'
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
              />
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== "DELETE" || deleting}
                style={{
                  background: deleteConfirm === "DELETE" ? ACCENT : "#222",
                  color: deleteConfirm === "DELETE" ? "#fff" : "#555",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: deleteConfirm === "DELETE" ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                  transition: "background 0.15s ease",
                }}
              >
                {deleting ? "Deleting…" : "Delete my account"}
              </button>
            </div>
          </div>
        </Section>

      </div>
    </AppLayout>
  );
}

/* ── helpers ─────────────────────────────────────────────────── */

function Section({ title, subtitle, children }) {
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "28px 32px", marginBottom: "20px" }}>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>{title}</div>
        {subtitle && <div style={{ fontSize: "13px", color: "#777", marginTop: "4px" }}>{subtitle}</div>}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.4px", color: "#999", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SaveButton({ saving, saved, onClick, label = "Save Changes" }) {
  return (
    <button
      className="s-save-btn"
      onClick={onClick}
      disabled={saving}
      style={{
        background: saved ? "#0a2a1a" : ACCENT,
        color: saved ? "#4ade80" : "#fff",
        border: saved ? "1px solid #14532d" : "1px solid transparent",
        borderRadius: "8px",
        padding: "10px 22px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: saving ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        transition: "background 0.2s ease, color 0.2s ease",
      }}
    >
      {saving ? "Saving…" : saved ? "✓ Saved" : label}
    </button>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: "44px",
        height: "24px",
        borderRadius: "12px",
        background: checked ? ACCENT : "#2a2a2a",
        border: "none",
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
        transition: "background 0.2s ease",
        padding: 0,
      }}
    >
      <span style={{
        position: "absolute",
        top: "3px",
        left: checked ? "23px" : "3px",
        width: "18px",
        height: "18px",
        borderRadius: "50%",
        background: "#fff",
        transition: "left 0.2s ease",
        display: "block",
      }} />
    </button>
  );
}

const inputStyle = {
  width: "100%",
  background: "#1e1e1e",
  border: "1px solid #2a2a2a",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "15px",
  color: "#fff",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
