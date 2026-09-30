import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointmentTypes,
  businessHours,
  escalationRules,
  organizationMembers,
  organizations,
  serviceCategories,
  subscriptions,
} from "@/db/schema";
import { APPOINTMENT_TYPE_DEFAULTS, SERVICE_INTENTS, type AppointmentTypeKey } from "@/lib/hvac/catalog";
import { DEFAULT_ESCALATION_RULES } from "@/lib/hvac/safety";
import { orgSettingsSchema, type OrgSettings } from "@/lib/org-settings";
import { DEFAULT_BUSINESS_HOURS, type BusinessHoursInput } from "@/lib/scheduling/hours";
import { randomToken } from "@/lib/crypto";
import { slugify } from "@/lib/utils";

export const TRIAL_DAYS = 14;

/**
 * Creates an organization with sensible HVAC defaults (hours, appointment types, service categories,
 * safety escalation rules) and makes `ownerUserId` its owner.
 */
export async function createOrganizationWithDefaults(input: {
  name: string;
  ownerUserId: string;
  timezone?: string;
  phone?: string | null;
  businessType?: string;
  isDemo?: boolean;
  settings?: Partial<OrgSettings>;
  hours?: BusinessHoursInput[];
  slug?: string;
}) {
  const db = getDb();
  return db.transaction(async (tx) => {
    let slug = input.slug ?? (slugify(input.name) || "company");
    const clash = await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1);
    if (clash.length) slug = `${slug}-${randomToken(3).toLowerCase()}`;
    const [org] = await tx
      .insert(organizations)
      .values({
        name: input.name,
        slug,
        timezone: input.timezone ?? "America/Phoenix",
        phone: input.phone ?? null,
        businessType: input.businessType ?? "residential_hvac",
        isDemo: input.isDemo ?? false,
        settings: orgSettingsSchema.parse(input.settings ?? {}),
        trialEndsAt: input.isDemo ? null : new Date(Date.now() + TRIAL_DAYS * 86_400_000),
      })
      .returning();
    await tx.insert(organizationMembers).values({ orgId: org.id, userId: input.ownerUserId, role: "owner" });
    await tx.insert(businessHours).values((input.hours ?? DEFAULT_BUSINESS_HOURS).map((h) => ({ orgId: org.id, ...h })));
    await tx.insert(appointmentTypes).values(
      (Object.keys(APPOINTMENT_TYPE_DEFAULTS) as AppointmentTypeKey[]).map((key) => ({ orgId: org.id, key, ...APPOINTMENT_TYPE_DEFAULTS[key] })),
    );
    await tx.insert(serviceCategories).values(
      SERVICE_INTENTS.map((i) => ({ orgId: org.id, key: i.key, name: i.label, enabled: true, appointmentTypeKey: i.appointmentType ?? "repair", defaultUrgency: i.defaultUrgency })),
    );
    await tx.insert(escalationRules).values(DEFAULT_ESCALATION_RULES.map((r) => ({ orgId: org.id, ...r })));
    await tx.insert(subscriptions).values({ orgId: org.id, status: "none" });
    return org;
  });
}
