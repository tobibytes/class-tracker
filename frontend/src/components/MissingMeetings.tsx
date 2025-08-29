import React, { useState } from 'react';
import { setLocal, getLocal } from '../hooks/useLocalStorage';

const days = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' }
];

export default function MissingMeetings({ courses, onSaved, titleOverrides, onTitlesSaved }: { courses: any[]; onSaved: (overrides: Record<string, any[]>) => void; titleOverrides: Record<string, string>; onTitlesSaved: (titles: Record<string, string>) => void }) {
  // overrides: { [course_id]: meetings[] }
  const initial = getLocal<Record<string, any[]>>('meeting_overrides', {});
  const [overrides, setOverrides] = useState<Record<string, any[]>>(initial);

  const initialTitles = getLocal<Record<string, string>>('title_overrides', titleOverrides || {});
  const [titles, setTitles] = useState<Record<string, string>>(initialTitles);

  const [collapsed, setCollapsed] = useState<boolean>(getLocal<boolean>('missing_meetings_collapsed', false));

  const setCourseMeetings = (courseId: string, meetings: any[]) => {
    const next = { ...overrides, [courseId]: meetings };
    setOverrides(next);
    setLocal('meeting_overrides', next);
  };

  const saveAll = () => onSaved(overrides);

  const setTitle = (courseId: string, name: string) => {
    const next = { ...titles, [courseId]: name };
    setTitles(next);
    setLocal('title_overrides', next);
    onTitlesSaved(next);
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    setLocal('missing_meetings_collapsed', next);
  };

  return (
    <section>
      <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Fill missing times</span>
        <button className="link" onClick={toggleCollapsed} title="Hide or show this panel">{collapsed ? 'Expand' : 'Collapse'}</button>
      </h3>
      <small style={{ display: collapsed ? 'none' : 'block', marginBottom: 8, opacity: 0.8 }}>Canvas courses often lack times. Add days and times for each course.</small>

      {!collapsed && (
        <>
          {courses.filter(c => (c.meetings || []).length === 0).map((c) => (
            <CourseEditor
              key={c.course_id}
              course={{ ...c, title: titles[c.course_id] || c.title }}
              meetings={overrides[c.course_id] || []}
              onChange={(m) => setCourseMeetings(c.course_id, m)}
              onTitleChange={(name) => setTitle(c.course_id, name)}
            />
          ))}
          <div style={{ marginTop: 8 }}>
            <button onClick={saveAll} title="Save overrides in your browser">Save Schedule</button>
          </div>
        </>
      )}
    </section>
  );
}

function CourseEditor({ course, meetings, onChange, onTitleChange }: { course: any; meetings: any[]; onChange: (meetings: any[]) => void; onTitleChange: (name: string) => void }) {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:15');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');

  const toggleDay = (key: string) => {
    setSelectedDays((ds) => (ds.includes(key) ? ds.filter(d => d !== key) : [...ds, key]));
  };

  const addMeetings = () => {
    const loc = building || room ? { campus: '', building, room, map_url: null } : null;
    const newMs = selectedDays.map((d) => ({ weekday: d, start, end, location_override: loc }));
    onChange([...(meetings || []), ...newMs]);
    setSelectedDays([]);
  };

  const removeMeeting = (idx: number) => {
    const next = [...meetings];
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div className="editor">
      <div className="editor-title">{course.code} • {course.title}</div>
      <div className="editor-row">
        <input placeholder="Display name (e.g., Operating Systems)" value={course.title} onChange={e => onTitleChange(e.target.value)} style={{ minWidth: 240, marginRight: 8 }} title="Give this course a friendlier name" />
        <div className="days">
          {days.map(d => (
            <button type="button" key={d.key} className={selectedDays.includes(d.key) ? 'day-btn active' : 'day-btn'} onClick={() => toggleDay(d.key)} title="Toggle this day">{d.label}</button>
          ))}
        </div>
        <input type="time" value={start} onChange={e => setStart(e.target.value)} title="Start time" />
        <span>–</span>
        <input type="time" value={end} onChange={e => setEnd(e.target.value)} title="End time" />
        <input placeholder="Building" value={building} onChange={e => setBuilding(e.target.value)} title="Optional building" />
        <input placeholder="Room" value={room} onChange={e => setRoom(e.target.value)} title="Optional room" />
        <button onClick={addMeetings} disabled={selectedDays.length === 0} title="Add meetings for selected days">Add</button>
      </div>
      <ul className="meeting-list">
        {(meetings || []).map((m, idx) => (
          <li key={idx}>
            <span className="pill" style={{ backgroundColor: course.color || '#999' }} />
            <span>{m.weekday.toUpperCase()} {m.start}–{m.end}</span>
            {(m.location_override?.building || m.location_override?.room) && (
              <span> @ {m.location_override?.building || ''} {m.location_override?.room || ''}</span>
            )}
            <button onClick={() => removeMeeting(idx)} className="link">remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

