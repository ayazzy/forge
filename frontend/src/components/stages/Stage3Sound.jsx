import { useState } from "react";
import { claude } from "../../lib/api";
import { S, COLORS } from "../../styles/theme";

function Stage3({ data, onApprove, saved, isComplete, onBackToSummary }) {
  const [cues, setCues] = useState(saved?.cues || null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setCues(null);
    const totalMins = data.analysis ? `${data.analysis.minutes}:${String(data.analysis.seconds).padStart(2, "0")}` : "15:00";
    const channelName = data.channelProfile?.channel_name || "the channel";
    const channelDesc = data.channelProfile?.description || "";
    const raw = await claude(`You are a sound designer for ${channelName}.
Analyze this script and produce a complete sound design plan with three layers.
The video is exactly ${totalMins} long. All timestamps must fall within this duration.
Channel style: ${channelDesc}
Era/Region: ${data.era || "unspecified"}
Script:
${data.script}
Return ONLY valid JSON:
{
  "musicBed": [{"timestamp":"0:00","mood":"describe mood","description":"what the music should feel like using period-appropriate instruments for the era","notes":"tempo, BPM, specific historical instruments from the era and region, duration until next cue","sunoPrompt":"ready-to-paste Suno prompt optimized for this mood with period-accurate instrumentation","source":"Suno"}],
  "ambientLayer": [{"timestamp":"0:00","environment":"specific environment","sounds":"specific ambient elements","notes":"volume guidance, duration","source":"Freesound"}],
  "effects": [{"timestamp":"approx within ${totalMins}","trigger":"the exact line or moment","sound":"specific sound effect","purpose":"why this lands here","source":"Freesound"}],
  "coldOpen": {"duration":"seconds of pre-narration atmosphere e.g. 3s","sound":"specific ambient sound before first word","mood":"emotional register","instruction":"what to do in the editor","source":"Freesound or Suno"},
  "mixingGuide": {"narration":"0 to -6dB — front and center","musicBed":"-18 to -24dB — felt not heard","ambientLayer":"-24 to -30dB — atmospheric background","soundEffects":"-12 to -18dB — punchy but not jarring"}
}
CRITICAL: All timestamps must be within the ${totalMins} video duration.
Include period-accurate instrumentation.
Suggest 4-8 music cues, 3-5 ambient shifts, 6-12 sound effects.`, 2500);
    try {
      setCues(JSON.parse(raw.replace(/```json|```/g, "").trim()));
    } catch { setCues({ musicBed: [], ambientLayer: [], effects: [] }); }
    setLoading(false);
  };

  const exportCues = () => {
    if (!cues) return;
    const lines = [
      "SOUND DESIGN — " + (data.topic || "Episode") + "\n",
      "=== MUSIC ===",
      ...cues.musicBed.map(c => `[${c.timestamp}] ${c.mood}\n  ${c.description}\n  → ${c.notes}`),
      "\n=== ATMOSPHERE ===",
      ...cues.ambientLayer.map(c => `[${c.timestamp}] ${c.environment}\n  ${c.sounds}\n  → ${c.notes}`),
      "\n=== SOUND EFFECTS ===",
      ...cues.effects.map(c => `[${c.timestamp}] "${c.trigger}"\n  ↳ ${c.sound}\n  Why: ${c.purpose}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `sound_design_ep${data.episode || "xx"}.txt`; a.click();
  };

  const TimestampBadge = ({ ts, color }) => (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", fontFamily: "monospace", background: `${color}12`, color, flexShrink: 0 }}>
      {ts}
    </span>
  );

  const CUE_SECTION = ({ title, color, items, fields }) => (
    <div style={{ ...S.card, marginBottom: "16px" }}>
      <div style={{ fontSize: "13px", fontWeight: "600", color, marginBottom: "14px" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: COLORS.surfaceSecondary, border: `1px solid ${COLORS.border}`, borderRadius: "8px", padding: "12px 14px" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <TimestampBadge ts={item.timestamp} color={color} />
              <div style={{ flex: 1 }}>
                {fields.map(f => (
                  <div key={f.key} style={{ marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", color: COLORS.textTertiary }}>{f.label}: </span>
                    <span style={{ fontSize: "12px", color: f.key === "trigger" ? COLORS.text : COLORS.textSecondary, fontStyle: f.key === "trigger" ? "italic" : "normal" }}>
                      {item[f.key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0" }}>
        <div>
          <div style={S.sectionTitle}>Sound Design</div>
          <div style={S.sectionSubtitle}>A complete sound plan for your video — music, atmosphere, and effects.</div>
        </div>
        {isComplete && (
          <button onClick={onBackToSummary} style={{ ...S.btnGhost, marginTop: "4px", whiteSpace: "nowrap" }}>
            ← Back to Summary
          </button>
        )}
      </div>

      {!cues && !loading && (
        <div style={{ ...S.card, textAlign: "center", padding: "48px 24px" }}>
          <div style={{ color: COLORS.textSecondary, fontSize: "14px", marginBottom: "20px" }}>
            Generate a full sound design plan — music cues, ambient layers, and effect placements
          </div>
          <button style={{ ...S.btnPrimary(false), width: "auto", padding: "12px 40px" }} onClick={generate}>
            Generate Sound Design
          </button>
        </div>
      )}
      {loading && (
        <div style={{ ...S.card, color: COLORS.textSecondary, fontSize: "13px", padding: "48px 24px", textAlign: "center" }}>
          Analyzing script for sound cues…
        </div>
      )}

      {cues && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", color: COLORS.textSecondary }}>
              {cues.musicBed.length} music cues · {cues.ambientLayer.length} ambient shifts · {cues.effects.length} effects
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={S.btnGhost} onClick={generate}>Regenerate</button>
              <button style={S.btnSecondary(false)} onClick={exportCues}>↓ Export .txt</button>
            </div>
          </div>

          <CUE_SECTION title="Music" color="#2563eb" items={cues.musicBed} fields={[{ key: "mood", label: "Mood" }, { key: "description", label: "Feel" }, { key: "notes", label: "Notes" }]} />
          <CUE_SECTION title="Atmosphere" color="#059669" items={cues.ambientLayer} fields={[{ key: "environment", label: "Environment" }, { key: "sounds", label: "Sounds" }, { key: "notes", label: "Notes" }]} />
          <CUE_SECTION title="Sound Effects" color="#e03535" items={cues.effects} fields={[{ key: "trigger", label: "On line" }, { key: "sound", label: "Effect" }, { key: "purpose", label: "Why" }]} />

          {cues.coldOpen && (
            <div style={{ ...S.card, marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#7c3aed", marginBottom: "14px" }}>Opening — Before First Word</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { label: "Duration", val: cues.coldOpen.duration },
                  { label: "Sound", val: cues.coldOpen.sound },
                  { label: "Mood", val: cues.coldOpen.mood },
                  { label: "Source", val: cues.coldOpen.source },
                ].map(r => (
                  <div key={r.label} style={{ background: COLORS.surfaceSecondary, padding: "10px 12px", borderRadius: "8px" }}>
                    <div style={S.label}>{r.label}</div>
                    <div style={{ fontSize: "13px", color: COLORS.text }}>{r.val}</div>
                  </div>
                ))}
              </div>
              {cues.coldOpen.instruction && (
                <div style={{ marginTop: "10px", fontSize: "12px", color: COLORS.textSecondary, fontStyle: "italic" }}>→ {cues.coldOpen.instruction}</div>
              )}
            </div>
          )}

          {cues.mixingGuide && (
            <div style={{ ...S.card, marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: COLORS.text, marginBottom: "12px" }}>Mixing Levels</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {Object.entries(cues.mixingGuide).map(([key, val]) => (
                  <div key={key} style={S.statRow}>
                    <span style={S.statLabel}>{key.replace(/([A-Z])/g, " $1")}</span>
                    <span style={S.statValue}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button style={{ ...S.btnApprove, width: "100%", justifyContent: "center" }} onClick={() => onApprove({ cues })}>
            Approve &amp; Continue →
          </button>
        </>
      )}
    </div>
  );
}

export default Stage3;
