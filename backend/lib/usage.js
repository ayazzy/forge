import { supabase } from './supabase.js';

export async function trackUsage(userId, field, increment = 1) {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM

  const { error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_month: month,
    p_field: field,
    p_increment: increment,
  });

  if (error) {
    console.warn('Usage tracking failed (non-blocking):', error.message);
  }
}
