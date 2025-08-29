import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { Config, ConfigSchema } from './types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const EXAMPLE_PATH = path.join(DATA_DIR, 'config.example.json');

export function ensureConfig(): Config {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(CONFIG_PATH)) {
    const example = fs.existsSync(EXAMPLE_PATH)
      ? fs.readFileSync(EXAMPLE_PATH, 'utf-8')
      : JSON.stringify(defaultConfig(), null, 2);
    fs.writeFileSync(CONFIG_PATH, example);
  }
  return readConfig();
}

export function readConfig(): Config {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const json = JSON.parse(raw);
  const parsed = ConfigSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('Invalid config: ' + parsed.error.toString());
  }
  return parsed.data;
}

export function writeConfig(cfg: Config) {
  const parsed = ConfigSchema.parse(cfg);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(parsed, null, 2));
}

function defaultConfig(): Config {
  return {
    data_source: {
      mode: 'manual',
      manual: { timezone: process.env.TZ || 'America/New_York' }
    },
    profile: {
      student_name: 'Student',
      school_name: '',
      semester: '',
      week_start: 'monday'
    },
    courses: [],
    notifications: {
      enabled: true,
      reminders: [{ type: 'before_class', minutes: 15 }],
      quiet_hours: { enabled: false }
    },
    ui: {
      theme: 'system',
      home_layout: { sections: ['next_class','today_overview','week_timeline'] },
      show_map_links: true,
      show_instructor: true
    },
    shortcuts: {
      quick_actions: [{ id: 'open_next_class_map', label: 'Open Map', action: 'map:next' }]
    }
  };
}

