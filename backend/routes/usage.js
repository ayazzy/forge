import express from 'express';
import { supabase } from '../lib/supabase.js';
import { PLAN_LIMITS } from '../lib/usage.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const month = new Date().toISOString().slice(0, 7);

  const [{ data: profile }, { data: usage, error }] = await Promise.all([
    supabase.from('profiles').select('plan, subscription_status').eq('id', req.user.id).single(),
    supabase.from('usage').select('*').eq('user_id', req.user.id).eq('month', month).single(),
  ]);

  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });

  const isActive = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing';
  const plan = isActive ? (profile?.plan || 'free') : 'free';
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  res.json({
    claude_calls: usage?.claude_calls || 0,
    cartesia_characters: usage?.cartesia_characters || 0,
    ideogram_generations: usage?.ideogram_generations || 0,
    month: month,
    limits,
    plan,
  });
});

export default router;
