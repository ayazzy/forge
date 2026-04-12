import { supabase } from './supabase';

const rawBase = import.meta.env.VITE_API_URL || '';
const API_BASE = rawBase && !rawBase.startsWith('http')
  ? `https://${rawBase}`
  : rawBase;

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
}

export async function claude(prompt, maxTokens = 1000) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({ prompt, maxTokens }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}

export async function generateSpeech(text, voiceId, settings = {}) {
  const cleanText = text
    .replace(/\[long pause\]/g, ' ')
    .replace(/\[short pause\]/g, ' ')
    .replace(/\[pause\]/g, ' ')
    .replace(/\[dramatic tone\]/g, '');
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/elevenlabs/${voiceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({
      text: cleanText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: settings.stability ?? 0.45,
        similarity_boost: settings.similarity ?? 0.82,
        style: settings.style ?? 0.35,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function generateIdeogramImage(prompt) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/ideogram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.url;
}

export async function uploadAsset({ episodeId, stage, type, segmentIndex, fileBlob, fileName, mimeType }) {
  const authHeader = await getAuthHeader();
  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(fileBlob);
  });
  const res = await fetch(`${API_BASE}/api/assets/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({ episodeId, stage, type, segmentIndex, fileData: base64, fileName, mimeType }),
  });
  if (!res.ok) throw new Error('Failed to upload asset');
  return res.json();
}

export async function getAssets(episodeId) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/assets/${episodeId}`, { headers: { ...authHeader } });
  if (!res.ok) throw new Error('Failed to fetch assets');
  return res.json();
}

export async function getChannelProfile() {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/channel`, { headers: { ...authHeader } });
  if (!res.ok) throw new Error('Failed to fetch channel profile');
  return res.json();
}

export async function saveChannelProfile(data) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/channel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save channel profile');
  return res.json();
}

export async function generateChannelTemplate(data) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/channel/generate-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to generate template');
  return res.json();
}

export async function getProfile() {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/profile`, { headers: { ...authHeader } });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function getUsage() {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/usage`, { headers: { ...authHeader } });
  if (!res.ok) throw new Error('Failed to fetch usage');
  return res.json();
}

export async function getEpisodes() {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/episodes`, { headers: { ...authHeader } });
  if (!res.ok) throw new Error('Failed to fetch episodes');
  return res.json();
}

export async function getEpisode(id) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/episodes/${id}`, { headers: { ...authHeader } });
  if (!res.ok) throw new Error('Failed to fetch episode');
  return res.json();
}

export async function createEpisode(data) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/episodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create episode');
  return res.json();
}

export async function updateEpisode(id, data) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/episodes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update episode');
  return res.json();
}

export async function deleteEpisode(id) {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE}/api/episodes/${id}`, {
    method: 'DELETE',
    headers: { ...authHeader },
  });
  if (!res.ok) throw new Error('Failed to delete episode');
  return res.json();
}
