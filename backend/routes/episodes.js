// SQL to run in Supabase SQL editor (1.7 — atomic credit deduction):
// CREATE OR REPLACE FUNCTION deduct_episode_credit(p_user_id UUID)
// RETURNS JSON AS $$
// DECLARE
//   v_profile RECORD;
//   v_monthly_limit INT;
// BEGIN
//   SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id FOR UPDATE;
//
//   IF v_profile.subscription_status NOT IN ('active', 'trialing') THEN
//     RETURN json_build_object('allowed', false, 'reason', 'No active subscription');
//   END IF;
//
//   v_monthly_limit := CASE v_profile.plan
//     WHEN 'creator' THEN 5 WHEN 'studio' THEN 11 WHEN 'pro' THEN 30 ELSE 0 END;
//
//   -- Reset if past reset date
//   IF v_profile.monthly_reset_at IS NOT NULL AND NOW() >= v_profile.monthly_reset_at THEN
//     UPDATE profiles SET monthly_episodes_used = 0,
//       monthly_reset_at = NOW() + INTERVAL '30 days'
//     WHERE user_id = p_user_id;
//     v_profile.monthly_episodes_used := 0;
//   END IF;
//
//   IF v_profile.monthly_episodes_used < v_monthly_limit THEN
//     UPDATE profiles SET monthly_episodes_used = monthly_episodes_used + 1 WHERE user_id = p_user_id;
//     RETURN json_build_object('allowed', true, 'source', 'monthly');
//   ELSIF v_profile.episode_credits > 0 THEN
//     UPDATE profiles SET episode_credits = episode_credits - 1 WHERE user_id = p_user_id;
//     RETURN json_build_object('allowed', true, 'source', 'credits');
//   ELSE
//     RETURN json_build_object('allowed', false, 'reason', 'Episode limit reached');
//   END IF;
// END;
// $$ LANGUAGE plpgsql;

import express from 'express';
import { supabase } from '../lib/supabase.js';
import { safeError } from '../lib/errors.js';
const router = express.Router();

// Allowlist of fields that can be set by the client (1.1 — mass assignment fix)
const ALLOWED_INSERT_FIELDS = ['title', 'status', 'active_stage', 'completed_stages', 'stage_data', 'episode_number', 'topic'];
const ALLOWED_UPDATE_FIELDS = ['title', 'status', 'active_stage', 'completed_stages', 'stage_data', 'episode_number', 'topic'];

const pick = (obj, keys) => Object.fromEntries(keys.filter(k => k in obj).map(k => [k, obj[k]]));

// Get all episodes for user
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('user_id', req.user.id)
    .order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: safeError(error) });
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

// Create episode — atomically deducts episode credit (1.7 — race condition fix)
router.post('/', async (req, res) => {
  // Atomic check-and-deduct via Supabase RPC (prevents race condition with concurrent requests)
  const { data: creditResult, error: creditError } = await supabase
    .rpc('deduct_episode_credit', { p_user_id: req.user.id });

  if (creditError) {
    console.error('[episodes] deduct_episode_credit RPC error:', creditError);
    return res.status(500).json({ error: safeError(creditError) });
  }

  if (!creditResult?.allowed) {
    const reason = creditResult?.reason || 'Episode limit reached';
    return res.status(403).json({
      error: reason,
      code: 'EPISODE_LIMIT',
    });
  }

  // Only allow safe fields in insert (1.1 — mass assignment fix)
  const safeBody = pick(req.body, ALLOWED_INSERT_FIELDS);

  const { data, error } = await supabase
    .from('episodes')
    .insert({ ...safeBody, user_id: req.user.id })
    .select()
    .single();
  if (error) return res.status(500).json({ error: safeError(error) });

  res.json(data);
});

// Update episode — only allows safe fields (1.1 — mass assignment fix)
router.patch('/:id', async (req, res) => {
  const safeBody = pick(req.body, ALLOWED_UPDATE_FIELDS);

  const { data, error } = await supabase
    .from('episodes')
    .update(safeBody)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: safeError(error) });
  res.json(data);
});

// Delete episode
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('episodes')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: safeError(error) });
  res.json({ success: true });
});

export default router;
