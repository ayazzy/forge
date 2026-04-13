import express from 'express';
import { supabase } from '../lib/supabase.js';
const router = express.Router();

const PLAN_LIMITS = { creator: 5, studio: 11, pro: 30 };

async function checkEpisodeLimit(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, subscription_status, monthly_episodes_used, monthly_reset_at, episode_credits')
    .eq('user_id', userId)
    .single();

  const status = profile?.subscription_status;
  const isActive = status === 'active' || status === 'trialing';
  const plan = profile?.plan || 'free';
  const monthlyLimit = isActive ? (PLAN_LIMITS[plan] || 0) : 0;

  // Auto-reset monthly usage if past reset date
  const now = new Date();
  const resetAt = profile?.monthly_reset_at ? new Date(profile.monthly_reset_at) : null;
  let monthlyUsed = profile?.monthly_episodes_used || 0;

  if (resetAt && now >= resetAt) {
    monthlyUsed = 0;
    await supabase.from('profiles').update({
      monthly_episodes_used: 0,
      monthly_reset_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('user_id', userId);
  }

  const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsed);
  const purchasedCredits = profile?.episode_credits || 0;

  return { monthlyRemaining, purchasedCredits, monthlyUsed, plan, isActive };
}

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

// Create episode — checks and deducts episode balance
router.post('/', async (req, res) => {
  const { monthlyRemaining, purchasedCredits, monthlyUsed, plan, isActive } = await checkEpisodeLimit(req.user.id);

  if (monthlyRemaining === 0 && purchasedCredits === 0) {
    return res.status(403).json({
      error: 'Episode limit reached',
      code: 'EPISODE_LIMIT',
      plan,
      isActive,
    });
  }

  const { data, error } = await supabase
    .from('episodes')
    .insert({ ...req.body, user_id: req.user.id })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  // Deduct only after successful creation — monthly first, then purchased credits
  if (monthlyRemaining > 0) {
    await supabase.from('profiles')
      .update({ monthly_episodes_used: monthlyUsed + 1 })
      .eq('user_id', req.user.id);
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('episode_credits')
      .eq('user_id', req.user.id)
      .single();
    await supabase.from('profiles')
      .update({ episode_credits: Math.max(0, (profile?.episode_credits || 0) - 1) })
      .eq('user_id', req.user.id);
  }

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
