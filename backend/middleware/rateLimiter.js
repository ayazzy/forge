import { supabase } from '../lib/supabase.js';

// Per-user rate limits (requests per hour) by plan and API type
const LIMITS = {
  claude: { creator: 60, studio: 120, pro: 250, free: 20, default: 20 },
  elevenlabs: { creator: 20, studio: 40, pro: 80, free: 10, default: 10 },
  ideogram: { creator: 15, studio: 30, pro: 60, free: 8, default: 8 },
};

// In-memory store: Map<userId, { count, resetAt }>
const rateLimitStore = new Map();

// Plan cache: Map<userId, { plan, fetchedAt }>
const planCache = new Map();
const PLAN_CACHE_TTL = 60_000; // 60 seconds

async function getUserPlan(userId) {
  const cached = planCache.get(userId);
  if (cached && Date.now() - cached.fetchedAt < PLAN_CACHE_TTL) {
    return cached.plan;
  }
  const { data } = await supabase
    .from('profiles')
    .select('plan, subscription_status')
    .eq('user_id', userId)
    .single();
  const isActive = data?.subscription_status === 'active' || data?.subscription_status === 'trialing';
  const plan = isActive ? (data?.plan || 'free') : 'free';
  planCache.set(userId, { plan, fetchedAt: Date.now() });
  return plan;
}

function getRateLimitKey(userId, apiType) {
  return `${userId}:${apiType}`;
}

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 10 * 60 * 1000);

export function createRateLimiter(apiType) {
  return async function rateLimiterMiddleware(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return next();

      const plan = await getUserPlan(userId);
      const limit = LIMITS[apiType]?.[plan] ?? LIMITS[apiType]?.default ?? 20;
      const key = getRateLimitKey(userId, apiType);
      const now = Date.now();

      let entry = rateLimitStore.get(key);
      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + 60 * 60 * 1000 };
        rateLimitStore.set(key, entry);
      }

      if (entry.count >= limit) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return res.status(429).json({
          error: `Rate limit exceeded. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
          retryAfter,
        });
      }

      entry.count++;
      next();
    } catch (e) {
      console.error('[RateLimiter] Error:', e);
      next(); // Don't block on rate limiter errors
    }
  };
}

export const claudeRateLimiter = createRateLimiter('claude');
export const elevenlabsRateLimiter = createRateLimiter('elevenlabs');
export const ideogramRateLimiter = createRateLimiter('ideogram');
