import express from 'express';
import { supabase } from '../lib/supabase.js';
const router = express.Router();

// GET saved topics for user
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('saved_topics')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) { console.error('[savedTopics GET]', error.message); return res.status(500).json({ error: error.message }); }
  res.json(data || []);
});

// POST save a topic
router.post('/', async (req, res) => {
  const { topic, angle, competition_level, competition_color, why_it_works, evidence_ratio } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });
  const { data, error } = await supabase
    .from('saved_topics')
    .insert({ user_id: req.user.id, topic, angle, competition_level, competition_color, why_it_works, evidence_ratio })
    .select()
    .single();
  if (error) { console.error('[savedTopics POST]', error.message); return res.status(500).json({ error: error.message }); }
  res.json(data);
});

// DELETE a saved topic
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('saved_topics')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
