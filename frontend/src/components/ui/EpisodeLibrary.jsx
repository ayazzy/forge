import { useState, useMemo } from "react";

const ACCENT = "#e03535";

function EpisodeLibrary({ episodes, onLoad, onClose, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return episodes.filter(ep => {
      const matchesSearch = !search || (ep.title || "Untitled").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || ep.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [episodes, search, statusFilter]);

  const handleDelete = async (id) => {
    await onDelete(id);
    setConfirmDelete(null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "14px", width: "600px", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>Episode Library</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "20px", lineHeight: "1", padding: "0 4px", fontFamily: "inherit" }}>×</button>
        </div>

        {/* Search + filter */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid #222", display: "flex", gap: "10px" }}>
          <input
            style={{ flex: 1, background: "#111", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", color: "#fff", outline: "none", fontFamily: "inherit" }}
            placeholder="Search episodes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", color: "#888", outline: "none", fontFamily: "inherit", cursor: "pointer" }}
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="complete">Complete</option>
          </select>
        </div>

        {/* Results count */}
        {(search || statusFilter !== "all") && (
          <div style={{ padding: "8px 24px 0", fontSize: "11px", color: "#444" }}>
            {filtered.length} of {episodes.length} episodes
          </div>
        )}

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 24px 16px" }}>
          {filtered.length === 0 && (
            <div style={{ color: "#444", fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "40px 0" }}>
              {episodes.length === 0
                ? "No episodes saved yet — complete your first pipeline run to see them here."
                : "No episodes match your search."}
            </div>
          )}
          {filtered.map((ep) => (
            <div
              key={ep.id}
              style={{ background: "#222", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "14px 18px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: "#fff" }}>{ep.title || "Untitled"}</div>
                  <div style={{
                    fontSize: "9px", fontWeight: "700", padding: "2px 7px", borderRadius: "20px",
                    background: ep.status === "complete" ? "#0a2a1a" : "#1e1e1e",
                    color: ep.status === "complete" ? "#4ade80" : "#555",
                    border: `1px solid ${ep.status === "complete" ? "#14532d" : "#2a2a2a"}`,
                    textTransform: "uppercase", flexShrink: 0,
                  }}>
                    {ep.status}
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "#555" }}>
                  {ep.episode_number ? `Ep. ${ep.episode_number} · ` : ""}
                  {ep.created_at ? new Date(ep.created_at).toLocaleDateString() : ""}
                  {ep.stage_data?.[1]?.analysis?.wordCount ? ` · ${ep.stage_data[1].analysis.wordCount.toLocaleString()} words` : ""}
                  {` · Stage ${ep.active_stage ?? 0}/8`}
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
