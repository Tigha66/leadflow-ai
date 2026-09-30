import { z } from "zod";

export const DEFAULT_GREETING = "Thanks for calling {{company_name}}. I'm the virtual receptionist. How can I help you today?";

export const orgSettingsSchema = z.object({
  receptionist: z
    .object({
      agentName: z.string().max(40).default(""),
      greeting: z.string().max(400).default(DEFAULT_GREETING),
      /** Disclose that the caller is speaking with a virtual/AI receptionist. On by default. */
      aiDisclosureEnabled: z.boolean().default(true),
      aiDisclosureText: z.string().max(300).default("Just so you know, I'm an AI-powered virtual receptionist."),
      tone: z.enum(["warm", "efficient", "formal"]).default("warm"),
      voice: z.string().max(40).default("marin"),
      askReferralSource: z.boolean().default(false),
      collectEmail: z.boolean().default(false),
      /** Allow the agent to answer pricing questions ONLY from the Pricing policy knowledge document. */
      pricingResponse: z
        .string()
        .max(400)
        .default("Pricing depends on what the technician finds, so I don't want to guess. I can get a technician scheduled or have someone from the office call you back with details."),
      mode: z.enum(["gather", "realtime"]).default("gather"),
    })
    .prefault({}),
  recording: z
    .object({
      /** Call recording is OFF by default: consent laws vary by state. */
      enabled: z.boolean().default(false),
      disclosureText: z.string().max(300).default("This call may be recorded for quality and training purposes."),
      transcriptsEnabled: z.boolean().default(true),
    })
    .prefault({}),
  afterHours: z
    .object({
      script: z
        .string()
        .max(500)
        .default("Our office is closed right now, but I can still help. I can take your information, schedule the next available visit, or flag an urgent problem for our on-call technician."),
      urgentCategories: z.array(z.string()).default(["ac_not_cooling", "furnace_not_heating", "furnace_not_turning_on", "water_leak"]),
      onCallNumber: z.string().max(20).default(""),
      transferUrgent: z.boolean().default(true),
      allowOvernightBooking: z.boolean().default(true),
      createCallbackTask: z.boolean().default(true),
    })
    .prefault({}),
  transfers: z
    .object({
      mainNumber: z.string().max(20).default(""),
      billingNumber: z.string().max(20).default(""),
      transferOnRequest: z.boolean().default(true),
    })
    .prefault({}),
  sms: z
    .object({
      enabled: z.boolean().default(true),
      appointmentConfirmation: z.boolean().default(true),
      leadAcknowledgment: z.boolean().default(true),
      callbackConfirmation: z.boolean().default(true),
      rescheduleConfirmation: z.boolean().default(true),
      reminders: z.boolean().default(false),
      /** Text back callers whose call was missed/abandoned. Off by default — enable only if appropriate for your consent practices. */
      missedCallTextBack: z.boolean().default(false),
    })
    .prefault({}),
});

export type OrgSettings = z.infer<typeof orgSettingsSchema>;

export function parseOrgSettings(raw: unknown): OrgSettings {
  const parsed = orgSettingsSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  return orgSettingsSchema.parse({});
}

export function renderGreeting(settings: OrgSettings, companyName: string): string {
  return settings.receptionist.greeting.replace(/\{\{\s*company_name\s*\}\}/g, companyName);
}
