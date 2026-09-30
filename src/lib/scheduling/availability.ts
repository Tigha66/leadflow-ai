import { addDaysToKey, dateKey, weekdayOfKey, zonedTimeToUtc } from "@/lib/time";
import { hoursForDate, type BusinessHoursInput, type HolidayInput } from "./hours";

export interface AppointmentTypeConfig {
  key: string;
  name: string;
  durationMinutes: number;
  bufferMinutes: number;
  sameDayAllowed: boolean;
  leadTimeMinutes: number;
  maxHorizonDays: number;
}

export interface BusyInterval {
  startsAt: Date;
  endsAt: Date;
  technicianId?: string | null;
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
  /** Technicians free for the whole window (empty when capacity-only scheduling is used). */
  availableTechnicianIds: string[];
}

export interface AvailabilityInput {
  timezone: string;
  hours: BusinessHoursInput[];
  holidays?: HolidayInput[];
  type: AppointmentTypeConfig;
  technicianIds: string[];
  busy: BusyInterval[];
  now?: Date;
  maxSlots?: number;
  /** Optional earliest day (YYYY-MM-DD, org tz) the caller asked for. */
  fromDate?: string;
}

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => aStart < bEnd && bStart < aEnd;

/**
 * Computes bookable arrival windows. A window is available when at least one technician has no
 * overlapping appointment (including buffer). Unassigned busy intervals consume general capacity.
 */
export function computeAvailability(input: AvailabilityInput): Slot[] {
  const now = input.now ?? new Date();
  const { type, timezone: tz } = input;
  const maxSlots = input.maxSlots ?? 6;
  const techs = input.technicianIds.length ? input.technicianIds : ["__capacity__"];
  const earliest = new Date(now.getTime() + type.leadTimeMinutes * 60_000);
  const todayKey = dateKey(now, tz);
  const startKey = input.fromDate && input.fromDate > todayKey ? input.fromDate : todayKey;
  const lastKey = addDaysToKey(todayKey, type.maxHorizonDays);
  const step = type.durationMinutes + type.bufferMinutes;
  const slots: Slot[] = [];

  for (let key = startKey; key <= lastKey && slots.length < maxSlots; key = addDaysToKey(key, 1)) {
    if (key === todayKey && !type.sameDayAllowed) continue;
    const window = hoursForDate(key, weekdayOfKey(key), input.hours, input.holidays ?? []);
    if (!window) continue;
    for (let m = window.open; m + type.durationMinutes <= window.close && slots.length < maxSlots; m += step) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      const startsAt = zonedTimeToUtc(key, `${hh}:${mm}`, tz);
      if (startsAt < earliest) continue;
      const endsAt = new Date(startsAt.getTime() + type.durationMinutes * 60_000);
      const blockEnd = new Date(endsAt.getTime() + type.bufferMinutes * 60_000);
      const overlapping = input.busy.filter((b) => overlaps(startsAt, blockEnd, b.startsAt, b.endsAt));
      const busyTechs = new Set(overlapping.filter((b) => b.technicianId).map((b) => b.technicianId as string));
      const unassignedLoad = overlapping.filter((b) => !b.technicianId).length;
      const free = techs.filter((t) => !busyTechs.has(t));
      if (free.length - unassignedLoad <= 0) continue;
      slots.push({ startsAt, endsAt, availableTechnicianIds: free.filter((t) => t !== "__capacity__") });
    }
  }
  return slots;
}

/** True when the requested window is still bookable given current busy intervals. */
export function isSlotAvailable(input: AvailabilityInput, startsAt: Date): Slot | null {
  const slots = computeAvailability({ ...input, maxSlots: 500, fromDate: dateKey(startsAt, input.timezone) });
  return slots.find((s) => s.startsAt.getTime() === startsAt.getTime()) ?? null;
}
