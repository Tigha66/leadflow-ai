import { addDaysToKey, dateKey, minutesOf, weekdayOfKey, zonedParts, zonedTimeToUtc } from "@/lib/time";

export interface BusinessHoursInput {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  closed: boolean;
}

export interface HolidayInput {
  date: string;
  name: string;
  closed: boolean;
  openTime?: string | null;
  closeTime?: string | null;
}

export const DEFAULT_BUSINESS_HOURS: BusinessHoursInput[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  dayOfWeek: d,
  openTime: d === 6 ? "08:00" : "07:00",
  closeTime: d === 6 ? "14:00" : "18:00",
  closed: d === 0,
}));

/** Opening window (minutes from local midnight) for a date key, honoring holiday overrides. */
export function hoursForDate(key: string, weekday: number, hours: BusinessHoursInput[], holidays: HolidayInput[] = []): { open: number; close: number } | null {
  const holiday = holidays.find((h) => h.date === key);
  if (holiday) {
    if (holiday.closed || !holiday.openTime || !holiday.closeTime) return null;
    return { open: minutesOf(holiday.openTime), close: minutesOf(holiday.closeTime) };
  }
  const day = hours.find((h) => h.dayOfWeek === weekday);
  if (!day || day.closed) return null;
  return { open: minutesOf(day.openTime), close: minutesOf(day.closeTime) };
}

export function isOpenAt(date: Date, tz: string, hours: BusinessHoursInput[], holidays: HolidayInput[] = []): boolean {
  const p = zonedParts(date, tz);
  const window = hoursForDate(dateKey(date, tz), p.weekday, hours, holidays);
  if (!window) return false;
  const m = p.hour * 60 + p.minute;
  return m >= window.open && m < window.close;
}

/** Next time the office opens (used for next-morning callback tasks). */
export function nextOpening(now: Date, tz: string, hours: BusinessHoursInput[], holidays: HolidayInput[] = []): Date {
  if (isOpenAt(now, tz, hours, holidays)) return now;
  const today = dateKey(now, tz);
  for (let i = 0; i < 14; i++) {
    const key = addDaysToKey(today, i);
    const window = hoursForDate(key, weekdayOfKey(key), hours, holidays);
    if (!window) continue;
    const hh = String(Math.floor(window.open / 60)).padStart(2, "0");
    const mm = String(window.open % 60).padStart(2, "0");
    const at = zonedTimeToUtc(key, `${hh}:${mm}`, tz);
    if (at > now) return at;
  }
  return new Date(now.getTime() + 12 * 3_600_000);
}
