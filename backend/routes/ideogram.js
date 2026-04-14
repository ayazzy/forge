import express from 'express';
import { trackUsage, checkUsageLimit } from '../lib/usage.js';
import { safeError } from '../lib/errors.js';
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { prompt } = req.body;

    const { allowed, used, limit } = await checkUsageLimit(req.user.id, 'ideogram_generations');
    if (!allowed) return res.status(429).json({ error: 'Monthly image generation limit reached', used, limit, limitType: 'ideogram_generations' });
    const response = await fetch('https://api.ideogram.ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': process.env.IDEOGRAM_API_KEY,
      },
      body: JSON.stringify({
        image_request: {
          prompt,
          aspect_ratio: 'ASPECT_16_9',
          model: 'V_2',
          style_type: 'REALISTIC',
          negative_prompt: 'bright colors, happy mood, modern, text, maps, cartoonish, photorealistic',
        },
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error });

    trackUsage(req.user.id, 'ideogram_generations', 1);

    res.json({ url: data.data?.[0]?.url || null });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

export default router;
