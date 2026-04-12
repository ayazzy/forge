import express from 'express';
import { supabase } from '../lib/supabase.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const month = new Date().toISOString().slice(0, 7);
  const { data, error } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('month', month)
    .single();
  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }
  res.json(data || {
    claude_calls: 0,
    elevenlabs_characters: 0,
    ideogram_generations: 0,
    suno_generations: 0,
    month,
  });
});

export default router;
