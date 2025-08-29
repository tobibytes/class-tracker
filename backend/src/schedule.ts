import { DateTime } from 'luxon';
import { Config, Course, Meeting, Weekdays, Location } from './types.js';

function getTimezone(config: Config) {
  if (config.data_source && (config.data_source as any).manual?.timezone) {
    return (config.data_source as any).manual.timezone;
  }
  return process.env.TZ || 'America/New_York';
}

export type MeetingInstance = {
  course: Course;
  meeting: Meeting;
  start: DateTime;
  end: DateTime;
  location: Location | null;
};

function buildNextOccurrences(config: Config, now: DateTime): MeetingInstance[] {
  const tz = getTimezone(config);
  const results: MeetingInstance[] = [];
  const nowTz = now.setZone(tz);

  for (const course of config.courses) {
    for (const meeting of course.meetings) {
      const weekdayNum = Weekdays[meeting.weekday];
      for (let addDays = 0; addDays < 7; addDays++) {
        const candidate = nowTz.plus({ days: addDays });
        const dayNum = candidate.weekday; // 1..7
        if (dayNum !== weekdayNum) continue;

        const [startHour, startMin] = meeting.start.split(':').map(Number);
        const [endHour, endMin] = meeting.end.split(':').map(Number);

        const start = candidate.set({ hour: startHour, minute: startMin, second: 0, millisecond: 0 });
        const end = candidate.set({ hour: endHour, minute: endMin, second: 0, millisecond: 0 });

        const location = meeting.location_override ?? course.location_default ?? null;

        if (end <= nowTz) {
          // Already ended
        } else {
          results.push({ course, meeting, start, end, location });
        }
      }
    }
  }
  results.sort((a, b) => a.start.toMillis() - b.start.toMillis());
  return results;
}

export function getNextMeeting(config: Config, nowISO?: string) {
  const tz = getTimezone(config);
  const now = nowISO ? DateTime.fromISO(nowISO, { zone: tz }) : DateTime.now().setZone(tz);
  const all = buildNextOccurrences(config, now);
  if (all.length === 0) return null;
  const next = all[0];

  let status: 'upcoming' | 'in_progress' = 'upcoming';
  if (now >= next.start && now < next.end) status = 'in_progress';

  const minutes_until = Math.max(0, Math.round((next.start.toMillis() - now.toMillis()) / 60000));

  return {
    now: now.toISO(),
    next: {
      course_id: next.course.course_id,
      course_code: next.course.code,
      course_title: next.course.title,
      color: next.course.color,
      start: next.start.toISO(),
      end: next.end.toISO(),
      location: next.location,
      instructors: next.course.instructors,
      minutes_until,
      status
    }
  };
}

export function getTodayMeetings(config: Config, nowISO?: string) {
  const tz = getTimezone(config);
  const now = nowISO ? DateTime.fromISO(nowISO, { zone: tz }) : DateTime.now().setZone(tz);
  const startOfDay = now.startOf('day');
  const endOfDay = now.endOf('day');

  const all = buildNextOccurrences(config, startOfDay.minus({ days: 1 }));
  const today = all.filter(mi => mi.start >= startOfDay && mi.start <= endOfDay)
    .map(mi => ({
      course_id: mi.course.course_id,
      course_code: mi.course.code,
      course_title: mi.course.title,
      color: mi.course.color,
      start: mi.start.toISO(),
      end: mi.end.toISO(),
      location: mi.location,
      instructors: mi.course.instructors
    }))
    .sort((a, b) => (a.start! < b.start! ? -1 : 1));

  return {
    now: now.toISO(),
    items: today
  };
}

