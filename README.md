Class Tracker

Overview
- A simple app that tells you your next class, time, and where it is.
- Manual mode or Canvas mode (via REST API, access token from .env).
- React + Vite frontend (dev) and Node + Express + TypeScript backend. Docker compose runs only the backend.

Quick start
1) Backend env
- Copy backend/.env.example to backend/.env and fill values:
  - PORT=4000
  - TZ=America/New_York (or your timezone)
  - Optional Canvas:
    - CANVAS_BASE_URL=https://your-school.instructure.com
    - CANVAS_ACCESS_TOKEN=your_canvas_token_here

2) Default schedule config (blank)
- On first run, backend creates backend/data/config.json from backend/data/config.example.json with an empty courses list.
- Connect Canvas to import your courses, or POST a manual config later via /api/config.

3) Run the app (local dev)
- Backend:  cd backend && npm install && npm run dev  (http://localhost:4000)
- Frontend: cd frontend && npm install && npm run dev (http://localhost:5173)
- The frontend calls the backend directly via VITE_API_BASE_URL (default http://localhost:4000).

4) Docker (backend only)
- docker compose up -d --build
- Backend:  http://localhost:4000
- Use Vite dev (npm run dev in frontend) for the UI.

5) Canvas sync (optional)
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
See backend/data/config.example.json (blank by default).

Local development
- Backend: cd backend && npm install && npm run dev
- Frontend: cd frontend && npm install && npm run dev

Notes
- Frontend shows:
  - Big “Next class in X min” card
  - Today list with time, code, title, room and a map pin
  - Week timeline with pill blocks per course
- The default schedule is empty; connect Canvas from the UI Settings to import courses.

