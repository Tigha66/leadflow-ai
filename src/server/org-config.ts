import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointmentTypes,
  businessHours,
  escalationRules,
  faqs,
  holidays,
  knowledgeDocuments,
  organizations,
  serviceAreas,
  serviceCategories,
  technicians,
} from "@/db/schema";
import { APPOINTMENT_TYPE_DEFAULTS, type AppointmentTypeKey } from "@/lib/hvac/catalog";
import { DEFAULT_ESCALATION_RULES, type EscalationRuleInput } from "@/lib/hvac/safety";
import { parseOrgSettings, type OrgSettings } from "@/lib/org-settings";
import type { KnowledgeInput } from "@/lib/receptionist/knowledge";
import type { AppointmentTypeConfig } from "@/lib/scheduling/availability";
import { DEFAULT_BUSINESS_HOURS, isOpenAt, type BusinessHoursInput, type HolidayInput } from "@/lib/scheduling/hours";
import type { ServiceAreaInput } from "@/lib/service-area";

export interface ReceptionistConfig {
  org: typeof organizations.$inferSelect;
  settings: OrgSettings;
  hours: BusinessHoursInput[];
  holidays: HolidayInput[];
  serviceAreas: ServiceAreaInput[];
  enabledCategories: string[];
  appointmentTypes: Record<string, AppointmentTypeConfig & { afterHoursBookable: boolean; active: boolean }>;
  technicians: { id: string; name: string; skills: string[] }[];
  knowledge: KnowledgeInput;
  escalationRules: EscalationRuleInput[];
}

/** Loads everything the receptionist needs for one organization. Always scoped by orgId. */
export async function loadReceptionistConfig(orgId: string): Promise<ReceptionistConfig | null> {
  const db = getDb();
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!org) return null;
  const [hrs, hol, areas, cats, types, techs, faqRows, docs, rules] = await Promise.all([
    db.select().from(businessHours).where(eq(businessHours.orgId, orgId)),
    db.select().from(holidays).where(eq(holidays.orgId, orgId)),
    db.select().from(serviceAreas).where(eq(serviceAreas.orgId, orgId)),
    db.select().from(serviceCategories).where(and(eq(serviceCategories.orgId, orgId), eq(serviceCategories.enabled, true))),
    db.select().from(appointmentTypes).where(eq(appointmentTypes.orgId, orgId)),
    db.select().from(technicians).where(and(eq(technicians.orgId, orgId), eq(technicians.active, true))),
    db.select().from(faqs).where(eq(faqs.orgId, orgId)),
    db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.orgId, orgId)),
    db.select().from(escalationRules).where(eq(escalationRules.orgId, orgId)),
  ]);

  const typeMap: ReceptionistConfig["appointmentTypes"] = {};
  for (const key of Object.keys(APPOINTMENT_TYPE_DEFAULTS) as AppointmentTypeKey[]) {
    const row = types.find((t) => t.key === key);
    const d = APPOINTMENT_TYPE_DEFAULTS[key];
    typeMap[key] = row
      ? { key, name: row.name, durationMinutes: row.durationMinutes, bufferMinutes: row.bufferMinutes, sameDayAllowed: row.sameDayAllowed, leadTimeMinutes: row.leadTimeMinutes, maxHorizonDays: row.maxHorizonDays, afterHoursBookable: row.afterHoursBookable, active: row.active }
      : { key, ...d, active: true };
  }

  const hoursInput = hrs.length ? hrs.map((h) => ({ dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, closed: h.closed })) : DEFAULT_BUSINESS_HOURS;
  const areaInput = areas.map((a) => ({ id: a.id, name: a.name, zipCodes: a.zipCodes, cities: a.cities, active: a.active, centerLat: a.centerLat, centerLng: a.centerLng, radiusMiles: a.radiusMiles }));

  return {
    org,
    settings: parseOrgSettings(org.settings),
    hours: hoursInput,
    holidays: hol.map((h) => ({ date: h.date, name: h.name, closed: h.closed, openTime: h.openTime, closeTime: h.closeTime })),
    serviceAreas: areaInput,
    enabledCategories: cats.map((c) => c.key),
    appointmentTypes: typeMap,
    technicians: techs.map((t) => ({ id: t.id, name: t.name, skills: t.skills })),
    knowledge: {
      faqs: faqRows.map((f) => ({ question: f.question, answer: f.answer, keywords: f.keywords, active: f.active })),
      documents: docs.map((d) => ({ kind: d.kind, content: d.content })),
      hours: hoursInput,
      holidays: hol.map((h) => ({ date: h.date, name: h.name, closed: h.closed, openTime: h.openTime, closeTime: h.closeTime })),
      serviceAreas: areaInput,
    },
    escalationRules: rules.length
      ? rules.map((r) => ({ id: r.id, name: r.name, hazard: r.hazard, keywords: r.keywords, action: r.action, script: r.script, transferNumber: r.transferNumber, active: r.active, priority: r.priority }))
      : DEFAULT_ESCALATION_RULES,
  };
}

export function isAfterHoursNow(cfg: Pick<ReceptionistConfig, "org" | "hours" | "holidays">, now = new Date()): boolean {
  return !isOpenAt(now, cfg.org.timezone, cfg.hours, cfg.holidays);
}
