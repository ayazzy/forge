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

export default function Terms() {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <Link to="/" style={{ fontSize: "13px", fontWeight: "800", letterSpacing: "3px", color: ACCENT, textDecoration: "none", display: "block", marginBottom: "48px" }}>FORGE</Link>

        <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#fff", marginBottom: "8px", marginTop: 0 }}>Terms of Service</h1>
        <p style={{ ...paraStyle, marginBottom: "32px" }}>Last updated: [DATE]. Please read these terms carefully before using Forge.</p>

        <div style={{ height: "1px", background: "#222", marginBottom: "32px" }} />

        <Section title="Acceptance of Terms">
          <div style={placeholderStyle}>[LEGAL REVIEW NEEDED] — Acceptance clause</div>
          <p style={paraStyle}>By accessing or using Forge, you agree to be bound by these Terms of Service. If you do not agree, you may not use the service.</p>
        </Section>

        <Section title="Account">
          <div style={placeholderStyle}>[LEGAL REVIEW NEEDED] — Account responsibilities and eligibility</div>
          <p style={paraStyle}>You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account.</p>
        </Section>

        <Section title="Subscriptions & Billing">
          <div style={placeholderStyle}>[LEGAL REVIEW NEEDED] — Subscription terms, billing cycles, refund policy</div>
          <p style={paraStyle}>Forge offers monthly subscriptions (Creator, Studio, Pro) and one-time episode packs. All plans include a 7-day free trial. Subscriptions renew automatically unless cancelled. You may cancel at any time through the billing portal.</p>
        </Section>

        <Section title="AI-Generated Content Ownership">
          <div style={placeholderStyle}>[LEGAL REVIEW NEEDED] — Content ownership, licensing, and AI-generated content policy</div>
          <p style={paraStyle}>Content generated using Forge (scripts, research briefs, image prompts, metadata) is provided for your use. You retain ownership of content you create. Forge does not claim rights to your generated output.</p>
        </Section>

        <Section title="Usage Limits">
          <div style={placeholderStyle}>[LEGAL REVIEW NEEDED] — Acceptable use, rate limits, prohibited uses</div>
          <p style={paraStyle}>Each plan includes a set number of episodes per month and API call limits. Exceeding limits may result in throttling. Abuse of the service may result in account suspension.</p>
        </Section>

        <Section title="Cancellation">
          <div style={placeholderStyle}>[LEGAL REVIEW NEEDED] — Cancellation and data retention policy</div>
          <p style={paraStyle}>You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. Your data will be retained for 30 days after cancellation unless you request deletion.</p>
        </Section>

        <Section title="Limitation of Liability">
          <div style={placeholderStyle}>[LEGAL REVIEW NEEDED] — Liability cap and disclaimers</div>
          <p style={paraStyle}>Forge is provided "as is" without warranty of any kind. To the maximum extent permitted by law, Forge shall not be liable for indirect, incidental, or consequential damages.</p>
        </Section>

        <Section title="Governing Law">
          <div style={placeholderStyle}>[LEGAL REVIEW NEEDED] — Jurisdiction and dispute resolution</div>
          <p style={paraStyle}>These terms are governed by the laws of [JURISDICTION]. Disputes shall be resolved through binding arbitration.</p>
        </Section>

        <div style={{ height: "1px", background: "#222", marginTop: "48px", marginBottom: "24px" }} />
        <div style={{ display: "flex", gap: "24px", fontSize: "13px" }}>
          <Link to="/privacy" style={{ color: "#777", textDecoration: "none" }}>Privacy Policy</Link>
          <Link to="/" style={{ color: "#777", textDecoration: "none" }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
