import express from 'express';
import { trackUsage } from '../lib/usage.js';
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { prompt } = req.body;
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
    res.status(500).json({ error: e.message });
  }
});

export default router;
