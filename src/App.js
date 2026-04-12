import { useState, useCallback, useEffect } from "react";
// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API_KEY = process.env.REACT_APP_ANTHROPIC_KEY;
const ELEVENLABS_API_KEY = process.env.REACT_APP_ELEVENLABS_KEY;
const MODEL = "claude-sonnet-4-20250514";
const WORDS_PER_MINUTE = 130;
const STYLE_BASE = "--ar 16:9 --style raw --v 6.1";
const ELEVENLABS_MODEL = "eleven_multilingual_v2";
const VOICE_PALETTE = ["#c0392b","#2980b9","#8e44ad","#27ae60","#e67e22","#16a085"];
const STORAGE_KEY = "unraveled_pipeline_v1";
const LIBRARY_KEY = "unraveled_library_v1";

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────
function saveState(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
}
function loadState() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}
function loadLibrary() {
  try { const s = localStorage.getItem(LIBRARY_KEY); return s ? JSON.parse(s) : []; } catch (e) { return []; }
}
function saveToLibrary(episode) {
  try {
    const lib = loadLibrary();
    const idx = lib.findIndex(e => e.id === episode.id);
    if (idx >= 0) lib[idx] = episode; else lib.unshift(episode);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib.slice(0, 20)));
  } catch (e) {}
}
function deleteFromLibrary(id) {
  try {
    const lib = loadLibrary().filter(e => e.id !== id);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
  } catch (e) {}
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
async function claude(prompt, maxTokens = 1000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text.trim();
}

async function generateSpeech(text, voiceId, settings = {}) {
  if (!voiceId) throw new Error("No voice ID set for this voice.");
  const cleanText = text
    .replace(/\[long pause\]/g, " ")
    .replace(/\[short pause\]/g, " ")
    .replace(/\[pause\]/g, " ")
    .replace(/\[dramatic tone\]/g, "");
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": ELEVENLABS_API_KEY },
    body: JSON.stringify({
      text: cleanText,
      model_id: ELEVENLABS_MODEL,
      voice_settings: {
        stability: settings.stability ?? 0.45,
        similarity_boost: settings.similarity ?? 0.82,
        style: settings.style ?? 0.35,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.message || `ElevenLabs error: ${res.status}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// ─── MOOD ANALYSIS ───────────────────────────────────────────────────────────
const MOOD_KEYWORDS = {
  "Dark / Ominous": ["death","ruin","collapse","darkness","fear","dread","silence","shadow"],
  "Tense / Rising": ["danger","threat","warning","storm","pressure","risk","edge","urgent"],
  "Reflective / Intimate": ["remember","thought","wondered","quiet","alone","still","looked"],
  "Epic / Cinematic": ["empire","world","history","changed","forever","century","vast","great"],
  "Melancholic / Resigned": ["nothing","too late","already","never","gone","once","used to"],
};
const MOOD_COLORS = {
  "Dark / Ominous": "#c0392b",
  "Tense / Rising": "#e67e22",
  "Reflective / Intimate": "#8e44ad",
  "Epic / Cinematic": "#2980b9",
  "Melancholic / Resigned": "#7f8c8d",
  "Neutral / Expository": "#4a9068",
};
const MOOD_STYLES = {
  "Dark / Ominous": "chiaroscuro lighting, deep shadows, muted palette, ominous atmosphere",
  "Tense / Rising": "high contrast, dramatic side lighting, urgent atmosphere, storm clouds",
  "Reflective / Intimate": "soft candlelight, warm intimate tones, painterly, quiet atmosphere",
  "Epic / Cinematic": "epic wide shot, golden hour, vast historical landscape, dramatic scale",
  "Melancholic / Resigned": "desaturated, muted earth tones, quiet desolation, fading light",
  "Neutral / Expository": "warm natural light, historical painting style, documentary realism",
};
function detectMood(text) {
  const lower = text.toLowerCase();
  const scores = {};
  for (const [mood, kws] of Object.entries(MOOD_KEYWORDS)) {
    scores[mood] = kws.filter(k => lower.includes(k)).length;
  }
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return top[1] > 0 ? top[0] : "Neutral / Expository";
}
function analyzeScript(text) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const totalSecs = Math.round((wordCount / WORDS_PER_MINUTE) * 60);
  const minutes = Math.floor(totalSecs / 60);
  const seconds = totalSecs % 60;
  let cumWords = 0;
  const sections = paragraphs.map((p, i) => {
    const pw = p.trim().split(/\s+/).length;
    cumWords += pw;
    return { index: i, text: p.trim(), wordCount: pw, mood: detectMood(p), cumulativeTime: Math.round((cumWords / WORDS_PER_MINUTE) * 60) };
  });
  return { wordCount, minutes, seconds, sections, paragraphCount: paragraphs.length };
}
function formatTime(secs) {
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;
}

// ─── ELEVENLABS TAG PROCESSOR ─────────────────────────────────────────────────
function injectV3Tags(text) {
  let r = text;
  r = r.replace(/\n\n+/g, "\n\n[long pause]\n\n");
  r = r.replace(/—\s*/g, "— [pause] ");
  r = r.replace(/\.\.\.\s*/g, "... [pause] ");
  r = r.replace(/\?(\s)(?=[a-zA-Z])/g, "? [short pause] $1");
  const darkOpeners = ["he died","she died","it ended","nothing remained","there was nothing"];
  return r.split("\n").map(line => {
    const lower = line.toLowerCase().trim();
    return darkOpeners.some(o => lower.startsWith(o)) ? `[dramatic tone] ${line}` : line;
  }).join("\n");
}

// ─── MIDJOURNEY POINT SELECTION ───────────────────────────────────────────────
function selectImagePoints(sections) {
  const selected = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const prev = sections[i - 1];
    const reasons = [];
    if (i === 0) reasons.push("opening");
    if (i === sections.length - 1) reasons.push("closing");
    if (prev && s.mood !== prev.mood) reasons.push("mood shift");
    if (i > 0 && i % 4 === 0 && reasons.length === 0) reasons.push("pacing");
    if (reasons.length > 0) selected.push({ ...s, reasons });
  }
  return selected.slice(0, 15);
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const ACCENT = "#e03535";
const S = {
  app: { minHeight: "100vh", background: "#f4f4f5", color: "#111", fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" },
  header: { borderBottom: "1px solid #e4e4e7", padding: "0 32px", display: "flex", alignItems: "center", gap: "16px", background: "#fff", height: "56px" },
  logoText: { fontSize: "13px", fontWeight: "700", letterSpacing: "0.5px", color: "#111", textTransform: "uppercase" },
  divider: { width: "1px", height: "16px", background: "#e4e4e7" },
  stageLabel: { fontSize: "12px", color: "#71717a" },
  stageBar: { display: "flex", overflowX: "auto", background: "#fff", borderBottom: "1px solid #e4e4e7" },
  stageTab: (active, done) => ({
    padding: "14px 18px", border: "none", background: "transparent",
    borderBottom: active ? `2px solid ${ACCENT}` : done ? "2px solid #22c55e" : "2px solid transparent",
    color: active ? ACCENT : done ? "#16a34a" : "#a1a1aa",
    fontSize: "11px", fontWeight: active ? "600" : "500", letterSpacing: "0.3px",
    cursor: done || active ? "pointer" : "not-allowed",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px",
    opacity: !active && !done ? 0.5 : 1,
    textTransform: "none",
  }),
  content: { padding: "28px 32px", maxWidth: "960px", margin: "0 auto" },
  label: { fontSize: "11px", fontWeight: "600", letterSpacing: "0.3px", color: "#71717a", textTransform: "uppercase", marginBottom: "6px", display: "block" },
  input: { width: "100%", background: "#fff", border: "1px solid #e4e4e7", color: "#111", padding: "9px 12px", fontFamily: "inherit", fontSize: "14px", outline: "none", borderRadius: "8px", boxSizing: "border-box" },
  textarea: (h = 200) => ({ width: "100%", background: "#fff", border: "1px solid #e4e4e7", color: "#111", padding: "9px 12px", fontFamily: "inherit", fontSize: "14px", outline: "none", resize: "vertical", minHeight: h, borderRadius: "8px", boxSizing: "border-box" }),
  btnPrimary: (disabled) => ({ background: disabled ? "#e4e4e7" : ACCENT, border: "none", color: disabled ? "#a1a1aa" : "#fff", padding: "10px 20px", fontFamily: "inherit", fontSize: "13px", fontWeight: "600", borderRadius: "8px", cursor: disabled ? "not-allowed" : "pointer", width: "100%" }),
  btnSecondary: (active) => ({ background: active ? "#dcfce7" : "#fff", border: `1px solid ${active ? "#86efac" : "#e4e4e7"}`, color: active ? "#16a34a" : "#3f3f46", padding: "8px 14px", fontFamily: "inherit", fontSize: "12px", fontWeight: "500", borderRadius: "6px", cursor: "pointer" }),
  btnApprove: { background: "#f0fdf4", border: "1.5px solid #86efac", color: "#16a34a", padding: "12px 24px", fontFamily: "inherit", fontSize: "13px", fontWeight: "600", borderRadius: "8px", cursor: "pointer" },
  statRow: { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f4f4f5" },
  statLabel: { fontSize: "11px", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.3px", fontWeight: "500" },
  statValue: { fontSize: "13px", color: "#111", fontWeight: "600" },
  sectionTitle: { fontSize: "11px", letterSpacing: "0.5px", color: "#71717a", textTransform: "uppercase", fontWeight: "600", marginBottom: "20px" },
  chunk: { background: "#fff", border: "1px solid #e4e4e7", padding: "16px", fontFamily: "monospace", fontSize: "12px", lineHeight: "1.8", overflowY: "auto", borderRadius: "8px" },
  promptCard: { background: "#fff", border: "1px solid #e4e4e7", marginBottom: "10px", borderRadius: "10px", overflow: "hidden" },
  promptHeader: { padding: "10px 16px", borderBottom: "1px solid #f4f4f5", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa" },
  promptBody: { padding: "12px 16px", fontFamily: "monospace", fontSize: "11px", color: "#3f3f46", lineHeight: "1.6" },
  slider: { width: "100%", accentColor: ACCENT, cursor: "pointer" },
};

const TAG_COLORS = { "[pause]": "#e67e22", "[short pause]": "#f39c12", "[long pause]": "#e74c3c", "[dramatic tone]": "#9b59b6" };
function renderTagged(text) {
  return text.split(/(\[(?:long pause|short pause|pause|dramatic tone)\])/g).map((part, i) => {
    const c = TAG_COLORS[part];
    return c ? <span key={i} style={{ color: c, fontWeight: "bold" }}>{part}</span> : <span key={i}>{part}</span>;
  });
}

// ─── STAGE 0: RESEARCH ───────────────────────────────────────────────────────
function Stage0({ onApprove, saved }) {
  const [topic, setTopic] = useState(saved?.topic || "");
  const [era, setEra] = useState(saved?.era || "");
  const [research, setResearch] = useState(saved?.research || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setResearch(null);
    const raw = await claude(`You are a historical researcher for Unraveled, a dark narrative history channel about ordinary people inside structural forces.
Research this topic and return a structured brief a scriptwriter can use to write a cinematic, accurate 15-minute narrative.
Topic: ${topic}
${era ? "Era / Region: " + era : ""}
Return ONLY valid JSON:
{"coreForce":"The structural force that destroys ordinary people (1-2 sentences)","historicalContext":"What was happening — economic, political, social (2-3 sentences)","characterProfile":{"name":"Historically plausible fictional name","role":"Occupation or social position","stakes":"What they stood to lose","arc":"From stability to collapse"},"keyDates":[{"year":"year","event":"what happened and why it matters"}],"authenticDetails":["specific detail that makes the world feel real"],"primarySources":[{"type":"diary/letter/record","description":"what kind of primary source exists that could be a second voice"}],"toneNotes":"Emotional register and what audience should feel","avoidCliches":["framing to avoid"]}`, 2000);
    try { setResearch(JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g, "").trim())); }
    catch { setResearch({ error: "Could not parse. Try regenerating." }); }
    setLoading(false);
  };
  const toText = research ? `TOPIC: ${topic}\nERA: ${era||"unspecified"}\n\nCORE FORCE: ${research.coreForce||""}\nCONTEXT: ${research.historicalContext||""}\n\nCHARACTER: ${research.characterProfile?.name} — ${research.characterProfile?.role}\nSTAKES: ${research.characterProfile?.stakes}\nARC: ${research.characterProfile?.arc}\n\nKEY DATES:\n${(research.keyDates||[]).map(d=>d.year+": "+d.event).join("\n")}\n\nAUTHENTIC DETAILS:\n${(research.authenticDetails||[]).map(d=>"• "+d).join("\n")}\n\nPRIMARY SOURCES: ${(research.primarySources||[]).map(s=>s.type+" — "+s.description).join("; ")}\n\nTONE: ${research.toneNotes}\nAVOID: ${(research.avoidCliches||[]).join("; ")}` : "";
  return (
    <div>
      <div style={S.sectionTitle}>Stage 0 — Historical Research</div>
      <div style={{ background: "#fff", border: "1px solid #e4e4e7", padding: "14px 20px", marginBottom: "28px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
        <div style={{ fontSize: "18px", flexShrink: 0 }}>🎬</div>
        <div>
          <div style={{ fontSize: "12px", color: "#111", marginBottom: "4px", fontWeight: "500" }}>Welcome to the Production Pipeline</div>
          <div style={{ fontSize: "11px", color: "#71717a", lineHeight: "1.6" }}>
            This pipeline takes you from a raw idea to a complete video production package — script, voiceover, images, sound design, thumbnail, and YouTube metadata. Start by entering your topic and letting the research stage build your historical brief.
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div><label style={S.label}>Topic</label><textarea style={S.textarea(120)} value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. The last merchant on the Silk Road as Ottoman trade routes collapsed" /></div>
          <div><label style={S.label}>Era / Region <span style={{ color: "#d4d4d8" }}>(optional)</span></label><input style={S.input} value={era} onChange={e => setEra(e.target.value)} placeholder="e.g. 15th century Central Asia" /></div>
          <button style={S.btnPrimary(loading || !topic.trim())} onClick={generate} disabled={loading || !topic.trim()}>{loading ? "Researching..." : research ? "Re-research" : "Research This Topic"}</button>
          {research && !research.error && <div style={{ fontSize: "10px", color: "#4a9068", letterSpacing: "1px" }}>✓ Research complete — approve to carry into script</div>}
        </div>
        <div>
          {!research && !loading && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#71717a", fontSize: "13px", fontStyle: "italic" }}>Enter a topic above to begin research</div>}
          {loading && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#52525b", fontSize: "13px", fontStyle: "italic" }}>Researching the historical record...</div>}
          {research?.error && <div style={{ color: "#c0392b", fontSize: "13px", padding: "20px 0" }}>{research.error}</div>}
          {research && !research.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "540px", overflowY: "auto" }}>
              <div style={{ background: "#fff", border: "1px solid #c0392b22", padding: "14px 16px" }}>
                <div style={{ fontSize: "9px", color: "#c0392b", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Core Force</div>
                <div style={{ fontSize: "13px", color: "#111", lineHeight: "1.6" }}>{research.coreForce}</div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #2980b922", padding: "14px 16px" }}>
                <div style={{ fontSize: "9px", color: "#2980b9", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>Character</div>
                {[{label:"Name",val:research.characterProfile?.name},{label:"Role",val:research.characterProfile?.role},{label:"Stakes",val:research.characterProfile?.stakes},{label:"Arc",val:research.characterProfile?.arc}].map(r => (
                  <div key={r.label} style={S.statRow}><span style={S.statLabel}>{r.label}</span><span style={{ fontSize: "12px", color: "#aaa", textAlign: "right", maxWidth: "65%" }}>{r.val}</span></div>
                ))}
              </div>
              <div style={{ background: "#fff", border: "1px solid #e4e4e7", padding: "14px 16px" }}>
                <div style={{ fontSize: "9px", color: "#71717a", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>Key Dates</div>
                {(research.keyDates||[]).map((d,i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", padding: "6px 0", borderBottom: "1px solid #f4f4f5" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#c0392b", minWidth: "50px" }}>{d.year}</span>
                    <span style={{ fontSize: "12px", color: "#52525b", lineHeight: "1.4" }}>{d.event}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "#fff", border: "1px solid #e4e4e7", padding: "14px 16px" }}>
                <div style={{ fontSize: "9px", color: "#71717a", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>Authentic Details</div>
                {(research.authenticDetails||[]).map((d,i) => <div key={i} style={{ fontSize: "12px", color: "#52525b", padding: "4px 0", borderBottom: "1px solid #f0f0f0", lineHeight: "1.5" }}>• {d}</div>)}
              </div>
              <div style={{ background: "#fff", border: "1px solid #8e44ad22", padding: "14px 16px" }}>
                <div style={{ fontSize: "9px", color: "#8e44ad", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Tone</div>
                <div style={{ fontSize: "12px", color: "#52525b", lineHeight: "1.6", marginBottom: "10px" }}>{research.toneNotes}</div>
                <div style={{ fontSize: "9px", color: "#a1a1aa", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>Avoid</div>
                {(research.avoidCliches||[]).map((c,i) => <div key={i} style={{ fontSize: "11px", color: "#71717a", padding: "3px 0" }}>✕ {c}</div>)}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={S.btnSecondary(copied)} onClick={() => { navigator.clipboard.writeText(toText); setCopied(true); setTimeout(()=>setCopied(false),2000); }}>{copied ? "Copied!" : "Copy Brief"}</button>
                <button style={{ ...S.btnApprove, flex: 1 }} onClick={() => onApprove({ topic, era, research, researchText: toText })}>Approve & Write Script →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── STAGE 1: SCRIPT ─────────────────────────────────────────────────────────
function Stage1({ onApprove, saved, researchData }) {
  const [topic, setTopic] = useState(saved?.topic || researchData?.topic || "");
  const [episode, setEpisode] = useState(saved?.episode || "");
  const [ctx, setCtx] = useState(saved?.ctx || "");
  const [script, setScript] = useState(saved?.script || "");
  const [analysis, setAnalysis] = useState(saved?.analysis || null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("script");
  const [copied, setCopied] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [revising, setRevising] = useState(false);
  const [showRevision, setShowRevision] = useState(false);
  const [hookScore, setHookScore] = useState(null);
  const [scoringHook, setScoringHook] = useState(false);
  const [retention, setRetention] = useState(null);
  const [analyzingRetention, setAnalyzingRetention] = useState(false);
  const [appliedFix, setAppliedFix] = useState(null);

  const revise = async () => {
    if (!revisionFeedback.trim() || !script) return;
    setRevising(true);
    const revised = await claude(`You are the writer for Unraveled, a dark narrative history channel.
Here is the current script:
${script}
The editor has the following feedback:
"${revisionFeedback}"
Rewrite the script incorporating this feedback. Keep everything that works. Fix only what's noted.
Maintain the same cinematic, measured register. Same word count target (~1,950–2,100 words).
Return ONLY the revised script, no explanation.`, 4000);
    setScript(revised);
    setRevisionFeedback("");
    setShowRevision(false);
    setRevising(false);
  };

  const scoreHook = async () => {
    if (!script) return;
    setScoringHook(true);
    setHookScore(null);
    const firstPara = script.trim().split(/\n\n/)[0] || "";
    const raw = await claude(`You are a YouTube retention expert. Score this opening hook for a narrative history video.
Hook:
"${firstPara}"
Score it on these dimensions, each 1-10:
- Intrigue: does it make you need to know what happens?
- Specificity: concrete details vs vague generalities?
- Stakes: do we feel something matters?
- Voice: is the register distinctive and confident?
- Pacing: does the rhythm pull you forward?
Return ONLY valid JSON:
{"overall":7,"dimensions":{"intrigue":{"score":8,"note":"one sentence feedback"},"specificity":{"score":7,"note":"..."},"stakes":{"score":6,"note":"..."},"voice":{"score":8,"note":"..."},"pacing":{"score":7,"note":"..."}},"rewrite":"An improved version of the hook in the same voice","whyBetter":"One sentence explaining what the rewrite fixes"}`, 1000);
    try { setHookScore(JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g, "").trim())); }
    catch { setHookScore({ error: "Could not parse. Try again." }); }
    setScoringHook(false);
  };

  const analyzeRetention = async () => {
    if (!script) return;
    setAnalyzingRetention(true);
    setRetention(null);
    const raw = await claude(`You are a YouTube retention expert analyzing a narrative history script.
Identify the 3 moments most likely to cause viewers to drop off, and provide a specific line rewrite for each.
Script:
${script.substring(0, 3000)}
Return ONLY valid JSON:
{"risks":[{"timestamp":"approx minute mark e.g. 3:00","risk":"why viewers drop here","originalLine":"the exact line or passage causing the problem","rewrite":"improved version","fix":"one sentence on what changed"}]}
Identify exactly 3 risks. Be specific about which lines are the problem.`, 1500);
    try { setRetention(JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g, "").trim())); }
    catch { setRetention({ error: "Could not parse. Try again." }); }
    setAnalyzingRetention(false);
  };

  // live reanalysis when script is edited
  useEffect(() => {
    if (script) setAnalysis(analyzeScript(script));
  }, [script]);

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setScript("");
    setAnalysis(null);
    const text = await claude(`You are the writer for Unraveled, a dark narrative history channel.
Write a full 15-minute narration script (~1,950–2,100 words).
Topic: ${topic}
${episode ? `Episode: ${episode}` : ""}
${ctx ? `Additional context: ${ctx}` : ""}
${researchData ? `Research brief to draw from:\n${researchData.researchText}` : ""}
Rules:
- Open with a specific moment or date, not broad overview
- One central ordinary fictional-but-historically-plausible person inside a structural force
- The force is the antagonist, not a person
- Third person narrator, measured and cinematic
- Use the specific authentic details from the research brief if provided
- 2–4 sentence paragraphs separated by blank lines
- End on consequence, not resolution
- Pure narration prose — no headers, no stage directions
Return ONLY the script.`, 4000);
    setScript(text);
    setLoading(false);
  };

  const withinTarget = analysis && analysis.minutes >= 12 && analysis.minutes <= 15;

  return (
    <div>
      <div style={S.sectionTitle}>Stage 1 — Script Generation</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div><label style={S.label}>Episode #</label><input style={S.input} value={episode} onChange={e => setEpisode(e.target.value)} placeholder="e.g. 02" /></div>
          <div><label style={S.label}>Topic</label><textarea style={S.textarea(120)} value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. The last merchant on the Silk Road" /></div>
          <div><label style={S.label}>Additional Context <span style={{ color: "#d4d4d8" }}>(optional)</span></label><textarea style={S.textarea(80)} value={ctx} onChange={e => setCtx(e.target.value)} placeholder="Historical detail, tone notes, specific events..." /></div>
          <button style={S.btnPrimary(loading || !topic.trim())} onClick={generate} disabled={loading || !topic.trim()}>
            {loading ? "Writing..." : script ? "Regenerate Script" : "Generate Script"}
          </button>
          {analysis && (
            <div>
              {[
                { label: "Words", value: analysis.wordCount.toLocaleString() },
                { label: "Read Time", value: `${analysis.minutes}m ${analysis.seconds}s` },
                { label: "Paragraphs", value: analysis.paragraphCount },
              ].map(s => (
                <div key={s.label} style={S.statRow}>
                  <span style={S.statLabel}>{s.label}</span>
                  <span style={S.statValue}>{s.value}</span>
                </div>
              ))}
              <div style={{ padding: "10px 0", fontSize: "10px", color: withinTarget ? "#4a9068" : "#c0392b", letterSpacing: "1px" }}>
                {withinTarget ? "✓ Within 12–15 min target" : analysis.minutes < 12 ? `${12 - analysis.minutes}m short` : `${analysis.minutes - 15}m over`}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {script ? (
            <>
              <div style={{ display: "flex", gap: "0", marginBottom: "12px", flexWrap: "wrap" }}>
                {[
                  { key: "script", label: "Script", hint: "Edit your script" },
                  { key: "moods", label: "Moods", hint: "Mood arc across sections" },
                  { key: "hook", label: "Hook Score", hint: "Score & improve your opening" },
                  { key: "retention", label: "Retention", hint: "Find drop-off risk moments" },
                ].map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)} title={t.hint} style={{ padding: "10px 16px", background: tab === t.key ? "#111" : "transparent", border: "1px solid #e4e4e7", color: tab === t.key ? "#e2ddd5" : "#444", fontFamily: "inherit", fontSize: "10px", letterSpacing: "1px", cursor: "pointer" }}>{t.label}</button>
                ))}
                <div style={{ flex: 1 }} />
                <button style={S.btnSecondary(copied)} onClick={() => { navigator.clipboard.writeText(script); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              {tab === "script" && (
                <>
                  <div style={{ fontSize: "10px", color: "#a1a1aa", letterSpacing: "1px", marginBottom: "6px" }}>Edit directly — word count updates live</div>
                  <textarea
                    style={{ ...S.textarea(420), fontFamily: "inherit", fontSize: "13px", lineHeight: "1.9" }}
                    value={script}
                    onChange={e => setScript(e.target.value)}
                  />
                </>
              )}

              {tab === "moods" && analysis && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "480px", overflowY: "auto" }}>
                  {/* Legend */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px", padding: "8px 12px", background: "#f9fafb", borderRadius: "6px" }}>
                    {Object.entries(MOOD_COLORS).map(([mood, color]) => (
                      <div key={mood} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: "10px", color: "#71717a" }}>{mood}</span>
                      </div>
                    ))}
                  </div>
                  {analysis.sections.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", padding: "8px 12px", background: "#fff", border: "1px solid #f4f4f5", borderRadius: "4px" }}>
                      <div style={{ width: "3px", background: MOOD_COLORS[s.mood], alignSelf: "stretch", borderRadius: "2px" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "9px", color: MOOD_COLORS[s.mood], letterSpacing: "1px", textTransform: "uppercase", marginBottom: "2px", fontWeight: "600" }}>{s.mood}</div>
                        <div style={{ fontSize: "11px", color: "#71717a", lineHeight: "1.5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.text.substring(0, 80)}...</div>
                      </div>
                      <div style={{ fontSize: "9px", color: "#a1a1aa", minWidth: "40px", textAlign: "right", flexShrink: 0 }}>{formatTime(s.cumulativeTime)}</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "hook" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "480px", overflowY: "auto" }}>
                  <div style={{ fontSize: "10px", color: "#a1a1aa", letterSpacing: "1px", fontStyle: "italic" }}>
                    Scores your opening paragraph on intrigue, specificity, stakes, voice, and pacing — then rewrites it.
                  </div>
                  <button style={S.btnPrimary(scoringHook || !script)} onClick={scoreHook} disabled={scoringHook || !script}>
                    {scoringHook ? "Scoring..." : hookScore ? "Re-score Hook" : "Score My Hook"}
                  </button>
                  {hookScore?.error && <div style={{ color: "#c0392b", fontSize: "12px" }}>{hookScore.error}</div>}
                  {hookScore && !hookScore.error && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "#fff", border: `1px solid ${hookScore.overall >= 7 ? "#4a906833" : hookScore.overall >= 5 ? "#e67e2233" : "#c0392b33"}`, padding: "16px 20px" }}>
                        <div style={{ fontSize: "40px", color: hookScore.overall >= 7 ? "#4a9068" : hookScore.overall >= 5 ? "#e67e22" : "#c0392b", fontWeight: "500", minWidth: "60px" }}>{hookScore.overall}<span style={{ fontSize: "16px", color: "#a1a1aa" }}>/10</span></div>
                        <div style={{ fontSize: "11px", color: "#71717a" }}>Overall hook score</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        {Object.entries(hookScore.dimensions || {}).map(([key, val]) => (
                          <div key={key} style={{ background: "#fff", border: "1px solid #e4e4e7", padding: "10px 14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "9px", color: "#71717a", textTransform: "uppercase", letterSpacing: "1px" }}>{key}</span>
                              <span style={{ fontSize: "12px", color: val.score >= 7 ? "#4a9068" : val.score >= 5 ? "#e67e22" : "#c0392b" }}>{val.score}/10</span>
                            </div>
                            <div style={{ fontSize: "11px", color: "#71717a", lineHeight: "1.4" }}>{val.note}</div>
                          </div>
                        ))}
                      </div>
                      {hookScore.rewrite && (
                        <div style={{ background: "#fff", border: "1px solid #4a906833", padding: "16px" }}>
                          <div style={{ fontSize: "9px", color: "#4a9068", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>Suggested Rewrite</div>
                          <div style={{ fontSize: "13px", color: "#111", lineHeight: "1.8", fontStyle: "italic", marginBottom: "10px" }}>{hookScore.rewrite}</div>
                          <div style={{ fontSize: "10px", color: "#71717a", marginBottom: "10px" }}>{hookScore.whyBetter}</div>
                          <button style={S.btnSecondary(false)} onClick={() => {
                            const paras = script.split(/\n\n/);
                            paras[0] = hookScore.rewrite;
                            setScript(paras.join("\n\n"));
                            setHookScore(null);
                            setTab("script");
                          }}>Apply Rewrite to Script</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {tab === "retention" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "480px", overflowY: "auto" }}>
                  <div style={{ fontSize: "10px", color: "#a1a1aa", letterSpacing: "1px", fontStyle: "italic" }}>
                    Identifies the 3 highest drop-off risk moments and rewrites each one to keep viewers watching.
                  </div>
                  <button style={S.btnPrimary(analyzingRetention || !script)} onClick={analyzeRetention} disabled={analyzingRetention || !script}>
                    {analyzingRetention ? "Analyzing..." : retention ? "Re-analyze" : "Analyze Retention Risks"}
                  </button>
                  {retention?.error && <div style={{ color: "#c0392b", fontSize: "12px" }}>{retention.error}</div>}
                  {retention && !retention.error && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {(retention.risks || []).map((r, i) => (
                        <div key={i} style={{ background: "#fff", border: "1px solid #c0392b22", padding: "14px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <div style={{ fontSize: "9px", color: "#c0392b", letterSpacing: "2px", textTransform: "uppercase" }}>Risk {i + 1}</div>
                            <div style={{ fontSize: "10px", color: "#71717a", fontFamily: "monospace" }}>~{r.timestamp}</div>
                          </div>
                          <div style={{ fontSize: "11px", color: "#c0392b", marginBottom: "8px" }}>{r.risk}</div>
                          <div style={{ background: "#f9fafb", padding: "10px 12px", marginBottom: "8px", borderLeft: "3px solid #fca5a5" }}>
                            <div style={{ fontSize: "9px", color: "#a1a1aa", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>Original</div>
                            <div style={{ fontSize: "12px", color: "#71717a", fontStyle: "italic", lineHeight: "1.6" }}>"{r.originalLine}"</div>
                          </div>
                          <div style={{ background: "#f9fafb", padding: "10px 12px", marginBottom: "8px", borderLeft: "3px solid #86efac" }}>
                            <div style={{ fontSize: "9px", color: "#4a9068", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>Rewrite</div>
                            <div style={{ fontSize: "12px", color: "#111", lineHeight: "1.6" }}>"{r.rewrite}"</div>
                          </div>
                          <div style={{ fontSize: "10px", color: "#71717a", fontStyle: "italic", marginBottom: "10px" }}>{r.fix}</div>
                          <button style={S.btnSecondary(appliedFix === i)} onClick={() => {
                            if (r.originalLine && r.rewrite) {
                              setScript(prev => prev.replace(r.originalLine, r.rewrite));
                              setAppliedFix(i);
                              setTimeout(() => setAppliedFix(null), 2000);
                            }
                          }}>{appliedFix === i ? "✓ Applied!" : "Apply Fix to Script"}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: "16px" }}>
                {showRevision ? (
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ ...S.label, marginBottom: "6px" }}>Revision notes</label>
                    <textarea
                      style={{ ...S.textarea(80), fontSize: "12px", marginBottom: "8px" }}
                      value={revisionFeedback}
                      onChange={e => setRevisionFeedback(e.target.value)}
                      placeholder="e.g. The opening is too slow. The collapse section needs more weight. Add more specific dates."
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button style={S.btnPrimary(revising || !revisionFeedback.trim())} onClick={revise} disabled={revising || !revisionFeedback.trim()}>
                        {revising ? "Revising..." : "Apply Revision"}
                      </button>
                      <button style={S.btnSecondary(false)} onClick={() => setShowRevision(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button style={{ ...S.btnSecondary(false), width: "100%", marginBottom: "8px" }} onClick={() => setShowRevision(true)}>Give Feedback & Revise</button>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  style={{ ...S.btnApprove, flex: 1, padding: "16px 24px", fontSize: "12px", letterSpacing: "3px", borderWidth: "2px", background: "#f0fdf4" }}
                  onClick={() => onApprove({ script, analysis, episode, topic, ctx })}
                >
                  ✓ Approve Script & Continue →
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "#d4d4d8", fontSize: "13px", fontStyle: "italic" }}>
              {loading ? "Writing your script..." : "Generate a script using the form on the left"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── STAGE 2: ELEVENLABS MULTI-VOICE ─────────────────────────────────────────
function Stage2({ data, onApprove, saved }) {
  const taggedScript = injectV3Tags(data.script);
  const [voices, setVoices] = useState(saved?.voices || [
    { id: "v1", name: "Narrator", voiceId: "", color: VOICE_PALETTE[0], stability: 0.45, similarity: 0.82, style: 0.35 },
  ]);
  const [rosterReady, setRosterReady] = useState(saved?.rosterReady || false);
  const [segments, setSegments] = useState(saved?.segments || null);
  const [detecting, setDetecting] = useState(false);
  const [audioUrls, setAudioUrls] = useState({});
  const [generating, setGenerating] = useState({});
  const [errors, setErrors] = useState({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [activeSegment, setActiveSegment] = useState(0);
  const [showSettings, setShowSettings] = useState(null);

  const addVoice = () => {
    if (voices.length >= 6) return;
    const id = `v${Date.now()}`;
    setVoices(prev => [...prev, { id, name: `Voice ${prev.length + 1}`, voiceId: "", color: VOICE_PALETTE[prev.length % VOICE_PALETTE.length], stability: 0.6, similarity: 0.8, style: 0.2 }]);
  };
  const removeVoice = (id) => setVoices(prev => prev.filter(v => v.id !== id));
  const updateVoice = (id, field, value) => setVoices(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));

  const detectSegments = async () => {
    setDetecting(true);
    const voiceNames = voices.map(v => v.name).join(", ");
    const raw = await claude(`You are a script analyst for a narrative history channel.
Split this script into segments, assigning each paragraph to one of these voices: ${voiceNames}
Assign diary entries, letters, or quoted primary sources to secondary voices if available.
Script:
${data.script}
Return ONLY valid JSON:
{"segments":[{"text":"exact paragraph text","voice":"${voices[0].name}"}]}`, 4000);
    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setSegments(parsed.segments.map((seg, i) => ({
        id: `seg-${i}`,
        text: seg.text,
        voiceId: voices.find(v => v.name === seg.voice)?.id || voices[0].id,
      })));
      setActiveSegment(0);
    } catch {
      const paragraphs = data.script.split(/\n\n+/).filter(p => p.trim().length > 20);
      setSegments(paragraphs.map((text, i) => ({ id: `seg-${i}`, text: text.trim(), voiceId: voices[0].id })));
      setActiveSegment(0);
    }
    setDetecting(false);
  };

  const generateSegment = async (seg) => {
    const voice = voices.find(v => v.id === seg.voiceId);
    if (!voice?.voiceId) { setErrors(prev => ({ ...prev, [seg.id]: `No voice ID set for "${voice?.name}"` })); return; }
    setGenerating(prev => ({ ...prev, [seg.id]: true }));
    setErrors(prev => ({ ...prev, [seg.id]: null }));
    try {
      const url = await generateSpeech(injectV3Tags(seg.text), voice.voiceId, { stability: voice.stability, similarity: voice.similarity, style: voice.style });
      setAudioUrls(prev => ({ ...prev, [seg.id]: url }));
    } catch (e) {
      setErrors(prev => ({ ...prev, [seg.id]: e.message }));
    } finally {
      setGenerating(prev => ({ ...prev, [seg.id]: false }));
    }
  };

  const [generateProgress, setGenerateProgress] = useState({ current: 0, total: 0 });

  const generateAll = async () => {
    setGeneratingAll(true);
    const toGenerate = segments.filter(s => !audioUrls[s.id]);
    setGenerateProgress({ current: 0, total: toGenerate.length });
    for (let i = 0; i < toGenerate.length; i++) {
      setGenerateProgress({ current: i + 1, total: toGenerate.length });
      await generateSegment(toGenerate[i]);
    }
    setGeneratingAll(false);
    setGenerateProgress({ current: 0, total: 0 });
  };

  const downloadSegment = (seg, index) => {
    const url = audioUrls[seg.id]; if (!url) return;
    const voice = voices.find(v => v.id === seg.voiceId);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.episode ? `ep${data.episode}_` : ""}seg${String(index + 1).padStart(2, "0")}_${voice?.name || "voice"}.mp3`;
    a.click();
  };

  const [zipping, setZipping] = useState(false);
  const downloadAllZip = async () => {
    setZipping(true);
    try {
      if (!window.JSZip) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
          script.onload = resolve; script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const zip = new window.JSZip();
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const url = audioUrls[seg.id];
        if (!url) continue;
        const voice = voices.find(v => v.id === seg.voiceId);
        const res = await fetch(url);
        const blob = await res.blob();
        const filename = `${data.episode ? `ep${data.episode}_` : ""}seg${String(i + 1).padStart(2, "00")}_${voice?.name || "voice"}.mp3`;
        zip.file(filename, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `${data.episode ? `ep${data.episode}_` : "episode_"}voiceover.zip`;
      a.click();
    } catch (e) {
      alert("Download failed: " + e.message);
    }
    setZipping(false);
  };

  const stats = (() => {
    const t = taggedScript;
    return {
      short: (t.match(/\[short pause\]/g) || []).length,
      pause: (t.match(/\[pause\]/g) || []).length,
      long: (t.match(/\[long pause\]/g) || []).length,
      dramatic: (t.match(/\[dramatic tone\]/g) || []).length,
    };
  })();

  const allGenerated = segments && segments.every(s => !!audioUrls[s.id]);
  const anyGenerated = segments && segments.some(s => !!audioUrls[s.id]);

  return (
    <div>
      <div style={S.sectionTitle}>Stage 2 — ElevenLabs Voiceover</div>

      {/* Tag stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: "#f4f4f5", marginBottom: "28px" }}>
        {[
          { label: "Short Pause", value: stats.short, color: "#f39c12" },
          { label: "Pause", value: stats.pause, color: "#e67e22" },
          { label: "Long Pause", value: stats.long, color: "#e74c3c" },
          { label: "Dramatic", value: stats.dramatic, color: "#9b59b6" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fafafa", padding: "14px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "9px", color: "#a1a1aa", letterSpacing: "1px", textTransform: "uppercase", marginTop: "4px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Step 1: Voice roster */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontSize: "10px", color: "#71717a", letterSpacing: "2px", textTransform: "uppercase" }}>Step 1 — Define Voices</div>
          {voices.length < 6 && <button style={{ ...S.btnSecondary(false), fontSize: "9px" }} onClick={addVoice}>+ Add Voice</button>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {voices.map((v) => (
            <div key={v.id} style={{ background: "#fff", border: `1px solid ${v.color}22` }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "10px 14px" }}>
                <div style={{ width: "3px", alignSelf: "stretch", background: v.color, borderRadius: "2px", flexShrink: 0 }} />
                <input style={{ ...S.input, width: "130px", flexShrink: 0, fontSize: "12px" }} value={v.name} onChange={e => updateVoice(v.id, "name", e.target.value)} placeholder="Voice name" />
                <input style={{ ...S.input, flex: 1, fontFamily: "monospace", fontSize: "11px" }} value={v.voiceId} onChange={e => updateVoice(v.id, "voiceId", e.target.value)} placeholder="Paste voice ID from elevenlabs.io → Voices → your voice → ID" />
                <button onClick={() => setShowSettings(showSettings === v.id ? null : v.id)} style={{ background: "none", border: "1px solid #222", color: showSettings === v.id ? v.color : "#444", cursor: "pointer", fontSize: "10px", padding: "6px 10px", fontFamily: "inherit", whiteSpace: "nowrap" }}>⚙ Settings</button>
                {voices.length > 1 && <button onClick={() => removeVoice(v.id)} style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}>×</button>}
              </div>
              {showSettings === v.id && (
                <div style={{ padding: "14px 20px", borderTop: `1px solid ${v.color}22`, display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { key: "stability", label: "Stability", hint: "Lower = more expressive" },
                    { key: "similarity", label: "Similarity", hint: "Higher = stays closer to voice" },
                    { key: "style", label: "Style", hint: "Higher = more dramatic" },
                  ].map(({ key, label, hint }) => (
                    <div key={key}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "10px", color: "#71717a", letterSpacing: "1px", textTransform: "uppercase" }}>{label}</span>
                        <span style={{ fontSize: "10px", color: v.color }}>{v[key].toFixed(2)} <span style={{ color: "#a1a1aa" }}>— {hint}</span></span>
                      </div>
                      <input type="range" min="0" max="1" step="0.01" value={v[key]} onChange={e => updateVoice(v.id, key, parseFloat(e.target.value))} style={S.slider} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {!rosterReady && (
          <button style={{ ...S.btnPrimary(voices.some(v => !v.voiceId.trim())), marginTop: "16px" }} onClick={() => setRosterReady(true)} disabled={voices.some(v => !v.voiceId.trim())}>
            Confirm Voices & Continue →
          </button>
        )}
        {rosterReady && <div style={{ marginTop: "10px", fontSize: "10px", color: "#4a9068", letterSpacing: "1px" }}>✓ {voices.length} voice{voices.length > 1 ? "s" : ""} confirmed</div>}
      </div>

      {/* Step 2: Segments */}
      {rosterReady && (
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "10px", color: "#71717a", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Step 2 — Assign Voices to Script</div>
          {!segments && (
            <div style={{ display: "flex", gap: "10px" }}>
              {voices.length > 1 && (
                <button style={{ ...S.btnPrimary(detecting), flex: 1 }} onClick={detectSegments} disabled={detecting}>
                  {detecting ? "Detecting..." : "Auto-detect Voice Segments"}
                </button>
              )}
              <button
                style={voices.length > 1 ? S.btnSecondary(false) : { ...S.btnPrimary(false), flex: 1 }}
                onClick={() => {
                  const paragraphs = data.script.split(/\n\n+/).filter(p => p.trim().length > 20);
                  setSegments(paragraphs.map((text, i) => ({ id: `seg-${i}`, text: text.trim(), voiceId: voices[0].id })));
                }}
              >
                {voices.length > 1 ? "Assign All to Narrator" : "Split into Segments"}
              </button>
            </div>
          )}
          {segments && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontSize: "10px", color: "#a1a1aa" }}>{segments.length} segments · {segments.filter(s => !!audioUrls[s.id]).length} generated</div>
                <button style={{ ...S.btnSecondary(false), fontSize: "9px" }} onClick={() => setSegments(null)}>Re-detect</button>
              </div>
              {/* Progress grid */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginBottom: "12px", padding: "10px", background: "#f9fafb", borderRadius: "8px" }}>
                {segments.map((seg, i) => {
                  const voice = voices.find(v => v.id === seg.voiceId) || voices[0];
                  const done = !!audioUrls[seg.id];
                  const running = !!generating[seg.id];
                  return (
                    <div
                      key={seg.id}
                      onClick={() => setActiveSegment(i)}
                      title={`Segment ${i + 1}: ${seg.text.substring(0, 50)}...`}
                      style={{
                        width: "18px", height: "18px", borderRadius: "3px", cursor: "pointer",
                        background: running ? "#e67e22" : done ? "#22c55e" : activeSegment === i ? voice.color : "#e4e4e7",
                        transition: "background 0.2s",
                        border: activeSegment === i && !done && !running ? `2px solid ${voice.color}` : "none",
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "280px", overflowY: "auto" }}>
                {segments.map((seg, i) => {
                  const voice = voices.find(v => v.id === seg.voiceId) || voices[0];
                  return (
                    <div key={seg.id} onClick={() => setActiveSegment(i)} style={{ display: "flex", gap: "10px", padding: "10px 12px", background: activeSegment === i ? "#f9fafb" : "#fff", border: `1px solid ${activeSegment === i ? voice.color + "44" : "#e4e4e7"}`, cursor: "pointer", borderRadius: "6px" }}>
                      <div style={{ width: "3px", background: voice.color, alignSelf: "stretch", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "10px", color: voice.color, letterSpacing: "1px", marginBottom: "4px", textTransform: "uppercase" }}>
                          {voice.name} {audioUrls[seg.id] && <span style={{ color: "#4a9068" }}>✓</span>} {generating[seg.id] && <span style={{ color: "#e67e22" }}>generating...</span>}
                        </div>
                        <div style={{ fontSize: "12px", color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{seg.text.substring(0, 90)}...</div>
                      </div>
                      {voices.length > 1 && (
                        <select value={seg.voiceId} onChange={e => { e.stopPropagation(); setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, voiceId: e.target.value } : s)); }} onClick={e => e.stopPropagation()} style={{ background: "#f4f4f5", border: "1px solid #222", color: "#888", fontSize: "10px", padding: "4px 8px", fontFamily: "inherit", cursor: "pointer", flexShrink: 0 }}>
                          {voices.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Generate */}
      {segments && (
        <div>
          <div style={{ fontSize: "10px", color: "#71717a", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Step 3 — Generate Audio</div>
          {segments[activeSegment] && (() => {
            const seg = segments[activeSegment];
            const voice = voices.find(v => v.id === seg.voiceId) || voices[0];
            return (
              <div style={{ background: "#fff", border: `1px solid ${voice.color}33`, padding: "16px", marginBottom: "16px" }}>
                <div style={{ fontSize: "10px", color: voice.color, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "10px" }}>Segment {activeSegment + 1} of {segments.length} — {voice.name}</div>
                <div style={{ fontSize: "12px", color: "#52525b", lineHeight: "1.8", maxHeight: "120px", overflowY: "auto", fontFamily: "monospace", marginBottom: "14px" }}>{renderTagged(injectV3Tags(seg.text))}</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  <button style={{ ...S.btnPrimary(generating[seg.id]), flex: 1, minWidth: "140px" }} onClick={() => generateSegment(seg)} disabled={generating[seg.id]}>
                    {generating[seg.id] ? "Generating..." : audioUrls[seg.id] ? "Regenerate" : "Generate"}
                  </button>
                  {audioUrls[seg.id] && (
                    <>
                      <audio key={audioUrls[seg.id]} controls src={audioUrls[seg.id]} style={{ flex: 2, minWidth: "180px", height: "34px" }} />
                      <button style={S.btnSecondary(false)} onClick={() => downloadSegment(seg, activeSegment)}>↓</button>
                    </>
                  )}
                </div>
                {errors[seg.id] && <div style={{ marginTop: "10px", padding: "8px 12px", background: "#fef2f2", border: "1px solid #3a1111", color: "#c0392b", fontSize: "11px", fontFamily: "monospace" }}>{errors[seg.id]}</div>}
              </div>
            );
          })()}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button style={{ ...S.btnSecondary(false), flex: 1 }} onClick={() => setActiveSegment(Math.max(0, activeSegment - 1))}>← Prev</button>
            <button style={{ ...S.btnSecondary(false), flex: 1 }} onClick={() => setActiveSegment(Math.min(segments.length - 1, activeSegment + 1))}>Next →</button>
            <button style={{ ...S.btnPrimary(generatingAll || allGenerated), flex: 2 }} onClick={() => {
              const remaining = segments.filter(s => !audioUrls[s.id]).length;
              if (remaining > 0 && !window.confirm(`Generate ${remaining} remaining segment${remaining > 1 ? "s" : ""}? This will use ElevenLabs credits and may take ${Math.round(remaining * 1.5)} minutes.`)) return;
              generateAll();
            }} disabled={generatingAll || allGenerated}>
              {generatingAll ? `Generating ${generateProgress.current} of ${generateProgress.total}...` : allGenerated ? "✓ All Generated" : `Generate Remaining ${segments.filter(s => !audioUrls[s.id]).length}`}
            </button>
          </div>
          {anyGenerated && (
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button style={{ ...S.btnApprove, flex: 1 }} onClick={() => onApprove({ segments, voices, audioUrls })}>Approve & Continue →</button>
              {allGenerated && (
                <button style={{ ...S.btnSecondary(false), whiteSpace: "nowrap" }} onClick={downloadAllZip} disabled={zipping}>
                  {zipping ? "Zipping..." : "↓ Download All as ZIP"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── STAGE 3: SOUND DESIGN ───────────────────────────────────────────────────
function Stage3({ data, onApprove, saved }) {
  const [cues, setCues] = useState(saved?.cues || null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setCues(null);
    const totalMins = data.analysis ? `${data.analysis.minutes}:${String(data.analysis.seconds).padStart(2,"0")}` : "15:00";
    const raw = await claude(`You are a sound designer for Unraveled, a dark cinematic narrative history channel.
Analyze this script and produce a complete sound design plan with three layers.
The video is exactly ${totalMins} long. All timestamps must fall within this duration.
Era/Region: ${data.era || "historical"}
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
Include period-accurate instrumentation — no anachronistic Western instruments unless the era is modern.
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
      "═══ MUSIC BED ═══",
      ...cues.musicBed.map(c => `[${c.timestamp}] ${c.mood}\n  ${c.description}\n  → ${c.notes}`),
      "\n═══ AMBIENT LAYER ═══",
      ...cues.ambientLayer.map(c => `[${c.timestamp}] ${c.environment}\n  ${c.sounds}\n  → ${c.notes}`),
      "\n═══ SOUND EFFECTS ═══",
      ...cues.effects.map(c => `[${c.timestamp}] "${c.trigger}"\n  ↳ ${c.sound}\n  Why: ${c.purpose}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `sound_design_ep${data.episode || "xx"}.txt`; a.click();
  };

  const CUE_SECTION = ({ title, color, items, fields }) => (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ fontSize: "10px", color, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px", borderBottom: `1px solid ${color}33`, paddingBottom: "6px" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: "#fff", border: `1px solid ${color}22`, padding: "12px 16px" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div style={{ fontSize: "11px", color, fontFamily: "monospace", minWidth: "44px", flexShrink: 0 }}>{item.timestamp}</div>
              <div style={{ flex: 1 }}>
                {fields.map(f => (
                  <div key={f.key} style={{ marginBottom: "4px" }}>
                    <span style={{ fontSize: "10px", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "1px" }}>{f.label}: </span>
                    <span style={{ fontSize: "12px", color: f.key === "trigger" ? "#e2ddd5" : "#777", fontStyle: f.key === "trigger" ? "italic" : "normal" }}>{item[f.key]}</span>
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
      <div style={S.sectionTitle}>Stage 3 — Sound Design</div>
      {!cues && !loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ color: "#a1a1aa", fontSize: "13px", marginBottom: "24px", fontStyle: "italic" }}>Generate a full sound design plan — music cues, ambient layers, and effect placements</div>
          <button style={{ ...S.btnPrimary(false), width: "auto", padding: "12px 40px" }} onClick={generate}>Generate Sound Design</button>
        </div>
      )}
      {loading && <div style={{ color: "#71717a", fontSize: "13px", padding: "40px 0", textAlign: "center", fontStyle: "italic" }}>Analyzing script for sound cues...</div>}
      {cues && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ fontSize: "10px", color: "#a1a1aa", letterSpacing: "1px" }}>
              {cues.musicBed.length} music cues · {cues.ambientLayer.length} ambient shifts · {cues.effects.length} effects
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={S.btnSecondary(false)} onClick={generate}>Regenerate</button>
              <button style={S.btnSecondary(false)} onClick={exportCues}>↓ Export .txt</button>
            </div>
          </div>
          <CUE_SECTION title="Music Bed" color="#2980b9" items={cues.musicBed} fields={[{ key: "mood", label: "Mood" }, { key: "description", label: "Feel" }, { key: "notes", label: "Notes" }]} />
          <CUE_SECTION title="Ambient Layer" color="#4a9068" items={cues.ambientLayer} fields={[{ key: "environment", label: "Environment" }, { key: "sounds", label: "Sounds" }, { key: "notes", label: "Notes" }]} />
          <CUE_SECTION title="Sound Effects" color="#c0392b" items={cues.effects} fields={[{ key: "trigger", label: "On line" }, { key: "sound", label: "Effect" }, { key: "purpose", label: "Why" }]} />
          {/* Cold Open */}
          {cues.coldOpen && (
            <div style={{ marginBottom: "20px", background: "#fff", border: "1px solid #8e44ad22", padding: "14px 18px", borderRadius: "10px" }}>
              <div style={{ fontSize: "10px", color: "#8e44ad", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>Cold Open — Before First Word</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { label: "Duration", val: cues.coldOpen.duration },
                  { label: "Sound", val: cues.coldOpen.sound },
                  { label: "Mood", val: cues.coldOpen.mood },
                  { label: "Source", val: cues.coldOpen.source },
                ].map(r => (
                  <div key={r.label} style={{ background: "#f9fafb", padding: "8px 12px", borderRadius: "6px" }}>
                    <div style={{ fontSize: "9px", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "2px" }}>{r.label}</div>
                    <div style={{ fontSize: "12px", color: "#111" }}>{r.val}</div>
                  </div>
                ))}
              </div>
              {cues.coldOpen.instruction && <div style={{ marginTop: "8px", fontSize: "11px", color: "#71717a", fontStyle: "italic" }}>→ {cues.coldOpen.instruction}</div>}
            </div>
          )}

          {/* Mixing Guide */}
          {cues.mixingGuide && (
            <div style={{ marginBottom: "20px", background: "#fff", border: "1px solid #e4e4e7", padding: "14px 18px", borderRadius: "10px" }}>
              <div style={{ fontSize: "10px", color: "#71717a", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>Mixing Levels Guide</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {Object.entries(cues.mixingGuide).map(([key, val]) => (
                  <div key={key} style={{ display: "flex", gap: "12px", padding: "6px 0", borderBottom: "1px solid #f4f4f5" }}>
                    <span style={{ fontSize: "11px", color: "#71717a", minWidth: "120px", textTransform: "capitalize" }}>{key.replace(/([A-Z])/g, " $1")}</span>
                    <span style={{ fontSize: "11px", color: "#111" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button style={{ ...S.btnApprove, marginTop: "8px" }} onClick={() => onApprove({ cues })}>Approve & Continue →</button>
        </>
      )}
    </div>
  );
}

// ─── STAGE 4: IMAGES (MANUAL + IDEOGRAM AUTO) ───────────────────────────────
const IDEOGRAM_API_KEY = process.env.REACT_APP_IDEOGRAM_KEY;

async function generateIdeogramImage(prompt) {
  if (!IDEOGRAM_API_KEY) throw new Error("No Ideogram API key — set REACT_APP_IDEOGRAM_KEY");
  const res = await fetch("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Api-Key": IDEOGRAM_API_KEY },
    body: JSON.stringify({
      image_request: {
        prompt,
        aspect_ratio: "ASPECT_16_9",
        model: "V_2",
        style_type: "REALISTIC",
        negative_prompt: "bright colors, happy mood, modern, text, maps, cartoonish, photorealistic skin, fantasy, weapons, people smiling",
      }
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Ideogram error: ${res.status}`);
  }
  const data = await res.json();
  return data.data?.[0]?.url || null;
}

function Stage4({ data, onApprove, saved }) {
  const [prompts, setPrompts] = useState(saved?.prompts || []);
  const [mode, setMode] = useState(saved?.mode || "manual");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [copied, setCopied] = useState(null);
  const [images, setImages] = useState(saved?.images || {});
  const [generating, setGenerating] = useState({});
  const [imgErrors, setImgErrors] = useState({});
  const [generatingAll, setGeneratingAll] = useState(false);

  const generatePrompts = useCallback(async () => {
    setLoading(true);
    setPrompts([]);
    setImages({});
    const imagePoints = selectImagePoints(data.analysis.sections);
    setProgress({ current: 0, total: imagePoints.length });
    const results = [];
    for (let i = 0; i < imagePoints.length; i++) {
      const pt = imagePoints[i];
      const era = data.era || "historical";
      const raw = await claude(`You are an image prompt expert for Unraveled, a dark cinematic narrative history channel.
Write ONE Midjourney image prompt for this paragraph:
"${pt.text.substring(0, 400)}"
Mood: ${pt.mood}
Era/Region: ${era}

RULES — follow strictly:
- NEVER use the word "medieval" — it defaults to European fantasy. Use the specific era and region instead.
- For figures: include specific culturally accurate clothing, armor, and equipment from the actual era and region.
- Include explicit spatial direction: "viewed from...", "camera angle...", "foreground/background..."
- Use period-appropriate artistic style: for Islamic/Central Asian subjects use "Persian miniature painting style, muted earth tones, aged parchment texture". For European subjects use "Flemish oil painting style". Avoid generic "cinematic" for historical subjects.
- No generic fantasy aesthetics. Ground every detail in the specific culture and time period.
- Include specific architectural details from the region (e.g. Islamic arches, blue tilework, mud brick for Central Asia).

Also write ONE sentence (max 15 words) explaining why a new image is needed here.
Return ONLY valid JSON:
{"prompt":"...","why":"...","segmentIndex":${i}}`, 600);
      let prompt = raw, why = "";
      try {
        const p = JSON.parse(raw.replace(/\`\`\`json|\`\`\`/g, "").trim());
        prompt = `${p.prompt}, oil painting texture, no text, ${STYLE_BASE}`;
        why = p.why;
      } catch { prompt = `${raw}, oil painting texture, no text, ${STYLE_BASE}`; }
      results.push({ ...pt, prompt, why, imageNumber: i + 1, segmentIndex: i });
      setPrompts([...results]);
      setProgress({ current: i + 1, total: imagePoints.length });
    }
    setLoading(false);
  }, [data]);

  const generateImage = async (p) => {
    setGenerating(prev => ({ ...prev, [p.imageNumber]: true }));
    setImgErrors(prev => ({ ...prev, [p.imageNumber]: null }));
    try {
      const url = await generateIdeogramImage(p.prompt);
      setImages(prev => ({ ...prev, [p.imageNumber]: url }));
    } catch (e) {
      setImgErrors(prev => ({ ...prev, [p.imageNumber]: e.message }));
    } finally {
      setGenerating(prev => ({ ...prev, [p.imageNumber]: false }));
    }
  };

  const generateAllImages = async () => {
    setGeneratingAll(true);
    for (const p of prompts) {
      if (!images[p.imageNumber]) await generateImage(p);
    }
    setGeneratingAll(false);
  };

  const downloadImage = async (url, num) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ep${data.episode || "xx"}_img${String(num).padStart(2,"0")}.png`;
    a.click();
  };

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };
  const copyAll = () => copy(prompts.map(p => p.prompt).join("\n\n"), "all");
  const exportAll = () => {
    const blob = new Blob([prompts.map((p, i) => `Image ${i+1} — ${p.mood}\n${p.why ? `Why: ${p.why}\n` : ""}${p.prompt}`).join("\n\n")], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `image_prompts_ep${data.episode || "xx"}.txt`; a.click();
  };
  const REASON_COLORS = { opening: "#2980b9", closing: "#2980b9", "mood shift": "#c0392b", pacing: "#555" };
  const anyImages = Object.keys(images).length > 0;
  const allImages = prompts.length > 0 && prompts.every(p => !!images[p.imageNumber]);

  return (
    <div>
      <div style={S.sectionTitle}>Stage 4 — Images</div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "2px", marginBottom: "24px" }}>
        {[
          { key: "manual", label: "Manual (Midjourney)" },
          { key: "auto", label: "Auto (Ideogram API)" },
        ].map(m => (
          <button key={m.key} onClick={() => setMode(m.key)} style={{ padding: "10px 20px", background: mode === m.key ? "#111827" : "#fff", border: `1px solid ${mode === m.key ? "#111827" : "#e4e4e7"}`, color: mode === m.key ? "#fff" : "#52525b", fontFamily: "inherit", fontSize: "12px", fontWeight: mode === m.key ? "600" : "400", cursor: "pointer", borderRadius: "6px" }}>
            {m.label}
          </button>
        ))}
        {mode === "auto" && !IDEOGRAM_API_KEY && (
          <div style={{ padding: "10px 16px", fontSize: "11px", color: "#c0392b", fontFamily: "monospace" }}>Set REACT_APP_IDEOGRAM_KEY to use auto mode</div>
        )}
      </div>

      {/* Generate prompts */}
      {prompts.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ color: "#a1a1aa", fontSize: "13px", marginBottom: "24px", fontStyle: "italic" }}>
            {mode === "auto" ? "Generate prompts and images automatically via Ideogram" : "Generate prompts to use in Midjourney"}
          </div>
          <button style={{ ...S.btnPrimary(false), width: "auto", padding: "12px 40px" }} onClick={generatePrompts}>Generate Image Prompts</button>
        </div>
      )}

      {loading && (
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "10px", color: "#71717a", letterSpacing: "2px", marginBottom: "8px" }}>Building prompts {progress.current} / {progress.total}</div>
          <div style={{ background: "#f4f4f5", height: "2px" }}><div style={{ height: "100%", background: "#2980b9", width: progress.total ? `${(progress.current / progress.total) * 100}%` : "0%", transition: "width 0.3s" }} /></div>
        </div>
      )}

      {prompts.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", color: "#71717a", letterSpacing: "2px", textTransform: "uppercase" }}>{prompts.length} images</div>
            <div style={{ display: "flex", gap: "8px" }}>
              {!loading && <button style={S.btnSecondary(false)} onClick={generatePrompts}>Regenerate Prompts</button>}
              {mode === "manual" && <button style={S.btnSecondary(copied === "all")} onClick={copyAll}>{copied === "all" ? "Copied!" : "Copy All"}</button>}
              {mode === "manual" && <button style={S.btnSecondary(false)} onClick={exportAll}>↓ Export</button>}
              {mode === "auto" && !generatingAll && !allImages && (
                <button style={S.btnPrimary(false)} onClick={generateAllImages}>Generate All Images</button>
              )}
              {mode === "auto" && generatingAll && (
                <button style={S.btnPrimary(true)} disabled>Generating...</button>
              )}
            </div>
          </div>

          {prompts.map((p, i) => (
            <div key={i} style={{ ...S.promptCard, marginBottom: "16px" }}>
              <div style={S.promptHeader}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "#a1a1aa" }}>Image {p.imageNumber}</span>
                  {p.reasons.map(r => <span key={r} style={{ fontSize: "8px", color: REASON_COLORS[r] || "#444", letterSpacing: "1px", textTransform: "uppercase" }}>{r}</span>)}
                  <span style={{ fontSize: "9px", color: MOOD_COLORS[p.mood] }}>{p.mood}</span>
                  {mode === "auto" && images[p.imageNumber] && <span style={{ fontSize: "9px", color: "#4a9068" }}>✓ generated</span>}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {mode === "manual" && <button style={S.btnSecondary(copied === i)} onClick={() => copy(p.prompt, i)}>{copied === i ? "Copied!" : "Copy"}</button>}
                  {mode === "auto" && !images[p.imageNumber] && (
                    <button style={S.btnSecondary(generating[p.imageNumber])} onClick={() => generateImage(p)} disabled={generating[p.imageNumber]}>
                      {generating[p.imageNumber] ? "..." : "Generate"}
                    </button>
                  )}
                  {mode === "auto" && images[p.imageNumber] && (
                    <>
                      <button style={S.btnSecondary(false)} onClick={() => generateImage(p)}>Retry</button>
                      <button style={S.btnSecondary(false)} onClick={() => downloadImage(images[p.imageNumber], p.imageNumber)}>↓</button>
                    </>
                  )}
                </div>
              </div>

              <div style={S.promptBody}>{p.prompt}</div>
              {p.why && <div style={{ padding: "8px 16px", borderTop: "1px solid #f4f4f5", fontSize: "11px", color: "#4a9068", fontStyle: "italic" }}>↳ {p.why}</div>}

              {/* Ideogram result */}
              {mode === "auto" && images[p.imageNumber] && (
                <div style={{ padding: "12px 16px", borderTop: "1px solid #e4e4e7" }}>
                  <img src={images[p.imageNumber]} alt={`Image ${p.imageNumber}`} style={{ width: "100%", display: "block", borderRadius: "2px" }} />
                </div>
              )}
              {mode === "auto" && imgErrors[p.imageNumber] && (
                <div style={{ padding: "8px 16px", borderTop: "1px solid #f4f4f5", fontSize: "11px", color: "#c0392b", fontFamily: "monospace" }}>{imgErrors[p.imageNumber]}</div>
              )}
            </div>
          ))}

          {!loading && (
            <button style={{ ...S.btnApprove, marginTop: "8px" }} onClick={() => onApprove({ prompts, images, mode })}>
              Approve & Continue →
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── STAGE 5: THUMBNAIL ──────────────────────────────────────────────────────
function Stage5({ data, onApprove, saved }) {
  const research = data.research;
  const [form, setForm] = useState({
    title: saved?.title || (data.topic && !data.topic.startsWith("TOPIC:") ? data.topic : research?.characterProfile?.name ? `The ${research.characterProfile.role}: ${research.characterProfile.name}` : data.topic?.split("\n")[0]?.replace(/^TOPIC:\s*/i,"") || ""),
    subject: saved?.subject || (research ? `${research.characterProfile?.name}, ${research.characterProfile?.role}` : ""),
    moment: saved?.moment || research?.characterProfile?.arc?.split(".")[0] || "",
    period: saved?.period || data.era || "",
  });
  const [concepts, setConcepts] = useState(saved?.concepts || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const generate = async () => {
    setLoading(true); setConcepts(null);
    const raw = await claude(`You are a YouTube thumbnail strategist for Unraveled, a dark historical narrative channel.
Generate 3 thumbnail concepts. One image-led, one text-led, one emotion-led.
Title: ${form.title}
Episode: ${data.episode || ""}
Subject: ${form.subject}
Key emotional moment: ${form.moment}
Period: ${form.period}
Return ONLY valid JSON:
{"concepts":[{"approach":"Image-led","headline":"Max 5 words","subtext":"Max 3 words or null","imagePrompt":"Midjourney prompt","typography":"font description","colorPalette":{"bg":"hex","textPrimary":"hex","textAccent":"hex"},"notes":"1 sentence on why this works"}]}`);
    try { setConcepts(JSON.parse(raw.replace(/```json|```/g, "").trim()).concepts); } catch (e) {}
    setLoading(false);
  };

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };
  const APPROACH_COLORS = { "Image-led": "#2980b9", "Text-led": "#c0392b", "Emotion-led": "#8e44ad" };

  return (
    <div>
      <div style={S.sectionTitle}>Stage 5 — Thumbnail Concepts</div>
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[
            { key: "title", label: "Video Title", placeholder: "Auto-filled from topic" },
            { key: "subject", label: "Main Subject", placeholder: "e.g. Last Silk Road merchant" },
            { key: "moment", label: "Key Emotional Moment", placeholder: "The moment everything changed" },
            { key: "period", label: "Historical Period", placeholder: "e.g. 15th century Central Asia" },
          ].map(f => (
            <div key={f.key}><label style={S.label}>{f.label}</label><input style={S.input} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} /></div>
          ))}
          <button style={S.btnPrimary(loading || !form.subject)} onClick={generate} disabled={loading || !form.subject}>
            {loading ? "Generating..." : "Generate Concepts"}
          </button>
        </div>
        <div style={{ overflowY: "auto" }}>
          {!concepts && !loading && <div style={{ color: "#d4d4d8", fontSize: "13px", fontStyle: "italic", paddingTop: "40px" }}>Fill in the details to generate thumbnail concepts</div>}
          {loading && <div style={{ color: "#71717a", fontSize: "13px", paddingTop: "40px" }}>Generating...</div>}
          {concepts && concepts.map((c, i) => (
            <div key={i} style={{ border: `1px solid ${APPROACH_COLORS[c.approach]}22`, background: "#fafafa", marginBottom: "16px" }}>
              <div style={{ padding: "12px 18px", borderBottom: `1px solid ${APPROACH_COLORS[c.approach]}22` }}>
                <span style={{ fontSize: "10px", color: APPROACH_COLORS[c.approach], letterSpacing: "2px", textTransform: "uppercase" }}>{c.approach}</span>
              </div>
              <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ background: "#111", padding: "0", aspectRatio: "16/9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid #e4e4e7", position: "relative", overflow: "hidden" }}>
                  <div style={{ fontSize: "28px", color: "#fff", fontWeight: "800", lineHeight: "1.2", textAlign: "center", padding: "0 20px", textShadow: "0 2px 8px rgba(0,0,0,0.8)", fontFamily: "Impact, Arial Black, sans-serif" }}>{c.headline}</div>
                  {c.subtext && <div style={{ fontSize: "14px", color: "#ccc", marginTop: "8px", textAlign: "center" }}>{c.subtext}</div>}
                  <div style={{ position: "absolute", top: "8px", left: "8px", fontSize: "10px", color: "#aaa", background: "rgba(0,0,0,0.6)", padding: "2px 6px", borderRadius: "3px" }}>SAMARKAND, 1220</div>
                </div>
                <div><div style={{ ...S.label, marginBottom: "6px" }}>Midjourney Prompt</div>
                  <div style={{ background: "#fff", border: "1px solid #e4e4e7", padding: "12px", fontFamily: "monospace", fontSize: "11px", color: "#3f3f46", lineHeight: "1.6" }}>/imagine prompt: {c.imagePrompt}</div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button style={S.btnSecondary(copied === `img-${i}`)} onClick={() => copy(`/imagine prompt: ${c.imagePrompt} --ar 16:9 --style raw --v 6.1`, `img-${i}`)}>{copied === `img-${i}` ? "✓ Copied!" : "Copy Prompt"}</button>
                    <button style={{ ...S.btnApprove, flex: 1 }} onClick={() => onApprove({ thumbnailForm: form, concepts, selectedConcept: c, selectedIndex: i })}>Select This Concept →</button>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #f4f4f5", paddingTop: "14px", fontSize: "11px", color: "#71717a", fontStyle: "italic" }}>{c.notes}</div>
              </div>
            </div>
          ))}
          {concepts && <div style={{ fontSize: "11px", color: "#71717a", fontStyle: "italic", marginTop: "8px" }}>Select a concept above to continue to Assembly</div>}
        </div>
      </div>
    </div>
  );
}

// ─── STAGE 6: YOUTUBE METADATA ───────────────────────────────────────────────
function Stage6({ data, saved, onApprove }) {
  const [meta, setMeta] = useState(saved?.meta || null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const generate = async () => {
    setLoading(true); setMeta(null);
    const totalMins = data.analysis ? `${data.analysis.minutes}:${String(data.analysis.seconds).padStart(2,"0")}` : "15:00";
    const raw = await claude(`You are a YouTube SEO strategist for Unraveled, a dark narrative history channel about ordinary people inside historical forces.
Generate complete upload metadata for this video.
Topic: ${data.topic}
Episode: ${data.episode || ""}
Video duration: ${totalMins}
Script excerpt (first 600 words):
${data.script?.substring(0, 2400) || ""}
Return ONLY valid JSON:
{
  "titles": [
    {"option": "A", "text": "title option 1", "angle": "why this works"},
    {"option": "B", "text": "title option 2", "angle": "why this works"},
    {"option": "C", "text": "title option 3", "angle": "why this works"}
  ],
  "description": "full YouTube description, 3-4 paragraphs, ends with channel tagline and 'New episodes monthly.'",
  "tags": ["tag1","tag2"],
  "category": "Education",
  "chapters": [{"time":"0:00","title":"chapter title"}]
}
CRITICAL: All chapter timestamps must fall within the ${totalMins} video duration. Space chapters evenly across the actual runtime.`, 2000);
    try { setMeta(JSON.parse(raw.replace(/```json|```/g, "").trim())); } catch (e) {}
    setLoading(false);
  };

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };

  return (
    <div>
      <div style={S.sectionTitle}>Stage 6 — YouTube Metadata</div>
      {!meta && !loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ color: "#a1a1aa", fontSize: "13px", marginBottom: "24px", fontStyle: "italic" }}>Generate titles, description, tags, and chapter markers</div>
          <button style={{ ...S.btnPrimary(false), width: "auto", padding: "12px 40px" }} onClick={generate}>Generate Metadata</button>
        </div>
      )}
      {loading && <div style={{ color: "#71717a", fontSize: "13px", padding: "40px 0", textAlign: "center", fontStyle: "italic" }}>Generating metadata...</div>}
      {meta && (
        <>
          {/* Titles */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "10px", color: "#71717a", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Title Options</div>
            {meta.titles?.map((t, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e4e4e7", padding: "14px 18px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "14px", color: "#111", marginBottom: "6px" }}>{t.text}</div>
                  <div style={{ fontSize: "10px", color: "#71717a", fontStyle: "italic" }}>{t.angle}</div>
                </div>
                <button style={{ ...S.btnSecondary(copied === `title-${i}`), flexShrink: 0 }} onClick={() => copy(t.text, `title-${i}`)}>{copied === `title-${i}` ? "✓" : "Copy"}</button>
              </div>
            ))}
          </div>

          {/* Description */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontSize: "10px", color: "#71717a", letterSpacing: "2px", textTransform: "uppercase" }}>Description</div>
              <button style={S.btnSecondary(copied === "desc")} onClick={() => copy(meta.description, "desc")}>{copied === "desc" ? "Copied!" : "Copy"}</button>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e4e4e7", padding: "16px 20px", fontSize: "13px", color: "#52525b", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>{meta.description}</div>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ fontSize: "10px", color: "#71717a", letterSpacing: "2px", textTransform: "uppercase" }}>Tags</div>
              <button style={S.btnSecondary(copied === "tags")} onClick={() => copy(meta.tags?.join(", "), "tags")}>{copied === "tags" ? "Copied!" : "Copy All"}</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {meta.tags?.map((tag, i) => (
                <span key={i} style={{ background: "#f9fafb", border: "1px solid #e4e4e7", color: "#71717a", fontSize: "11px", padding: "4px 10px" }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* Chapters */}
          {meta.chapters?.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "10px", color: "#71717a", letterSpacing: "2px", textTransform: "uppercase" }}>Chapter Markers</div>
                <button style={S.btnSecondary(copied === "chapters")} onClick={() => copy(meta.chapters.map(c => `${c.time} ${c.title}`).join("\n"), "chapters")}>{copied === "chapters" ? "Copied!" : "Copy"}</button>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e4e4e7", padding: "14px 18px" }}>
                {meta.chapters.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: "16px", padding: "6px 0", borderBottom: i < meta.chapters.length - 1 ? "1px solid #0f0f0f" : "none" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "12px", color: "#c0392b", minWidth: "40px" }}>{c.time}</span>
                    <span style={{ fontSize: "12px", color: "#52525b" }}>{c.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button style={S.btnSecondary(false)} onClick={generate}>Regenerate</button>
            <button style={{ ...S.btnApprove, flex: 1 }} onClick={() => { if (meta) onApprove({ meta }); }}>Go to Assembly →</button>
          </div>
        </>
      )}
    </div>
  );
}


// ─── STAGE 7: ASSEMBLY VIEW ──────────────────────────────────────────────────
function Stage7({ data, onApprove }) {
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
        `    Audio: ep${episode||"xx"}_seg${String(i+1).padStart(2,"0")}_${item.voice.name}.mp3`,
        item.imageUrl ? `    Image: ep${episode||"xx"}_img${String(item.matchedPrompt?.imageNumber||i+1).padStart(2,"0")}.png` : `    Image: (none assigned)`,
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
      <div style={S.sectionTitle}>Stage 7 — Assembly</div>

      {timeline.length === 0 && (
        <div style={{ color: "#d4d4d8", fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "60px 0" }}>
          Complete the Voiceover and Images stages to build the assembly view.
        </div>
      )}

      {timeline.length > 0 && (
        <>
          {/* Header stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1px", background: "#f4f4f5", marginBottom: "24px" }}>
            {[
              { label: "Segments", value: segments.length, color: "#c0392b" },
              { label: "Images", value: prompts.length, color: "#2980b9" },
              { label: "Voices", value: voices.length, color: "#8e44ad" },
              { label: "Sound Cues", value: (cues?.effects || []).length, color: "#4a9068" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fafafa", padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: "22px", color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "9px", color: "#a1a1aa", letterSpacing: "1px", textTransform: "uppercase", marginTop: "4px" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px" }}>
            {/* Left: segment list / timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "600px", overflowY: "auto" }}>
              <div style={{ fontSize: "9px", color: "#a1a1aa", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>Timeline</div>
              {timeline.map((item, i) => (
                <div
                  key={i}
                  onClick={() => { setActiveItem(i); setCopiedPrompt(false); }}
                  style={{
                    display: "flex", gap: "8px", padding: "8px 10px", cursor: "pointer",
                    background: activeItem === i ? "#f9fafb" : "#fff",
                    border: `1px solid ${activeItem === i ? item.voice.color + "55" : "#e4e4e7"}`,
                    borderRadius: "6px",
                  }}
                >
                  <div style={{ width: "3px", background: item.voice.color, alignSelf: "stretch", flexShrink: 0, borderRadius: "1px" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontSize: "9px", color: item.voice.color, letterSpacing: "1px", textTransform: "uppercase" }}>{item.voice.name}</span>
                      <span style={{ fontSize: "9px", color: "#a1a1aa" }}>
                        {audioUrls[item.seg.id] ? "✓ audio" : "○ audio"}
                        {" · "}
                        {item.imageUrl ? "✓ img" : "○ img"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: "1.4" }}>
                      {item.seg.text.substring(0, 60)}...
                    </div>
                    {item.segEffects.length > 0 && (
                      <div style={{ fontSize: "9px", color: "#4a9068", marginTop: "3px" }}>⚡ {item.segEffects.length} sfx</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Right: active segment detail */}
            {active && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

                {/* Image preview */}
                <div style={{ background: "#fff", border: "1px solid #e4e4e7", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {active.imageUrl ? (
                    <img src={active.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px" }}>
                      <div style={{ fontSize: "11px", color: "#a1a1aa", fontStyle: "italic", marginBottom: "12px" }}>No image generated — use the prompt below in Midjourney or switch to Auto (Ideogram) in Stage 4</div>
                    </div>
                  )}
                </div>

                {/* Audio player */}
                <div style={{ background: "#fff", border: `1px solid ${active.voice.color}22`, padding: "12px 16px" }}>
                  <div style={{ fontSize: "9px", color: active.voice.color, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>
                    Segment {activeItem + 1} of {timeline.length} — {active.voice.name}
                  </div>
                  {audioUrls[active.seg.id] ? (
                    <audio key={audioUrls[active.seg.id]} controls src={audioUrls[active.seg.id]} style={{ width: "100%", height: "32px" }} />
                  ) : (
                    <div style={{ fontSize: "11px", color: "#71717a", fontStyle: "italic" }}>Audio was generated but is unavailable after page reload — re-generate in Stage 2 or use your downloaded ZIP file</div>
                  )}
                </div>

                {/* Script text */}
                <div style={{ background: "#fff", border: "1px solid #f4f4f5", padding: "14px 16px" }}>
                  <div style={{ fontSize: "9px", color: "#a1a1aa", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>Script</div>
                  <div style={{ fontSize: "13px", color: "#52525b", lineHeight: "1.8" }}>{active.seg.text}</div>
                </div>

                {/* Sound effects for this segment */}
                {active.segEffects.length > 0 && (
                  <div style={{ background: "#fff", border: "1px solid #4a906822", padding: "12px 16px" }}>
                    <div style={{ fontSize: "9px", color: "#4a9068", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>Sound Effects</div>
                    {active.segEffects.map((e, i) => (
                      <div key={i} style={{ display: "flex", gap: "10px", padding: "5px 0", borderBottom: "1px solid #f0f0f0" }}>
                        <span style={{ fontSize: "11px", color: "#52525b", fontStyle: "italic", flex: 1 }}>"{e.trigger}"</span>
                        <span style={{ fontSize: "11px", color: "#4a9068" }}>→ {e.sound}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Image prompt */}
                {active.matchedPrompt && (
                  <div style={{ background: "#fff", border: "1px solid #e4e4e7", padding: "12px 16px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ fontSize: "9px", color: "#a1a1aa", letterSpacing: "2px", textTransform: "uppercase" }}>
                        Image {active.matchedPrompt.imageNumber} — {active.matchedPrompt.mood}
                      </div>
                      {active.matchedPrompt.why && (
                        <div style={{ fontSize: "10px", color: "#4a9068", fontStyle: "italic" }}>↳ {active.matchedPrompt.why}</div>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "#3f3f46", fontFamily: "monospace", lineHeight: "1.6", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                      {active.matchedPrompt.prompt}
                    </div>
                    <button
                      style={{ ...S.btnSecondary(copiedPrompt), marginTop: "8px", fontSize: "11px" }}
                      onClick={() => copyPrompt(active.matchedPrompt.prompt)}
                    >{copiedPrompt ? "✓ Copied!" : "Copy Prompt"}</button>
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

          {/* Music bed overview */}
          {cues?.musicBed?.length > 0 && (
            <div style={{ marginTop: "24px", background: "#fff", border: "1px solid #2980b922", padding: "14px 18px", borderRadius: "10px" }}>
              <div style={{ fontSize: "9px", color: "#2980b9", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Music Bed</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {cues.musicBed.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: "16px", padding: "10px 14px", background: "#f9fafb", borderRadius: "6px", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "11px", color: "#2980b9", fontFamily: "monospace", minWidth: "44px", flexShrink: 0, fontWeight: "600" }}>{c.timestamp}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", color: "#111", fontWeight: "600", marginBottom: "2px" }}>{c.mood}</div>
                      <div style={{ fontSize: "11px", color: "#52525b", lineHeight: "1.5", marginBottom: "2px" }}>{c.description}</div>
                      {c.notes && <div style={{ fontSize: "10px", color: "#a1a1aa", fontStyle: "italic" }}>{c.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export */}
          <div style={{ marginTop: "24px", padding: "20px 24px", background: "#fff", border: "1px solid #1a2a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "13px", color: "#111", marginBottom: "4px" }}>Ready to edit</div>
              <div style={{ fontSize: "11px", color: "#71717a" }}>
                Exports a JSON manifest + Resolve assembly guide with everything named, numbered, and sequenced
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{ ...S.btnSecondary(exported), whiteSpace: "nowrap" }} onClick={exportPackage}>
                {exported ? "✓ Exported!" : "↓ Export Package"}
              </button>
              {onApprove && (
                <button style={{ ...S.btnApprove, flex: 1 }} onClick={() => onApprove({})}>
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

// ─── EPISODE LIBRARY ─────────────────────────────────────────────────────────
function EpisodeLibrary({ onLoad, onClose }) {
  const [library, setLibrary] = useState(() => loadLibrary());
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = (id) => {
    deleteFromLibrary(id);
    setLibrary(loadLibrary());
    setConfirmDelete(null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#f4f4f5", border: "1px solid #e4e4e7", width: "600px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e4e4e7", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "10px", letterSpacing: "3px", color: "#71717a", textTransform: "uppercase" }}>Episode Library</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", fontSize: "18px" }}>×</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 24px" }}>
          {library.length === 0 && (
            <div style={{ color: "#52525b", fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "40px 0" }}>No episodes saved yet — complete your first pipeline run to see them here.</div>
          )}
          {library.map((ep) => (
            <div key={ep.id} style={{ background: "#fff", border: "1px solid #e4e4e7", padding: "14px 18px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", color: "#111", marginBottom: "4px" }}>{ep.topic || "Untitled"}</div>
                <div style={{ fontSize: "10px", color: "#a1a1aa", letterSpacing: "1px" }}>
                  {ep.episode ? `Ep. ${ep.episode} · ` : ""}{ep.savedAt ? new Date(ep.savedAt).toLocaleDateString() : ""}
                  {ep.wordCount ? ` · ${ep.wordCount.toLocaleString()} words` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button style={S.btnSecondary(false)} onClick={() => { onLoad(ep); onClose(); }}>Load</button>
                {confirmDelete === ep.id
                  ? <><button style={{ ...S.btnSecondary(false), color: "#c0392b", borderColor: "#c0392b" }} onClick={() => handleDelete(ep.id)}>Delete</button><button style={S.btnSecondary(false)} onClick={() => setConfirmDelete(null)}>No</button></>
                  : <button style={{ ...S.btnSecondary(false), color: "#a1a1aa" }} onClick={() => setConfirmDelete(ep.id)}>✕</button>
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const STAGES = [
  { id: 0, label: "Research" },
  { id: 1, label: "Script" },
  { id: 2, label: "Voiceover" },
  { id: 3, label: "Sound" },
  { id: 4, label: "Images" },
  { id: 5, label: "Assembly" },
  { id: 6, label: "Thumbnail" },
  { id: 7, label: "Metadata" },
];

export default function Pipeline() {
  const restored = loadState();
  const [activeStage, setActiveStage] = useState(restored?.activeStage || 0);
  const [completedStages, setCompletedStages] = useState(new Set(restored?.completedStages || []));
  const [stageData, setStageData] = useState(restored?.stageData || {});
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [episodeId] = useState(() => restored?.episodeId || `ep_${Date.now()}`);

  const mergedData = Object.values(stageData).reduce((acc, d) => ({ ...acc, ...d }), {});

  const handleApprove = (stage, data) => {
    const newStageData = { ...stageData, [stage]: data };
    const newCompleted = new Set([...completedStages, stage]);
    const newActive = stage + 1;
    setStageData(newStageData);
    setCompletedStages(newCompleted);
    setActiveStage(newActive);
    const merged = Object.values(newStageData).reduce((acc, d) => ({ ...acc, ...d }), {});
    saveState({ activeStage: newActive, completedStages: [...newCompleted], stageData: newStageData, episodeId });
    // Auto-save to library when script is approved
    if (stage === 1 && merged.topic) {
      saveToLibrary({ id: episodeId, topic: merged.topic, episode: merged.episode, wordCount: merged.analysis?.wordCount, savedAt: Date.now(), stageData: newStageData });
    }
  };

  const handleReset = () => {
    clearState();
    setActiveStage(0);
    setCompletedStages(new Set());
    setStageData({});
    setShowResetConfirm(false);
  };

  const handleLoadEpisode = (ep) => {
    setStageData(ep.stageData || {});
    setCompletedStages(new Set(Object.keys(ep.stageData || {}).map(Number)));
    setActiveStage(1);
    saveState({ activeStage: 1, completedStages: Object.keys(ep.stageData || {}).map(Number), stageData: ep.stageData, episodeId: ep.id });
  };

  return (
    <div style={S.app}>
      {showLibrary && <EpisodeLibrary onLoad={handleLoadEpisode} onClose={() => setShowLibrary(false)} />}
      <div style={S.header}>
        <div style={S.logoText}>Unraveled</div>
        <div style={S.divider} />
        <div style={S.stageLabel}>Production Pipeline</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowLibrary(true)} style={{ background: "none", border: "1px solid #e4e4e7", color: "#52525b", fontSize: "10px", cursor: "pointer", letterSpacing: "1px", fontFamily: "inherit", marginRight: "8px", padding: "6px 14px" }}>
          Library
        </button>
        {!showResetConfirm && (
          <button onClick={() => setShowResetConfirm(true)} style={{ background: "#c0392b", border: "none", color: "#fff", fontSize: "10px", cursor: "pointer", letterSpacing: "1px", fontFamily: "inherit", padding: "6px 14px" }}>
            + New Episode
          </button>
        )}
        {showResetConfirm && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "#71717a" }}>Clear all progress?</span>
            <button onClick={handleReset} style={{ background: "none", border: "1px solid #c0392b", color: "#c0392b", fontSize: "10px", cursor: "pointer", padding: "4px 10px", fontFamily: "inherit" }}>Yes</button>
            <button onClick={() => setShowResetConfirm(false)} style={{ background: "none", border: "1px solid #222", color: "#71717a", fontSize: "10px", cursor: "pointer", padding: "4px 10px", fontFamily: "inherit" }}>No</button>
          </div>
        )}
      </div>

      <div style={{ borderBottom: "1px solid #e4e4e7" }}>
        <div style={{ ...S.stageBar, borderBottom: "none" }}>
          {STAGES.map((stage, i) => (
            <button
              key={stage.id}
              style={S.stageTab(activeStage === i, completedStages.has(i))}
              onClick={() => (completedStages.has(i) || activeStage === i) && setActiveStage(i)}
              title={!completedStages.has(i) && activeStage !== i ? "Complete the current stage to unlock" : ""}
            >
              {completedStages.has(i) ? <span style={{ color: "#4a9068" }}>✓</span> : <span style={{ color: activeStage === i ? "#c0392b" : "#222" }}>{String(i + 1).padStart(2, "0")}</span>}
              {stage.label}
              {!completedStages.has(i) && activeStage !== i && <span style={{ fontSize: "8px", color: "#d4d4d8", marginLeft: "2px" }}>🔒</span>}
            </button>
          ))}
        </div>
        <div style={{ height: "2px", background: "#f4f4f5", position: "relative" }}>
          <div style={{
            position: "absolute", left: 0, top: 0, height: "100%", background: "#c0392b",
            width: `${(completedStages.size / STAGES.length) * 100}%`,
            transition: "width 0.4s ease",
          }} />
        </div>
        <div style={{ padding: "6px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "10px", color: "#a1a1aa" }}>
            {completedStages.size === 0 ? "Start by researching your topic" : completedStages.size === STAGES.length ? "All stages complete" : `Stage ${activeStage + 1} of ${STAGES.length} — ${STAGES[activeStage]?.label}`}
          </div>
          <div style={{ fontSize: "10px", color: "#a1a1aa" }}>{Math.round((completedStages.size / STAGES.length) * 100)}% complete</div>
        </div>
      </div>

      <div style={S.content}>
        {activeStage === 0 && <Stage0 onApprove={d => handleApprove(0, d)} saved={stageData[0]} />}
        {activeStage === 1 && <Stage1 onApprove={d => handleApprove(1, d)} saved={stageData[1]} researchData={stageData[0]} />}
        {activeStage === 2 && <Stage2 data={mergedData} onApprove={d => handleApprove(2, d)} saved={stageData[2]} />}
        {activeStage === 3 && <Stage3 data={mergedData} onApprove={d => handleApprove(3, d)} saved={stageData[3]} />}
        {activeStage === 4 && <Stage4 data={mergedData} onApprove={d => handleApprove(4, d)} saved={stageData[4]} />}
        {activeStage === 5 && <Stage7 data={mergedData} onApprove={d => handleApprove(5, d)} />}
        {activeStage === 6 && <Stage5 data={mergedData} onApprove={d => handleApprove(6, d)} saved={stageData[6]} />}
        {activeStage === 7 && <Stage6 data={mergedData} saved={stageData[7]} onApprove={d => handleApprove(7, d)} />}
      </div>
    </div>
  );
}