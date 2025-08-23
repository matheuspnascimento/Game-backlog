Game Backlog Portfolio

Personal portfolio project to demonstrate my QA work. All project requirements, the test plan, and the test cases are in the Wiki. Bugs found are tracked in GitHub Issues.

Tech stack

Frontend: HTML + CSS + Vanilla JS, Google Material Icons, ApexCharts. 

Backend: Node.js (ES modules) with Express and node-fetch; dotenv for env vars. 

Testing: Cypress. 

Features

Tabs & views: Profile, Favorites, Playing, Played, Backlog, each with item counters. 
 

Search & sort: Search by title and sort by last added, last played, rating, A–Z, Z–A, or favorites only. 
 

Add/Edit/Delete: Modal form with Title (required), Status (Backlog/Playing/Played/Favorites), and 1–5 star rating. Delete confirmation modal. 
 
 

Covers: Game cover auto-fetched from IGDB via a server endpoint. 
 

Charts: Status donut + ratings bar using ApexCharts on the Profile tab. 
 

Persistence: LocalStorage with key gbr.games.v1. 
 

Project structure
.
├─ public/
│  ├─ index.html
│  ├─ css/style.css
│  └─ js/app.js
├─ server.js
├─ package.json
├─ package-lock.json
├─ cypress/
│  └─ e2e/backlog.cy.js
├─ .env            # not committed
└─ .gitignore


public/index.html: app shell, tabs, toolbars, modals, and chart containers. 
 

public/css/style.css: UI styles for tabs, cards, overlay, counters. 
 
 

public/js/app.js: state, CRUD, sorting/filtering, charts, and IGDB cover fetch. 
 

server.js: Express static server + /api/igdb/cover-url proxy (Twitch OAuth). 
 

cypress/e2e/backlog.cy.js: E2E tests (add, move, rate, delete, search). 
 
 
 
 

.gitignore: excludes node_modules/ and .env. 

Getting started (local)

Prerequisites: Node.js 18+ recommended.

Install dependencies

npm install


Create .env

# Create an app in the Twitch Dev Console, then set:
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...
PORT=3000


(Do not commit .env; it’s ignored.) 
 

Run the server

npm run dev
# or
npm start


Opens on http://localhost:3000. 
 
 

Scripts

npm run dev / npm start: start Express server. 

npm run cypress:open: interactive test runner. 

npm run cypress:run: headless E2E run. 

Note: Tests hit http://localhost:3000/, so keep the server running. 

Data model (stored in LocalStorage)

Each game object:

{
  "id": "uuid",
  "title": "Fallout New Vegas",
  "status": "Backlog|Playing|Played|Favorites",
  "rating": 1-5 or null,
  "imageUrl": "cover url or placeholder",
  "createdAt": "ISO",
  "updatedAt": "ISO",
  "lastPlayedAt": "ISO|null"
}


API (server)

GET /api/igdb/cover-url?title=<string> → { title, imageId, url }
Server obtains a Twitch OAuth token and queries IGDB; used by the frontend to show a cover image. 
 

Usage notes

Cover fetching requires valid TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET. 

The app is a personal QA portfolio; see Wiki for requirements, test plan, and cases; see Issues for bugs.

Sorting labels and counts update dynamically as you add/edit items. 
 

Acknowledgments

IGDB API (via Twitch).
