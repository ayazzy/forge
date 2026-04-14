import { useState } from "react";
import { Link } from "react-router-dom";
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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://www.tryforge.studio/reset-password",
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: "13px", fontWeight: "800", letterSpacing: "3px", textAlign: "center", marginBottom: "32px", color: ACCENT }}>FORGE</div>
        <div style={{ fontSize: "22px", fontWeight: "700", color: "#fff", marginBottom: "8px", textAlign: "center" }}>Reset password</div>
        <div style={{ fontSize: "14px", color: "#888", textAlign: "center", marginBottom: "28px" }}>
          Enter your email and we'll send you a reset link.
        </div>

        {sent ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>✉️</div>
            <div style={{ fontSize: "15px", color: "#4ade80", fontWeight: "600", marginBottom: "8px" }}>Check your email</div>
            <div style={{ fontSize: "13px", color: "#888", lineHeight: "1.6" }}>
              We sent a password reset link to <strong style={{ color: "#ccc" }}>{email}</strong>. Check your inbox (and spam folder).
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
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
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <Link to="/login" style={{ fontSize: "13px", color: "#777", textDecoration: "none" }}>← Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
