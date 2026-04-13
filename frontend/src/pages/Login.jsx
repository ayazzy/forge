import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  padding: "10px 12px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  color: "#fff",
  fontFamily: "inherit",
};

const labelStyle = {
  fontSize: "11px",
  fontWeight: "600",
  letterSpacing: "0.3px",
  color: "#888",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "6px",
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
    } else {
      navigate(redirectTo);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: "13px", fontWeight: "800", letterSpacing: "2px", textAlign: "center", marginBottom: "32px", color: ACCENT }}>FORGE</div>
        <div style={{ fontSize: "20px", fontWeight: "700", color: "#fff", marginBottom: "24px", textAlign: "center" }}>Sign in</div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
          </div>
          {error && (
            <div style={{ fontSize: "12px", color: "#e03535", background: "#2a1515", border: "1px solid #3a1515", borderRadius: "6px", padding: "8px 12px" }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} style={{ background: loading ? "#2a2a2a" : ACCENT, color: loading ? "#555" : "#fff", border: "none", borderRadius: "6px", padding: "11px", fontSize: "13px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", marginTop: "4px", fontFamily: "inherit" }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <Link to="/signup" style={{ fontSize: "13px", color: "#555", textDecoration: "none" }}>Don't have an account? <span style={{ color: ACCENT }}>Sign up</span></Link>
          <Link to="/" style={{ fontSize: "12px", color: "#333", textDecoration: "none" }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
