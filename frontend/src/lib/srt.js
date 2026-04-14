/**
 * Generate an SRT subtitle file from narration segments.
 * Timing is estimated from word count at the given WPM rate.
 */

function formatSRTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * @param {Array<{text: string}>} segments - Narration segments
 * @param {number} wordsPerMinute - Estimated speaking rate (default 150)
 * @returns {string} SRT file content
 */
export function generateSRT(segments, wordsPerMinute = 150) {
  const secondsPerWord = 60 / wordsPerMinute;
  let currentTime = 0;
  const entries = [];

  segments.forEach((seg, i) => {
    const words = seg.text.trim().split(/\s+/).filter(Boolean);
    const duration = words.length * secondsPerWord;
    const start = currentTime;
    const end = currentTime + duration;

    entries.push(
      `${i + 1}\n${formatSRTTime(start)} --> ${formatSRTTime(end)}\n${seg.text.trim()}\n`
    );

    currentTime = end;
  });

  return entries.join('\n');
}
