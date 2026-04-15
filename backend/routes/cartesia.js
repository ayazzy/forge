import express from 'express';
import { safeError } from '../lib/errors.js';

const router = express.Router();

const CARTESIA_BASE = 'https://api.cartesia.ai';
const CHUNK_SIZE = 450;

// In-memory voices cache (1-hour TTL)
let voicesCache = null;
let voicesCacheAt = 0;
const VOICES_TTL = 60 * 60 * 1000;

function chunkText(text) {
  if (text.length <= CHUNK_SIZE) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > CHUNK_SIZE) {
    const sub = remaining.slice(0, CHUNK_SIZE + 80);
    const lastPeriod = Math.max(
      sub.lastIndexOf('. ', CHUNK_SIZE),
      sub.lastIndexOf('! ', CHUNK_SIZE),
      sub.lastIndexOf('? ', CHUNK_SIZE),
    );
    const cutAt = lastPeriod > CHUNK_SIZE / 2 ? lastPeriod + 1 : CHUNK_SIZE;
    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function cartesiaTTSChunk(text, voiceId, speed) {
  const res = await fetch(`${CARTESIA_BASE}/tts/bytes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cartesia-Version': '2024-10-01',
      'X-API-Key': process.env.CARTESIA_API_KEY,
    },
    body: JSON.stringify({
      model_id: 'sonic-2',
      transcript: text,
      voice: { mode: 'id', id: voiceId },
      output_format: { container: 'mp3', encoding: 'mp3', sample_rate: 44100 },
      speed,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Cartesia error ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// POST /api/cartesia/generate
router.post('/generate', async (req, res) => {
  try {
    const { text, voiceId, speed = 1.0 } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required.' });
    }
    if (!voiceId || typeof voiceId !== 'string') {
      return res.status(400).json({ error: 'voiceId is required.' });
    }
    if (text.length > 10000) {
      return res.status(400).json({ error: 'Text too long. Maximum 10,000 characters.' });
    }

    const clampedSpeed = Math.min(Math.max(0.5, parseFloat(speed) || 1.0), 2.0);
    const chunks = chunkText(text.trim());

    const buffers = await Promise.all(chunks.map(c => cartesiaTTSChunk(c, voiceId, clampedSpeed)));
    const combined = Buffer.concat(buffers);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(combined);
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

// GET /api/cartesia/voices
router.get('/voices', async (req, res) => {
  try {
    const now = Date.now();
    if (voicesCache && now - voicesCacheAt < VOICES_TTL) {
      return res.json(voicesCache);
    }
    if (!process.env.CARTESIA_API_KEY) {
      return res.status(500).json({ error: 'CARTESIA_API_KEY is not configured on the server.' });
    }
    const response = await fetch(`${CARTESIA_BASE}/voices`, {
      headers: {
        'Cartesia-Version': '2024-10-01',
        'X-API-Key': process.env.CARTESIA_API_KEY,
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return res.status(502).json({ error: `Cartesia ${response.status}: ${body || 'unknown error'}` });
    }
    const all = await response.json();
    const voices = Array.isArray(all) ? all : (all.voices || []);
    console.log(`[cartesia/voices] total from API: ${voices.length}`);
    // Filter to English voices — include any voice where language contains 'en'
    // or where language is absent (treat as English)
    const english = voices.filter(v =>
      !v.language || v.language.toLowerCase().includes('en')
    );
    console.log(`[cartesia/voices] after english filter: ${english.length}`);
    voicesCache = english;
    voicesCacheAt = now;
    res.json(english);
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

export default router;
