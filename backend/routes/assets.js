import express from 'express';
import { supabase } from '../lib/supabase.js';
import { safeError } from '../lib/errors.js';
const router = express.Router();

const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'image/png', 'image/jpeg', 'image/webp'];
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25MB
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeFileName(name) {
  // Strip path traversal and keep only safe characters
  return name.replace(/\.\.[/\\]/g, '').replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

// Upload asset to Supabase Storage
router.post('/upload', async (req, res) => {
  try {
    const { episodeId, stage, type, segmentIndex, fileData, fileName, mimeType } = req.body;

    // 1.5 — Validate episodeId format
    if (!episodeId || !UUID_RE.test(episodeId)) {
      return res.status(400).json({ error: 'Invalid episode ID.' });
    }

    // 1.5 — Validate mimeType
    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({ error: `Unsupported file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}.` });
    }

    // 1.5 — Validate and sanitize fileName
    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ error: 'File name is required.' });
    }
    const safeFileName = sanitizeFileName(fileName);

    // 1.5 — Validate file size
    if (!fileData) return res.status(400).json({ error: 'File data is required.' });
    const buffer = Buffer.from(fileData, 'base64');
    const isAudio = mimeType.startsWith('audio/');
    const maxBytes = isAudio ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;
    if (buffer.length > maxBytes) {
      const maxMB = maxBytes / (1024 * 1024);
      const label = isAudio ? 'Audio' : 'Image';
      return res.status(400).json({ error: `File too large. ${label} files must be under ${maxMB}MB.` });
    }

    const bucket = type === 'audio' ? 'forge-audio' : 'forge-images';
    const storagePath = `${req.user.id}/${episodeId}/${safeFileName}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);
    const { data, error } = await supabase
      .from('assets')
      .insert({
        episode_id: episodeId,
        user_id: req.user.id,
        stage,
        type,
        segment_index: segmentIndex,
        storage_path: storagePath,
        url: publicUrl,
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

// Get assets for episode
router.get('/:episodeId', async (req, res) => {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('episode_id', req.params.episodeId)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: safeError(error) });
  res.json(data);
});

export default router;
