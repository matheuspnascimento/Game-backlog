# Game Backlog (Single Page App)

- One-page app using **Express**, **MaterializeCSS**, **Chart.js**.
- Data persistence: **LocalStorage** (GBR-020).
- Covers fetched via **IGDB** (server-side proxy).

## Requirements
- Node 18+
- Twitch/IGDB credentials

## Setup
1. Copy `.env.example` to `.env` and fill in:
   ```
   TWITCH_CLIENT_ID=...
   TWITCH_CLIENT_SECRET=...
   PORT=3000
   ```
2. Install deps:
   ```bash
   npm install
   ```
3. Run:
   ```bash
   npm run dev
   ```
4. Open: http://localhost:3000

## Notes
- Add: Title required, default status Backlog.
- Edit: Only **Status** and **Rating**.
- Duplicate prevention: case-insensitive Title.
- Views: Favorites, Playing, Played, Backlog.
- Profile: status donut + ratings bar; shows 3 *Currently Playing* and 5 *Favorites*.
- Sorting: Last added / Last played / Rating.
- Images: fetched on add via `/api/igdb/cover-url?title=...`; fall back to local placeholder.
