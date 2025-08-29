import React from 'react';

type Item = {
  course_code: string;
  course_title: string;
  start: string;
  end: string;
  color?: string;
  location?: { building?: string; room?: string; map_url?: string | null } | null;
};

export default function TodayList({ items }: { items: Item[] }) {
  return (
    <section>
      <h3>Today</h3>
      <ul className="today-list">
        {items.map((it, idx) => {
          const start = new Date(it.start);
          const time = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const room = it.location && (it.location.building || it.location.room) ? `${it.location.building || ''} ${it.location.room || ''}`.trim() : '';
          return (
            <li key={idx} className="today-item">
              <span className="pill" style={{ backgroundColor: it.color || '#999' }} />
              <span className="time">{time}</span>
              <span className="code">{it.course_code}</span>
              <span className="title">{it.course_title}</span>
              <span className="room">{room}</span>
              {it.location?.map_url && (
                <a className="map-pin" href={it.location.map_url} target="_blank" rel="noreferrer" title="Open map">📍</a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

