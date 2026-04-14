import express from 'express';
import { trackUsage, checkUsageLimit } from '../lib/usage.js';
import { safeError } from '../lib/errors.js';

const router = express.Router();

router.post('/', async (req, res) => {
  // 1.4 — Input validation
  const { prompt, maxTokens: rawMax = 4000 } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }
  if (prompt.length > 15000) {
    return res.status(400).json({ error: 'Prompt too long. Maximum 15,000 characters.' });
  }
  const maxTokens = Math.min(Math.max(1, parseInt(rawMax) || 4000), 8000);

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
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        stream: true,
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
