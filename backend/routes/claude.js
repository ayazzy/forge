import express from 'express';
import { trackUsage, checkUsageLimit } from '../lib/usage.js';
import { safeError } from '../lib/errors.js';
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    // 1.4 — Input validation
    const { prompt, maxTokens: rawMax = 1000 } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }
    if (prompt.length > 15000) {
      return res.status(400).json({ error: 'Prompt too long. Maximum 15,000 characters.' });
    }
    const maxTokens = Math.min(Math.max(1, parseInt(rawMax) || 1000), 8000);

    const { allowed, used, limit } = await checkUsageLimit(req.user.id, 'claude_calls');
    if (!allowed) return res.status(429).json({ error: 'Monthly AI call limit reached', used, limit, limitType: 'claude_calls' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: safeError(new Error(data.error.message)) });

    trackUsage(req.user.id, 'claude_calls', 1);

    res.json({ text: data.content[0].text.trim() });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

export default router;
