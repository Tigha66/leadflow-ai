import type { ReceptionistContext } from "@/lib/receptionist/engine";
import { createMemoryTools } from "@/lib/receptionist/memory-tools";
import { isOpenAt } from "@/lib/scheduling/hours";
import { SERVICE_INTENTS } from "@/lib/hvac/catalog";
import {
  DEMO_COMPANY,
  DEMO_DOCUMENTS,
  DEMO_ESCALATION_RULES,
  DEMO_FAQS,
  DEMO_HOURS,
  DEMO_SERVICE_AREAS,
  DEMO_SETTINGS,
  DEMO_TECHNICIANS,
} from "./desert-air";

/** Builds a fully in-memory receptionist context for the Desert Air demo company. */
export function createDemoContext(opts: { now?: Date; forceAfterHours?: boolean } = {}): ReceptionistContext {
  const now = opts.now ?? new Date();
  const tools = createMemoryTools({
    timezone: DEMO_COMPANY.timezone,
    hours: DEMO_HOURS,
    serviceAreas: DEMO_SERVICE_AREAS,
    knowledge: { faqs: DEMO_FAQS, documents: DEMO_DOCUMENTS, hours: DEMO_HOURS, serviceAreas: DEMO_SERVICE_AREAS },
    technicianIds: DEMO_TECHNICIANS.map((_, i) => `tech-${i}`),
    now: () => now,
  });
  return {
    companyName: DEMO_COMPANY.name,
    settings: DEMO_SETTINGS,
    escalationRules: DEMO_ESCALATION_RULES,
    isAfterHours: opts.forceAfterHours ?? !isOpenAt(now, DEMO_COMPANY.timezone, DEMO_HOURS),
    enabledCategories: SERVICE_INTENTS.map((i) => i.key),
    tools,
  };
}
