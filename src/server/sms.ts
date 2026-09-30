import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { contacts, smsMessages } from "@/db/schema";
import { logger } from "@/lib/logger";
import { sendSms, twilioConfigured } from "@/lib/twilio/client";
import { appUrl } from "@/lib/integrations-status";

export type SmsKind = "appointment_confirmation" | "lead_ack" | "reschedule_confirmation" | "callback_confirmation" | "reminder" | "missed_call_followup" | "internal_alert";

/**
 * Sends a TRANSACTIONAL text. Enforces consent: customer messages require the contact to have
 * agreed (captured on the call) and not to have opted out (STOP). No marketing sends exist.
 * Without Twilio credentials, messages are stored as "simulated" and never leave the system.
 */
export async function sendTransactionalSms(opts: {
  orgId: string;
  contactId: string | null;
  to: string;
  kind: SmsKind;
  body: string;
  callId?: string | null;
  appointmentId?: string | null;
  from?: string | null;
  isDemo?: boolean;
}) {
  const db = getDb();
  let allowed = opts.kind === "internal_alert";
  if (!allowed && opts.contactId) {
    const [c] = await db
      .select({ consent: contacts.smsConsent, optedOut: contacts.smsOptedOutAt })
      .from(contacts)
      .where(and(eq(contacts.id, opts.contactId), eq(contacts.orgId, opts.orgId)))
      .limit(1);
    allowed = Boolean(c?.consent && !c.optedOut);
  }
  const body = opts.kind === "internal_alert" ? opts.body : `${opts.body} Reply STOP to opt out.`;
  const base = { orgId: opts.orgId, contactId: opts.contactId, callId: opts.callId ?? null, appointmentId: opts.appointmentId ?? null, toNumber: opts.to, kind: opts.kind, body };
  if (!allowed) {
    await db.insert(smsMessages).values({ ...base, status: "blocked_no_consent" });
    return { status: "blocked_no_consent" as const };
  }
  const from = opts.from || process.env.TWILIO_PHONE_NUMBER;
  if (opts.isDemo || !twilioConfigured() || !from) {
    await db.insert(smsMessages).values({ ...base, status: "simulated" });
    return { status: "simulated" as const };
  }
  try {
    const res = await sendSms({ from, to: opts.to, body, statusCallback: `${appUrl()}/api/twilio/sms-status` });
    await db.insert(smsMessages).values({ ...base, status: "sent", providerSid: res.sid });
    return { status: "sent" as const };
  } catch (err) {
    logger.error("sms.send_failed", { orgId: opts.orgId, kind: opts.kind, err });
    await db.insert(smsMessages).values({ ...base, status: "failed", error: err instanceof Error ? err.message.slice(0, 300) : "error" });
    return { status: "failed" as const };
  }
}
