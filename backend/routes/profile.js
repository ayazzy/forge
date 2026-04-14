import express from 'express';
import { supabase } from '../lib/supabase.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();
  if (error) return res.status(404).json({ error: 'Profile not found' });
  res.json(data);
});

// Delete account — removes auth user (cascades to profiles via FK)
router.delete('/account', async (req, res) => {
  const { error } = await supabase.auth.admin.deleteUser(req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ deleted: true });
});

export default router;
