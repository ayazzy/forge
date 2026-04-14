import express from 'express';
import { supabase } from '../lib/supabase.js';
import { sendWelcomeEmail } from '../lib/email.js';
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
  const { channel_name, description, tone, video_length, weekly_goal } = req.body;
  const update = { channel_name, description, tone, video_length };
  if (weekly_goal !== undefined) update.weekly_goal = Number(weekly_goal);
  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', req.user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Import channel data from YouTube URL
router.post('/import-from-url', async (req, res) => {
  try {
    const { channelUrl } = req.body;
    if (!channelUrl) return res.status(400).json({ error: 'channelUrl is required' });

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) return res.status(500).json({ error: 'YouTube API key not configured' });

    // Extract handle or channel ID from URL
    // Supports: @handle, /channel/UCxxx, /c/name, /user/name
    let channelData = null;
    const handleMatch = channelUrl.match(/youtube\.com\/@([^/?&]+)/);
    const channelIdMatch = channelUrl.match(/youtube\.com\/channel\/(UC[^/?&]+)/);
    const customMatch = channelUrl.match(/youtube\.com\/(?:c|user)\/([^/?&]+)/);

    if (handleMatch) {
      const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${handleMatch[1]}&key=${YOUTUBE_API_KEY}`);
      const ytData = await ytRes.json();
      if (ytData.error) throw new Error(ytData.error.message);
      channelData = ytData.items?.[0] || null;
    } else if (channelIdMatch) {
      const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIdMatch[1]}&key=${YOUTUBE_API_KEY}`);
      const ytData = await ytRes.json();
      if (ytData.error) throw new Error(ytData.error.message);
      channelData = ytData.items?.[0] || null;
    } else if (customMatch) {
      // Search by name as fallback
      const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(customMatch[1])}&maxResults=1&key=${YOUTUBE_API_KEY}`);
      const ytData = await ytRes.json();
      if (ytData.error) throw new Error(ytData.error.message);
      const found = ytData.items?.[0];
      if (found) {
        const detailRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${found.snippet.channelId}&key=${YOUTUBE_API_KEY}`);
        const detailData = await detailRes.json();
        channelData = detailData.items?.[0] || null;
      }
    }

    if (!channelData) return res.status(404).json({ error: 'Channel not found. Check the URL and try again.' });

    const channelId = channelData.id;
    const channelName = channelData.snippet.title;
    const channelDescription = channelData.snippet.description || '';
    const subscribers = parseInt(channelData.statistics?.subscriberCount || 0);
    const totalViews = parseInt(channelData.statistics?.viewCount || 0);
    const videoCount = parseInt(channelData.statistics?.videoCount || 0);

    // Fetch top 10 videos by view count to infer content style and length
    const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=viewCount&maxResults=10&key=${YOUTUBE_API_KEY}`);
    const videosData = await videosRes.json();
    const topVideos = (videosData.items || []).map(v => v.snippet.title);

    // Fetch video durations for the top videos to infer avg length
    const videoIds = (videosData.items || []).map(v => v.id.videoId).filter(Boolean).join(',');
    let avgMinutes = 15;
    if (videoIds) {
      const detailRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`);
      const detailData = await detailRes.json();
      const durations = (detailData.items || []).map(v => {
        const match = v.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return null;
        return (parseInt(match[1] || 0) * 60) + parseInt(match[2] || 0);
      }).filter(Boolean);
      if (durations.length) {
        avgMinutes = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
      }
    }

    // Snap avg length to nearest option
    const LENGTH_OPTIONS = [8, 12, 15, 20];
    const video_length = LENGTH_OPTIONS.reduce((prev, curr) =>
      Math.abs(curr - avgMinutes) < Math.abs(prev - avgMinutes) ? curr : prev
    );

    // Ask Claude to generate tone + description from real channel data
    const prompt = `You are setting up a YouTube content production template for a creator.

Here is real data from their YouTube channel:
Channel name: ${channelName}
Subscribers: ${subscribers.toLocaleString()}
Total views: ${totalViews.toLocaleString()}
Videos: ${videoCount}
Channel description: ${channelDescription.substring(0, 500)}
Top videos by views:
${topVideos.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Based on this data, return a production profile. Be specific about the niche, style, and audience.

Return ONLY valid JSON:
{
  "description": "2-4 sentences describing what this channel makes: the niche, the style, who watches it, what makes it distinctive. This will power every script the channel produces — be specific.",
  "tone": "dark_serious OR neutral_educational OR light_entertaining"
}

tone definitions:
- dark_serious: Cinematic, weighty, makes viewers think deeply
- neutral_educational: Clear, informative, teaches and informs
- light_entertaining: Fun, accessible, enjoyable to watch`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const claudeData = await response.json();
    if (claudeData.error) throw new Error(claudeData.error.message);

    const raw = claudeData.content[0].text.trim();
    const analysis = JSON.parse(raw.replace(/```json|```/g, '').trim());

    // Persist the channel ID so the stats endpoint can use it later
    await supabase
      .from('profiles')
      .update({ youtube_channel_id: channelId })
      .eq('id', req.user.id);

    res.json({
      channel_name: channelName,
      description: analysis.description,
      tone: analysis.tone,
      video_length,
      subscribers,
      top_videos: topVideos,
      youtube_channel_id: channelId,
      confidence: 'high',
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to analyze channel' });
  }
});

// Generate custom template from channel description
router.post('/generate-template', async (req, res) => {
  try {
    const { channel_name, description, tone, video_length } = req.body;

    const toneDescriptions = {
      dark_serious: 'Dark, cinematic, serious, weighty. Content that makes viewers think deeply.',
      investigative: 'Research-driven, journalistic, exposes truth and builds tension through evidence.',
      narrative_storytelling: 'Character-driven, immersive narrative. Pulls viewers deep into the story.',
      neutral_educational: 'Clear, informative, engaging. Content that teaches and informs.',
      inspirational: 'Uplifting, empowering, motivational. Drives viewers to think bigger and take action.',
      light_entertaining: 'Fun, accessible, entertaining. Content that is enjoyable and easy to watch.',
      conversational: 'Authentic, relatable, personal. Feels like talking to a knowledgeable friend.',
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

    // Send welcome email on first-time onboarding completion (fire and forget)
    if (req.user?.email) sendWelcomeEmail(req.user.email).catch(() => {});

    // Fire and forget — generate trending topics in the background
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    fetch(`${backendUrl}/api/trends/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
      },
    }).catch(e => console.warn('Background trend generation failed:', e));

    res.json(saved);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/channel/stats — live YouTube channel stats
router.get('/stats', async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('youtube_channel_id, channel_name')
      .eq('id', req.user.id)
      .single();

    if (!profile?.youtube_channel_id && !profile?.channel_name) return res.json(null);

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) return res.status(500).json({ error: 'YouTube API key not configured' });

    let channelId = profile.youtube_channel_id;

    // Fallback: resolve channel ID from channel name if not stored yet
    if (!channelId && profile.channel_name) {
      const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(profile.channel_name)}&maxResults=1&key=${YOUTUBE_API_KEY}`);
      const searchData = await searchRes.json();
      channelId = searchData.items?.[0]?.snippet?.channelId;
      if (channelId) {
        // Save it so we don't need to search next time
        await supabase.from('profiles').update({ youtube_channel_id: channelId }).eq('id', req.user.id);
      }
    }

    if (!channelId) return res.json(null);

    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`);
    const ytData = await ytRes.json();
    const stats = ytData.items?.[0]?.statistics;
    if (!stats) return res.json(null);

    const result = {
      subscribers: parseInt(stats.subscriberCount || 0),
      total_views: parseInt(stats.viewCount || 0),
      video_count: parseInt(stats.videoCount || 0),
    };

    // Save daily snapshot (upsert so duplicate dates are ignored)
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from('channel_stats_snapshots').upsert({
      user_id: req.user.id,
      date: today,
      subscribers: result.subscribers,
      total_views: result.total_views,
      video_count: result.video_count,
    }, { onConflict: 'user_id,date' });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/channel/snapshots — historical stats for charts
router.get('/snapshots', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('channel_stats_snapshots')
      .select('date, subscribers, total_views, video_count')
      .eq('user_id', req.user.id)
      .order('date', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
