import React, { useEffect, useMemo, useState } from 'react';
import { getNext, getToday, getConfig, canvasImport, computeNext, computeToday } from './api';
import NextCard from './components/NextCard';
import TodayList from './components/TodayList';
import WeekTimeline from './components/WeekTimeline';
import SettingsModal from './components/SettingsModal';
import MissingMeetings from './components/MissingMeetings';
import { getLocal, setLocal, removeLocal } from './hooks/useLocalStorage';
import { Analytics } from "@vercel/analytics/next"
export default function App() {
  const [error, setError] = useState<string | null>(null);
  console.log(`backend: ${import.meta.env.VITE_API_BASE_URL}`);

  // UI state
  const [showSettings, setShowSettings] = useState(false);

  const [baseUrl, setBaseUrl] = useState<string>(localStorage.getItem('canvas_base_url') || '');
  const [token, setToken] = useState<string>(localStorage.getItem('canvas_token') || '');
  const [timezone, setTimezone] = useState<string>(localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  // Courses and local meeting overrides
  const [courses, setCourses] = useState<any[]>(getLocal('courses_cache', [] as any[]));
  const [meetingOverrides, setMeetingOverrides] = useState<Record<string, any[]>>(getLocal('meeting_overrides', {}));

  const hasCanvas = !!baseUrl && !!token;
  const mergedCourses = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    return courses.map((c: any) => ({
      ...c,
      meetings: (meetingOverrides[c.course_id] && meetingOverrides[c.course_id].length > 0) ? meetingOverrides[c.course_id] : (c.meetings || [])
    }));
  }, [courses, meetingOverrides]);

  // Ephemeral config built per user in browser
  const ephemeralConfig = useMemo(() => ({
    data_source: { mode: hasCanvas ? 'canvas' : 'manual', manual: { timezone } },
    profile: { student_name: 'Student', school_name: '', semester: '', week_start: 'monday' },
    courses: mergedCourses,
    notifications: { enabled: true, reminders: [{ type: 'before_class', minutes: 15 }], quiet_hours: { enabled: false } },
    ui: { theme: 'system', home_layout: { sections: ['next_class','today_overview','week_timeline'] }, show_map_links: true, show_instructor: true },
    shortcuts: { quick_actions: [{ id: 'open_next_class_map', label: 'Open Map', action: 'map:next' }] }
  }), [hasCanvas, mergedCourses, timezone]);

  const [nextInfo, setNextInfo] = useState<any>(null);
  const [todayInfo, setTodayInfo] = useState<any>(null);

  useEffect(() => {
    setError(null);
    if (hasCanvas) {
      // If we have creds but no courses cached, import from Canvas
      if (courses.length === 0) {
        canvasImport(baseUrl, token)
          .then(({ courses }) => {
            setCourses(courses);
            setLocal('courses_cache', courses);
          })
          .catch((e) => setError(e.message));
      }
    } else {
      // Fallback to server global config (single-user mode)
      Promise.all([getNext(), getToday(), getConfig()]).then(([n, t, c]) => {
        setNextInfo(n);
        setTodayInfo(t);
        // Also keep ephemeral config so WeekTimeline shows something
        setCourses(c.courses || []);
      }).catch((e) => setError(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCanvas]);

  // Recompute next/today when ephemeralConfig changes in Canvas mode
  useEffect(() => {
    if (hasCanvas) {
      Promise.all([computeNext(ephemeralConfig), computeToday(ephemeralConfig)])
        .then(([n, t]) => { setNextInfo(n); setTodayInfo(t); })
        .catch((e) => setError(e.message));
    }
  }, [hasCanvas, ephemeralConfig]);

  const onSettingsSaved = ({ base_url, access_token, timezone: tz }: any) => {
    setBaseUrl(base_url);
    setToken(access_token);
    setTimezone(tz);
    setShowSettings(false);
  };

  const onOverridesSaved = (overrides: Record<string, any[]>) => {
    setMeetingOverrides(overrides);
  };

  const disconnect = () => {
    removeLocal('canvas_base_url');
    removeLocal('canvas_token');
    removeLocal('courses_cache');
    removeLocal('meeting_overrides');
    setBaseUrl('');
    setToken('');
    setCourses([]);
    setMeetingOverrides({});
  };

  return (
    <div className="container">
      <Analytics />
      <header>
        <h1>Class Tracker</h1>
        <div style={{ marginLeft: 'auto' }}>
          {hasCanvas ? (
            <>
              <button onClick={() => setShowSettings(true)} className="link">Settings</button>
              <button onClick={disconnect} className="link" style={{ marginLeft: 8 }}>Disconnect</button>
            </>
          ) : (
            <button onClick={() => setShowSettings(true)}>Connect Canvas</button>
          )}
        </div>
      </header>

      {error && <div className="error">Error: {error}</div>}

      {nextInfo?.next && <NextCard next={nextInfo.next} />}
      {todayInfo?.items && <TodayList items={todayInfo.items} />}
      <WeekTimeline config={{ courses: mergedCourses }} />

      {hasCanvas && mergedCourses.some((c: any) => (c.meetings || []).length === 0) && (
        <MissingMeetings courses={mergedCourses} onSaved={onOverridesSaved} />
      )}

      <footer>
        <small>Timezone: {timezone}</small>
      </footer>

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSaved={onSettingsSaved}
      />
    </div>
  );
}

