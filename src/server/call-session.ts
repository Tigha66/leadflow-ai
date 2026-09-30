import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { callEvents, calls, contacts, leads, properties, tasks, transcripts, usageRecords, type LeadStage } from "@/db/schema";
import { INTENT_BY_KEY, type AppointmentTypeKey } from "@/lib/hvac/catalog";
import { logger } from "@/lib/logger";
import {
  buildSummary,
  finalOutcome,
  newConversation,
  openingLine,
  respond,
  type BookingRequest,
  type ConversationState,
  type EngineAction,
  type ReceptionistContext,
  type ReceptionistTools,
} from "@/lib/receptionist/engine";
import { answerFromKnowledge } from "@/lib/receptionist/knowledge";
import { nextOpening } from "@/lib/scheduling/hours";
import { checkServiceArea } from "@/lib/service-area";
import { classifyIntentWithAi, polishSummaryWithAi } from "./ai";
import { isAfterHoursNow, loadReceptionistConfig, type ReceptionistConfig } from "./org-config";
import { bookSlot, findSlots } from "./scheduling";
import { sendTransactionalSms } from "./sms";

type Channel = "voice" | "voice_realtime" | "simulator" | "missed_call";

export interface StartCallInput {
  orgId: string;
  channel: Channel;
  fromNumber?: string | null;
  toNumber?: string | null;
  providerCallSid?: string | null;
  phoneNumberId?: string | null;
  callerName?: string | null;
  isDemo?: boolean;
  now?: Date;
}

export interface TurnOutput {
  reply: string;
  actions: EngineAction[];
  ended: boolean;
  transfer?: { number: string; reason: string };
  state: ConversationState;
}

/* ------------------------------------------------------------------ */
/* Contacts / leads                                                     */
/* ------------------------------------------------------------------ */

async function ensureContact(orgId: string, state: ConversationState, isDemo: boolean): Promise<string | null> {
  const phone = state.fields.phone ?? state.callerIdPhone;
  if (!phone) return null;
  const db = getDb();
  const [existing] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.orgId, orgId), eq(contacts.phone, phone)))
    .limit(1);
  const f = state.fields;
  if (existing) {
    await db
      .update(contacts)
      .set({
        name: f.name && f.name !== "Caller" ? f.name : existing.name,
        email: f.email ?? existing.email,
        customerType: f.customerType === "existing" ? "existing" : existing.customerType,
        propertyType: f.propertyType ?? existing.propertyType,
        referralSource: f.referralSource ?? existing.referralSource,
        ...(state.smsConsent === true ? { smsConsent: true, smsConsentAt: new Date() } : {}),
      })
      .where(and(eq(contacts.id, existing.id), eq(contacts.orgId, orgId)));
    return existing.id;
  }
  const [created] = await db
    .insert(contacts)
    .values({
      orgId,
      name: f.name && f.name !== "Caller" ? f.name : null,
      phone,
      email: f.email ?? null,
      customerType: f.customerType ?? "new",
      propertyType: f.propertyType ?? "residential",
      referralSource: f.referralSource ?? null,
      smsConsent: state.smsConsent === true,
      smsConsentAt: state.smsConsent === true ? new Date() : null,
      isDemo,
    })
    .returning({ id: contacts.id });
  return created.id;
}

async function ensureProperty(orgId: string, contactId: string, state: ConversationState): Promise<string | null> {
  const f = state.fields;
  if (!f.address) return null;
  const db = getDb();
  const [existing] = await db
    .select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.orgId, orgId), eq(properties.contactId, contactId), eq(properties.address, f.address)))
    .limit(1);
  if (existing) return existing.id;
  const [p] = await db
    .insert(properties)
    .values({
      orgId,
      contactId,
      address: f.address,
      zip: f.zip ?? null,
      city: f.city ?? null,
      inServiceArea: state.serviceArea === "in_area" ? true : state.serviceArea === "out_of_area" ? false : null,
      systemType: f.systemType ?? null,
    })
    .returning({ id: properties.id });
  return p.id;
}

function stageFor(state: ConversationState): LeadStage {
  if (state.appointment) {
    return ["estimate", "install_consult"].includes(state.appointment.appointmentTypeKey) ? "estimate_scheduled" : "appointment_booked";
  }
  if (state.callbackRequested || state.escalation) return "needs_follow_up";
  if (state.fields.name && (state.fields.phone || state.callerIdPhone) && state.fields.address && state.serviceArea === "in_area") return "qualified";
  return "new";
}

async function upsertLead(orgId: string, callId: string, contactId: string | null, state: ConversationState, existingLeadId: string | null, isDemo: boolean, source = "phone") {
  const db = getDb();
  const values = {
    contactId,
    stage: stageFor(state),
    serviceCategory: state.intentKey ?? null,
    urgency: state.urgency,
    description: state.fields.description ? `${state.serviceArea === "out_of_area" ? "[Out of area] " : ""}${state.fields.description}`.slice(0, 1000) : null,
    updatedAt: new Date(),
  };
  if (existingLeadId) {
    await db.update(leads).set(values).where(and(eq(leads.id, existingLeadId), eq(leads.orgId, orgId)));
    return existingLeadId;
  }
  const [lead] = await db.insert(leads).values({ orgId, callId, source, isDemo, ...values }).returning({ id: leads.id });
  return lead.id;
}

/* ------------------------------------------------------------------ */
/* Tools bound to a call                                                */
/* ------------------------------------------------------------------ */

function dbTools(cfg: ReceptionistConfig, callId: string, isDemo: boolean, now: () => Date): ReceptionistTools {
  return {
    async checkServiceArea(input) {
      return checkServiceArea(cfg.serviceAreas, input);
    },
    async findSlots({ appointmentTypeKey, page }) {
      return findSlots(cfg, appointmentTypeKey, page, now());
    },
    async bookAppointment(req: BookingRequest) {
      try {
        const orgId = cfg.org.id;
        const draft: ConversationState = { ...newConversation({ afterHours: false }), fields: req.fields, serviceArea: req.serviceAreaStatus, urgency: req.urgency, intentKey: req.intentKey };
        const contactId = await ensureContact(orgId, draft, isDemo);
        const propertyId = contactId ? await ensureProperty(orgId, contactId, draft) : null;
        const [call] = await getDb().select({ leadId: calls.leadId }).from(calls).where(and(eq(calls.id, callId), eq(calls.orgId, orgId))).limit(1);
        const leadId = await upsertLead(orgId, callId, contactId, draft, call?.leadId ?? null, isDemo);
        const intentLabel = INTENT_BY_KEY[req.intentKey]?.label ?? "Service";
        const appt = await bookSlot(
          cfg,
          {
            typeKey: req.appointmentTypeKey as AppointmentTypeKey,
            startsAt: new Date(req.slot.startsAt),
            contactId,
            propertyId,
            leadId,
            callId,
            summary: `${intentLabel} — ${req.fields.name ?? "Caller"}${req.fields.address ? ` @ ${req.fields.address}` : ""}${req.fields.description ? `: ${req.fields.description}` : ""}`.slice(0, 500),
            location: req.fields.address,
            isDemo,
            preferredTechnicianId: req.slot.technicianId ?? null,
          },
          now(),
        );
        if (!appt) return { ok: false, reason: "slot_taken" };
        await getDb()
          .update(calls)
          .set({ appointmentId: appt.id, leadId, contactId })
          .where(and(eq(calls.id, callId), eq(calls.orgId, orgId)));
        await getDb()
          .update(leads)
          .set({ stage: ["estimate", "install_consult"].includes(req.appointmentTypeKey) ? "estimate_scheduled" : "appointment_booked" })
          .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)));
        return { ok: true, id: appt.id, confirmed: appt.status === "confirmed", startsAt: appt.startsAt.toISOString(), endsAt: appt.endsAt.toISOString(), label: appt.label };
      } catch (err) {
        logger.error("call.book_failed", { callId, err });
        return { ok: false, reason: "error" };
      }
    },
    async answerQuestion({ intentKey, text }) {
      return answerFromKnowledge(cfg.knowledge, intentKey, text);
    },
    classifyWithAi: classifyIntentWithAi,
  };
}

export function buildContext(cfg: ReceptionistConfig, callId: string, afterHours: boolean, isDemo: boolean, now: () => Date = () => new Date()): ReceptionistContext {
  return {
    companyName: cfg.org.name,
    settings: cfg.settings,
    escalationRules: cfg.escalationRules,
    isAfterHours: afterHours,
    enabledCategories: cfg.enabledCategories.length ? cfg.enabledCategories : undefined,
    tools: dbTools(cfg, callId, isDemo, now),
  };
}

/* ------------------------------------------------------------------ */
/* Lifecycle                                                            */
/* ------------------------------------------------------------------ */

async function nextSeq(callId: string): Promise<number> {
  const [row] = await getDb().select({ n: sql<number>`coalesce(max(${transcripts.seq}), 0)` }).from(transcripts).where(eq(transcripts.callId, callId));
  return Number(row?.n ?? 0) + 1;
}

async function addTranscript(orgId: string, callId: string, speaker: "caller" | "agent" | "system", text: string) {
  if (!text) return;
  await getDb().insert(transcripts).values({ orgId, callId, speaker, text: text.slice(0, 4000), seq: await nextSeq(callId) });
}

export async function startCall(input: StartCallInput) {
  const cfg = await loadReceptionistConfig(input.orgId);
  if (!cfg) throw new Error("Organization not found");
  const now = input.now ?? new Date();
  const afterHours = isAfterHoursNow(cfg, now);
  const state = newConversation({ afterHours, callerIdPhone: input.fromNumber ?? null });
  const isDemo = input.isDemo ?? cfg.org.isDemo;
  const [call] = await getDb()
    .insert(calls)
    .values({
      orgId: input.orgId,
      channel: input.channel,
      providerCallSid: input.providerCallSid ?? null,
      phoneNumberId: input.phoneNumberId ?? null,
      fromNumber: input.fromNumber ?? null,
      toNumber: input.toNumber ?? null,
      callerName: input.callerName ?? null,
      startedAt: now,
      afterHours,
      recordingEnabled: cfg.settings.recording.enabled,
      transcriptEnabled: cfg.settings.recording.transcriptsEnabled,
      conversationState: state,
      isDemo,
    })
    .returning();
  const greeting = openingLine({ companyName: cfg.org.name, settings: cfg.settings, isAfterHours: afterHours });
  if (cfg.settings.recording.transcriptsEnabled) await addTranscript(input.orgId, call.id, "agent", greeting);
  await getDb().insert(callEvents).values({ orgId: input.orgId, callId: call.id, type: "call.started", data: { channel: input.channel, afterHours } });
  return { call, greeting, cfg, afterHours };
}

export async function handleCallerTurn(opts: { orgId: string; callId: string; text: string; now?: Date }): Promise<TurnOutput> {
  const db = getDb();
  const [call] = await db
    .select()
    .from(calls)
    .where(and(eq(calls.id, opts.callId), eq(calls.orgId, opts.orgId)))
    .limit(1);
  if (!call) throw new Error("Call not found");
  const cfg = await loadReceptionistConfig(opts.orgId);
  if (!cfg) throw new Error("Organization not found");
  const prev = (call.conversationState as ConversationState | null) ?? newConversation({ afterHours: call.afterHours, callerIdPhone: call.fromNumber });
  const now = opts.now ?? new Date();
  const ctx = buildContext(cfg, call.id, call.afterHours, call.isDemo, () => now);
  const result = await respond(prev, opts.text, ctx);

  if (call.transcriptEnabled) {
    await addTranscript(opts.orgId, call.id, "caller", opts.text);
    await addTranscript(opts.orgId, call.id, "agent", result.reply);
  }
  const transfer = result.actions.find((a): a is Extract<EngineAction, { type: "transfer" }> => a.type === "transfer");
  const escalate = result.actions.find((a) => a.type === "escalate");
  await db
    .update(calls)
    .set({
      conversationState: result.state,
      intent: result.state.intentKey ?? null,
      serviceCategory: result.state.intentKey && INTENT_BY_KEY[result.state.intentKey]?.kind === "service" ? result.state.intentKey : call.serviceCategory,
      urgency: result.state.urgency,
      serviceAreaStatus: result.state.serviceArea,
      callerName: result.state.fields.name ?? call.callerName,
      escalated: call.escalated || Boolean(escalate),
      ...(transfer ? { transferStatus: "attempted" as const } : {}),
    })
    .where(and(eq(calls.id, call.id), eq(calls.orgId, opts.orgId)));
  for (const a of result.actions) {
    if (a.type === "hangup") continue;
    await db.insert(callEvents).values({ orgId: opts.orgId, callId: call.id, type: `action.${a.type}`, data: a as unknown as Record<string, unknown> });
  }
  return { reply: result.reply, actions: result.actions, ended: result.state.ended, transfer: transfer ? { number: transfer.number, reason: transfer.reason } : undefined, state: result.state };
}

/**
 * Finalizes a call: persists contact, lead, callback task, SMS confirmations, summary and usage.
 * Idempotent — safe to call from both the conversation end and Twilio's status callback.
 */
export async function finalizeCall(opts: { orgId: string; callId: string; durationSeconds?: number | null; providerStatus?: string | null; transferCompleted?: boolean; now?: Date }) {
  const db = getDb();
  const now = opts.now ?? new Date();
  const [call] = await db
    .select()
    .from(calls)
    .where(and(eq(calls.id, opts.callId), eq(calls.orgId, opts.orgId)))
    .limit(1);
  if (!call) return null;
  if (call.endedAt && call.summary) {
    if (opts.durationSeconds && !call.durationSeconds) {
      await db.update(calls).set({ durationSeconds: opts.durationSeconds }).where(and(eq(calls.id, call.id), eq(calls.orgId, opts.orgId)));
    }
    return call;
  }
  const cfg = await loadReceptionistConfig(opts.orgId);
  if (!cfg) return null;
  const state = (call.conversationState as ConversationState | null) ?? newConversation({ afterHours: call.afterHours, callerIdPhone: call.fromNumber });
  const missed = ["no-answer", "busy", "failed", "canceled"].includes(opts.providerStatus ?? "");
  const engagedTurns = state.turns;
  let outcome = missed ? "missed" : finalOutcome(state);
  const isMissedLead = (missed || outcome === "abandoned") && Boolean(call.fromNumber);

  let contactId = call.contactId;
  let leadId = call.leadId;
  if (state.leadWorthy || state.callbackRequested || state.appointment || state.escalation || isMissedLead) {
    contactId = (await ensureContact(opts.orgId, state, call.isDemo)) ?? contactId;
    if (contactId && state.fields.address) await ensureProperty(opts.orgId, contactId, state);
    if (state.leadWorthy || state.escalation || isMissedLead || state.appointment) {
      if (isMissedLead && engagedTurns === 0) {
        state.callbackRequested = true;
        state.fields.description = missed ? "Missed call — caller did not reach the receptionist." : "Caller hung up before describing the issue.";
      }
      leadId = await upsertLead(opts.orgId, call.id, contactId, state, leadId, call.isDemo, isMissedLead && engagedTurns === 0 ? "missed_call" : "phone");
    }
  }

  // Callback task (incl. next-morning callback for after-hours calls).
  const needsTask = (state.callbackRequested && !state.appointment) || state.escalation || isMissedLead;
  if (needsTask && (!call.afterHours || cfg.settings.afterHours.createCallbackTask || state.escalation)) {
    const urgent = state.urgency !== "routine" || Boolean(state.escalation);
    const dueAt = urgent ? now : call.afterHours ? nextOpening(now, cfg.org.timezone, cfg.hours, cfg.holidays) : new Date(now.getTime() + 30 * 60_000);
    const who = state.fields.name ?? call.callerName ?? "caller";
    const title = state.escalation
      ? `URGENT safety follow-up (${state.escalation.ruleName}) — ${who}`
      : isMissedLead && engagedTurns === 0
        ? `Missed call — call back ${who}`
        : `Call back ${who}: ${INTENT_BY_KEY[state.intentKey ?? "other"]?.label ?? "request"}`;
    await db.insert(tasks).values({ orgId: opts.orgId, callId: call.id, contactId, type: "callback", title, dueAt });
  }

  // Transactional SMS (consent captured on the call).
  const phone = state.fields.phone ?? state.callerIdPhone;
  const sms = cfg.settings.sms;
  if (sms.enabled && phone && contactId && state.smsConsent) {
    if (state.appointment && sms.appointmentConfirmation) {
      await sendTransactionalSms({
        orgId: opts.orgId,
        contactId,
        to: phone,
        kind: "appointment_confirmation",
        body: `${cfg.org.name}: your ${state.appointment.confirmed ? "appointment is confirmed" : "appointment request was received"} for ${state.appointment.label}.`,
        callId: call.id,
        appointmentId: state.appointment.id,
        from: call.toNumber,
        isDemo: call.isDemo,
      });
    } else if (state.callbackRequested && sms.callbackConfirmation) {
      await sendTransactionalSms({ orgId: opts.orgId, contactId, to: phone, kind: "callback_confirmation", body: `${cfg.org.name}: thanks for calling. Our team will call you back ${call.afterHours ? "when the office opens" : "shortly"}.`, callId: call.id, from: call.toNumber, isDemo: call.isDemo });
    } else if (sms.leadAcknowledgment && state.leadWorthy) {
      await sendTransactionalSms({ orgId: opts.orgId, contactId, to: phone, kind: "lead_ack", body: `${cfg.org.name}: thanks for reaching out. We received your request and will follow up soon.`, callId: call.id, from: call.toNumber, isDemo: call.isDemo });
    }
  }
  if (sms.missedCallTextBack && isMissedLead && engagedTurns === 0 && call.fromNumber && contactId) {
    await db.update(contacts).set({ smsConsent: true, smsConsentAt: now }).where(and(eq(contacts.id, contactId), eq(contacts.orgId, opts.orgId), sql`${contacts.smsOptedOutAt} is null`));
    await sendTransactionalSms({ orgId: opts.orgId, contactId, to: call.fromNumber, kind: "missed_call_followup", body: `${cfg.org.name}: sorry we missed your call. Reply here or call us back and we'll get you taken care of.`, callId: call.id, from: call.toNumber, isDemo: call.isDemo });
  }
  // Internal on-call alert for safety escalations (staff number, not a customer message).
  if (state.escalation?.lifeSafety && cfg.settings.afterHours.onCallNumber) {
    await sendTransactionalSms({ orgId: opts.orgId, contactId: null, to: cfg.settings.afterHours.onCallNumber, kind: "internal_alert", body: `SAFETY ESCALATION (${state.escalation.ruleName}) from ${phone ?? "unknown caller"}. Caller was told to leave and call 911/utility. Please follow up.`, callId: call.id, isDemo: call.isDemo });
  }

  // Summary
  let summary = buildSummary(state);
  if (isMissedLead && engagedTurns === 0) summary = missed ? `Missed call from ${call.fromNumber}. Callback task created.` : `Caller (${call.fromNumber}) hung up before describing the issue. Callback task created.`;
  if (call.transcriptEnabled && engagedTurns > 1) {
    const lines = await db.select().from(transcripts).where(eq(transcripts.callId, call.id)).orderBy(asc(transcripts.seq));
    const polished = await polishSummaryWithAi(summary, lines.map((l) => `${l.speaker}: ${l.text}`).join("\n"));
    if (polished) summary = polished;
  }
  if (outcome === "transferred" && opts.transferCompleted === false) outcome = "callback_requested";

  const endedAt = now;
  const duration = opts.durationSeconds ?? Math.max(1, Math.round((endedAt.getTime() - call.startedAt.getTime()) / 1000));
  const [updated] = await db
    .update(calls)
    .set({
      status: missed ? "missed" : "completed",
      endedAt,
      durationSeconds: duration,
      outcome: outcome as typeof call.outcome,
      intent: state.intentKey ?? call.intent,
      serviceCategory: state.intentKey && INTENT_BY_KEY[state.intentKey]?.kind === "service" ? state.intentKey : call.serviceCategory,
      urgency: state.urgency,
      serviceAreaStatus: state.serviceArea,
      address: state.fields.address ? `${state.fields.address}${state.fields.zip && !state.fields.address.includes(state.fields.zip) ? ` ${state.fields.zip}` : ""}` : call.address,
      callerName: state.fields.name ?? call.callerName,
      escalated: call.escalated || Boolean(state.escalation),
      transferStatus: state.transfer ? (opts.transferCompleted === false ? "failed" : opts.transferCompleted ? "completed" : "attempted") : call.transferStatus,
      qualification: state.fields as Record<string, unknown>,
      summary,
      contactId,
      leadId,
      appointmentId: state.appointment?.id ?? call.appointmentId,
    })
    .where(and(eq(calls.id, call.id), eq(calls.orgId, opts.orgId)))
    .returning();
  if (call.channel !== "simulator") {
    await db.insert(usageRecords).values({ orgId: opts.orgId, metric: "call_minutes", quantity: Math.max(1, Math.ceil(duration / 60)), callId: call.id });
  }
  await db.insert(callEvents).values({ orgId: opts.orgId, callId: call.id, type: "call.finalized", data: { outcome } });
  return updated;
}
