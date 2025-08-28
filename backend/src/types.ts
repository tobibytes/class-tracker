import { z } from 'zod';

export const LocationSchema = z.object({
  campus: z.string().optional().default(''),
  building: z.string().optional().default(''),
  room: z.string().optional().default(''),
  map_url: z.string().url().nullable().optional()
});

export const MeetingSchema = z.object({
  weekday: z.enum(['mon','tue','wed','thu','fri','sat','sun']),
  start: z.string(),
  end: z.string(),
  location_override: z.union([LocationSchema, z.null()]).nullable().optional()
});

export const CourseSchema = z.object({
  course_id: z.string(),
  code: z.string(),
  title: z.string(),
  section: z.string().optional().default(''),
  color: z.string().optional().default('#4F46E5'),
  instructors: z.array(z.string()).default([]),
  location_default: LocationSchema,
  meetings: z.array(MeetingSchema),
  online: z.object({
    is_online: z.boolean(),
    join_url: z.string().url().nullable()
  }).default({ is_online: false, join_url: null }),
  notes: z.string().optional().default('')
});

export const DataSourceSchema = z.object({
  mode: z.enum(['manual','canvas']),
  manual: z.object({
    timezone: z.string()
  }).optional(),
  canvas: z.object({
    base_url: z.string().url(),
    access_token: z.string().optional(),
    sync: z.object({
      courses: z.boolean().default(true),
      assignments: z.boolean().default(false),
      locations: z.boolean().default(false)
    }).default({ courses: true, assignments: false, locations: false })
  }).optional()
});

export const NotificationsSchema = z.object({
  enabled: z.boolean(),
  reminders: z.array(z.object({
    type: z.enum(['before_class','room_change']),
    minutes: z.number().int().nonnegative()
  })).default([]),
  quiet_hours: z.object({
    enabled: z.boolean(),
    start: z.string().optional(),
    end: z.string().optional()
  }).default({ enabled: false })
});

export const UISchema = z.object({
  theme: z.enum(['system','light','dark']).default('system'),
  home_layout: z.object({
    sections: z.array(z.enum(['next_class','today_overview','week_timeline']))
  }).default({ sections: ['next_class','today_overview','week_timeline'] }),
  show_map_links: z.boolean().default(true),
  show_instructor: z.boolean().default(true)
});

export const ShortcutSchema = z.object({
  id: z.string(),
  label: z.string(),
  action: z.string()
});

export const ConfigSchema = z.object({
  data_source: DataSourceSchema,
  profile: z.object({
    student_name: z.string(),
    school_name: z.string().optional().default(''),
    semester: z.string().optional().default(''),
    week_start: z.enum(['monday','sunday']).default('monday')
  }),
  courses: z.array(CourseSchema).default([]),
  notifications: NotificationsSchema,
  ui: UISchema,
  shortcuts: z.object({
    quick_actions: z.array(ShortcutSchema).default([])
  }).default({ quick_actions: [] })
});

export type Location = z.infer<typeof LocationSchema>;
export type Meeting = z.infer<typeof MeetingSchema>;
export type Course = z.infer<typeof CourseSchema>;
export type Config = z.infer<typeof ConfigSchema>;

export const Weekdays: Record<string, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 7
};

