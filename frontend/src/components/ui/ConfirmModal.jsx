import { useEffect, useRef } from "react";

const ACCENT = "#e03535";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  variant = "danger",
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    // Focus confirm button when modal opens
    setTimeout(() => confirmRef.current?.focus(), 50);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const confirmColor = variant === "danger" ? ACCENT : "#d97706";

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        style={{
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          borderRadius: "12px",
          padding: "28px 32px",
          width: "100%",
          maxWidth: "420px",
        }}
      >
        <div id="confirm-modal-title" style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "10px" }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: "14px", color: "#888", lineHeight: "1.6", marginBottom: "24px" }}>
            {description}
          </div>
        )}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #333",
              color: "#aaa",
              borderRadius: "8px",
              padding: "9px 18px",
              fontSize: "13px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={() => { onConfirm(); onClose(); }}
            style={{
              background: confirmColor,
              border: "none",
              color: "#fff",
              borderRadius: "8px",
              padding: "9px 18px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
