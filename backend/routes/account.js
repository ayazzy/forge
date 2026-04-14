import express from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// DELETE /api/account — permanently deletes user account and all associated data (2.5 / GDPR)
router.delete('/', async (req, res) => {
  const userId = req.user.id;
  const errors = [];

  // 1. Cancel active Stripe subscription
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_status')
      .eq('user_id', userId)
      .single();

    if (profile?.stripe_customer_id && profile.subscription_status !== 'canceled') {
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'active',
        limit: 5,
      });
      for (const sub of subscriptions.data) {
        await stripe.subscriptions.cancel(sub.id).catch(e => errors.push(`Stripe cancel: ${e.message}`));
      }
      // Also check trialing
      const trialing = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'trialing',
        limit: 5,
      });
      for (const sub of trialing.data) {
        await stripe.subscriptions.cancel(sub.id).catch(e => errors.push(`Stripe cancel trial: ${e.message}`));
      }
    }
  } catch (e) {
    errors.push(`Stripe: ${e.message}`);
  }

  // 2. Delete all episodes
  try {
    await supabase.from('episodes').delete().eq('user_id', userId);
  } catch (e) {
    errors.push(`Episodes: ${e.message}`);
  }

  // 3. Delete all assets (DB records — storage files are secondary)
  try {
    await supabase.from('assets').delete().eq('user_id', userId);
  } catch (e) {
    errors.push(`Assets: ${e.message}`);
  }

  // 4. Delete saved topics
  try {
    await supabase.from('saved_topics').delete().eq('user_id', userId);
  } catch (e) {
    errors.push(`Saved topics: ${e.message}`);
  }

  // 5. Delete usage records
  try {
    await supabase.from('usage').delete().eq('user_id', userId);
  } catch (e) {
    errors.push(`Usage: ${e.message}`);
  }

  // 6. Delete channel profile
  try {
    await supabase.from('channel_profiles').delete().eq('user_id', userId);
  } catch (e) {
    errors.push(`Channel profile: ${e.message}`);
  }

  // 7. Delete profile record
  try {
    await supabase.from('profiles').delete().eq('user_id', userId);
  } catch (e) {
    errors.push(`Profile: ${e.message}`);
  }

  // 8. Delete Supabase auth user
  try {
    await supabase.auth.admin.deleteUser(userId);
  } catch (e) {
    errors.push(`Auth user: ${e.message}`);
  }

  if (errors.length > 0) {
    console.warn('[account delete] Partial deletion errors for user', userId, errors);
  }

  res.json({ success: true });
});

export default router;
