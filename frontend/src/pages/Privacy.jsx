import { Link } from "react-router-dom";

const ACCENT = "#e03535";

const pageStyle = {
  minHeight: "100vh",
  background: "#111",
  fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif",
  color: "#ccc",
};

const containerStyle = {
  maxWidth: "740px",
  margin: "0 auto",
  padding: "60px 32px",
};

const headingStyle = {
  fontSize: "14px",
  fontWeight: "700",
  color: "#fff",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: "8px",
  marginTop: "36px",
};

const paraStyle = {
  fontSize: "14px",
  lineHeight: "1.8",
  color: "#aaa",
};

const placeholderStyle = {
  fontSize: "12px",
  color: "#555",
  fontStyle: "italic",
  background: "#1a1a1a",
  border: "1px dashed #333",
  borderRadius: "6px",
  padding: "8px 12px",
  marginBottom: "12px",
};

function Section({ title, children }) {
  return (
    <div>
      <div style={headingStyle}>{title}</div>
      {children}
    </div>
  );
}

export default function Privacy() {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Link to="/" style={{ fontSize: "13px", fontWeight: "800", letterSpacing: "3px", color: ACCENT, textDecoration: "none", display: "block", marginBottom: "48px" }}>FORGE</Link>

        <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#fff", marginBottom: "8px", marginTop: 0 }}>Privacy Policy</h1>
        <p style={{ ...paraStyle, marginBottom: "32px" }}>Last updated: [DATE]. This policy explains how Forge collects, uses, and protects your data.</p>

        <div style={{ height: "1px", background: "#222", marginBottom: "32px" }} />

        <Section title="Data We Collect">
          <div style={placeholderStyle}>[LEGAL REVIEW NEEDED] — Full data collection inventory</div>
          <p style={paraStyle}>We collect: email address and authentication data, payment information (processed by Stripe — we do not store card details), channel profile and production settings, content generated through the pipeline (topics, scripts, research), and usage data (API calls, episodes created).</p>
        </Section>

        <Section title="How We Use It">
          <div style={placeholderStyle}>[LEGAL REVIEW NEEDED] — Legal basis for processing</div>
          <p style={paraStyle}>We use your data to provide and improve the Forge service, process payments, send transactional emails (billing confirmations, trial reminders), and personalise your production experience.</p>
        </Section>

        <Section title="Third-Party Services">
          <div style={placeholderStyle}>[LEGAL REVIEW NEEDED] — Third-party DPAs and data sharing details</div>
          <p style={paraStyle}>Forge uses the following third-party services:</p>
          <ul style={{ ...paraStyle, paddingLeft: "20px" }}>
            <li><strong style={{ color: "#ccc" }}>Supabase</strong> — database and authentication</li>
            <li><strong style={{ color: "#ccc" }}>Stripe</strong> — payment processing</li>
            <li><strong style={{ color: "#ccc" }}>Anthropic</strong> — AI content generation (your prompts are sent to Anthropic's API)</li>
            <li><strong style={{ color: "#ccc" }}>ElevenLabs</strong> — voice synthesis (script text is sent to ElevenLabs)</li>
          </ul>
        </Section>

        <Section title="Data Retention">
          <div style={placeholderStyle}>[LEGAL REVIEW NEEDED] — Retention periods by data type</div>
          <p style={paraStyle}>We retain your data for as long as your account is active. After cancellation, data is retained for 30 days then deleted. You may request immediate deletion at any time.</p>
        </Section>

        <Section title="Your Rights (Deletion & Export)">
          <div style={placeholderStyle}>[LEGAL REVIEW NEEDED] — Full GDPR/CCPA rights statement</div>
          <p style={paraStyle}>You have the right to: access your data, correct inaccurate data, request deletion of your account and all associated data (available in Settings → Danger Zone), and data portability. To exercise these rights, use the in-app controls or contact us.</p>
        </Section>

        <Section title="Contact">
          <div style={placeholderStyle}>[LEGAL REVIEW NEEDED] — Data controller contact and DPO details</div>
          <p style={paraStyle}>For privacy questions or data requests, contact us at [EMAIL].</p>
        </Section>

        <div style={{ height: "1px", background: "#222", marginTop: "48px", marginBottom: "24px" }} />
        <div style={{ display: "flex", gap: "24px", fontSize: "13px" }}>
          <Link to="/terms" style={{ color: "#777", textDecoration: "none" }}>Terms of Service</Link>
          <Link to="/" style={{ color: "#777", textDecoration: "none" }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
