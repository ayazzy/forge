import express from 'express';
import { trackUsage } from '../lib/usage.js';
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { prompt, maxTokens = 1000 } = req.body;
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
    if (data.error) return res.status(400).json({ error: data.error.message });

    trackUsage(req.user.id, 'claude_calls', 1);

    res.json({ text: data.content[0].text.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
