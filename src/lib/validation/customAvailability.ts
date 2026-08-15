export type CustomAvailabilityEntry = {
  day: string;
  startTime: string;
  endTime: string;
};

export const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

type WeekDay = (typeof WEEK_DAYS)[number];

function normalizeDay(value: string): WeekDay | string {
  const match = WEEK_DAYS.find((day) => day.toLowerCase() === value.toLowerCase());
  return match ?? value;
}

export function sanitizeCustomAvailability(entries: CustomAvailabilityEntry[]): CustomAvailabilityEntry[] {
  return entries
    .map((entry) => ({
      day: normalizeDay(entry.day?.trim() ?? ''),
      startTime: entry.startTime?.trim() ?? '',
      endTime: entry.endTime?.trim() ?? '',
    }))
    .filter((entry) => Boolean(entry.day) && Boolean(entry.startTime) && Boolean(entry.endTime)) as CustomAvailabilityEntry[];
}

export function validateCustomAvailability(entries: CustomAvailabilityEntry[]): string | null {
  if (!entries.length) {
    return 'Add at least one availability block.';
  }

  for (const entry of entries) {
    if (!WEEK_DAYS.includes(entry.day as WeekDay)) {
      return `Invalid day "${entry.day}".`;
    }

    if (!TIME_PATTERN.test(entry.startTime) || !TIME_PATTERN.test(entry.endTime)) {
      return 'Start and end times must be valid 24h times (HH:MM).';
    }

    if (entry.startTime >= entry.endTime) {
      return `Start time must be before end time for ${entry.day}.`;
    }
  }

  return null;
}

