import express from 'express';
import { supabase } from '../lib/supabase.js';
const router = express.Router();

// Get all episodes for user
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('user_id', req.user.id)
    .order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get single episode
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();
  if (error) return res.status(404).json({ error: 'Episode not found' });
  res.json(data);
});

// Create episode
router.post('/', async (req, res) => {
  const { data, error } = await supabase
    .from('episodes')
    .insert({ ...req.body, user_id: req.user.id })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Update episode
router.patch('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('episodes')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete episode
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('episodes')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
