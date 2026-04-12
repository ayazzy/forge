export const WORDS_PER_MINUTE = 130;

export const MOOD_KEYWORDS = {
  "Dark / Ominous": ["death","ruin","collapse","darkness","fear","dread","silence","shadow"],
  "Tense / Rising": ["danger","threat","warning","storm","pressure","risk","edge","urgent"],
  "Reflective / Intimate": ["remember","thought","wondered","quiet","alone","still","looked"],
  "Epic / Cinematic": ["empire","world","history","changed","forever","century","vast","great"],
  "Melancholic / Resigned": ["nothing","too late","already","never","gone","once","used to"],
};

export const MOOD_COLORS = {
  "Dark / Ominous": "#c0392b",
  "Tense / Rising": "#e67e22",
  "Reflective / Intimate": "#8e44ad",
  "Epic / Cinematic": "#2980b9",
  "Melancholic / Resigned": "#7f8c8d",
  "Neutral / Expository": "#4a9068",
};

export const MOOD_STYLES = {
  "Dark / Ominous": "chiaroscuro lighting, deep shadows, muted palette, ominous atmosphere",
  "Tense / Rising": "high contrast, dramatic side lighting, urgent atmosphere, storm clouds",
  "Reflective / Intimate": "soft candlelight, warm intimate tones, painterly, quiet atmosphere",
  "Epic / Cinematic": "epic wide shot, golden hour, vast historical landscape, dramatic scale",
  "Melancholic / Resigned": "desaturated, muted earth tones, quiet desolation, fading light",
  "Neutral / Expository": "warm natural light, historical painting style, documentary realism",
};

export function detectMood(text, moodConfig = null) {
  const keywords = moodConfig
    ? Object.fromEntries(Object.entries(moodConfig).map(([mood, data]) => [mood, data.keywords || []]))
    : MOOD_KEYWORDS;
  const lower = text.toLowerCase();
  const scores = {};
  for (const [mood, kws] of Object.entries(keywords)) {
    scores[mood] = kws.filter(k => lower.includes(k)).length;
  }
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return top[1] > 0 ? top[0] : Object.keys(keywords)[0];
}

export function analyzeScript(text) {
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

export function formatTime(secs) {
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;
}

export function injectV3Tags(text) {
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

export function selectImagePoints(sections) {
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
