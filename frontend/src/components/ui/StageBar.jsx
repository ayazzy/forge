import { S, ACCENT, COLORS } from "../../styles/theme";

function StageBar({ STAGES, activeStage, completedStages, onStageClick }) {

  return (
    <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
      {/* Visual pipeline nodes */}
      <div style={{ padding: '20px 40px 16px', display: 'flex', alignItems: 'flex-start' }}>
        {STAGES.map((stage, i) => {
          const completed = completedStages.has(i);
          const active = activeStage === i;
          const reachable = completed || active || i <= activeStage;
          const isLast = i === STAGES.length - 1;

          return (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'flex-start', flex: isLast ? 'none' : 1 }}>
              {/* Node + label */}
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: reachable ? 'pointer' : 'default' }}
                onClick={() => reachable && onStageClick(i)}
                title={!reachable ? 'Complete the current stage to unlock' : ''}
              >
                {/* Node circle */}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: completed ? ACCENT : active ? 'rgba(224,53,53,0.12)' : '#1e1e1e',
                  border: completed ? `2px solid ${ACCENT}` : active ? `2px solid ${ACCENT}` : '2px solid #333',
                  transition: 'all 0.2s ease',
                }}>
                  {completed ? (
                    <span style={{ fontSize: '12px', color: '#fff', lineHeight: 1 }}>✓</span>
                  ) : (
                    <span style={{ fontSize: '9px', fontWeight: '700', color: active ? ACCENT : '#555' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  )}
                </div>
                {/* Label below */}
                <span style={{
                  fontSize: '10px',
                  fontWeight: active ? '700' : '400',
                  color: completed ? '#aaa' : active ? '#fff' : '#555',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.2s ease',
                }}>
                  {stage.label}
                </span>
              </div>

              {/* Connector line (not after last node) */}
              {!isLast && (
                <div style={{
                  flex: 1,
                  height: '2px',
                  background: completed ? ACCENT : '#2a2a2a',
                  marginTop: '13px',
                  transition: 'background 0.3s ease',
                }} />
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default StageBar;
