/**
 * Robustly extract JSON from a Claude response string.
 * Handles markdown code fences, leading/trailing text, and trailing commas.
 */
export function extractJSON(raw) {
  if (!raw) return null;

  // 1. Try direct parse first
  try { return JSON.parse(raw); } catch {}

  // 2. Strip markdown code fences
  let cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}

  // 3. Find first { or [ and match to last } or ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const start = firstBrace === -1 ? firstBracket
    : firstBracket === -1 ? firstBrace
    : Math.min(firstBrace, firstBracket);
  if (start === -1) return null;

  const isArray = cleaned[start] === '[';
  const endChar = isArray ? ']' : '}';
  const lastEnd = cleaned.lastIndexOf(endChar);
  if (lastEnd === -1) return null;

  const candidate = cleaned.substring(start, lastEnd + 1);
  try { return JSON.parse(candidate); } catch {}

  // 4. Try fixing common issues: trailing commas
  const fixedCommas = candidate.replace(/,\s*([\]}])/g, '$1');
  try { return JSON.parse(fixedCommas); } catch {}

  return null;
}
