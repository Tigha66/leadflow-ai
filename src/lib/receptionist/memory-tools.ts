/**
 * In-memory receptionist tools. Powers the public /demo simulator (no database or credentials
 * required) and unit tests. Bookings made here are never persisted and are clearly labeled as demo.
 */
import { APPOINTMENT_TYPE_DEFAULTS } from "@/lib/hvac/catalog";
import { computeAvailability, type BusyInterval } from "@/lib/scheduling/availability";
import type { BusinessHoursInput } from "@/lib/scheduling/hours";
import { checkServiceArea, type ServiceAreaInput } from "@/lib/service-area";
import { describeWindow } from "@/lib/time";
import type { ReceptionistTools } from "./engine";
import { answerFromKnowledge, type KnowledgeInput } from "./knowledge";

export interface MemoryToolsConfig {
  timezone: string;
  hours: BusinessHoursInput[];
  serviceAreas: ServiceAreaInput[];
  knowledge: KnowledgeInput;
  technicianIds: string[];
  busy?: BusyInterval[];
  now?: () => Date;
}

export function createMemoryTools(cfg: MemoryToolsConfig): ReceptionistTools & { bookings: BusyInterval[] } {
  const bookings: BusyInterval[] = [...(cfg.busy ?? [])];
  const now = cfg.now ?? (() => new Date());
  return {
    bookings,
    async checkServiceArea(input) {
      return checkServiceArea(cfg.serviceAreas, input);
    },
    async findSlots({ appointmentTypeKey, page }) {
      const type = { key: appointmentTypeKey, ...APPOINTMENT_TYPE_DEFAULTS[appointmentTypeKey] };
      const slots = computeAvailability({
        timezone: cfg.timezone,
        hours: cfg.hours,
        type,
        technicianIds: cfg.technicianIds,
        busy: bookings,
        now: now(),
        maxSlots: (page + 1) * 3,
      });
      return slots.slice(page * 3, page * 3 + 3).map((s) => ({
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        label: describeWindow(s.startsAt, s.endsAt, cfg.timezone, now()),
        technicianId: s.availableTechnicianIds[0] ?? null,
      }));
    },
    async bookAppointment(req) {
      const startsAt = new Date(req.slot.startsAt);
      const endsAt = new Date(req.slot.endsAt);
      const clash = bookings.some((b) => b.technicianId === req.slot.technicianId && b.startsAt < endsAt && startsAt < b.endsAt);
      if (clash) return { ok: false, reason: "slot_taken" };
      bookings.push({ startsAt, endsAt, technicianId: req.slot.technicianId });
      return { ok: true, id: `demo-${bookings.length}`, confirmed: true, startsAt: req.slot.startsAt, endsAt: req.slot.endsAt, label: req.slot.label };
    },
    async answerQuestion({ intentKey, text }) {
      return answerFromKnowledge(cfg.knowledge, intentKey, text);
    },
  };
}
