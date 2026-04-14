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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/>
      <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" fill="#34A853"/>
      <path d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" fill="#FBBC05"/>
      <path d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" fill="#EA4335"/>
    </svg>
  );
}

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
        <div style={{ fontSize: "13px", fontWeight: "800", letterSpacing: "3px", textAlign: "center", marginBottom: "32px", color: ACCENT }}>FORGE</div>
        <div style={{ fontSize: "22px", fontWeight: "700", color: "#fff", marginBottom: "24px", textAlign: "center" }}>Sign in</div>

        <button
          type="button"
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${redirectTo}` } })}
          style={{ width: "100%", background: "#fff", color: "#111", border: "none", borderRadius: "8px", padding: "11px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "20px" }}
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ flex: 1, height: "1px", background: "#222" }} />
          <span style={{ fontSize: "12px", color: "#777" }}>or</span>
          <div style={{ flex: 1, height: "1px", background: "#222" }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
            <div style={{ textAlign: "right", marginTop: "6px" }}>
              <Link to="/forgot-password" style={{ fontSize: "12px", color: "#555", textDecoration: "none" }}>Forgot password?</Link>
            </div>
          </div>
          {error && (
            <div style={{ fontSize: "12px", color: "#e03535", background: "#2a1515", border: "1px solid #3a1515", borderRadius: "6px", padding: "8px 12px" }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} style={{ background: loading ? "#2a2a2a" : ACCENT, color: loading ? "#888" : "#fff", border: "none", borderRadius: "6px", padding: "12px", fontSize: "15px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", marginTop: "4px", fontFamily: "inherit" }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <Link to="/signup" style={{ fontSize: "14px", color: "#aaa", textDecoration: "none" }}>Don't have an account? <span style={{ color: ACCENT }}>Sign up</span></Link>
          <Link to="/" style={{ fontSize: "13px", color: "#777", textDecoration: "none" }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
