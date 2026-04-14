import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import claudeRoute from './routes/claude.js';
import elevenlabsRoute from './routes/elevenlabs.js';
import ideogramRoute from './routes/ideogram.js';
import episodesRoute from './routes/episodes.js';
import assetsRoute from './routes/assets.js';
import profileRoute from './routes/profile.js';
import usageRoute from './routes/usage.js';
import channelRoute from './routes/channel.js';
import trendsRoute from './routes/trends.js';
import savedTopicsRoute from './routes/savedTopics.js';
import claudeGuestRoute from './routes/claudeGuest.js';
import claudeStreamRoute from './routes/claudeStream.js';
import stripeRoute, { handleWebhook } from './routes/stripe.js';
import accountRoute from './routes/account.js';
import { requireAuth } from './middleware/auth.js';
import { claudeRateLimiter, elevenlabsRateLimiter, ideogramRateLimiter } from './middleware/rateLimiter.js';
import { runJob as runTrialReminder } from './jobs/trialReminder.js';

dotenv.config({ path: '../.env' });

const app = express();

// 1.3 — Tightened CORS: removed wildcard /\.vercel\.app$/ regex
const allowedOrigins = [
  'http://localhost:5173',
  'https://forge-gamma-pied.vercel.app',
  'https://tryforge.studio',
  'https://www.tryforge.studio',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Stripe webhook needs raw body — must be registered before express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json({ limit: '50mb' }));

app.use('/api/claude/guest', claudeGuestRoute);
// 1.2 — Per-user rate limiting on all AI routes
app.use('/api/claude/stream', requireAuth, claudeRateLimiter, claudeStreamRoute);
app.use('/api/claude', requireAuth, claudeRateLimiter, claudeRoute);
app.use('/api/elevenlabs', requireAuth, elevenlabsRateLimiter, elevenlabsRoute);
app.use('/api/ideogram', requireAuth, ideogramRateLimiter, ideogramRoute);
app.use('/api/episodes', requireAuth, episodesRoute);
app.use('/api/assets', requireAuth, assetsRoute);
app.use('/api/profile', requireAuth, profileRoute);
app.use('/api/usage', requireAuth, usageRoute);
app.use('/api/channel', requireAuth, channelRoute);
app.use('/api/trends', requireAuth, trendsRoute);
app.use('/api/saved-topics', requireAuth, savedTopicsRoute);
app.use('/api/stripe', requireAuth, stripeRoute);
app.use('/api/account', requireAuth, accountRoute);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Forge API running on port ${PORT}`));

// Trial reminder job — runs every 6 hours
setInterval(runTrialReminder, 6 * 60 * 60 * 1000);
