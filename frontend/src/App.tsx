import React, { useEffect, useMemo, useState } from 'react';
import { getNext, getToday, getConfig, canvasImport, computeNext, computeToday } from './api';
import NextCard from './components/NextCard';
import TodayList from './components/TodayList';
import WeekTimeline from './components/WeekTimeline';
import SettingsModal from './components/SettingsModal';
import MissingMeetings from './components/MissingMeetings';
import { getLocal, setLocal, removeLocal } from './hooks/useLocalStorage';

export default function App() {
  const [error, setError] = useState<string | null>(null);
  console.log(`backend: ${import.meta.env.VITE_API_BASE_URL}`);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !getLocal<boolean>('onboarding_dismissed', false));
  const dismissOnboarding = () => { setLocal('onboarding_dismissed', true); setShowOnboarding(false); };
  const [offline, setOffline] = useState<boolean>(() => !navigator.onLine);

  const DEFAULT_CANVAS_BASE_URL = (import.meta.env.VITE_DEFAULT_CANVAS_BASE_URL as string) || 'https://morganstate.instructure.com';
  const sanitize = (s: string) => (s || '').trim().replace(/^"+|"+$/g, '');
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    const v = getLocal<string>('canvas_base_url', '');
    const sanitized = sanitize(v);
    return sanitized || DEFAULT_CANVAS_BASE_URL;
  });
  const [token, setToken] = useState<string>(() => sanitize(getLocal<string>('canvas_token', '')));
  const [timezone, setTimezone] = useState<string>(() => {
    const tz = sanitize(getLocal<string>('timezone', '')) || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    return tz;
  });

  // Courses and local overrides
  const [courses, setCourses] = useState<any[]>(getLocal('courses_cache', [] as any[]));
  const [meetingOverrides, setMeetingOverrides] = useState<Record<string, any[]>>(getLocal('meeting_overrides', {}));
  const [titleOverrides, setTitleOverrides] = useState<Record<string, string>>(getLocal('title_overrides', {}));

  const hasCanvas = !!baseUrl && !!token;
  const mergedCourses = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    return courses.map((c: any) => ({
      ...c,
      title: titleOverrides[c.course_id] ? titleOverrides[c.course_id] : c.title,
      meetings: (meetingOverrides[c.course_id] && meetingOverrides[c.course_id].length > 0) ? meetingOverrides[c.course_id] : (c.meetings || [])
    }));
  }, [courses, meetingOverrides, titleOverrides]);

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
    if (offline) {
      // Compute from local cache when offline
      const { next, today } = computeLocalSchedule(mergedCourses);
      setNextInfo(next);
      setTodayInfo(today);
      return;
    }

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
        // Also keep ephemeral config and cache courses for offline use
        setCourses(c.courses || []);
        setLocal('courses_cache', c.courses || []);
      }).catch((e) => setError(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCanvas, offline]);

  // Recompute next/today when ephemeralConfig changes in Canvas mode
  useEffect(() => {
    if (hasCanvas) {
      Promise.all([computeNext(ephemeralConfig), computeToday(ephemeralConfig)])
        .then(([n, t]) => { setNextInfo(n); setTodayInfo(t); })
        .catch((e) => setError(e.message));
    }
  }, [hasCanvas, ephemeralConfig]);

  // Periodic refresh to keep data fresh while the app is open
  useEffect(() => {
    const refresh = () => {
      if (offline) {
        const { next, today } = computeLocalSchedule(mergedCourses);
        setNextInfo(next);
        setTodayInfo(today);
        return;
      }
      if (hasCanvas) {
        Promise.all([computeNext(ephemeralConfig), computeToday(ephemeralConfig)])
          .then(([n, t]) => { setNextInfo(n); setTodayInfo(t); })
          .catch((e) => setError(e.message));
      } else {
        Promise.all([getNext(), getToday()])
          .then(([n, t]) => { setNextInfo(n); setTodayInfo(t); })
          .catch((e) => setError(e.message));
      }
    };
    const id = window.setInterval(refresh, 30000); // 30s
    return () => window.clearInterval(id);
  }, [hasCanvas, ephemeralConfig, offline, mergedCourses]);

  // Manual refresh
  const refreshNow = () => {
    setError(null);
    if (offline) {
      const { next, today } = computeLocalSchedule(mergedCourses);
      setNextInfo(next);
      setTodayInfo(today);
      return;
    }
    if (hasCanvas) {
      Promise.all([computeNext(ephemeralConfig), computeToday(ephemeralConfig)])
        .then(([n, t]) => { setNextInfo(n); setTodayInfo(t); })
        .catch((e) => setError(e.message));
    } else {
      Promise.all([getNext(), getToday()])
        .then(([n, t]) => { setNextInfo(n); setTodayInfo(t); })
        .catch((e) => setError(e.message));
    }
  };

  const onSettingsSaved = ({ base_url, access_token, timezone: tz }: any) => {
    setBaseUrl(base_url);
    setToken(access_token);
    setTimezone(tz);
    setShowSettings(false);
  };

  const onOverridesSaved = (overrides: Record<string, any[]>) => {
    setMeetingOverrides(overrides);
  };

  const onTitlesSaved = (titles: Record<string, string>) => {
    setTitleOverrides(titles);
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

  // Track online/offline
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Local schedule computation (device timezone)
  function computeLocalSchedule(localCourses: any[]) {
    const now = new Date();
    const dayIdx = now.getDay(); // 0..6 (Sun..Sat)
    const map: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

    type MI = { course: any; start: Date; end: Date; location: any };
    const list: MI[] = [];
    for (const c of localCourses || []) {
      for (const m of c.meetings || []) {
        const target = map[m.weekday];
        if (typeof target !== 'number') continue;
        for (let add = 0; add < 7; add++) {
          const d = new Date(now);
          const diff = (target - dayIdx + 7 + add) % 7;
          d.setDate(now.getDate() + diff);
          const [sh, sm] = String(m.start || '00:00').split(':').map((x: string) => parseInt(x, 10));
          const [eh, em] = String(m.end || '00:00').split(':').map((x: string) => parseInt(x, 10));
          const s = new Date(d); s.setHours(sh || 0, sm || 0, 0, 0);
          const e = new Date(d); e.setHours(eh || 0, em || 0, 0, 0);
          const loc = m.location_override ?? c.location_default ?? null;
          if (e <= now && add === 0) continue;
          list.push({ course: c, start: s, end: e, location: loc });
          break;
        }
      }
    }
    list.sort((a, b) => a.start.getTime() - b.start.getTime());

    const nextMI = list.find(mi => mi.end > now) || null;
    let next: any = null;
    if (nextMI) {
      const minutes_until = Math.max(0, Math.round((nextMI.start.getTime() - now.getTime()) / 60000));
      const status: 'upcoming' | 'in_progress' = (now >= nextMI.start && now < nextMI.end) ? 'in_progress' : 'upcoming';
      next = {
        now: now.toISOString(),
        next: {
          course_id: nextMI.course.course_id,
          course_code: nextMI.course.code,
          course_title: nextMI.course.title,
          color: nextMI.course.color,
          start: nextMI.start.toISOString(),
          end: nextMI.end.toISOString(),
          location: nextMI.location,
          instructors: nextMI.course.instructors,
          minutes_until,
          status
        }
      };
    }

    const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(now); endOfDay.setHours(23,59,59,999);
    const todayItems = list
      .filter(mi => mi.start >= startOfDay && mi.start <= endOfDay)
      .map(mi => ({
        course_id: mi.course.course_id,
        course_code: mi.course.code,
        course_title: mi.course.title,
        color: mi.course.color,
        start: mi.start.toISOString(),
        end: mi.end.toISOString(),
        location: mi.location,
        instructors: mi.course.instructors
      }))
      .sort((a, b) => (a.start < b.start ? -1 : 1));

    return { next, today: { now: now.toISOString(), items: todayItems } };
  }

  return (
    <div className="container">
      <header>
        <h1>Class Tracker</h1>
        <div style={{ marginLeft: 'auto' }}>
          {hasCanvas ? (
            <>
              <button onClick={refreshNow} className="link" title="Reload schedule now">Refresh</button>
              <button onClick={() => setShowSettings(true)} className="link" style={{ marginLeft: 8 }} title="Open settings to manage Canvas and preferences">Settings</button>
              <button onClick={disconnect} className="link" style={{ marginLeft: 8 }} title="Remove saved Canvas credentials and local data">Disconnect</button>
            </>
          ) : (
            <>
              <button onClick={refreshNow} className="link" title="Reload schedule now">Refresh</button>
              <button onClick={() => setShowSettings(true)} className="link" style={{ marginLeft: 8 }} title="Add your Canvas base URL and token to import your courses">Connect Canvas</button>
            </>
          )}
        </div>
      </header>

      {showOnboarding && mergedCourses.length === 0 && (
        <div className="tip" role="note" style={{ margin: '8px 0' }}>
          Tip: Connect Canvas in Settings to import courses; then rename classes and fill in missing times.
          <button className="link" onClick={dismissOnboarding} style={{ marginLeft: 8 }} title="Dismiss this tip">Got it</button>
        </div>
      )}

      {offline && (
        <div className="offline" role="status" title="You’re offline — showing cached data">Offline mode: showing cached schedule</div>
      )}

      {error && <div className="error">Error: {error}</div>}

      {mergedCourses.length === 0 && (
        <section className="empty">
          <p>No courses yet. Connect Canvas to import your schedule.</p>
          <button onClick={() => setShowSettings(true)} title="Add your Canvas base URL and token">Connect Canvas</button>
        </section>
      )}

      {nextInfo?.next && <NextCard next={nextInfo.next} />}
      {Array.isArray(todayInfo?.items) && todayInfo.items.length > 0 && <TodayList items={todayInfo.items} />}
      <WeekTimeline config={{ courses: mergedCourses }} />

      {hasCanvas && mergedCourses.some((c: any) => (c.meetings || []).length === 0) && (
        <MissingMeetings courses={mergedCourses} onSaved={onOverridesSaved} titleOverrides={titleOverrides} onTitlesSaved={onTitlesSaved} />
      )}

      <footer>
        <small>Timezone: {timezone}</small>
      </footer>

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSaved={onSettingsSaved}
        courses={mergedCourses}
        titleOverrides={titleOverrides}
        onTitlesSaved={onTitlesSaved}
      />
    </div>
  );
}

