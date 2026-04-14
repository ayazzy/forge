// SQL to run in Supabase SQL editor (1.6 — webhook idempotency):
// CREATE TABLE processed_events (
//   event_id TEXT PRIMARY KEY,
//   processed_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX idx_processed_events_at ON processed_events(processed_at);
// Optional: auto-cleanup old events
// DELETE FROM processed_events WHERE processed_at < NOW() - INTERVAL '30 days';

import express from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendCancellationEmail } from '../lib/email.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const APP_URL = process.env.APP_URL || 'https://forge-gamma-pied.vercel.app';

const PLAN_LIMITS = { creator: 4, studio: 12, pro: 30 };

const PLANS = {
  creator: { monthlyPriceId: process.env.STRIPE_CREATOR_PRICE_ID, annualPriceId: process.env.STRIPE_CREATOR_ANNUAL_PRICE_ID, name: 'Creator' },
  studio:  { monthlyPriceId: process.env.STRIPE_STUDIO_PRICE_ID,  annualPriceId: process.env.STRIPE_STUDIO_ANNUAL_PRICE_ID,  name: 'Studio'  },
  pro:     { monthlyPriceId: process.env.STRIPE_PRO_PRICE_ID,     annualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,     name: 'Pro'     },
};

const PACKS = {
  pack_1: { priceId: process.env.STRIPE_PACK_1_PRICE_ID, episodes: 1 },
  pack_3: { priceId: process.env.STRIPE_PACK_3_PRICE_ID, episodes: 3 },
  pack_5: { priceId: process.env.STRIPE_PACK_5_PRICE_ID, episodes: 5 },
};

// ─── helpers ────────────────────────────────────────────────────────────────

async function getOrCreateCustomer(userId, email) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}

// ─── routes ─────────────────────────────────────────────────────────────────

// GET /api/stripe/billing
router.get('/billing', async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, plan, subscription_status, trial_ends_at, monthly_episodes_used, monthly_reset_at, episode_credits, free_episode_used')
      .eq('id', req.user.id)
      .single();

    const plan = profile?.plan || 'free';
    const status = profile?.subscription_status || null;
    const isActive = status === 'active' || status === 'trialing';
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
      }).eq('id', req.user.id);
    }

    const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsed);
    const purchasedCredits = profile?.episode_credits || 0;

    res.json({
      plan,
      subscription_status: status,
      trial_ends_at: profile?.trial_ends_at || null,
      monthly_limit: monthlyLimit,
      monthly_used: monthlyUsed,
      monthly_remaining: monthlyRemaining,
      purchased_credits: purchasedCredits,
      total_remaining: monthlyRemaining + purchasedCredits,
      free_episode_used: profile?.free_episode_used ?? false,
    });
  } catch (e) {
    console.error('Billing fetch error:', e);
    res.status(500).json({ error: 'Failed to fetch billing' });
  }
});

// POST /api/stripe/create-checkout-session (subscription)
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { plan, annual = false } = req.body;
    const planConfig = PLANS[plan];
    const priceId = annual ? planConfig?.annualPriceId : planConfig?.monthlyPriceId;
    if (!priceId) return res.status(400).json({ error: 'Invalid plan selected.' });

    const customerId = await getOrCreateCustomer(req.user.id, req.user.email);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        metadata: { supabase_user_id: req.user.id, plan },
      },
      success_url: `${APP_URL}/dashboard?subscription=success`,
      cancel_url: `${APP_URL}/pricing`,
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('Checkout session error:', e);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

// POST /api/stripe/create-pack-checkout-session (one-time episode pack)
router.post('/create-pack-checkout-session', async (req, res) => {
  try {
    const { pack } = req.body;
    const packConfig = PACKS[pack];
    if (!packConfig?.priceId) {
      console.error(`[pack checkout] Invalid pack or missing priceId. pack="${pack}" PACKS keys=${Object.keys(PACKS).join(',')} priceIds=${JSON.stringify(Object.fromEntries(Object.entries(PACKS).map(([k,v]) => [k, v.priceId || 'MISSING'])))}`);
      return res.status(400).json({ error: 'Invalid pack' });
    }

    const customerId = await getOrCreateCustomer(req.user.id, req.user.email);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: packConfig.priceId, quantity: 1 }],
      mode: 'payment',
      metadata: { supabase_user_id: req.user.id, pack, episodes: packConfig.episodes },
      success_url: `${APP_URL}/pipeline?pack=success`,
      cancel_url: `${APP_URL}/pricing`,
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('Pack checkout error:', e);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

// POST /api/stripe/create-portal-session
router.post('/create-portal-session', async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', req.user.id)
      .single();

    if (!profile?.stripe_customer_id) return res.status(400).json({ error: 'No billing account found.' });

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${APP_URL}/settings`,
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('Portal session error:', e);
    res.status(500).json({ error: 'Failed to open billing portal.' });
  }
});

// ─── webhook (exported separately — needs raw body) ──────────────────────────

export async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Webhook signature failed:', e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  // 1.6 — Idempotency: skip events we've already processed to prevent replay attacks
  // and double-crediting on pack purchases
  const { data: existingEvent } = await supabase
    .from('processed_events')
    .select('event_id')
    .eq('event_id', event.id)
    .single();

  if (existingEvent) {
    return res.json({ received: true });
  }

  // Mark event as processed before handling (insert first to handle concurrent webhooks)
  await supabase.from('processed_events').insert({ event_id: event.id });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // One-time pack purchase
        if (session.mode === 'payment') {
          const userId = session.metadata?.supabase_user_id;
          const episodes = parseInt(session.metadata?.episodes || '0');
          if (userId && episodes > 0) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('episode_credits')
              .eq('id', userId)
              .single();
            const current = profile?.episode_credits || 0;
            await supabase.from('profiles').update({
              episode_credits: current + episodes,
            }).eq('id', userId);
          }
          break;
        }

        // Subscription checkout completed
        if (session.mode === 'subscription') {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          let userId = sub.metadata?.supabase_user_id;
          const plan = sub.metadata?.plan || 'creator';
          console.log('[webhook] checkout.session.completed — sub metadata:', sub.metadata, 'customer:', session.customer);

          // Fallback 1: look up profile by stripe_customer_id
          if (!userId) {
            const { data: profile, error: profileErr } = await supabase
              .from('profiles')
              .select('id')
              .eq('stripe_customer_id', session.customer)
              .single();
            console.log('[webhook] customer_id lookup:', profile, profileErr);
            userId = profile?.id;
          }

          // Fallback 2: look up user by email
          if (!userId && session.customer_details?.email) {
            const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers();
            console.log('[webhook] email lookup for:', session.customer_details.email, 'users count:', users?.length, 'err:', usersErr);
            const match = users?.find(u => u.email === session.customer_details.email);
            userId = match?.id;
          }

          console.log('[webhook] final userId:', userId, 'plan:', plan);
          if (userId) {
            const { error: updateErr } = await supabase.from('profiles').update({
              stripe_customer_id: session.customer,
              plan,
              subscription_status: sub.status,
              trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
              monthly_episodes_used: 0,
              monthly_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }).eq('id', userId);
            console.log('[webhook] update result:', updateErr);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        let userId = sub.metadata?.supabase_user_id;
        const plan = sub.metadata?.plan || 'creator';
        if (!userId) {
          const { data: profile } = await supabase.from('profiles').select('id').eq('stripe_customer_id', sub.customer).single();
          userId = profile?.id;
        }
        if (!userId) {
          const customer = await stripe.customers.retrieve(sub.customer);
          if (customer.email) {
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const match = users?.find(u => u.email === customer.email);
            userId = match?.id;
          }
        }
        if (userId) {
          await supabase.from('profiles').update({
            plan: sub.status === 'canceled' ? 'free' : plan,
            subscription_status: sub.status,
            trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          }).eq('id', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        let userId = sub.metadata?.supabase_user_id;
        if (!userId) {
          const { data: profile } = await supabase.from('profiles').select('id').eq('stripe_customer_id', sub.customer).single();
          userId = profile?.id;
        }
        if (!userId) {
          const customer = await stripe.customers.retrieve(sub.customer);
          if (customer.email) {
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const match = users?.find(u => u.email === customer.email);
            userId = match?.id;
          }
        }
        if (userId) {
          await supabase.from('profiles').update({
            plan: 'free',
            subscription_status: 'canceled',
            trial_ends_at: null,
          }).eq('id', userId);

          // Send cancellation email (fire and forget)
          try {
            const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
            if (authUser?.email) sendCancellationEmail(authUser.email).catch(() => {});
          } catch (emailErr) {
            console.error('[webhook] Failed to fetch user email for cancellation email:', emailErr.message);
          }
        }
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (e) {
    console.error('Webhook handler error:', e);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

export default router;
