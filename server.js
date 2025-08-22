import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
console.log('TWITCH_CLIENT_ID:', process.env.TWITCH_CLIENT_ID);
console.log('TWITCH_CLIENT_SECRET:', process.env.TWITCH_CLIENT_SECRET ? '[OK]' : '[MISSING]');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- IGDB helper (server-side; do NOT expose secrets) ----
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || '';
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || '';
let cachedToken = null;
let tokenExpTs = 0;

async function getTwitchToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpTs) return cachedToken;
  const url = `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Twitch token error: ${res.status} ${msg}`);
  }
  const j = await res.json();
  console.log(j)
  cachedToken = j.access_token;
  tokenExpTs = now + (j.expires_in - 60) * 1000;
  return cachedToken;
}

// GET /api/igdb/cover-url?title=The%20Last%20of%20Us
app.get('/api/igdb/cover-url', async (req, res) => {
  try {
    const title = (req.query.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Missing title' });
    if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET)
      return res.status(500).json({ error: 'Server missing Twitch credentials' });

    const token = await getTwitchToken();
    const q = `fields name,cover.image_id; search "${title.replace(/"/g, '\"')}"; limit 1;`;
    const igdbRes = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: q
    });
    if (!igdbRes.ok) {
      const txt = await igdbRes.text();
      return res.status(502).json({ error: `IGDB error ${igdbRes.status}`, detail: txt });
      }
    const arr = await igdbRes.json();
    const game = arr?.[0];
    const imageId = game?.cover?.image_id || null;
    const url = imageId ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg` : null;
    res.json({ title, imageId, url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Fallback to index.html (SPA)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});