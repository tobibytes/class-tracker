import React, { useState } from 'react';
import { setLocal, getLocal } from '../hooks/useLocalStorage';

export default function SettingsModal({ open, onClose, onSaved, courses = [], titleOverrides = {}, onTitlesSaved }: { open: boolean; onClose: () => void; onSaved: (vals: { base_url: string; access_token: string; timezone: string }) => void; courses?: any[]; titleOverrides?: Record<string, string>; onTitlesSaved: (titles: Record<string, string>) => void }) {
  const DEFAULT_CANVAS_BASE_URL = (import.meta.env.VITE_DEFAULT_CANVAS_BASE_URL as string) || 'https://morganstate.instructure.com';
  const [baseUrl, setBaseUrl] = useState<string>(getLocal<string>('canvas_base_url', DEFAULT_CANVAS_BASE_URL));
  const [token, setToken] = useState<string>(getLocal<string>('canvas_token', ''));
  const [tz, setTz] = useState<string>(getLocal<string>('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'));
  const [titles, setTitles] = useState<Record<string, string>>(getLocal<Record<string, string>>('title_overrides', titleOverrides || {}));
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  if (!open) return null;

  const save = () => {
    const sanitize = (s: string) => (s || '').trim().replace(/^"+|"+$/g, '');
    const b = sanitize(baseUrl);
    const t = sanitize(token);
    const tzSan = sanitize(tz);
    setLocal('canvas_base_url', b);
    setLocal('canvas_token', t);
    setLocal('timezone', tzSan);
    onSaved({ base_url: b, access_token: t, timezone: tzSan });
  };

  const setTitle = (courseId: string, name: string) => {
    const next = { ...(titles || {}), [courseId]: name };
    setTitles(next);
    setLocal('title_overrides', next);
    onTitlesSaved(next);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Connect Canvas</h3>
        <label>
          Access Token
          <input type="password" placeholder="Canvas API token" value={token} onChange={e => setToken(e.target.value)} title="Stored only in your browser and used to fetch your courses" />
        </label>

        <details style={{ marginBottom: 8 }}>
          <summary>How to get your Canvas token</summary>
          <ol style={{ margin: '8px 16px' }}>
            <li>Open Canvas and log in.</li>
            <li>Go to Account → Settings.</li>
            <li>Click New Access Token → Create Token.</li>
            <li>Copy the token and paste it here.</li>
          </ol>
        </details>

        <button className="link" type="button" onClick={() => setShowAdvanced(!showAdvanced)} title="Show advanced connection options">
          {showAdvanced ? 'Hide advanced' : 'Show advanced'}
        </button>

        {showAdvanced && (
          <>
            <label>
              Canvas Base URL
              <input placeholder="https://your-school.instructure.com" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} title="Your Canvas site URL, e.g., https://morganstate.instructure.com" />
            </label>
            <label>
              Timezone
              <input placeholder="America/New_York" value={tz} onChange={e => setTz(e.target.value)} title="IANA timezone, e.g., America/New_York" />
            </label>
          </>
        )}

        {Array.isArray(courses) && courses.length > 0 && (
          <div className="manage-courses" style={{ marginTop: 16 }}>
            <h4>Manage Courses</h4>
            <small style={{ display: 'block', marginBottom: 8, opacity: 0.8 }}>Rename how courses appear in the app.</small>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {courses.map((c: any) => (
                <li key={c.course_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="pill" style={{ backgroundColor: c.color || '#999' }} />
                  <code style={{ opacity: 0.8 }}>{c.code}</code>
                  <input
                    style={{ flex: 1 }}
                    placeholder="Display name (e.g., Operating Systems)"
                    value={(titles && titles[c.course_id]) || c.title || ''}
                    onChange={(e) => setTitle(c.course_id, e.target.value)}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
          <button onClick={save} disabled={!baseUrl || !token}>Save</button>
        </div>
        <p className="hint">Your token is kept in your browser and sent only to this server to fetch your courses. It is not stored on the server.</p>
      </div>
    </div>
  );
}

