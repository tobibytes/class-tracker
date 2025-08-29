import React from 'react';

const days = ['mon','tue','wed','thu','fri','sat','sun'];

export default function WeekTimeline({ config }: { config: any }) {
  const courses = config.courses || [];
  const byDay: Record<string, any[]> = Object.fromEntries(days.map(d => [d, []]));

  for (const c of courses) {
    for (const m of c.meetings || []) {
      byDay[m.weekday].push({ ...m, course: c });
    }
  }
  for (const d of days) {
    byDay[d].sort((a, b) => a.start.localeCompare(b.start));
  }

  return (
    <section>
      <h3>Week</h3>
      <div className="week">
        {days.map(d => (
          <div className="day" key={d}>
            <div className="day-label">{d.toUpperCase()}</div>
            <div className="day-items">
              {byDay[d].map((m, idx) => (
                <div className="pill-item" style={{ backgroundColor: m.course.color || '#ccc' }} key={idx} title={`${m.course.code} • ${m.course.title} ${m.start}-${m.end}`}>
                  <span className="pill-text">{m.course.code}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

