import express from 'express';

const router = express.Router();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

async function searchYouTube(query, maxResults = 10) {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    order: 'viewCount',
    publishedAfter: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    maxResults,
    key: YOUTUBE_API_KEY,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  const data = await res.json();

  if (data.error) throw new Error(data.error.message);

  const videoIds = data.items.map(i => i.id.videoId).filter(Boolean).join(',');
  if (!videoIds) return [];

  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
  );
  const statsData = await statsRes.json();

  const statsMap = {};
  (statsData.items || []).forEach(v => {
    statsMap[v.id] = v.statistics;
  });

  return (data.items || []).map(item => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnail: item.snippet.thumbnails?.medium?.url,
    views: parseInt(statsMap[item.id.videoId]?.viewCount || 0),
    likes: parseInt(statsMap[item.id.videoId]?.likeCount || 0),
  }));
}

function analyzeCompetition(videos) {
  if (!videos.length) return { level: 'Unknown', color: '#555', score: 0 };
  const topViews = Math.max(...videos.map(v => v.views));

  if (topViews > 1000000) return { level: 'High', color: '#e03535', score: 3 };
  if (topViews > 100000) return { level: 'Medium', color: '#d97706', score: 2 };
  return { level: 'Low', color: '#4ade80', score: 1 };
}

// Generate topic ideas for a niche
router.post('/generate', async (req, res) => {
  try {
    const { niche, channelDescription } = req.body;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a YouTube content strategist for faceless channels.

Generate 6 specific video topic ideas for this channel:
${channelDescription ? `Channel description: ${channelDescription}` : `Niche: ${niche}`}

Rules:
- Each topic should be specific enough to search on YouTube
- Focus on topics that have proven audience interest
- Avoid overly broad topics
- Each topic should work as a faceless narration-style video

Return ONLY valid JSON:
{"topics": ["topic 1", "topic 2", "topic 3", "topic 4", "topic 5", "topic 6"]}`,
        }],
      }),
    });

    const claudeData = await claudeRes.json();
    const raw = claudeData.content[0].text.trim();
    const { topics } = JSON.parse(raw.replace(/```json|```/g, '').trim());

    const results = await Promise.all(
      topics.map(async (topic) => {
        try {
          const videos = await searchYouTube(topic, 5);
          const competition = analyzeCompetition(videos);
          const totalViews = videos.reduce((acc, v) => acc + v.views, 0);
          const avgViews = videos.length ? Math.round(totalViews / videos.length) : 0;
          const topVideo = videos[0] || null;

          return {
            topic,
            videos: videos.slice(0, 3),
            competition,
            avgViews,
            topVideoViews: topVideo?.views || 0,
            topVideoTitle: topVideo?.title || null,
            verdict: competition.score === 1 ? 'Great opportunity' : competition.score === 2 ? 'Worth exploring' : 'Highly competitive',
            verdictColor: competition.score === 1 ? '#4ade80' : competition.score === 2 ? '#d97706' : '#e03535',
          };
        } catch (e) {
          return {
            topic, videos: [], competition: { level: 'Unknown', color: '#555', score: 0 },
            avgViews: 0, verdict: 'Could not verify', verdictColor: '#555',
            topVideoViews: 0, topVideoTitle: null,
          };
        }
      })
    );

    results.sort((a, b) => {
      const aScore = (a.competition.score === 1 ? 3 : a.competition.score === 2 ? 2 : 1) + (a.avgViews > 50000 ? 2 : a.avgViews > 10000 ? 1 : 0);
      const bScore = (b.competition.score === 1 ? 3 : b.competition.score === 2 ? 2 : 1) + (b.avgViews > 50000 ? 2 : b.avgViews > 10000 ? 1 : 0);
      return bScore - aScore;
    });

    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Validate a specific topic idea
router.post('/validate', async (req, res) => {
  try {
    const { topic, channelDescription } = req.body;

    const videos = await searchYouTube(topic, 8);
    const competition = analyzeCompetition(videos);
    const totalViews = videos.reduce((acc, v) => acc + v.views, 0);
    const avgViews = videos.length ? Math.round(totalViews / videos.length) : 0;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `You are a YouTube content strategist analysing whether a topic is worth making a video about.

Topic: "${topic}"
${channelDescription ? `Channel: ${channelDescription}` : ''}

YouTube data (last 90 days):
- Videos found: ${videos.length}
- Average views: ${avgViews.toLocaleString()}
- Top video views: ${videos[0]?.views?.toLocaleString() || 0}
- Top videos: ${videos.slice(0, 3).map(v => `"${v.title}" (${v.views?.toLocaleString()} views)`).join(', ')}

Analyse this data and return ONLY valid JSON:
{
  "recommendation": "Make it",
  "reason": "2-3 sentence explanation based on the actual data",
  "angle": "The specific angle to take to differentiate from existing videos (1-2 sentences)",
  "estimatedOpportunity": "High"
}

The recommendation field must be exactly one of: "Make it", "Proceed with caution", "Skip it"
The estimatedOpportunity field must be exactly one of: "High", "Medium", "Low"`,
        }],
      }),
    });

    const claudeData = await claudeRes.json();
    const raw = claudeData.content[0].text.trim();
    const analysis = JSON.parse(raw.replace(/```json|```/g, '').trim());

    res.json({ topic, videos: videos.slice(0, 5), competition, avgViews, analysis });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
