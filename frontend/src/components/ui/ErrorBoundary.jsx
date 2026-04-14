import { Component } from "react";

const ACCENT = "#e03535";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Caught render error:", error, info.componentStack);
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { stageMode, message } = this.props;

    if (stageMode) {
      return (
        <div style={{
          background: "#1a1a1a",
          border: `1px solid ${ACCENT}33`,
          borderRadius: "10px",
          padding: "32px 28px",
          textAlign: "center",
          margin: "16px 0",
        }}>
          <div style={{ fontSize: "22px", marginBottom: "12px" }}>⚠️</div>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#fff", marginBottom: "8px" }}>
            {message || "This stage encountered an error."}
          </div>
          <div style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>
            Your other stages are safe. Click Retry to try again.
          </div>
          <button
            onClick={() => this.reset()}
            style={{
              background: ACCENT,
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 22px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div style={{
        minHeight: "100vh",
        background: "#111",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "-apple-system, BlinkMacSystemFont, Inter, sans-serif",
        padding: "32px",
      }}>
        <div style={{
          background: "#1a1a1a",
          border: "1px solid #222",
          borderRadius: "12px",
          padding: "48px",
          width: "100%",
          maxWidth: "440px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "13px", fontWeight: "800", letterSpacing: "3px", color: ACCENT, marginBottom: "32px" }}>FORGE</div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: "#fff", marginBottom: "10px" }}>Something went wrong</div>
          <div style={{ fontSize: "14px", color: "#888", marginBottom: "28px", lineHeight: "1.6" }}>
            Try refreshing the page or going back to the dashboard.
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: ACCENT,
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "11px 22px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Refresh
            </button>
            <button
              onClick={() => { window.location.href = "/dashboard"; }}
              style={{
                background: "none",
                color: "#aaa",
                border: "1px solid #333",
                borderRadius: "8px",
                padding: "11px 22px",
                fontSize: "14px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
