import express from 'express';
import { supabase } from '../lib/supabase.js';
const router = express.Router();

// Get channel profile
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || null);
});

// Save channel profile (basic fields only)
router.post('/', async (req, res) => {
  const { channel_name, description, tone, video_length } = req.body;
  const { data, error } = await supabase
    .from('profiles')
    .update({ channel_name, description, tone, video_length })
    .eq('id', req.user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Generate custom template from channel description
router.post('/generate-template', async (req, res) => {
  try {
    const { channel_name, description, tone, video_length } = req.body;

    const toneDescriptions = {
      dark_serious: 'Dark, cinematic, serious, weighty. Content that makes viewers think deeply.',
      neutral_educational: 'Clear, informative, engaging. Content that teaches and informs.',
      light_entertaining: 'Fun, accessible, entertaining. Content that is enjoyable and easy to watch.',
    };

    const wordsPerMinute = 130;
    const targetWords = Math.round(video_length * wordsPerMinute);

    const prompt = `You are setting up a custom AI production template for a YouTube channel on Forge, an AI video production platform.

Based on this creator's channel description, generate a fully customised production template.

Channel name: ${channel_name}
Channel description: ${description}
Tone: ${toneDescriptions[tone] || tone}
Target video length: ${video_length} minutes (~${targetWords} words)

Generate a JSON template that will power every video this channel produces. Be highly specific to their niche — avoid generic instructions.

Return ONLY valid JSON in this exact structure:
{
  "researchPrompt": "A detailed instruction for how to research topics for this specific channel. What angle to take, what details to look for, what sources to prioritise, what to avoid. 3-5 sentences.",
  "scriptPrompt": "A detailed instruction for the writing style, narrative structure, register, and approach for this channel's scripts. Include specific guidance on opening style, pacing, and closing. 3-5 sentences.",
  "imageStyle": "A Midjourney/image generation style string describing the visual aesthetic for this channel. Include medium, lighting, mood, composition style. 1-2 sentences.",
  "targetWordCount": ${targetWords},
  "wordsPerMinute": ${wordsPerMinute},
  "moods": {
    "mood_name_1": {
      "keywords": ["word1", "word2", "word3", "word4", "word5"],
      "color": "#hexcolor",
      "imageStyle": "specific image style for this mood"
    },
    "mood_name_2": {
      "keywords": ["word1", "word2", "word3", "word4", "word5"],
      "color": "#hexcolor",
      "imageStyle": "specific image style for this mood"
    }
  }
}

Generate exactly 5-6 moods that are specific and relevant to this channel's content. Each mood should have 5-8 keywords, a distinct hex color, and a specific image style variation.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const claudeData = await response.json();
    if (claudeData.error) throw new Error(claudeData.error.message);

    const raw = claudeData.content[0].text.trim();
    const template = JSON.parse(raw.replace(/```json|```/g, '').trim());

    const { data: saved, error } = await supabase
      .from('profiles')
      .update({
        channel_name,
        description,
        tone,
        video_length,
        prompt_config: {
          researchPrompt: template.researchPrompt,
          scriptPrompt: template.scriptPrompt,
          imageStyle: template.imageStyle,
          targetWordCount: template.targetWordCount,
          wordsPerMinute: template.wordsPerMinute,
        },
        mood_config: template.moods,
        is_configured: true,
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(saved);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
