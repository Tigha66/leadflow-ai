import type { CallOutcome, Urgency } from "@/db/schema";
import { INTENT_BY_KEY, type AppointmentTypeKey, type IntentDef } from "@/lib/hvac/catalog";
import { classifyIntent, detectCustomerType, detectSystemType, isResidentialOrCommercial } from "@/lib/hvac/intents";
import { detectHazard, type EscalationRuleInput } from "@/lib/hvac/safety";
import type { OrgSettings } from "@/lib/org-settings";
import { renderGreeting } from "@/lib/org-settings";
import type { ServiceAreaCheck } from "@/lib/service-area";
import {
  chooseOption,
  cleanAddress,
  extractEmail,
  extractNameAnswer,
  extractPhone,
  extractVolunteeredName,
  extractZip,
  looksLikeAddress,
  parseYesNo,
} from "./extract";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type Awaiting =
  | "intent"
  | "clarify"
  | "name"
  | "phone_confirm"
  | "phone"
  | "email"
  | "address"
  | "zip"
  | "customer_type"
  | "description"
  | "referral"
  | "out_of_area_keep"
  | "slot_choice"
  | "sms_consent"
  | "anything_else"
  | "done";

export interface QualificationFields {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  zip?: string;
  city?: string;
  customerType?: "new" | "existing";
  propertyType?: "residential" | "commercial";
  description?: string;
  systemType?: string;
  referralSource?: string;
}

export interface OfferedSlot {
  startsAt: string;
  endsAt: string;
  label: string;
  technicianId?: string | null;
}

export interface ConversationState {
  version: 1;
  awaiting: Awaiting;
  turns: number;
  intentKey?: string;
  urgency: Urgency;
  afterHours: boolean;
  callerIdPhone?: string;
  fields: QualificationFields;
  serviceArea: ServiceAreaCheck["status"];
  serviceAreaName?: string;
  offeredSlots?: OfferedSlot[];
  slotPage: number;
  appointment?: { id: string; label: string; confirmed: boolean; startsAt: string; endsAt: string; appointmentTypeKey: string };
  smsConsent?: boolean;
  outcome?: CallOutcome;
  escalation?: { hazard: string; ruleName: string; lifeSafety: boolean };
  transfer?: { number: string; reason: string };
  callbackRequested: boolean;
  faqAnswered: boolean;
  leadWorthy: boolean;
  misunderstandings: number;
  ended: boolean;
  topics: string[];
}

export type EngineAction =
  | { type: "transfer"; number: string; reason: string }
  | { type: "hangup" }
  | { type: "escalate"; hazard: string; lifeSafety: boolean }
  | { type: "create_callback_task"; reason: string; urgent: boolean };

export interface TurnResult {
  state: ConversationState;
  reply: string;
  actions: EngineAction[];
}

export interface BookingRequest {
  appointmentTypeKey: AppointmentTypeKey;
  slot: OfferedSlot;
  fields: QualificationFields;
  urgency: Urgency;
  intentKey: string;
  serviceAreaStatus: ServiceAreaCheck["status"];
}

export type BookingResult =
  | { ok: true; id: string; confirmed: boolean; startsAt: string; endsAt: string; label: string }
  | { ok: false; reason: "slot_taken" | "not_allowed" | "error" };

/** Side-effecting capabilities injected by the caller (DB-backed, demo/in-memory, or realtime relay). */
export interface ReceptionistTools {
  checkServiceArea(input: { zip?: string; city?: string; text?: string }): Promise<ServiceAreaCheck>;
  findSlots(input: { appointmentTypeKey: AppointmentTypeKey; urgency: Urgency; page: number }): Promise<OfferedSlot[]>;
  bookAppointment(req: BookingRequest): Promise<BookingResult>;
  answerQuestion(input: { intentKey: string; text: string }): Promise<string | null>;
  /** Optional LLM-assisted intent classification for utterances the rules can't place. */
  classifyWithAi?(text: string): Promise<string | null>;
}

export interface ReceptionistContext {
  companyName: string;
  settings: OrgSettings;
  escalationRules: EscalationRuleInput[];
  isAfterHours: boolean;
  /** Service-category keys the company has enabled. Disabled intents get a polite decline. */
  enabledCategories?: string[];
  tools: ReceptionistTools;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const ACKS = ["Got it.", "Thanks.", "Okay.", "Perfect.", "Great."];
function ack(state: ConversationState): string {
  return ACKS[state.turns % ACKS.length];
}

function firstName(state: ConversationState): string {
  return state.fields.name?.split(" ")[0] ?? "";
}

function last4(phone?: string): string {
  return phone ? phone.slice(-4) : "";
}

const EMPATHY: Record<string, string> = {
  ac_not_cooling: "I'm sorry the AC isn't keeping up — let's get someone out to take a look.",
  ac_not_turning_on: "Sorry to hear the AC won't come on. Let's get a technician scheduled.",
  furnace_not_heating: "I'm sorry you're without heat. Let's get that looked at.",
  furnace_not_turning_on: "Sorry the furnace won't start. Let's get a technician out to you.",
  heat_pump_problem: "Okay, a heat pump issue. We can get that checked out.",
  thermostat_problem: "Thermostat trouble can be frustrating. Let's get it looked at.",
  strange_noise: "Unusual noises are worth checking. Let's get a technician out.",
  strange_smell: "Thanks for calling about that. Let's have a technician check it out.",
  water_leak: "Water around the equipment should be looked at soon. Let's get you scheduled.",
  maintenance: "Happy to set up a tune-up for you.",
  new_system_estimate: "We'd be glad to put together an estimate for a new system.",
  system_replacement: "Sure — we can set up a consultation to talk through replacement options.",
  indoor_air_quality: "Great — we can have someone go over indoor air quality options with you.",
  ductwork: "Okay, we can have someone look at the ductwork and airflow.",
  commercial_inquiry: "Thanks for thinking of us for your commercial property.",
};

export function newConversation(opts: { afterHours: boolean; callerIdPhone?: string | null }): ConversationState {
  return {
    version: 1,
    awaiting: "intent",
    turns: 0,
    urgency: "routine",
    afterHours: opts.afterHours,
    callerIdPhone: opts.callerIdPhone ?? undefined,
    fields: {},
    serviceArea: "unknown",
    slotPage: 0,
    callbackRequested: false,
    faqAnswered: false,
    leadWorthy: false,
    misunderstandings: 0,
    ended: false,
    topics: [],
  };
}

/** Opening line: greeting, optional AI disclosure, optional recording disclosure, after-hours note. */
export function openingLine(ctx: Pick<ReceptionistContext, "companyName" | "settings" | "isAfterHours">): string {
  const s = ctx.settings;
  const parts: string[] = [];
  let greeting = renderGreeting(s, ctx.companyName);
  if (s.recording.enabled) parts.push(s.recording.disclosureText);
  if (ctx.isAfterHours) {
    greeting = greeting.replace(/How can I help you today\?$/i, "").trim();
    parts.push(greeting, s.afterHours.script, "What's going on today?");
  } else {
    parts.push(greeting);
  }
  // Disclose AI when enabled and the greeting doesn't already say so.
  if (s.receptionist.aiDisclosureEnabled && !/virtual|ai\b|automated|artificial/i.test(greeting)) {
    parts.splice(s.recording.enabled ? 1 : 0, 0, s.receptionist.aiDisclosureText);
  }
  return parts.filter(Boolean).join(" ");
}

function opportunisticExtract(state: ConversationState, text: string) {
  const f = state.fields;
  f.name ??= extractVolunteeredName(text) ?? undefined;
  const zip = extractZip(text);
  if (zip && !f.zip) f.zip = zip;
  if (!f.systemType) f.systemType = detectSystemType(text) ?? undefined;
  if (!f.customerType) f.customerType = detectCustomerType(text) ?? undefined;
  if (!f.propertyType) f.propertyType = isResidentialOrCommercial(text) ?? undefined;
  const email = extractEmail(text);
  if (email && !f.email) f.email = email;
  if (!f.address && looksLikeAddress(text) && /\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|way|blvd|ct|court|pl|place|pkwy|circle|cir|trail|trl)\b/i.test(text)) {
    f.address = cleanAddress(text);
  }
}

function isServiceIntent(intent?: IntentDef): boolean {
  return intent?.kind === "service";
}

function currentIntent(state: ConversationState): IntentDef | undefined {
  return state.intentKey ? INTENT_BY_KEY[state.intentKey] : undefined;
}

function appointmentTypeFor(state: ConversationState): AppointmentTypeKey {
  const intent = currentIntent(state);
  if (state.urgency === "emergency") return "emergency";
  return intent?.appointmentType ?? "repair";
}

/* ------------------------------------------------------------------ */
/* Engine                                                               */
/* ------------------------------------------------------------------ */

/**
 * Advances the conversation by one caller utterance. Pure with respect to its inputs apart from the
 * injected tools, so it is shared by the phone (Twilio Gather) flow, the dashboard simulator, the
 * public demo and the realtime relay's fallback logic.
 */
export async function respond(prev: ConversationState, rawText: string, ctx: ReceptionistContext): Promise<TurnResult> {
  const state: ConversationState = structuredClone(prev);
  const actions: EngineAction[] = [];
  const text = (rawText ?? "").trim();
  state.turns += 1;

  if (state.ended) return { state, reply: "", actions: [{ type: "hangup" }] };

  if (!text) {
    state.misunderstandings += 1;
    if (state.misunderstandings >= 3) return endWithCallback(state, ctx, actions, "I'm having trouble hearing you. I'll have someone from our office call you back.");
    return { state, reply: "Sorry, I didn't catch that. Could you say that again?", actions };
  }

  // 1) Safety first — every turn.
  if (!state.escalation) {
    const hazard = detectHazard(text, ctx.escalationRules);
    if (hazard) {
      state.escalation = { hazard: String(hazard.rule.hazard), ruleName: hazard.rule.name, lifeSafety: hazard.lifeSafety };
      actions.push({ type: "escalate", hazard: String(hazard.rule.hazard), lifeSafety: hazard.lifeSafety });
      if (hazard.lifeSafety || hazard.rule.action === "safety_script") {
        state.urgency = "emergency";
        state.outcome = "escalated";
        state.leadWorthy = true;
        if (!state.intentKey) {
          const cls = classifyIntent(text);
          state.intentKey = cls.intent.kind === "service" ? cls.intent.key : "other";
        }
        state.fields.description ??= text;
        const onCall = hazard.rule.transferNumber || ctx.settings.afterHours.onCallNumber;
        actions.push({ type: "create_callback_task", reason: `Safety escalation: ${hazard.rule.name}`, urgent: true });
        state.callbackRequested = true;
        state.ended = true;
        state.awaiting = "done";
        const follow = onCall
          ? " Once you're somewhere safe, our on-call team will call you back at this number."
          : " Once you're somewhere safe, our team will follow up with you at this number.";
        actions.push({ type: "hangup" });
        return { state, reply: `${hazard.rule.script}${follow} Please go now and stay safe.`, actions };
      }
      if (hazard.rule.action === "priority_booking") {
        state.urgency = state.urgency === "emergency" ? "emergency" : "priority";
        const rest = await advance(state, text, ctx, actions);
        return { state, reply: `${hazard.rule.script} ${rest}`.trim(), actions };
      }
      if (hazard.rule.action === "transfer_on_call" && (hazard.rule.transferNumber || ctx.settings.afterHours.onCallNumber)) {
        const number = hazard.rule.transferNumber || ctx.settings.afterHours.onCallNumber;
        state.urgency = "emergency";
        state.outcome = "transferred";
        state.transfer = { number, reason: hazard.rule.name };
        state.ended = true;
        actions.push({ type: "transfer", number, reason: hazard.rule.name });
        return { state, reply: `${hazard.rule.script} I'm connecting you with our on-call team now.`, actions };
      }
    }
  }

  const reply = await advance(state, text, ctx, actions);
  return { state, reply, actions };
}

async function advance(state: ConversationState, text: string, ctx: ReceptionistContext, actions: EngineAction[]): Promise<string> {
  const f = state.fields;

  switch (state.awaiting) {
    case "intent":
    case "clarify":
    case "anything_else": {
      if (state.awaiting === "anything_else") {
        const yn = parseYesNo(text);
        const cls = classifyIntent(text);
        if (yn === "no" && cls.confidence === 0) return goodbye(state, ctx, actions);
        if (yn === "yes" && cls.confidence === 0) {
          state.awaiting = "clarify";
          return "Sure — what else can I help with?";
        }
      }
      return handleIntent(state, text, ctx, actions);
    }
    case "name": {
      const name = extractNameAnswer(text);
      opportunisticExtract(state, text);
      if (name) f.name = name;
      else if (!f.name) {
        state.misunderstandings += 1;
        if (state.misunderstandings >= 2) f.name = "Caller";
        else return "Sorry — could I get your first and last name?";
      }
      return nextStep(state, ctx, actions, `Thanks, ${firstName(state)}.`);
    }
    case "phone_confirm": {
      const yn = parseYesNo(text);
      const typed = extractPhone(text);
      if (typed) {
        f.phone = typed;
        return nextStep(state, ctx, actions, ack(state));
      }
      if (yn === "yes") {
        f.phone = state.callerIdPhone;
        return nextStep(state, ctx, actions, ack(state));
      }
      state.awaiting = "phone";
      return "No problem. What's the best number to reach you?";
    }
    case "phone": {
      const phone = extractPhone(text);
      if (!phone) {
        state.misunderstandings += 1;
        if (state.misunderstandings >= 3 && state.callerIdPhone) {
          f.phone = state.callerIdPhone;
          return nextStep(state, ctx, actions, "I'll use the number you're calling from.");
        }
        return "Sorry, I didn't get that. Could you say the ten-digit number, digit by digit?";
      }
      f.phone = phone;
      return nextStep(state, ctx, actions, ack(state));
    }
    case "email": {
      const email = extractEmail(text);
      if (email) f.email = email;
      state.awaiting = "address";
      return nextStep(state, ctx, actions, email ? ack(state) : "No problem, we'll skip that.");
    }
    case "address": {
      const cleaned = cleanAddress(text);
      const zip = extractZip(text);
      if (zip) f.zip = zip;
      f.address = cleaned;
      if (!f.zip) {
        const area = await ctx.tools.checkServiceArea({ text: cleaned });
        if (area.status === "in_area") {
          state.serviceArea = "in_area";
          state.serviceAreaName = area.matchedArea;
          return nextStep(state, ctx, actions, ack(state));
        }
        state.awaiting = "zip";
        return "And what's the ZIP code there?";
      }
      return checkAreaThenContinue(state, ctx, actions);
    }
    case "zip": {
      const zip = extractZip(text);
      if (!zip) {
        state.misunderstandings += 1;
        if (state.misunderstandings >= 3) {
          state.serviceArea = "unknown";
          return nextStep(state, ctx, actions, "No problem, our dispatcher will confirm the location.");
        }
        return "Sorry, could you repeat the five-digit ZIP code?";
      }
      f.zip = zip;
      return checkAreaThenContinue(state, ctx, actions);
    }
    case "customer_type": {
      const yn = parseYesNo(text);
      const detected = detectCustomerType(text);
      f.customerType = detected ?? (yn === "yes" ? "existing" : "new");
      return nextStep(state, ctx, actions, f.customerType === "existing" ? "Thanks for being a customer." : "Welcome — glad you called.");
    }
    case "description": {
      f.description = [f.description, text].filter(Boolean).join(" — ");
      opportunisticExtract(state, text);
      const reclass = classifyIntent(text);
      if ((state.intentKey === "other" || !state.intentKey) && reclass.confidence > 0) {
        state.intentKey = reclass.intent.key;
        if (reclass.intent.defaultUrgency === "priority" && state.urgency === "routine") state.urgency = "priority";
      }
      if (state.intentKey === "other") state.intentKey = "other";
      return nextStep(state, ctx, actions, ack(state));
    }
    case "referral": {
      f.referralSource = text.slice(0, 120);
      return nextStep(state, ctx, actions, "Thanks for letting us know.");
    }
    case "out_of_area_keep": {
      const yn = parseYesNo(text);
      state.leadWorthy = yn !== "no";
      state.outcome = "out_of_area";
      state.awaiting = "anything_else";
      return yn === "no"
        ? "Understood. Is there anything else I can help with?"
        : "Okay, I've saved your information and someone will reach out if we're able to help. Anything else I can do for you?";
    }
    case "slot_choice": {
      const offered = state.offeredSlots ?? [];
      if (/\b(none|neither|no(ne)? of (those|them)|other (times|days)|later|something else|different)\b/i.test(text) && chooseOption(text, offered.map((o) => o.label)) === null) {
        state.slotPage += 1;
        return offerSlots(state, ctx, actions, "No problem.");
      }
      const idx = chooseOption(text, offered.map((o) => o.label));
      if (idx === null) {
        const yn = parseYesNo(text);
        if (yn === "yes" && offered.length) return bookSlot(state, ctx, actions, offered[0]);
        state.misunderstandings += 1;
        if (state.misunderstandings >= 3) return endWithCallback(state, ctx, actions, "Let me have our dispatcher call you to find a time that works.").reply;
        return `Which works better: ${offered.map((o, i) => `${["the first", "the second", "the third"][i]}, ${o.label}`).join("; ")}?`;
      }
      return bookSlot(state, ctx, actions, offered[idx]);
    }
    case "sms_consent": {
      const yn = parseYesNo(text);
      state.smsConsent = yn === "yes";
      state.awaiting = "anything_else";
      return `${state.smsConsent ? "Great, you'll get a text shortly." : "No problem, no text."} Is there anything else I can help with?`;
    }
    case "done":
    default:
      return goodbye(state, ctx, actions);
  }
}

async function handleIntent(state: ConversationState, text: string, ctx: ReceptionistContext, actions: EngineAction[]): Promise<string> {
  opportunisticExtract(state, text);
  let cls = classifyIntent(text);
  if (cls.confidence === 0 && ctx.tools.classifyWithAi) {
    const key = await ctx.tools.classifyWithAi(text).catch(() => null);
    if (key && INTENT_BY_KEY[key]) cls = { intent: INTENT_BY_KEY[key], confidence: 0.5, matched: [] };
  }
  const intent = cls.intent;
  state.topics.push(intent.key);

  // Enabled categories check (service intents only).
  if (intent.kind === "service" && ctx.enabledCategories && !ctx.enabledCategories.includes(intent.key)) {
    state.intentKey = intent.key;
    state.leadWorthy = true;
    state.fields.description ??= text;
    state.callbackRequested = true;
    return collectForCallback(state, ctx, actions, `That's not something we typically schedule over the phone, but I can have someone from the office follow up.`);
  }

  switch (intent.kind) {
    case "service": {
      const first = !state.intentKey || state.intentKey === "other" || !isServiceIntent(currentIntent(state));
      state.intentKey = intent.key;
      state.leadWorthy = true;
      if (!state.fields.description || first) state.fields.description = text;
      if (intent.defaultUrgency === "priority" && state.urgency === "routine") state.urgency = "priority";
      if (intent.key === "commercial_inquiry") state.fields.propertyType = "commercial";
      if (state.afterHours && ctx.settings.afterHours.urgentCategories.includes(intent.key) && state.urgency === "routine") state.urgency = "priority";
      return nextStep(state, ctx, actions, EMPATHY[intent.key] ?? "I can help with that.");
    }
    case "account": {
      state.intentKey = intent.key;
      state.fields.description = text;
      state.callbackRequested = true;
      const lead =
        intent.key === "cancellation"
          ? "I can help with that. I'll pass your cancellation request to our office so they can take care of it and confirm with you."
          : intent.key === "reschedule"
            ? "I can help get that moved. I'll send the request to our dispatcher, who will confirm the new time with you."
            : "Let me get our dispatch team to check on your appointment and get back to you.";
      return collectForCallback(state, ctx, actions, lead);
    }
    case "info": {
      state.intentKey ??= intent.key;
      const answer = await ctx.tools.answerQuestion({ intentKey: intent.key, text });
      state.faqAnswered = true;
      state.outcome ??= "faq_answered";
      state.awaiting = "anything_else";
      if (intent.key === "pricing_question" && !answer) {
        return `${ctx.settings.receptionist.pricingResponse} Would you like me to set that up?`;
      }
      if (intent.key === "billing_question" && ctx.settings.transfers.billingNumber && isBusinessTime(state)) {
        state.transfer = { number: ctx.settings.transfers.billingNumber, reason: "Billing question" };
        state.outcome = "transferred";
        state.ended = true;
        actions.push({ type: "transfer", number: ctx.settings.transfers.billingNumber, reason: "Billing question" });
        return "Let me connect you with our office for billing questions. One moment.";
      }
      if (!answer) {
        state.callbackRequested = true;
        return collectForCallback(state, ctx, actions, "That's a great question — I don't want to give you wrong information, so I'll have someone from the office follow up.");
      }
      return `${answer} Is there anything else I can help with?`;
    }
    case "human": {
      const number = isBusinessTime(state)
        ? ctx.settings.transfers.mainNumber
        : ctx.settings.afterHours.transferUrgent && state.urgency !== "routine"
          ? ctx.settings.afterHours.onCallNumber
          : "";
      if (number && ctx.settings.transfers.transferOnRequest) {
        state.transfer = { number, reason: "Caller asked for a person" };
        state.outcome = "transferred";
        state.ended = true;
        actions.push({ type: "transfer", number, reason: "Caller asked for a person" });
        return "Of course. Let me connect you with someone on our team. One moment please.";
      }
      state.callbackRequested = true;
      state.intentKey ??= intent.key;
      return collectForCallback(
        state,
        ctx,
        actions,
        state.afterHours ? "Our team is out of the office right now, but I'll make sure someone calls you back first thing." : "Everyone's helping other customers right now, but I'll have someone call you back shortly.",
      );
    }
    default: {
      if (state.awaiting === "clarify" || state.misunderstandings >= 1) {
        // Treat as a general service request instead of looping.
        state.intentKey = "other";
        state.leadWorthy = true;
        state.fields.description = text;
        return nextStep(state, ctx, actions, "Thanks for explaining.");
      }
      state.misunderstandings += 1;
      state.awaiting = "clarify";
      return "Got it. Could you tell me a little more about what's going on with your heating or cooling, or what you're calling about?";
    }
  }
}

function isBusinessTime(state: ConversationState): boolean {
  return !state.afterHours;
}

/** Collect just name + phone, then create a callback task. */
async function collectForCallback(state: ConversationState, ctx: ReceptionistContext, actions: EngineAction[], lead: string): Promise<string> {
  state.callbackRequested = true;
  return nextStep(state, ctx, actions, lead);
}

/** Decide the next question. Collects information progressively — one question at a time. */
async function nextStep(state: ConversationState, ctx: ReceptionistContext, actions: EngineAction[], prefix: string): Promise<string> {
  const f = state.fields;
  const say = (q: string) => `${prefix} ${q}`.trim();
  const callbackOnly = state.callbackRequested && !isServiceIntent(currentIntent(state));

  if (!f.name) {
    state.awaiting = "name";
    return say("Can I get your name?");
  }
  if (!f.phone) {
    if (state.callerIdPhone) {
      state.awaiting = "phone_confirm";
      return say(`Is the number ending in ${last4(state.callerIdPhone)} the best one to reach you?`);
    }
    state.awaiting = "phone";
    return say("What's the best phone number to reach you?");
  }
  if (callbackOnly) {
    return finishCallback(state, ctx, actions, prefix);
  }
  if (ctx.settings.receptionist.collectEmail && f.email === undefined && state.awaiting !== "email") {
    state.awaiting = "email";
    return say("What's a good email for your records? You can say skip.");
  }
  if (!f.address) {
    state.awaiting = "address";
    return say("What's the address where you need service, including the ZIP code?");
  }
  if (state.serviceArea === "unknown" && f.zip) {
    return checkAreaThenContinue(state, ctx, actions, prefix);
  }
  if (state.serviceArea === "out_of_area") {
    state.awaiting = "out_of_area_keep";
    return say("Would you like me to keep your information on file in case our service area changes?");
  }
  if (!f.customerType) {
    state.awaiting = "customer_type";
    return say("Have we been out to this address before?");
  }
  const intent = currentIntent(state);
  if (!f.description || (intent?.key === "other" && f.description.split(/\s+/).length < 4)) {
    state.awaiting = "description";
    return say("Can you briefly describe what's going on?");
  }
  if (ctx.settings.receptionist.askReferralSource && !f.referralSource && f.customerType === "new") {
    state.awaiting = "referral";
    return say("And how did you hear about us?");
  }
  f.propertyType ??= "residential";
  return scheduleOrRoute(state, ctx, actions, prefix);
}

async function checkAreaThenContinue(state: ConversationState, ctx: ReceptionistContext, actions: EngineAction[], prefix = ""): Promise<string> {
  const f = state.fields;
  const area = await ctx.tools.checkServiceArea({ zip: f.zip, city: f.city, text: f.address });
  state.serviceArea = area.status;
  state.serviceAreaName = area.matchedArea;
  if (area.status === "out_of_area") {
    state.outcome = "out_of_area";
    state.awaiting = "out_of_area_keep";
    return `${prefix} I'm sorry — it looks like that address is outside the area ${ctx.companyName} currently serves, so I can't book a visit there. Would you like me to keep your information on file in case that changes?`.trim();
  }
  return nextStep(state, ctx, actions, prefix || ack(state));
}

async function scheduleOrRoute(state: ConversationState, ctx: ReceptionistContext, actions: EngineAction[], prefix: string): Promise<string> {
  const ah = ctx.settings.afterHours;
  // Urgent after-hours: hand off to on-call when configured.
  if (state.afterHours && state.urgency !== "routine" && ah.transferUrgent && ah.onCallNumber) {
    state.transfer = { number: ah.onCallNumber, reason: "Urgent after-hours call" };
    state.outcome = "transferred";
    state.ended = true;
    actions.push({ type: "transfer", number: ah.onCallNumber, reason: "Urgent after-hours call" });
    return `${prefix} Since this sounds urgent, I'm connecting you with our on-call technician now. Please hold.`.trim();
  }
  if (state.afterHours && !ah.allowOvernightBooking) {
    return finishCallback(state, ctx, actions, `${prefix} I've got everything I need.`);
  }
  if (state.serviceArea === "unknown") {
    // Never promise service we can't verify — hand off to a human.
    return finishCallback(state, ctx, actions, `${prefix} I wasn't able to confirm that address is in our service area, so I'll have our dispatcher confirm and call you.`);
  }
  return offerSlots(state, ctx, actions, prefix);
}

async function offerSlots(state: ConversationState, ctx: ReceptionistContext, actions: EngineAction[], prefix: string): Promise<string> {
  const slots = await ctx.tools.findSlots({ appointmentTypeKey: appointmentTypeFor(state), urgency: state.urgency, page: state.slotPage });
  if (!slots.length) {
    return finishCallback(state, ctx, actions, `${prefix} I don't see an open time I can offer right now, so I'll have our dispatcher call you to get you on the schedule.`);
  }
  const top = slots.slice(0, 3);
  state.offeredSlots = top;
  state.awaiting = "slot_choice";
  const options = top.length === 1 ? top[0].label : `${top.slice(0, -1).map((s) => s.label).join(", ")}, or ${top[top.length - 1].label}`;
  const lead = state.slotPage === 0 ? "The earliest I have is" : "I also have";
  return `${prefix} ${lead} ${options}. Which works best?`.replace(/\s+/g, " ").trim();
}

async function bookSlot(state: ConversationState, ctx: ReceptionistContext, actions: EngineAction[], slot: OfferedSlot): Promise<string> {
  const result = await ctx.tools.bookAppointment({
    appointmentTypeKey: appointmentTypeFor(state),
    slot,
    fields: state.fields,
    urgency: state.urgency,
    intentKey: state.intentKey ?? "other",
    serviceAreaStatus: state.serviceArea,
  });
  if (!result.ok) {
    if (result.reason === "slot_taken") {
      state.slotPage = 0;
      return offerSlots(state, ctx, actions, "Sorry — that time was just taken.");
    }
    return finishCallback(state, ctx, actions, "I wasn't able to lock in that time, so I'll have our dispatcher call you to confirm.");
  }
  state.appointment = {
    id: result.id,
    label: result.label,
    confirmed: result.confirmed,
    startsAt: result.startsAt,
    endsAt: result.endsAt,
    appointmentTypeKey: appointmentTypeFor(state),
  };
  state.outcome = "booked";
  const confirmLine = result.confirmed
    ? `You're all set for ${result.label}. The technician will call when they're on the way.`
    : `I've sent a request for ${result.label} to our dispatch team. They'll confirm it with you shortly.`;
  if (ctx.settings.sms.enabled && ctx.settings.sms.appointmentConfirmation && state.fields.phone) {
    state.awaiting = "sms_consent";
    return `${confirmLine} Can I text a confirmation to the number ending in ${last4(state.fields.phone)}?`;
  }
  state.awaiting = "anything_else";
  return `${confirmLine} Is there anything else I can help with?`;
}

async function finishCallback(state: ConversationState, ctx: ReceptionistContext, actions: EngineAction[], prefix: string): Promise<string> {
  state.callbackRequested = true;
  state.leadWorthy = state.leadWorthy || isServiceIntent(currentIntent(state));
  if (!state.outcome || state.outcome === "faq_answered") state.outcome = state.leadWorthy ? "lead_captured" : "callback_requested";
  const urgent = state.urgency !== "routine";
  actions.push({ type: "create_callback_task", reason: currentIntent(state)?.label ?? "Callback requested", urgent });
  const when = state.afterHours ? "first thing when the office opens" : "shortly";
  const sms = ctx.settings.sms.enabled && ctx.settings.sms.callbackConfirmation && state.fields.phone;
  if (sms) {
    state.awaiting = "sms_consent";
    return `${prefix} Someone from ${ctx.companyName} will call you ${when}. Would you like a text confirming that?`.replace(/\s+/g, " ").trim();
  }
  state.awaiting = "anything_else";
  return `${prefix} Someone from ${ctx.companyName} will call you ${when}. Is there anything else I can help with?`.replace(/\s+/g, " ").trim();
}

function goodbye(state: ConversationState, ctx: ReceptionistContext, actions: EngineAction[]): string {
  state.ended = true;
  state.awaiting = "done";
  actions.push({ type: "hangup" });
  const name = firstName(state);
  return `Thanks for calling ${ctx.companyName}${name && name !== "Caller" ? `, ${name}` : ""}. Have a great day!`;
}

function endWithCallback(state: ConversationState, ctx: ReceptionistContext, actions: EngineAction[], line: string): TurnResult {
  state.callbackRequested = true;
  state.outcome ??= "callback_requested";
  state.ended = true;
  state.awaiting = "done";
  actions.push({ type: "create_callback_task", reason: "Caller could not be understood", urgent: false }, { type: "hangup" });
  return { state, reply: `${line} Thanks for calling ${ctx.companyName}.`, actions };
}

/* ------------------------------------------------------------------ */
/* Summaries                                                            */
/* ------------------------------------------------------------------ */

/** Final outcome when the call ends (e.g. the caller hangs up mid-conversation). */
export function finalOutcome(state: ConversationState): CallOutcome {
  if (state.outcome) return state.outcome;
  if (state.appointment) return "booked";
  if (state.leadWorthy && (state.fields.phone || state.callerIdPhone)) return "lead_captured";
  if (state.callbackRequested) return "callback_requested";
  if (state.turns <= 1) return "abandoned";
  return "other";
}

export function buildSummary(state: ConversationState, companyTz?: string): string {
  const f = state.fields;
  const def = state.intentKey ? INTENT_BY_KEY[state.intentKey] : undefined;
  const who = f.name && f.name !== "Caller" ? f.name : "Caller";
  const parts: string[] = [];
  const topics = Array.from(new Set(state.topics.map((t) => INTENT_BY_KEY[t]?.label ?? t))).join("; ");
  const about = def && def.key !== "other" ? def.label : topics || "a general request";
  const verb = def?.kind === "info" ? "asked about" : "called about";
  parts.push(`${who}${f.customerType ? ` (${f.customerType} customer${f.propertyType === "commercial" ? ", commercial" : ""})` : ""} ${verb} ${about}.`);
  if (def?.kind === "info" && topics && topics !== about) parts.push(`Topics: ${topics}.`);
  if (f.description && f.description.length > 3) parts.push(`Caller said: "${f.description.slice(0, 220)}".`);
  if (f.systemType) parts.push(`System: ${f.systemType}.`);
  if (f.address) {
    const area = state.serviceArea === "in_area" ? "in service area" : state.serviceArea === "out_of_area" ? "OUTSIDE service area" : "service area not verified";
    parts.push(`Address: ${f.address}${f.zip && !f.address.includes(f.zip) ? ` ${f.zip}` : ""} (${area}).`);
  }
  if (state.escalation) parts.push(`SAFETY ESCALATION: ${state.escalation.ruleName}. Caller was given the safety script.`);
  if (state.urgency !== "routine") parts.push(`Urgency: ${state.urgency}.`);
  if (state.afterHours) parts.push("After-hours call.");
  if (state.appointment) parts.push(`${state.appointment.confirmed ? "Booked" : "Requested"}: ${state.appointment.label}.`);
  if (state.transfer) parts.push(`Transferred to ${state.transfer.number} (${state.transfer.reason}).`);
  if (state.callbackRequested && !state.appointment) parts.push("Callback requested.");
  if (state.smsConsent !== undefined) parts.push(state.smsConsent ? "Caller agreed to SMS confirmation." : "Caller declined SMS.");
  void companyTz;
  return parts.join(" ");
}
