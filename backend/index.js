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
import { requireAuth } from './middleware/auth.js';

dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/claude', requireAuth, claudeRoute);
app.use('/api/elevenlabs', requireAuth, elevenlabsRoute);
app.use('/api/ideogram', requireAuth, ideogramRoute);
app.use('/api/episodes', requireAuth, episodesRoute);
app.use('/api/assets', requireAuth, assetsRoute);
app.use('/api/profile', requireAuth, profileRoute);
app.use('/api/usage', requireAuth, usageRoute);
app.use('/api/channel', requireAuth, channelRoute);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Forge API running on port ${PORT}`));
