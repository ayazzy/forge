import { supabase } from './supabase.js';

export const PLAN_LIMITS = {
  free:    { claude_calls: 20,   cartesia_characters: 50000,   ideogram_generations: 10  },
  creator: { claude_calls: 250,  cartesia_characters: 400000,  ideogram_generations: 150 },
  studio:  { claude_calls: 750,  cartesia_characters: 1200000, ideogram_generations: 450 },
  pro:     { claude_calls: 2000, cartesia_characters: 3000000, ideogram_generations: 1200 },
};

export async function trackUsage(userId, field, increment = 1) {
  const month = new Date().toISOString().slice(0, 7);
  const { error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_month: month,
    p_field: field,
    p_increment: increment,
  });
  if (error) console.warn('Usage tracking failed (non-blocking):', error.message);
}

export async function checkUsageLimit(userId, field) {
  const month = new Date().toISOString().slice(0, 7);

  const [{ data: profile }, { data: usage }] = await Promise.all([
    supabase.from('profiles').select('plan, subscription_status').eq('id', userId).single(),
    supabase.from('usage').select(field).eq('user_id', userId).eq('month', month).single(),
  ]);

  const isActive = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing';
  const plan = isActive ? (profile?.plan || 'free') : 'free';
  const limit = PLAN_LIMITS[plan]?.[field] ?? PLAN_LIMITS.free[field];
  const used = usage?.[field] || 0;

  return { allowed: used < limit, used, limit, plan };
}
