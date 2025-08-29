import fetch from 'node-fetch';
import { Course } from './types.js';

type CanvasCourse = {
  id: number;
  name: string;
  course_code?: string;
  calendar?: { ics?: string };
  enrollments?: any[];
};

export async function fetchCanvasCourses(baseUrl: string, token: string): Promise<Course[]> {
  const url = new URL('/api/v1/courses', baseUrl);
  url.searchParams.set('enrollment_state', 'active');
  url.searchParams.set('enrollment_type', 'student');
  url.searchParams.append('include[]', 'term');
  url.searchParams.append('state[]', 'available');
  url.searchParams.append('state[]', 'current');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Canvas API error ${res.status}: ${text}`);
  }
  const data = (await res.json()) as CanvasCourse[];

  const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];
  let colorIdx = 0;

  const courses: Course[] = data.map((c): Course => {
    const color = colors[colorIdx++ % colors.length];
    return {
      course_id: `canvas-${c.id}`,
      code: c.course_code || extractCode(c.name) || `ID${c.id}`,
      title: c.name,
      section: '',
      color,
      instructors: [],
      location_default: {
        campus: '',
        building: '',
        room: '',
        map_url: null
      },
      meetings: [],
      online: { is_online: false, join_url: null },
      notes: ''
    };
  });
  return courses;
}

function extractCode(name?: string): string | null {
  if (!name) return null;
  const m = name.match(/^[A-Z]{2,}\s*\d{3,}/);
  return m ? m[0].replace(/\s+/, ' ') : null;
}

