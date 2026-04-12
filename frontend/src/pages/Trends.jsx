import { useState } from "react";
import AppLayout from "../components/ui/AppLayout";

const ACCENT = "#e03535";
const niches = ["History", "True Crime", "Finance", "Science", "Cooking", "Other"];

export default function Trends() {
  const [query, setQuery] = useState("");
  const [activeNiche, setActiveNiche] = useState(null);

  return (
    <AppLayout>
      <div style={{ padding: "32px 40px", maxWidth: "960px", width: "100%" }}>
        <div style={{ fontSize: "20px", fontWeight: "700", color: "#fff", marginBottom: "24px" }}>Trend Research</div>

        {/* Search */}
        <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: "10px", padding: "20px 24px", marginBottom: "16px" }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search a niche or topic e.g. Ottoman Empire, personal finance, true crime"
            style={{ width: "100%", background: "#222", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "10px 14px", fontSize: "14px", outline: "none", boxSizing: "border-box", color: "#fff", fontFamily: "inherit" }}
          />
        </div>

        {/* Niche filters */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
          {niches.map((n) => (
            <button
              key={n}
              onClick={() => setActiveNiche(activeNiche === n ? null : n)}
              style={{
                padding: "7px 14px",
                border: `1px solid ${activeNiche === n ? ACCENT : "#333"}`,
                background: activeNiche === n ? "#2a1515" : "#1a1a1a",
                color: activeNiche === n ? ACCENT : "#888",
                borderRadius: "6px", fontSize: "12px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Results area */}
        <div style={{ background: "#1a1a1a", border: "1px solid #222", borderRadius: "10px", padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>↗</div>
          <div style={{ fontSize: "14px", color: "#555", marginBottom: "8px" }}>
            Enter a topic to find trending content ideas
          </div>
          <div style={{ fontSize: "12px", color: "#333", fontStyle: "italic" }}>
            Trend search coming soon — powered by YouTube Data API and Google Trends
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
