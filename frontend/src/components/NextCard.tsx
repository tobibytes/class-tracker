import React from 'react';

type Props = {
  next: {
    course_code: string;
    course_title: string;
    start: string;
    end: string;
    color?: string;
    minutes_until: number;
    status: 'upcoming' | 'in_progress';
    location?: {
      campus?: string;
      building?: string;
      room?: string;
      map_url?: string | null;
    } | null;
  }
};

export default function NextCard({ next }: Props) {
  const start = new Date(next.start);
  const end = new Date(next.end);
  const time = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const location = next.location && (next.location.building || next.location.room) ? `${next.location.building || ''} ${next.location.room || ''}`.trim() : 'Location TBD';

  return (
    <div className="next-card" style={{ borderColor: next.color || '#4F46E5' }}>
      <div className="badge" style={{ backgroundColor: next.color || '#4F46E5' }}>
        {next.status === 'in_progress' ? 'In progress' : `Starts in ${next.minutes_until} min`}
      </div>
      <h2>{next.course_title}</h2>
      <p className="time">{time} • <span style={{ opacity: 0.8 }}>{next.course_code}</span></p>
      <p className="location">{location}</p>
      {next.location?.map_url && (
        <a className="map-link" href={next.location.map_url} target="_blank" rel="noreferrer">Open map</a>
      )}
    </div>
  );
}

