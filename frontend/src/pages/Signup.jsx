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

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/onboarding";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate(redirectTo), 3100);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: "13px", fontWeight: "800", letterSpacing: "2px", textAlign: "center", marginBottom: "32px", color: ACCENT }}>FORGE</div>
        <div style={{ fontSize: "20px", fontWeight: "700", color: "#fff", marginBottom: "24px", textAlign: "center" }}>Create account</div>

        {!success && (
          <>
            <button
              type="button"
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${redirectTo}` } })}
              style={{ width: "100%", background: "#fff", color: "#111", border: "none", borderRadius: "8px", padding: "11px", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "20px" }}
            >
              <GoogleIcon /> Continue with Google
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <div style={{ flex: 1, height: "1px", background: "#222" }} />
              <span style={{ fontSize: "11px", color: "#444" }}>or</span>
              <div style={{ flex: 1, height: "1px", background: "#222" }} />
            </div>
          </>
        )}

        {success ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: "14px", color: "#4ade80", marginBottom: "8px" }}>✓ Account created</div>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>Check your email to confirm your account.</div>
            <div style={{ fontSize: "12px", color: "#555", marginBottom: "10px" }}>
              {redirectTo === "/onboarding" ? "Setting up your channel profile…" : "Taking you in…"}
            </div>
            <div style={{ height: "3px", background: "#222", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{
                height: "100%", background: ACCENT, borderRadius: "2px",
                animation: "fillBar 3s linear forwards",
              }} />
            </div>
            <style>{`@keyframes fillBar { from { width: 0% } to { width: 100% } }`}</style>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required style={inputStyle} />
            </div>
            {error && (
              <div style={{ fontSize: "12px", color: "#e03535", background: "#2a1515", border: "1px solid #3a1515", borderRadius: "6px", padding: "8px 12px" }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{ background: loading ? "#2a2a2a" : ACCENT, color: loading ? "#555" : "#fff", border: "none", borderRadius: "6px", padding: "11px", fontSize: "13px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", marginTop: "4px", fontFamily: "inherit" }}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <Link to="/login" style={{ fontSize: "13px", color: "#555", textDecoration: "none" }}>Already have an account? <span style={{ color: ACCENT }}>Sign in</span></Link>
          <Link to="/" style={{ fontSize: "12px", color: "#333", textDecoration: "none" }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
