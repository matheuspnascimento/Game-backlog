# Game Backlog Portfolio

Personal QA portfolio project to demonstrate my work as a QA Engineer.
All **requirements**, **test plan**, and **test cases** are in the **GitHub Wiki**.
All **bugs** are tracked in **GitHub Issues**. Project in *current development*.

---

## Tech Stack

- **Frontend:** HTML, CSS, Vanilla JavaScript, Google Material Icons, ApexCharts
- **Backend:** Node.js (ES Modules) with Express and node-fetch
- **Config:** dotenv for environment variables
- **Testing:** Cypress (headless + interactive)
- **CI:** GitHub Actions (Cypress headless on Electron)

---

## Features

- **Statuses:** Backlog, Playing, Played, Favorites
- **CRUD:** Add, edit, delete games; optional 1–5 star rating
- **Search & Sort:** Title search; sort by last added, last played, rating, A–Z, Z–A; favorites-only filter
- **Covers:** IGDB cover lookup via server proxy (Twitch OAuth)
- **Dashboard:** ApexCharts (status donut + rating distribution)
- **Persistence:** LocalStorage (`gbr.games.v1`)

---

## Project Structure

GAME-BACKLOG/
├── .github/
│   └── workflows/
│       └── ci.yml
├── cypress/
│   ├── e2e/
│   │   └── backlog.cy.js
│   ├── fixtures/
│   └── support/
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── index.html
├── .env
├── .env.example
├── .gitignore
├── cypress.config.js
├── package-lock.json
├── package.json
├── server.js
└── README.md


> The server serves `public/`. If your files are at the repo root, move them under `public/` or update `server.js`.

---

## Prerequisites

- Node.js 18+
- npm (bundled with Node)

---

## Environment Variables

Create a `.env` in the project root:

```bash
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
PORT=3000
```

- IGDB cover lookup requires valid Twitch credentials.
- **Never commit** `.env` (listed in `.gitignore`).

---

## Run Locally

Install:

```bash
npm install
```

Start:

```bash
npm run dev
# or
npm start
```

Open: `http://localhost:3000`

---

## NPM Scripts

```bash
npm run dev          # start server (dev)
npm start            # start server
npm run cypress:open # open Cypress UI
npm run cypress:run  # headless tests
```

> Keep the server running at `http://localhost:3000` while executing Cypress.

---

## Testing (Cypress)

Default spec location:

```
cypress/
└─ e2e/
   └─ backlog.cy.js
```

Run interactive:

```bash
npm run cypress:open
```

Run headless:

```bash
npm run cypress:run
```

---

## API (Server)

`GET /api/igdb/cover-url?title=<string>` → JSON

```json
{ "title": "Fallout New Vegas", "imageId": "abc123", "url": "https://..." }
```

- Server fetches a Twitch OAuth token, queries IGDB, and returns a cover URL.

---

## Data Model (LocalStorage)

Each game:

```json
{
  "id": "uuid",
  "title": "string",
  "status": "Backlog|Playing|Played|Favorites",
  "rating": 1,
  "imageUrl": "string|null",
  "createdAt": "ISO",
  "updatedAt": "ISO",
  "lastPlayedAt": "ISO|null"
}
```

---

## Continuous Integration

`ci.yml` (GitHub Actions) on push to `main`:

- Checkout, setup Node
- `npm ci`
- Start app and run Cypress (Electron, headless)
- Upload screenshots on failure

**Repository secrets required:**

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`

---

## Portfolio Context

- This is a **personal QA portfolio**.
- **Wiki:** requirements, test plan, test cases.
- **Issues:** defects, triage, improvements.
- Demonstrates traceability, automation, and CI.

---

## Security Notes

- Do **not** expose Twitch credentials to the client.
- `.env` is ignored by Git.

---

## License

MIT (or update as needed).
