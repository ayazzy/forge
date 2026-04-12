import express from 'express';
import { trackUsage } from '../lib/usage.js';
const router = express.Router();

router.post('/:voiceId', async (req, res) => {
  try {
    const { voiceId } = req.params;
    const characterCount = req.body.text?.length || 0;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify(req.body),
      }
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err?.detail?.message || 'ElevenLabs error' });
    }
    const buffer = await response.arrayBuffer();

    trackUsage(req.user.id, 'elevenlabs_characters', characterCount);

    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
