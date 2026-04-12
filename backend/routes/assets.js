import express from 'express';
import { supabase } from '../lib/supabase.js';
const router = express.Router();

// Upload asset to Supabase Storage
router.post('/upload', async (req, res) => {
  try {
    const { episodeId, stage, type, segmentIndex, fileData, fileName, mimeType } = req.body;
    const bucket = type === 'audio' ? 'forge-audio' : 'forge-images';
    const storagePath = `${req.user.id}/${episodeId}/${fileName}`;
    const buffer = Buffer.from(fileData, 'base64');
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
    res.status(500).json({ error: e.message });
  }
});

// Get assets for episode
router.get('/:episodeId', async (req, res) => {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('episode_id', req.params.episodeId)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
