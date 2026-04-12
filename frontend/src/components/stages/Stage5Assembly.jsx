import { useState } from "react";
import { S, COLORS } from "../../styles/theme";

function Stage7({ data, onApprove, isComplete, onBackToSummary }) {
  const { segments = [], voices = [], audioUrls = {}, prompts = [], images = {}, cues = null, topic, episode, meta } = data;

  // Build timeline items by merging segments with their matched images
  const timeline = segments.map((seg, i) => {
    const voice = voices.find(v => v.id === seg.voiceId) || voices[0] || { name: "Narrator", color: "#c0392b" };
    // Match image to segment by proximity — find the image prompt closest to this segment index
    const imageIndex = Math.round((i / Math.max(segments.length - 1, 1)) * Math.max(prompts.length - 1, 0));
    const matchedPrompt = prompts[imageIndex];
    const imageUrl = matchedPrompt ? images[matchedPrompt.imageNumber] : null;
    // Find sound cues that roughly fall in this segment
    const segStart = Math.round((i / segments.length) * 15); // approx minutes
    const segEnd = Math.round(((i + 1) / segments.length) * 15);
    const segEffects = (cues?.effects || []).filter(c => {
      const mins = parseFloat(c.timestamp?.split(":")?.[0] || 0);
      return mins >= segStart && mins < segEnd;
    });
    return { seg, voice, imageUrl, matchedPrompt, segEffects, index: i };
  });

  const [activeItem, setActiveItem] = useState(0);
  const [exported, setExported] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const copyPrompt = (text) => {
    const flags = "--ar 16:9 --style raw --v 6.1";
    const full = text.includes("--ar") ? text : `${text} ${flags}`;
    navigator.clipboard.writeText(full);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const exportPackage = () => {
    // Build a structured manifest
    const manifest = {
      episode: episode || "01",
      topic: topic || "Untitled",
      generatedAt: new Date().toISOString(),
      totalSegments: segments.length,
      totalImages: prompts.length,
      voices: voices.map(v => ({ name: v.name, color: v.color })),
      timeline: timeline.map((item, i) => ({
        segment: i + 1,
        voice: item.voice.name,
        text: item.seg.text.substring(0, 120) + "...",
        imageNumber: item.matchedPrompt?.imageNumber || null,
        imageMood: item.matchedPrompt?.mood || null,
        soundEffects: item.segEffects.map(e => ({ trigger: e.trigger, sound: e.sound })),
      })),
      musicBed: (cues?.musicBed || []).map(c => ({ timestamp: c.timestamp, mood: c.mood, description: c.description })),
      ambientLayer: (cues?.ambientLayer || []).map(c => ({ timestamp: c.timestamp, environment: c.environment, sounds: c.sounds })),
      youtubeMetadata: meta ? {
        recommendedTitle: meta.titles?.[0]?.text,
        tags: meta.tags,
        chapters: meta.chapters,
      } : null,
    };

    // Export manifest as JSON
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ep${episode || "xx"}_assembly_manifest.json`;
    a.click();

    // Export resolve-ready text guide
    const lines = [
      `DAVINCI RESOLVE ASSEMBLY GUIDE`,
      `Episode ${episode || "xx"} — ${topic || "Untitled"}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      `${"═".repeat(60)}`,
      ``,
      `IMPORT ORDER`,
      `─────────────`,
      ...timeline.map((item, i) => [
        `[${String(i+1).padStart(2,"0")}] ${item.voice.name.toUpperCase()}`,
        `    Audio: ep${episode||"xx"}_seg${String(i+1).padStart(2,"00")}_${item.voice.name}.mp3`,
        item.imageUrl ? `    Image: ep${episode||"xx"}_img${String(item.matchedPrompt?.imageNumber||i+1).padStart(2,"00")}.png` : `    Image: (none assigned)`,
        item.segEffects.length > 0 ? `    SFX:   ${item.segEffects.map(e => e.sound).join(", ")}` : "",
        `    Text:  "${item.seg.text.substring(0, 80)}..."`,
        ``,
      ].filter(Boolean).join("\n")),
      `${"═".repeat(60)}`,
      ``,
      `MUSIC BED CUES`,
      `─────────────`,
      ...(cues?.musicBed || []).map(c => `[${c.timestamp}] ${c.mood} — ${c.description}`),
      ``,
      `AMBIENT LAYER`,
      `─────────────`,
      ...(cues?.ambientLayer || []).map(c => `[${c.timestamp}] ${c.environment} — ${c.sounds}`),
    ];

    const textBlob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a2 = document.createElement("a");
    a2.href = URL.createObjectURL(textBlob);
    a2.download = `ep${episode || "xx"}_resolve_guide.txt`;
    a2.click();

    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const active = timeline[activeItem];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0" }}>
        <div>
          <div style={S.sectionTitle}>Assembly</div>
          <div style={S.sectionSubtitle}>Review your timeline — audio, images, and sound cues all in one place.</div>
        </div>
        {isComplete && (
          <button onClick={onBackToSummary} style={{ ...S.btnGhost, marginTop: "4px", whiteSpace: "nowrap" }}>
            ← Back to Summary
          </button>
        )}
      </div>

      {timeline.length === 0 && (
        <div style={{ ...S.card, color: COLORS.textTertiary, fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "60px 24px" }}>
          Complete the Narration and Visuals stages to build the assembly view.
        </div>
      )}

      {timeline.length > 0 && (
        <>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
            {[
              { label: "Segments", value: segments.length, color: "#e03535" },
              { label: "Images", value: prompts.length, color: "#2563eb" },
              { label: "Voices", value: voices.length, color: "#7c3aed" },
              { label: "Sound Cues", value: (cues?.effects || []).length, color: "#059669" },
            ].map(s => (
              <div key={s.label} style={{ ...S.card, textAlign: "center", marginBottom: 0 }}>
                <div style={{ fontSize: "28px", fontWeight: "700", color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "11px", color: COLORS.textSecondary, marginTop: "4px" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px" }}>
            {/* Left: timeline list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "600px", overflowY: "auto" }}>
              <div style={{ ...S.label, marginBottom: "10px" }}>Timeline</div>
              {timeline.map((item, i) => (
                <div
                  key={i}
                  onClick={() => { setActiveItem(i); setCopiedPrompt(false); }}
                  style={{
                    display: "flex", gap: "8px", padding: "9px 10px", cursor: "pointer",
                    background: activeItem === i ? COLORS.surfaceSecondary : COLORS.surface,
                    border: `1px solid ${activeItem === i ? item.voice.color + "55" : COLORS.border}`,
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ width: "3px", background: item.voice.color, alignSelf: "stretch", flexShrink: 0, borderRadius: "2px" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontSize: "11px", color: item.voice.color, fontWeight: "600" }}>{item.voice.name}</span>
                      <span style={{ fontSize: "10px", color: COLORS.textTertiary }}>
                        {audioUrls[item.seg.id] ? "✓" : "○"} {item.imageUrl ? "✓" : "○"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: "1.4" }}>
                      {item.seg.text.substring(0, 60)}…
                    </div>
                    {item.segEffects.length > 0 && (
                      <div style={{ fontSize: "10px", color: COLORS.success, marginTop: "2px" }}>⚡ {item.segEffects.length} sfx</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Right: active segment detail */}
            {active && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Image preview */}
                <div style={{ background: COLORS.surfaceSecondary, border: `1px solid ${COLORS.border}`, borderRadius: "10px", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {active.imageUrl ? (
                    <img src={active.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px" }}>
                      <div style={{ fontSize: "12px", color: COLORS.textTertiary, fontStyle: "italic" }}>
                        No image generated — go back to Visuals to generate one
                      </div>
                    </div>
                  )}
                </div>

                {/* Audio player */}
                <div style={{ ...S.card, marginBottom: 0 }}>
                  <div style={{ fontSize: "11px", color: active.voice.color, fontWeight: "600", marginBottom: "8px" }}>
                    Segment {activeItem + 1} of {timeline.length} — {active.voice.name}
                  </div>
                  {audioUrls[active.seg.id] ? (
                    <audio key={audioUrls[active.seg.id]} controls src={audioUrls[active.seg.id]} style={{ width: "100%", height: "32px" }} />
                  ) : (
                    <div style={{ fontSize: "12px", color: COLORS.textSecondary, fontStyle: "italic" }}>
                      Audio unavailable after page reload — re-generate in Narration or use your downloaded ZIP file
                    </div>
                  )}
                </div>

                {/* Script text */}
                <div style={{ ...S.card, marginBottom: 0 }}>
                  <div style={S.label}>Script</div>
                  <div style={{ fontSize: "13px", color: COLORS.textSecondary, lineHeight: "1.8" }}>{active.seg.text}</div>
                </div>

                {/* Sound effects */}
                {active.segEffects.length > 0 && (
                  <div style={{ ...S.card, marginBottom: 0 }}>
                    <div style={{ ...S.label, color: COLORS.success }}>Sound Effects</div>
                    {active.segEffects.map((e, i) => (
                      <div key={i} style={{ display: "flex", gap: "10px", padding: "6px 0", borderBottom: `1px solid ${COLORS.borderLight}` }}>
                        <span style={{ fontSize: "12px", color: COLORS.textSecondary, fontStyle: "italic", flex: 1 }}>"{e.trigger}"</span>
                        <span style={{ fontSize: "12px", color: COLORS.success }}>→ {e.sound}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Image prompt */}
                {active.matchedPrompt && (
                  <div style={{ ...S.card, marginBottom: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <div style={S.label}>Image {active.matchedPrompt.imageNumber} — {active.matchedPrompt.mood}</div>
                      {active.matchedPrompt.why && (
                        <div style={{ fontSize: "11px", color: COLORS.success, fontStyle: "italic" }}>↳ {active.matchedPrompt.why}</div>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: COLORS.textSecondary, fontFamily: "monospace", lineHeight: "1.6", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                      {active.matchedPrompt.prompt}
                    </div>
                    <button style={{ ...S.btnSecondary(copiedPrompt), marginTop: "10px", fontSize: "11px" }} onClick={() => copyPrompt(active.matchedPrompt.prompt)}>
                      {copiedPrompt ? "✓ Copied!" : "Copy Prompt"}
                    </button>
                  </div>
                )}

                {/* Prev / Next */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button style={{ ...S.btnSecondary(false), flex: 1 }} onClick={() => setActiveItem(Math.max(0, activeItem - 1))}>← Prev</button>
                  <button style={{ ...S.btnSecondary(false), flex: 1 }} onClick={() => setActiveItem(Math.min(timeline.length - 1, activeItem + 1))}>Next →</button>
                </div>
              </div>
            )}
          </div>

          {/* Music bed */}
          {cues?.musicBed?.length > 0 && (
            <div style={{ ...S.card, marginTop: "24px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#2563eb", marginBottom: "12px" }}>Music Bed</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {cues.musicBed.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: "16px", padding: "10px 12px", background: COLORS.surfaceSecondary, borderRadius: "8px", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "11px", color: "#2563eb", fontFamily: "monospace", minWidth: "44px", flexShrink: 0, fontWeight: "600" }}>{c.timestamp}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: "600", marginBottom: "2px" }}>{c.mood}</div>
                      <div style={{ fontSize: "12px", color: COLORS.textSecondary, lineHeight: "1.5" }}>{c.description}</div>
                      {c.notes && <div style={{ fontSize: "11px", color: COLORS.textTertiary, fontStyle: "italic", marginTop: "2px" }}>{c.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export */}
          <div style={{ ...S.cardElevated, marginTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: COLORS.text, marginBottom: "4px" }}>Ready to edit</div>
              <div style={{ fontSize: "12px", color: COLORS.textSecondary }}>
                Exports a JSON manifest + Resolve assembly guide with everything named, numbered, and sequenced
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
              <button style={{ ...S.btnSecondary(exported), whiteSpace: "nowrap" }} onClick={exportPackage}>
                {exported ? "✓ Exported!" : "↓ Export Package"}
              </button>
              {onApprove && (
                <button style={{ ...S.btnApprove, whiteSpace: "nowrap" }} onClick={() => onApprove({})}>
                  Continue to Thumbnail →
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Stage7;
