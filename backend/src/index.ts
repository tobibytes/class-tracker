import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { ensureConfig, readConfig, writeConfig } from './config.js';
import { ConfigSchema } from './types.js';
import { getNextMeeting, getTodayMeetings } from './schedule.js';
import { fetchCanvasCourses } from './canvas.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);

ensureConfig();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get('/api/config', (_req, res) => {
  try {
    const cfg = readConfig();
    res.json(cfg);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const parsed = ConfigSchema.parse(req.body);
    writeConfig(parsed);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/next', (req, res) => {
  try {
    const cfg = readConfig();
    const now = typeof req.query.now === 'string' ? req.query.now : undefined;
    const result = getNextMeeting(cfg, now);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/today', (req, res) => {
  try {
    const cfg = readConfig();
    const now = typeof req.query.now === 'string' ? req.query.now : undefined;
    const result = getTodayMeetings(cfg, now);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/sync/canvas', async (_req, res) => {
  try {
    const base = process.env.CANVAS_BASE_URL;
    const token = process.env.CANVAS_ACCESS_TOKEN;
    if (!base || !token) {
      return res.status(400).json({ error: 'CANVAS_BASE_URL and CANVAS_ACCESS_TOKEN must be set in backend/.env' });
    }
    const cfg = readConfig();
    const courses = await fetchCanvasCourses(base, token);
    const newCfg = {
      ...cfg,
      data_source: {
        mode: 'canvas',
        canvas: {
          base_url: base,
          sync: { courses: true, assignments: false, locations: false }
        }
      },
      courses
    };
    writeConfig(newCfg as any);
    res.json({ ok: true, imported: courses.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend listening on http://0.0.0.0:${PORT}`);
});

