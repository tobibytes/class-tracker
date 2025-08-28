import React, { useEffect, useState } from 'react';
import { getNext, getToday, getConfig } from './api';
import NextCard from './components/NextCard';
import TodayList from './components/TodayList';
import WeekTimeline from './components/WeekTimeline';

export default function App() {
  const [nextInfo, setNextInfo] = useState<any>(null);
  const [today, setToday] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getNext(), getToday(), getConfig()])
      .then(([n, t, c]) => {
        setNextInfo(n);
        setToday(t);
        setConfig(c);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="container">
      <header>
        <h1>Class Tracker</h1>
      </header>
      {error && <div className="error">Error: {error}</div>}
      {nextInfo?.next && <NextCard next={nextInfo.next} />}
      {today?.items && <TodayList items={today.items} />}
      {config && <WeekTimeline config={config} />}
      <footer>
        <small>Theme: {config?.ui?.theme || 'system'}</small>
      </footer>
    </div>
  );
}

