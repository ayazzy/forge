import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const ACCENT = "#e03535";

const pageStyle = {
  minHeight: "100vh",
  background: "#111",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif",
  padding: "32px",
};

const cardStyle = {
  background: "#1a1a1a",
  border: "1px solid #222",
  borderRadius: "12px",
  padding: "48px",
  width: "100%",
  maxWidth: "400px",
};

const inputStyle = {
  width: "100%",
  background: "#222",
  border: "1px solid #2a2a2a",
  borderRadius: "6px",
  padding: "11px 14px",
  fontSize: "15px",
  outline: "none",
  boxSizing: "border-box",
  color: "#fff",
  fontFamily: "inherit",
};

const labelStyle = {
  fontSize: "12px",
  fontWeight: "600",
  letterSpacing: "0.3px",
  color: "#aaa",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "6px",
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase handles the recovery token from the URL hash fragment automatically
    // We just need to listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    // Also mark ready if there's a recovery token in the hash
    if (window.location.hash.includes('type=recovery')) {
      setReady(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      navigate("/login?reset=success");
    }
  };

  if (!ready) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: "13px", fontWeight: "800", letterSpacing: "3px", textAlign: "center", marginBottom: "32px", color: ACCENT }}>FORGE</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "15px", color: "#888" }}>Validating reset link…</div>
            <div style={{ fontSize: "12px", color: "#555", marginTop: "12px" }}>
              If nothing happens, <a href="/forgot-password" style={{ color: ACCENT, textDecoration: "none" }}>request a new link</a>.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: "13px", fontWeight: "800", letterSpacing: "3px", textAlign: "center", marginBottom: "32px", color: ACCENT }}>FORGE</div>
        <div style={{ fontSize: "22px", fontWeight: "700", color: "#fff", marginBottom: "8px", textAlign: "center" }}>Set new password</div>
        <div style={{ fontSize: "14px", color: "#888", textAlign: "center", marginBottom: "28px" }}>Choose a strong password for your account.</div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={labelStyle}>New password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
          </div>
          {error && (
            <div style={{ fontSize: "12px", color: "#e03535", background: "#2a1515", border: "1px solid #3a1515", borderRadius: "6px", padding: "8px 12px" }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ background: loading ? "#2a2a2a" : ACCENT, color: loading ? "#888" : "#fff", border: "none", borderRadius: "6px", padding: "12px", fontSize: "15px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
