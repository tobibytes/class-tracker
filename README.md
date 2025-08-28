Class Tracker (Dockerized)

Overview
- A simple app that tells you your next class, time, and where it is.
- Manual mode or Canvas mode (via REST API, access token from .env).
- Dockerized frontend (React + Vite + Nginx) and backend (Node + Express + TS).

Quick start
1) Backend env
- Copy backend/.env.example to backend/.env and fill values:
  - PORT=4000
  - TZ=America/New_York (or your timezone)
  - Optional Canvas:
    - CANVAS_BASE_URL=https://your-school.instructure.com
    - CANVAS_ACCESS_TOKEN=your_canvas_token_here

2) Default schedule config
- On first run, backend will create backend/data/config.json from backend/data/config.example.json.
- Edit backend/data/config.example.json before first run to set your manual schedule, or update later via POST /api/config.

3) Build and run (Docker)
- docker compose up -d --build
- Frontend: http://localhost:5173
- Backend:  http://localhost:4000

4) Canvas sync (optional)
- Put your Canvas base URL and access token in backend/.env.
- POST to http://localhost:4000/api/sync/canvas to import courses. If Canvas doesn’t provide meeting times/rooms, add them manually later.

API (backend)
- GET /api/health          -> { ok }
- GET /api/config          -> current config (matches the schema below)
- POST /api/config         -> replace config (send full JSON)
- GET /api/next            -> next upcoming meeting { next: {...} }
- GET /api/today           -> today’s meetings
- POST /api/sync/canvas    -> import courses from Canvas using env values

Config schema (subset)
- data_source.mode: "manual" | "canvas"
- manual.timezone: IANA timezone (e.g., America/New_York)
- courses[] with meetings[] weekday/start/end and location fields

Minimal example config
See backend/data/config.example.json for a ready-to-use example you can adjust.

Local development (optional)
- You can also run services locally:
  - Backend: cd backend && npm install && npm run dev
  - Frontend: cd frontend && npm install && npm run dev

Notes
- Frontend shows:
  - Big “Next class in X min” card
  - Today list with time, code, room and a map pin
  - Week timeline with pill blocks per course
- Nginx proxies /api/* to the backend when using Docker.

