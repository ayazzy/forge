import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Generate niche-specific search queries from channel description
async function generateSearchQueries(channelDescription) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You are a YouTube content researcher.

Based on this channel description, generate 5 YouTube search queries that would find videos in this niche.
Queries should be broad enough to find many results but specific enough to be relevant.

Channel: ${channelDescription}

Return ONLY valid JSON:
{"queries": ["query 1", "query 2", "query 3", "query 4", "query 5"]}`,
      }],
    }),
  });
  const data = await res.json();
  const raw = data.content[0].text.trim();
  const { queries } = JSON.parse(raw.replace(/```json|```/g, '').trim());
  return queries;
}

// Search YouTube and get video + channel stats
async function searchYouTubeWithChannelData(query, maxResults = 20) {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    order: 'viewCount',
    publishedAfter: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    maxResults,
    relevanceLanguage: 'en',
    key: YOUTUBE_API_KEY,
  });

  const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  const searchData = await searchRes.json();
  if (searchData.error) throw new Error(searchData.error.message);

  const items = searchData.items || [];
  if (!items.length) return [];

  const videoIds = items.map(i => i.id.videoId).filter(Boolean).join(',');
  const channelIds = [...new Set(items.map(i => i.snippet.channelId).filter(Boolean))].join(',');

  const [videoRes, channelRes] = await Promise.all([
    fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`),
    fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelIds}&key=${YOUTUBE_API_KEY}`),
  ]);

  const videoData = await videoRes.json();
  const channelData = await channelRes.json();

  const channelMap = {};
  (channelData.items || []).forEach(c => {
    channelMap[c.id] = {
      name: c.snippet.title,
      subscribers: parseInt(c.statistics?.subscriberCount || 0),
      totalViews: parseInt(c.statistics?.viewCount || 0),
      videoCount: parseInt(c.statistics?.videoCount || 0),
    };
  });

  return (videoData.items || []).map(v => {
    const channel = channelMap[v.snippet.channelId] || {};
    const views = parseInt(v.statistics?.viewCount || 0);
    const subscribers = channel.subscribers || 1;
    const ratio = subscribers > 0 ? Math.round(views / subscribers * 10) / 10 : 0;

    return {
      videoId: v.id,
      title: v.snippet.title,
      channelId: v.snippet.channelId,
      channelName: channel.name || v.snippet.channelTitle,
      publishedAt: v.snippet.publishedAt,
      views,
      subscribers,
      ratio,
      likes: parseInt(v.statistics?.likeCount || 0),
    };
  }).filter(v =>
    v.views > 1000 &&
    v.subscribers < 500000
  ).sort((a, b) => b.ratio - a.ratio);
}

// Identify topic patterns and opportunities from video data
async function identifyOpportunities(videos, channelDescription) {
  const videoSummary = videos.slice(0, 30).map(v =>
    `"${v.title}" — ${v.views.toLocaleString()} views, ${v.subscribers.toLocaleString()} subs, ${v.ratio}x ratio`
  ).join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a YouTube content strategist analysing real performance data.

Channel description: ${channelDescription}

Here are real YouTube videos performing well from non-massive channels (sorted by views-to-subscriber ratio):
${videoSummary}

The views-to-subscriber ratio shows how much a video overperformed relative to the channel size. High ratio = big opportunity.

Identify 6 distinct topic opportunities based on patterns in this real data. Each opportunity should be a specific video idea this channel could make.

IMPORTANT: Every field must be filled in. The "whyItWorks" field must be a non-empty string of 2 sentences that references specific numbers from the data.

Return ONLY valid JSON matching this exact structure (all field names must match exactly):
{
  "opportunities": [
    {
      "topic": "Specific video topic idea based on the data",
      "angle": "The specific hook or angle that makes this work",
      "whyItWorks": "2 sentences explaining why the data shows this is an opportunity. Reference specific numbers like ratios and view counts.",
      "competitionLevel": "Low",
      "evidenceVideo": "Exact title of the best performing video from the data above",
      "evidenceViews": 125000,
      "evidenceSubscribers": 8500,
      "evidenceRatio": 14.7
    }
  ]
}

competitionLevel must be exactly one of: "Low", "Medium", "High"
whyItWorks must never be empty or null — always write 2 full sentences referencing the actual data.`,
      }],
    }),
  });

  const data = await res.json();
  const raw = data.content[0].text.trim();
  const { opportunities } = JSON.parse(raw.replace(/```json|```/g, '').trim());
  console.log('Opportunities from Claude:', JSON.stringify(opportunities, null, 2));
  return opportunities;
}

// GET cached topics
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('trending_topics')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.json({ topics: [], generated_at: null, needs_generation: true });
    }

    const isStale = new Date() - new Date(data.generated_at) > 24 * 60 * 60 * 1000;
    res.json({ topics: data.topics, generated_at: data.generated_at, needs_generation: false, is_stale: isStale });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST refresh — find what's working on YouTube, then identify opportunities
router.post('/refresh', async (req, res) => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('description, channel_name')
      .eq('id', req.user.id)
      .single();

    const channelDesc = profile?.description || 'general YouTube channel';

    // Step 1: Generate search queries for this niche
    const queries = await generateSearchQueries(channelDesc);

    // Step 2: Search YouTube with each query in parallel
    const searchResults = await Promise.all(
      queries.map(q => searchYouTubeWithChannelData(q, 20).catch(() => []))
    );

    // Step 3: Merge and deduplicate all videos
    const seen = new Set();
    const allVideos = searchResults.flat().filter(v => {
      if (seen.has(v.videoId)) return false;
      seen.add(v.videoId);
      return true;
    }).sort((a, b) => b.ratio - a.ratio);

    // Step 4: Claude identifies opportunities from the real data
    const opportunities = await identifyOpportunities(allVideos, channelDesc);

    // Step 5: Enrich with competition color
    const enriched = opportunities.map(opp => ({
      ...opp,
      competitionColor: opp.competitionLevel === 'Low' ? '#4ade80' : opp.competitionLevel === 'Medium' ? '#d97706' : '#e03535',
      opportunityScore: opp.competitionLevel === 'Low' ? 3 : opp.competitionLevel === 'Medium' ? 2 : 1,
    }));

    // Step 6: Save to database
    await supabase
      .from('trending_topics')
      .upsert({
        user_id: req.user.id,
        topics: enriched,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    res.json({ topics: enriched, generated_at: new Date().toISOString() });
  } catch (e) {
    console.error('Trends refresh error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST validate a specific topic
router.post('/validate', async (req, res) => {
  try {
    const { topic, channelDescription } = req.body;

    const videos = await searchYouTubeWithChannelData(topic, 20);
    const topVideos = videos.slice(0, 8);

    if (!topVideos.length) {
      return res.json({
        topic,
        videos: [],
        avgRatio: 0,
        avgViews: 0,
        analysis: {
          recommendation: 'Proceed with caution',
          reason: "No videos found on this topic from smaller channels. This could mean it's completely untested or too niche.",
          angle: 'Consider broadening the topic slightly to find comparable content.',
          estimatedOpportunity: 'Low',
        },
      });
    }

    const avgRatio = topVideos.reduce((acc, v) => acc + v.ratio, 0) / topVideos.length;
    const avgViews = topVideos.reduce((acc, v) => acc + v.views, 0) / topVideos.length;

    const videoSummary = topVideos.map(v =>
      `"${v.title}" — ${v.views.toLocaleString()} views, ${v.subscribers.toLocaleString()} subs, ${v.ratio}x ratio`
    ).join('\n');

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are a YouTube content strategist analysing whether a topic is worth making a video about.

Topic: "${topic}"
${channelDescription ? `Channel: ${channelDescription}` : ''}

Real YouTube performance data (from non-massive channels, last 12 months):
${videoSummary}

Average views-to-subscriber ratio: ${avgRatio.toFixed(1)}x
Average views: ${Math.round(avgViews).toLocaleString()}

A ratio above 5x is a strong signal. Above 10x is exceptional.

Return ONLY valid JSON:
{
  "recommendation": "Make it",
  "reason": "2-3 sentences based on the actual ratio and view data",
  "angle": "Specific angle to differentiate from existing videos",
  "estimatedOpportunity": "High"
}

recommendation must be exactly one of: "Make it", "Proceed with caution", "Skip it"
estimatedOpportunity must be exactly one of: "High", "Medium", "Low"`,
        }],
      }),
    });

    const claudeData = await claudeRes.json();
    const raw = claudeData.content[0].text.trim();
    const analysis = JSON.parse(raw.replace(/```json|```/g, '').trim());

    res.json({ topic, videos: topVideos.slice(0, 5), avgRatio, avgViews: Math.round(avgViews), analysis });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
