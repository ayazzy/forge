import { useState } from "react";

const ACCENT = "#e03535";

function EpisodeLibrary({ episodes, onLoad, onClose, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = async (id) => {
    await onDelete(id);
    setConfirmDelete(null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "14px", width: "600px", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>Episode Library</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "20px", lineHeight: "1", padding: "0 4px", fontFamily: "inherit" }}>×</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 24px" }}>
          {episodes.length === 0 && (
            <div style={{ color: "#444", fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "40px 0" }}>
              No episodes saved yet — complete your first pipeline run to see them here.
            </div>
          )}
          {episodes.map((ep) => (
            <div
              key={ep.id}
              style={{ background: "#222", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "14px 18px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: "500", color: "#fff", marginBottom: "4px" }}>{ep.title || "Untitled"}</div>
                <div style={{ fontSize: "12px", color: "#555" }}>
                  {ep.episode_number ? `Ep. ${ep.episode_number} · ` : ""}
                  {ep.created_at ? new Date(ep.created_at).toLocaleDateString() : ""}
                  {ep.stage_data?.[1]?.analysis?.wordCount ? ` · ${ep.stage_data[1].analysis.wordCount.toLocaleString()} words` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <button
                  style={{ background: "#2a2a2a", border: "1px solid #333", color: "#888", padding: "7px 14px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
                  onClick={() => onLoad(ep)}
                >
                  Load
                </button>
                {confirmDelete === ep.id ? (
                  <>
                    <button
                      style={{ background: "#2a1515", border: `1px solid ${ACCENT}`, color: ACCENT, padding: "7px 14px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
                      onClick={() => handleDelete(ep.id)}
                    >
                      Delete
                    </button>
                    <button
                      style={{ background: "#2a2a2a", border: "1px solid #333", color: "#888", padding: "7px 14px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
                      onClick={() => setConfirmDelete(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    style={{ background: "none", border: "none", color: "#444", fontSize: "14px", cursor: "pointer", padding: "7px 10px", fontFamily: "inherit" }}
                    onClick={() => setConfirmDelete(ep.id)}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EpisodeLibrary;
