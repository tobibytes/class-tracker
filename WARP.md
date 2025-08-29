# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Monorepo with a Node/Express + TypeScript backend and a React + Vite frontend.
- Goal: show the next class, today’s schedule, and a weekly timeline. Supports two modes:
  - Server-managed config (persisted JSON on disk)
  - Client-ephemeral config built from Canvas imports and local overrides (kept in browser storage)

Commands you’ll use often
- Backend (local dev)
  - cd backend && npm install && cp .env.example .env && npm run dev
  - Env: PORT (default 4000), TZ, optional CANVAS_BASE_URL, CANVAS_ACCESS_TOKEN
  - First run creates backend/data/config.json from backend/data/config.example.json
- Backend (build + start)
  - cd backend && npm install && npm run build && npm run start
- Frontend (local dev)
  - cd frontend && npm install && npm run dev
  - Calls backend directly using VITE_API_BASE_URL (default http://localhost:4000); no Vite proxy
- Frontend (build + preview)
  - cd frontend && npm run build && npm run preview
- Docker (compose)
  - docker compose up -d --build
  - Note: current docker-compose.yml starts only the backend on 4000 and persists /app/data
- Quick API checks
  - Health: curl -s http://localhost:4000/api/health | jq
  - Next (deterministic time): curl -s "http://localhost:4000/api/next?now=2025-01-15T09:00:00-05:00" | jq
  - Today (deterministic time): curl -s "http://localhost:4000/api/today?now=2025-01-15T09:00:00-05:00" | jq
- Lint/tests
  - No lint or test scripts are configured in package.json files at this time

High-level architecture and flow
- Backend (backend/)
  - Entry point: src/index.ts
    - Endpoints:
      - GET /api/health → basic uptime
      - GET /api/config → read global config JSON
      - POST /api/config → validate+write global config (zod schema)
      - GET /api/next → compute next meeting (optional now=ISO for deterministic checks)
      - GET /api/today → compute today’s meetings (optional now=ISO)
      - POST /api/canvas/import → stateless Canvas fetch (client supplies base_url and token); returns course shells (no meeting times)
      - POST /api/compute/next, /api/compute/today → compute from client-provided ephemeral config (not persisted)
      - POST /api/sync/canvas → legacy env-based Canvas sync; writes courses into global config and switches mode to "canvas"
    - Middleware: CORS enabled; JSON body size limit 1mb; morgan for logging
  - Configuration persistence: src/config.ts
    - ensureConfig() creates backend/data/config.json (from config.example.json or a sensible default) and returns parsed config
    - readConfig()/writeConfig() wrap filesystem read/write with zod validation
    - On Docker, docker-compose mounts a named volume at /app/data to persist config.json
  - Scheduling: src/schedule.ts (Luxon)
    - Computes next meeting and today’s meetings using timezone precedence: config.data_source.manual.timezone → process.env.TZ → 'UTC'
    - Produces structured objects consumed by the frontend (start/end ISO strings, status, minutes_until)
  - Canvas integration: src/canvas.ts
    - fetchCanvasCourses() hits Canvas /api/v1/courses with a Bearer token; maps results to internal Course objects (no times by default)
  - Types and validation: src/types.ts (zod)
    - ConfigSchema composes DataSource, Course, Meeting, Location, Notifications, UI, Shortcuts
    - Weekdays mapping (mon..sun → 1..7) drives schedule arithmetic

- Frontend (frontend/)
  - Vite React app. Dev server on 5173
  - API layer (src/api.ts): calls backend directly using import.meta.env.VITE_API_BASE_URL (defaults to http://localhost:4000)
  - App flow (src/App.tsx):
    - If Canvas creds exist in localStorage: import courses via /api/canvas/import and keep them in local cache; build an ephemeral config and compute next/today via /api/compute/*
    - If no Canvas creds: fall back to server global config via GET /api/config, /api/next, /api/today
    - UI: NextCard (next class card), TodayList (today’s meetings), WeekTimeline (weekly pills), SettingsModal (stores Canvas creds + timezone), MissingMeetings (let users add times/rooms to Canvas courses; overrides saved to localStorage)
  - PWA bits: public/manifest.webmanifest, public/sw.js with a tiny cache for index.html and static assets

Environment and ports
- Backend: http://localhost:4000 (PORT configurable via backend/.env)
- Frontend (dev): http://localhost:5173 (strict port, proxy /api → 4000)

Notes specific to this repo
- The docker-compose.yml currently defines only the backend service. Use Vite dev (npm run dev in frontend) for the UI; no Nginx is required.
- Timezone selection affects schedule computation. In client-ephemeral mode, timezone is stored in localStorage and included in the ephemeral config; in server-managed mode, TZ or config.data_source.manual.timezone applies.

