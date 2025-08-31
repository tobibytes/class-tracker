import React, { useEffect, useMemo, useState } from 'react';
import { getNext, getToday, getConfig, canvasImport, computeNext, computeToday } from './api';
import NextCard from './components/NextCard';
import TodayList from './components/TodayList';
import WeekTimeline from './components/WeekTimeline';
import SettingsModal from './components/SettingsModal';
import MissingMeetings from './components/MissingMeetings';
import { getLocal, setLocal, removeLocal } from './hooks/useLocalStorage';
import { Analytics } from "@vercel/analytics/react"
export default function App() {
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showSettings, setShowSettings] = useState(false);

  const [baseUrl, setBaseUrl] = useState<string>(localStorage.getItem('canvas_base_url') || '');
  const [token, setToken] = useState<string>(localStorage.getItem('canvas_token') || '');
  const [timezone, setTimezone] = useState<string>(localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  // Courses and local meeting overrides
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
    if (hasCanvas) {
      if (courses.length === 0) {
        canvasImport(baseUrl, token)
          .then(({ courses }) => {
            setCourses(courses);
            setLocal('courses_cache', courses);
          })
          .catch((e) => setError(e.message));
      } else {
        const { next, today } = computeLocalSchedule(mergedCourses);
        setNextInfo(next);
        setTodayInfo(today);
      }
    } else {
      if (courses.length > 0) {
        const { next, today } = computeLocalSchedule(mergedCourses);
        setNextInfo(next);
        setTodayInfo(today);
      } else {
        Promise.all([getNext(), getToday(), getConfig()]).then(([n, t, c]) => {
          setNextInfo(n);
          setTodayInfo(t);
          setCourses(c.courses || []);
          setLocal('courses_cache', c.courses || []);
        }).catch((e) => setError(e.message));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCanvas, courses, mergedCourses]);

  // Recompute next/today when ephemeralConfig changes in Canvas mode
  useEffect(() => {
    if (!hasCanvas) return;

    // Show local schedule immediately if we have cached courses
    if (mergedCourses.length > 0) {
      const { next, today } = computeLocalSchedule(mergedCourses);
      setNextInfo(next);
      setTodayInfo(today);
    }

    // Then try server compute; only overwrite if server returns a value
    Promise.all([computeNext(ephemeralConfig), computeToday(ephemeralConfig)])
      .then(([n, t]) => {
        if (n && (n as any).next) setNextInfo(n);
        if (t && Array.isArray((t as any).items)) setTodayInfo(t);
      })
      .catch((e) => setError(e.message));
  }, [hasCanvas, ephemeralConfig, mergedCourses]);

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

      {error && <div className="error">You are Offline </div>}

      {nextInfo?.next && <NextCard next={nextInfo.next} />}
      {todayInfo?.items && <TodayList items={todayInfo.items} />}
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

