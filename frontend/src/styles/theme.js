import React from "react";

export const ACCENT = "#e03535";
export const ACCENT_HOVER = "#c42b2b";
export const ACCENT_LIGHT = "#2a1515";

export const VOICE_PALETTE = ["#e03535","#2563eb","#7c3aed","#059669","#d97706","#0891b2"];

export const TAG_COLORS = {
  "[pause]": "#d97706",
  "[short pause]": "#f59e0b",
  "[long pause]": "#ef4444",
  "[dramatic tone]": "#8b5cf6"
};

export const REASON_COLORS = {
  opening: "#2563eb",
  closing: "#2563eb",
  "mood shift": "#e03535",
  pacing: "#059669"
};

export const APPROACH_COLORS = {
  "Image-led": "#2563eb",
  "Text-led": "#e03535",
  "Emotion-led": "#7c3aed"
};

export const COLORS = {
  background: "#111111",
  surface: "#1a1a1a",
  surfaceSecondary: "#222222",
  surfaceTertiary: "#2a2a2a",
  border: "#222222",
  borderLight: "#1e1e1e",
  text: "#ffffff",
  textSecondary: "#888888",
  textTertiary: "#444444",
  success: "#4ade80",
  successBg: "#0a2a1a",
  successBorder: "#14532d",
  warning: "#d97706",
  error: "#e03535",
  accent: "#e03535",
};

export const S = {
  app: {
    minHeight: "100vh",
    background: COLORS.background,
    color: COLORS.text,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    display: "flex",
    flexDirection: "column",
  },

  pageContent: {
    flex: 1,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },

  header: {
    background: COLORS.surface,
    borderBottom: `1px solid ${COLORS.border}`,
    padding: "0 40px",
    display: "flex",
    alignItems: "center",
    height: "52px",
    gap: "16px",
    position: "sticky",
    top: 0,
    zIndex: 40,
  },

  logoText: {
    fontSize: "13px",
    fontWeight: "800",
    letterSpacing: "2px",
    color: ACCENT,
  },

  divider: {
    width: "1px",
    height: "16px",
    background: COLORS.border,
  },

  stageLabel: {
    fontSize: "12px",
    color: COLORS.textSecondary,
  },

  stageBar: {
    display: "flex",
    overflowX: "auto",
    background: COLORS.surface,
    borderBottom: `1px solid ${COLORS.border}`,
    padding: "0 32px",
    gap: "2px",
  },

  stageTab: (active, done) => ({
    padding: "14px 18px",
    border: "none",
    background: "transparent",
    borderBottom: active
      ? `2px solid ${ACCENT}`
      : done
      ? "2px solid #4ade80"
      : "2px solid transparent",
    color: active ? "#fff" : done ? "#4ade80" : COLORS.textTertiary,
    fontSize: "11px",
    fontWeight: active ? "600" : "400",
    letterSpacing: "0.2px",
    cursor: done || active ? "pointer" : "not-allowed",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    opacity: !active && !done ? 0.3 : 1,
    transition: "all 0.15s ease",
  }),

  content: {
    padding: "32px 40px",
    maxWidth: "1000px",
    margin: "0 auto",
    width: "100%",
  },

  card: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "12px",
  },

  cardElevated: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "16px",
  },

  label: {
    fontSize: "10px",
    fontWeight: "600",
    letterSpacing: "0.8px",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    display: "block",
    marginBottom: "8px",
  },

  sectionTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: "4px",
  },

  sectionSubtitle: {
    fontSize: "12px",
    color: COLORS.textSecondary,
    marginBottom: "20px",
    lineHeight: "1.5",
  },

  input: {
    width: "100%",
    background: COLORS.surfaceSecondary,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.text,
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    outline: "none",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    transition: "border-color 0.15s ease",
    boxSizing: "border-box",
  },

  textarea: (h = 200) => ({
    width: "100%",
    background: COLORS.surfaceSecondary,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.text,
    padding: "12px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    outline: "none",
    resize: "vertical",
    minHeight: `${h}px`,
    lineHeight: "1.7",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    boxSizing: "border-box",
  }),

  btnPrimary: (disabled) => ({
    background: disabled ? COLORS.surfaceTertiary : ACCENT,
    border: "none",
    color: disabled ? COLORS.textTertiary : "#fff",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    transition: "background 0.15s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  }),

  btnSecondary: (active) => ({
    background: active ? "#0a2a1a" : COLORS.surfaceSecondary,
    border: `1px solid ${active ? "#14532d" : COLORS.border}`,
    color: active ? "#4ade80" : COLORS.textSecondary,
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    transition: "all 0.15s ease",
  }),

  btnApprove: {
    background: "#0a2a1a",
    border: "1px solid #14532d",
    color: "#4ade80",
    padding: "11px 24px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },

  btnGhost: {
    background: "none",
    border: "none",
    color: COLORS.textSecondary,
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    cursor: "pointer",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
  },

  statRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: `1px solid ${COLORS.borderLight}`,
  },

  statLabel: {
    fontSize: "12px",
    color: COLORS.textSecondary,
  },

  statValue: {
    fontSize: "13px",
    color: COLORS.text,
    fontWeight: "600",
  },

  chunk: {
    background: COLORS.surfaceSecondary,
    border: `1px solid ${COLORS.border}`,
    padding: "14px 16px",
    fontFamily: "monospace",
    fontSize: "12px",
    borderRadius: "8px",
    lineHeight: "1.7",
    color: "#aaa",
  },

  promptCard: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "10px",
    marginBottom: "10px",
    overflow: "hidden",
  },

  promptHeader: {
    padding: "10px 16px",
    borderBottom: `1px solid ${COLORS.borderLight}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: COLORS.surfaceSecondary,
  },

  promptBody: {
    padding: "14px 16px",
    fontFamily: "monospace",
    fontSize: "11px",
    color: "#888",
    lineHeight: "1.6",
  },

  slider: {
    width: "100%",
    accentColor: ACCENT,
    cursor: "pointer",
  },

  tag: (color) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: "600",
    letterSpacing: "0.3px",
    background: `${color}20`,
    color: color,
    textTransform: "uppercase",
  }),

  badge: (color = ACCENT) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: "20px",
    fontSize: "10px",
    fontWeight: "600",
    background: `${color}20`,
    color: color,
  }),
};

export function renderTagged(text) {
  return text.split(/(\[(?:long pause|short pause|pause|dramatic tone)\])/g).map((part, i) => {
    const c = TAG_COLORS[part];
    return c
      ? React.createElement("span", { key: i, style: { color: c, fontWeight: "600", fontSize: "11px" } }, part)
      : React.createElement("span", { key: i }, part);
  });
}
