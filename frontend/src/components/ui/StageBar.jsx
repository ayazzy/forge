import { S, ACCENT, COLORS } from "../../styles/theme";

function StageBar({ STAGES, activeStage, completedStages, onStageClick }) {
  return (
    <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ ...S.stageBar, borderBottom: "none" }}>
        {STAGES.map((stage, i) => (
          <button
            key={stage.id}
            style={S.stageTab(activeStage === i, completedStages.has(i))}
            onClick={() => (completedStages.has(i) || activeStage === i) && onStageClick(i)}
            title={!completedStages.has(i) && activeStage !== i ? "Complete the current stage to unlock" : ""}
          >
            {completedStages.has(i)
              ? <span style={{ fontSize: "12px", color: "#4ade80", lineHeight: 1 }}>●</span>
              : <span style={{ fontSize: "10px", fontWeight: "600", opacity: 0.5 }}>{String(i + 1).padStart(2, "0")}</span>
            }
            {stage.label}
          </button>
        ))}
      </div>
      {/* Progress strip */}
      <div style={{ padding: "8px 40px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "12px", color: COLORS.textSecondary }}>
          {completedStages.size === 0
            ? "Start by researching your topic"
            : completedStages.size === STAGES.length
            ? "✓ All stages complete"
            : `${completedStages.size} of ${STAGES.length} stages complete`}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "120px", height: "3px", background: COLORS.border, borderRadius: "2px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(completedStages.size / STAGES.length) * 100}%`,
              background: ACCENT,
              borderRadius: "2px",
              transition: "width 0.4s ease",
            }} />
          </div>
          <div style={{ fontSize: "11px", color: COLORS.textSecondary, fontWeight: "600", minWidth: "32px", textAlign: "right" }}>
            {Math.round((completedStages.size / STAGES.length) * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default StageBar;
