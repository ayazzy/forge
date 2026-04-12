export const STORAGE_KEY = "forge_pipeline_v1";
export const LIBRARY_KEY = "forge_library_v1";

export function saveState(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
}
export function loadState() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
export function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}
export function loadLibrary() {
  try { const s = localStorage.getItem(LIBRARY_KEY); return s ? JSON.parse(s) : []; } catch (e) { return []; }
}
export function saveToLibrary(episode) {
  try {
    const lib = loadLibrary();
    const idx = lib.findIndex(e => e.id === episode.id);
    if (idx >= 0) lib[idx] = episode; else lib.unshift(episode);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib.slice(0, 20)));
  } catch (e) {}
}
export function deleteFromLibrary(id) {
  try {
    const lib = loadLibrary().filter(e => e.id !== id);
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
  } catch (e) {}
}
