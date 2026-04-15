/**
 * Broadcast-standard SRT subtitle generation.
 * Standards: 42 chars/line, max 2 lines/entry, 1-7s display, sentence boundaries, 200ms gaps.
 */

function formatSRTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// Strip [stage direction] and similar annotation tags
function stripTags(text) {
  return text.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
}

// Split text at sentence boundaries (. ! ?)
function splitSentences(text) {
  const parts = text.match(/[^.!?]+[.!?]+['"]?\s*/g);
  if (parts && parts.length > 0) return parts.map(s => s.trim()).filter(Boolean);
  return [text.trim()].filter(Boolean);
}

// Hard-wrap text to max 42 chars per line, returning array of lines
function wrapLines(text, maxLen = 42) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLen) {
      if (current) lines.push(current);
      current = word.length > maxLen ? word.substring(0, maxLen) : word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Pack lines into subtitle cards of at most 2 lines each
function packCards(lines) {
  const cards = [];
  for (let i = 0; i < lines.length; i += 2) {
    cards.push(lines.slice(i, i + 2).join('\n'));
  }
  return cards;
}

/**
 * @param {Array<{text: string}>} segments - Narration segments
 * @param {number} wordsPerMinute - Estimated speaking rate (default 150)
 * @returns {string} SRT file content
 */
export function generateSRT(segments, wordsPerMinute = 150) {
  const GAP = 0.2;        // 200ms gap between entries
  const MIN_DUR = 1.0;    // minimum 1 second display
  const MAX_DUR = 7.0;    // maximum 7 seconds display
  const secPerWord = 60 / wordsPerMinute;

  let currentTime = 0;
  let index = 1;
  const entries = [];

  for (const seg of segments) {
    const cleaned = stripTags(seg.text || '');
    if (!cleaned) continue;

    const sentences = splitSentences(cleaned);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
      const sentenceDuration = Math.max(MIN_DUR, Math.min(MAX_DUR, wordCount * secPerWord));

      const lines = wrapLines(trimmed);
      const cards = packCards(lines);

      // Distribute time proportionally by word count per card
      const cardWords = cards.map(c => c.split(/\s+/).filter(Boolean).length);
      const totalWords = cardWords.reduce((a, b) => a + b, 0) || 1;

      for (let ci = 0; ci < cards.length; ci++) {
        const fraction = cardWords[ci] / totalWords;
        const dur = Math.max(MIN_DUR, Math.min(MAX_DUR, sentenceDuration * fraction));
        const start = currentTime;
        const end = start + dur;

        entries.push(`${index}\n${formatSRTTime(start)} --> ${formatSRTTime(end)}\n${cards[ci]}`);
        index++;
        currentTime = end + GAP;
      }
    }
  }

  return entries.join('\n\n') + (entries.length ? '\n' : '');
}
