import express from 'express';
import { trackUsage, checkUsageLimit } from '../lib/usage.js';
import { safeError } from '../lib/errors.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// 3.6 — Model tiering: Sonnet for creative/analytical, Haiku for structured/templated
const MODEL_MAP = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-20250514',
};
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

// 3.7 — Static system prompt (cached across calls to reduce cost)
const SYSTEM_PROMPT = 'You are Forge AI, a YouTube content production assistant. You help creators research topics, write scripts, develop hooks, analyze retention, and optimize content for maximum engagement.';

// Feature plan requirements
const FEATURE_PLANS = {
  one_shot: ['studio', 'pro'],
};

router.post('/', async (req, res) => {
  // 1.4 — Input validation
  const { prompt, maxTokens: rawMax = 4000, model: modelKey = 'sonnet', feature } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }
  if (prompt.length > 15000) {
    return res.status(400).json({ error: 'Prompt too long. Maximum 15,000 characters.' });
  }
  const maxTokens = Math.min(Math.max(1, parseInt(rawMax) || 4000), 8000);
  const model = MODEL_MAP[modelKey] || DEFAULT_MODEL;

  // 3.9 — Feature gating
  if (feature && FEATURE_PLANS[feature]) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, subscription_status')
        .eq('id', req.user.id)
        .single();
      const isActive = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing';
      if (!isActive || !FEATURE_PLANS[feature].includes(profile?.plan)) {
        return res.status(403).json({ error: `${feature} requires a Studio or Pro plan.`, code: 'FEATURE_GATED' });
      }
    } catch {
      return res.status(500).json({ error: 'Failed to verify feature access.' });
    }
  }

  const { allowed, used, limit } = await checkUsageLimit(req.user.id, 'claude_calls');
  if (!allowed) {
    return res.status(429).json({ error: 'Monthly AI call limit reached', used, limit, limitType: 'claude_calls' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: true,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
            }
          } catch {}
        }
      }
    }

    trackUsage(req.user.id, 'claude_calls', 1);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (e) {
    // Return generic error over SSE stream
    res.write(`data: ${JSON.stringify({ error: 'Generation failed. Please try again.' })}\n\n`);
    res.end();
  }
});

export default router;
