import "server-only";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, dispatchRecords } from "@/db/schema";
import type { AppointmentTypeKey } from "@/lib/hvac/catalog";
import { computeAvailability, type BusyInterval } from "@/lib/scheduling/availability";
import { addDaysToKey, dateKey, describeWindow, zonedTimeToUtc } from "@/lib/time";
import { googleBusy, googleCreateEvent } from "./google-calendar";
import type { ReceptionistConfig } from "./org-config";

/**
 * Scheduling provider abstraction. The internal calendar is always the system of record; external
 * providers (Google Calendar today; ServiceTitan / Housecall Pro / Jobber / FieldEdge in future)
 * contribute busy time and receive booked jobs.
 */
export interface SchedulingProvider {
  name: string;
  busy(orgId: string, from: Date, to: Date): Promise<BusyInterval[]>;
  onBooked(orgId: string, appt: { summary: string; description: string; startsAt: Date; endsAt: Date; location?: string }): Promise<string | null>;
}

const internalProvider: SchedulingProvider = {
  name: "internal",
  async busy(orgId, from, to) {
    const rows = await getDb()
      .select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt, technicianId: appointments.technicianId })
      .from(appointments)
      .where(and(eq(appointments.orgId, orgId), inArray(appointments.status, ["requested", "confirmed"]), lte(appointments.startsAt, to), gte(appointments.endsAt, from)));
    return rows;
  },
  async onBooked() {
    return null;
  },
};

const googleProvider: SchedulingProvider = {
  name: "google_calendar",
  busy: googleBusy,
  onBooked: googleCreateEvent,
};

export function providersFor(): SchedulingProvider[] {
  return [internalProvider, googleProvider];
}

function techsFor(cfg: ReceptionistConfig, typeKey: AppointmentTypeKey): string[] {
  const skilled = cfg.technicians.filter((t) => t.skills.includes(typeKey));
  return (skilled.length ? skilled : cfg.technicians).map((t) => t.id);
}

async function collectBusy(orgId: string, from: Date, to: Date): Promise<BusyInterval[]> {
  const all = await Promise.all(providersFor().map((p) => p.busy(orgId, from, to)));
  return all.flat();
}

export async function findSlots(cfg: ReceptionistConfig, typeKey: AppointmentTypeKey, page = 0, now = new Date()) {
  const type = cfg.appointmentTypes[typeKey] ?? cfg.appointmentTypes.repair;
  const tz = cfg.org.timezone;
  const horizonEnd = zonedTimeToUtc(addDaysToKey(dateKey(now, tz), type.maxHorizonDays + 1), "00:00", tz);
  const busy = await collectBusy(cfg.org.id, now, horizonEnd);
  const slots = computeAvailability({
    timezone: tz,
    hours: cfg.hours,
    holidays: cfg.holidays,
    type,
    technicianIds: techsFor(cfg, typeKey),
    busy,
    now,
    maxSlots: (page + 1) * 3,
  });
  return slots.slice(page * 3, page * 3 + 3).map((s) => ({
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    label: describeWindow(s.startsAt, s.endsAt, tz, now),
    technicianId: s.availableTechnicianIds[0] ?? null,
  }));
}

export interface BookInput {
  typeKey: AppointmentTypeKey;
  startsAt: Date;
  contactId: string | null;
  propertyId: string | null;
  leadId: string | null;
  callId: string | null;
  summary: string;
  location?: string;
  isDemo?: boolean;
  preferredTechnicianId?: string | null;
}

/**
 * Books a slot atomically. A per-organization advisory lock serializes concurrent bookings so two
 * callers can't take the last technician for the same window. Availability is re-checked inside the lock.
 */
export async function bookSlot(cfg: ReceptionistConfig, input: BookInput, now = new Date()) {
  const type = cfg.appointmentTypes[input.typeKey] ?? cfg.appointmentTypes.repair;
  const endsAt = new Date(input.startsAt.getTime() + type.durationMinutes * 60_000);
  const orgId = cfg.org.id;
  const externalBusy = await providersFor()
    .filter((p) => p.name !== "internal")
    .reduce<Promise<BusyInterval[]>>(async (acc, p) => [...(await acc), ...(await p.busy(orgId, input.startsAt, endsAt))], Promise.resolve([]));

  const result = await getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${orgId}))`);
    const busy = await tx
      .select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt, technicianId: appointments.technicianId })
      .from(appointments)
      .where(
        and(
          eq(appointments.orgId, orgId),
          inArray(appointments.status, ["requested", "confirmed"]),
          lte(appointments.startsAt, new Date(endsAt.getTime() + type.bufferMinutes * 60_000)),
          gte(appointments.endsAt, input.startsAt),
        ),
      );
    const slots = computeAvailability({
      timezone: cfg.org.timezone,
      hours: cfg.hours,
      holidays: cfg.holidays,
      type,
      technicianIds: techsFor(cfg, input.typeKey),
      busy: [...busy, ...externalBusy],
      now,
      maxSlots: 500,
      fromDate: dateKey(input.startsAt, cfg.org.timezone),
    });
    const slot = slots.find((s) => s.startsAt.getTime() === input.startsAt.getTime());
    if (!slot) return null;
    const techId =
      input.preferredTechnicianId && slot.availableTechnicianIds.includes(input.preferredTechnicianId)
        ? input.preferredTechnicianId
        : (slot.availableTechnicianIds[0] ?? null);
    const [appt] = await tx
      .insert(appointments)
      .values({
        orgId,
        contactId: input.contactId,
        propertyId: input.propertyId,
        leadId: input.leadId,
        callId: input.callId,
        appointmentTypeKey: input.typeKey,
        technicianId: techId,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: "confirmed",
        summary: input.summary,
        isDemo: input.isDemo ?? false,
      })
      .returning();
    await tx.insert(dispatchRecords).values({ orgId, appointmentId: appt.id, technicianId: techId, status: techId ? "assigned" : "unassigned" });
    return appt;
  });
  if (!result) return null;

  const externalId = await googleCreateEvent(orgId, { summary: input.summary.slice(0, 120), description: input.summary, startsAt: result.startsAt, endsAt: result.endsAt, location: input.location });
  if (externalId) {
    await getDb().update(appointments).set({ provider: "google_calendar", externalId }).where(and(eq(appointments.id, result.id), eq(appointments.orgId, orgId)));
  }
  return { ...result, label: describeWindow(result.startsAt, result.endsAt, cfg.org.timezone, now) };
}
