import express from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const APP_URL = process.env.APP_URL || 'https://forge-gamma-pied.vercel.app';

const PLAN_LIMITS = { creator: 5, studio: 11, pro: 30 };

const PLANS = {
  creator: { priceId: process.env.STRIPE_CREATOR_PRICE_ID, name: 'Creator' },
  studio:  { priceId: process.env.STRIPE_STUDIO_PRICE_ID,  name: 'Studio'  },
  pro:     { priceId: process.env.STRIPE_PRO_PRICE_ID,     name: 'Pro'     },
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
      .select('stripe_customer_id, plan, subscription_status, trial_ends_at, monthly_episodes_used, monthly_reset_at, episode_credits')
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
    });
  } catch (e) {
    console.error('Billing fetch error:', e);
    res.status(500).json({ error: 'Failed to fetch billing' });
  }
});

// POST /api/stripe/create-checkout-session (subscription)
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { plan } = req.body;
    const planConfig = PLANS[plan];
    if (!planConfig?.priceId) return res.status(400).json({ error: 'Invalid plan' });

    const customerId = await getOrCreateCustomer(req.user.id, req.user.email);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7,
        metadata: { supabase_user_id: req.user.id, plan },
      },
      success_url: `${APP_URL}/dashboard?subscription=success`,
      cancel_url: `${APP_URL}/pricing`,
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('Checkout session error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/stripe/create-pack-checkout-session (one-time episode pack)
router.post('/create-pack-checkout-session', async (req, res) => {
  try {
    const { pack } = req.body;
    const packConfig = PACKS[pack];
    if (!packConfig?.priceId) return res.status(400).json({ error: 'Invalid pack' });

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
    res.status(500).json({ error: e.message });
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

    if (!profile?.stripe_customer_id) return res.status(400).json({ error: 'No billing account found' });

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${APP_URL}/settings`,
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error('Portal session error:', e);
    res.status(500).json({ error: e.message });
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

          // Fallback 1: look up profile by stripe_customer_id
          if (!userId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('stripe_customer_id', session.customer)
              .single();
            userId = profile?.id;
          }

          // Fallback 2: look up user by email
          if (!userId && session.customer_details?.email) {
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const match = users?.find(u => u.email === session.customer_details.email);
            userId = match?.id;
          }

          if (userId) {
            await supabase.from('profiles').update({
              stripe_customer_id: session.customer,
              plan,
              subscription_status: sub.status,
              trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
              monthly_episodes_used: 0,
              monthly_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }).eq('id', userId);
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
