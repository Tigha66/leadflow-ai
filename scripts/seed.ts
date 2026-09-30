/**
 * Seeds the fictional demo company "Desert Air Heating & Cooling" with realistic, clearly-labeled
 * demo data. Re-running replaces the demo organization (other organizations are never touched).
 *
 *   npm run db:seed
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  calls,
  contacts,
  dispatchRecords,
  faqs,
  knowledgeDocuments,
  leadNotes,
  leads,
  locations,
  organizations,
  phoneNumbers,
  properties,
  serviceAreas,
  smsMessages,
  subscriptions,
  tasks,
  technicians,
  transcripts,
  users,
  type CallOutcome,
  type LeadStage,
  type Urgency,
} from "@/db/schema";
import { INTENT_BY_KEY, type AppointmentTypeKey } from "@/lib/hvac/catalog";
import {
  DEMO_COMPANY,
  DEMO_DOCUMENTS,
  DEMO_FAQS,
  DEMO_HOURS,
  DEMO_SERVICE_AREAS,
  DEMO_SETTINGS,
  DEMO_TECHNICIANS,
  DEMO_USER,
} from "@/lib/demo/desert-air";
import { isOpenAt } from "@/lib/scheduling/hours";
import { addDaysToKey, dateKey, zonedTimeToUtc } from "@/lib/time";
import { hashPassword } from "@/lib/passwords";
import { createOrganizationWithDefaults } from "@/server/org-bootstrap";

// Deterministic PRNG so the demo looks the same on every seed.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const weighted = <T,>(items: [T, number][]): T => {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) if ((r -= w) <= 0) return v;
  return items[0][0];
};

const FIRST = ["Maria", "James", "Linda", "Robert", "Patricia", "Michael", "Jennifer", "David", "Elizabeth", "Daniel", "Susan", "Carlos", "Jessica", "Anthony", "Sarah", "Kevin", "Angela", "Brian", "Nicole", "Luis", "Rachel", "Omar", "Grace", "Tyler", "Hannah", "Victor", "Megan", "Andre", "Olivia", "Sam"];
const LAST = ["Lopez", "Nguyen", "Patel", "Johnson", "Garcia", "Kim", "Martinez", "Brown", "Rivera", "Davis", "Chen", "Wilson", "Anderson", "Thomas", "Hernandez", "Moore", "Jackson", "Lee", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres"];
const STREETS = ["N 7th Ave", "E Camelback Rd", "W Indian School Rd", "E Thomas Rd", "N Central Ave", "E McDowell Rd", "S Mill Ave", "E Baseline Rd", "N Scottsdale Rd", "E Shea Blvd", "W Glendale Ave", "E Southern Ave", "N 44th St", "E Guadalupe Rd", "W Chandler Blvd"];

const INTENT_MIX: [string, number][] = [
  ["ac_not_cooling", 26],
  ["ac_not_turning_on", 8],
  ["maintenance", 12],
  ["thermostat_problem", 5],
  ["strange_noise", 5],
  ["water_leak", 5],
  ["new_system_estimate", 6],
  ["system_replacement", 4],
  ["heat_pump_problem", 4],
  ["furnace_not_heating", 3],
  ["indoor_air_quality", 3],
  ["ductwork", 2],
  ["commercial_inquiry", 2],
  ["existing_appointment", 4],
  ["reschedule", 3],
  ["hours", 3],
  ["pricing_question", 3],
  ["membership_question", 2],
  ["billing_question", 2],
  ["speak_with_staff", 2],
];

const DESCRIPTIONS: Record<string, string[]> = {
  ac_not_cooling: ["AC is running but blowing warm air, house is at 88.", "Upstairs won't get below 84 even with the AC running all day.", "Unit runs constantly and the house isn't cooling down."],
  ac_not_turning_on: ["Outdoor unit won't kick on, thermostat is calling for cool.", "AC stopped turning on after a storm last night."],
  maintenance: ["Wants a spring AC tune-up before summer.", "Annual maintenance for two systems.", "Comfort Club member due for a tune-up."],
  thermostat_problem: ["Thermostat screen is blank.", "New smart thermostat isn't talking to the system."],
  strange_noise: ["Loud rattling from the outdoor unit.", "Squealing noise when the air handler starts."],
  water_leak: ["Water pooling around the air handler in the garage.", "Drain line seems clogged, water in the closet."],
  new_system_estimate: ["System is 18 years old, wants a quote on a new one.", "Looking at a heat pump for a new addition."],
  system_replacement: ["Tech said the compressor is failing, wants replacement options.", "Replacing an old package unit."],
  heat_pump_problem: ["Heat pump iced over this morning.", "Heat pump keeps short cycling."],
  furnace_not_heating: ["Furnace blowing cold air on a chilly morning."],
  indoor_air_quality: ["Asking about air purifiers for allergies.", "Interested in a whole-home dehumidifier."],
  ductwork: ["Back bedroom is always 6 degrees warmer.", "Wants ductwork inspected after a remodel."],
  commercial_inquiry: ["Small office rooftop unit not cooling.", "Restaurant needs a maintenance agreement quote."],
  existing_appointment: ["Checking on technician arrival time."],
  reschedule: ["Needs to move Thursday appointment to next week."],
  hours: ["Asked about Saturday hours."],
  pricing_question: ["Asked about the diagnostic fee."],
  membership_question: ["Asked what the Comfort Club includes."],
  billing_question: ["Question about an invoice from last week."],
  speak_with_staff: ["Asked to speak with the office manager."],
};

const JOB_VALUE: Record<string, [number, number]> = {
  repair: [250, 1400],
  maintenance: [129, 259],
  estimate: [6500, 14500],
  install_consult: [7500, 16000],
  emergency: [350, 1600],
};

async function main() {
  const db = getDb();
  console.log("[seed] seeding Desert Air demo…");

  // Demo user
  let [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${DEMO_USER.email}`).limit(1);
  if (!user) {
    [user] = await db.insert(users).values({ email: DEMO_USER.email, name: DEMO_USER.name, passwordHash: await hashPassword(DEMO_USER.password) }).returning();
  }

  // Replace existing demo org.
  await db.delete(organizations).where(eq(organizations.slug, DEMO_COMPANY.slug));
  const org = await createOrganizationWithDefaults({
    name: DEMO_COMPANY.name,
    ownerUserId: user.id,
    timezone: DEMO_COMPANY.timezone,
    phone: DEMO_COMPANY.phone,
    isDemo: true,
    settings: DEMO_SETTINGS,
    hours: DEMO_HOURS,
    slug: DEMO_COMPANY.slug,
  });
  await db.update(organizations).set({ onboardingStep: 13, onboardingCompletedAt: new Date(), website: DEMO_COMPANY.website }).where(eq(organizations.id, org.id));
  await db.update(subscriptions).set({ plan: "pro", status: "demo" }).where(eq(subscriptions.orgId, org.id));

  const [loc] = await db.insert(locations).values({ orgId: org.id, name: "Phoenix HQ", address: "2150 E Fictional Way", city: "Phoenix", state: "AZ", zip: "85016", isPrimary: true }).returning();
  await db.insert(serviceAreas).values(DEMO_SERVICE_AREAS.map((a) => ({ orgId: org.id, locationId: loc.id, name: a.name, zipCodes: a.zipCodes, cities: a.cities, active: a.active })));
  const techRows = await db.insert(technicians).values(DEMO_TECHNICIANS.map((t) => ({ orgId: org.id, locationId: loc.id, name: t.name, team: t.team, skills: t.skills, phone: t.phone }))).returning();
  await db.insert(faqs).values(DEMO_FAQS.map((f) => ({ orgId: org.id, ...f })));
  await db.insert(knowledgeDocuments).values(DEMO_DOCUMENTS.map((d) => ({ orgId: org.id, ...d })));
  const [phone] = await db.insert(phoneNumbers).values({ orgId: org.id, e164: DEMO_COMPANY.phone, label: "Main line (demo)", provider: "simulated", status: "simulated", locationId: loc.id }).returning();

  // Historical calls — 45 days back plus today.
  const tz = DEMO_COMPANY.timezone;
  const now = new Date();
  const todayKey = dateKey(now, tz);
  const allZips = DEMO_SERVICE_AREAS.flatMap((a) => a.zipCodes);
  const cityForZip = (zip: string) => DEMO_SERVICE_AREAS.find((a) => a.zipCodes.includes(zip))?.cities[0] ?? "Phoenix";
  let callCount = 0;

  for (let d = 45; d >= 0; d--) {
    const key = addDaysToKey(todayKey, -d);
    const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
    const volume = Math.round((weekday === 0 ? 4 : weekday === 6 ? 7 : 11) * (0.75 + rand() * 0.6) * (d === 0 ? 0.6 : 1));
    for (let i = 0; i < volume; i++) {
      const afterHoursCall = rand() < 0.28;
      const hour = afterHoursCall ? pick([5, 6, 18, 19, 20, 21, 22]) : 7 + Math.floor(rand() * 10);
      const minute = Math.floor(rand() * 60);
      const startedAt = zonedTimeToUtc(key, `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`, tz);
      if (startedAt > now) continue;
      const afterHours = !isOpenAt(startedAt, tz, DEMO_HOURS);
      const intentKey = weighted(INTENT_MIX);
      const intent = INTENT_BY_KEY[intentKey];
      const name = `${pick(FIRST)} ${pick(LAST)}`;
      const phoneNum = `+1602555${String(1000 + Math.floor(rand() * 8999)).slice(0, 4)}`;
      const outOfArea = intent.kind === "service" && rand() < 0.06;
      const zip = outOfArea ? pick(["85701", "85326", "85142", "86001"]) : pick(allZips);
      const address = `${100 + Math.floor(rand() * 9800)} ${pick(STREETS)}, ${outOfArea ? pick(["Tucson", "Buckeye", "Queen Creek", "Flagstaff"]) : cityForZip(zip)} ${zip}`;
      const description = pick(DESCRIPTIONS[intentKey] ?? ["General question."]);
      const escalatedCall = intent.kind === "service" && rand() < 0.03;
      let urgency: Urgency = escalatedCall ? "emergency" : intent.defaultUrgency;
      if (afterHours && urgency === "routine" && ["water_leak"].includes(intentKey)) urgency = "priority";

      let outcome: CallOutcome;
      if (escalatedCall) outcome = "escalated";
      else if (outOfArea) outcome = "out_of_area";
      else if (intent.kind === "service") outcome = weighted<CallOutcome>([["booked", 62], ["lead_captured", 16], ["callback_requested", 10], ["transferred", 5], ["abandoned", 7]]);
      else if (intent.kind === "info") outcome = weighted<CallOutcome>([["faq_answered", 80], ["callback_requested", 12], ["transferred", 8]]);
      else if (intent.kind === "account") outcome = "callback_requested";
      else outcome = weighted<CallOutcome>([["transferred", 60], ["callback_requested", 40]]);
      if (d === 0 && i === 0) outcome = "missed";

      const duration = outcome === "missed" ? 0 : outcome === "abandoned" ? 20 + Math.floor(rand() * 30) : outcome === "faq_answered" ? 60 + Math.floor(rand() * 90) : 150 + Math.floor(rand() * 240);
      const hasLead = intent.kind === "service" || outcome === "missed" || (intent.kind === "account" && rand() < 0.3);
      const smsConsent = outcome === "booked" ? rand() < 0.8 : rand() < 0.4;

      const [contact] = await db
        .insert(contacts)
        .values({
          orgId: org.id,
          name: outcome === "missed" ? null : name,
          phone: phoneNum,
          customerType: rand() < 0.35 ? "existing" : "new",
          propertyType: intentKey === "commercial_inquiry" ? "commercial" : "residential",
          referralSource: rand() < 0.5 ? pick(["Google", "Neighbor referral", "Yelp", "Truck wrap", "Nextdoor", "Repeat customer"]) : null,
          smsConsent,
          smsConsentAt: smsConsent ? startedAt : null,
          isDemo: true,
        })
        .returning();
      const [prop] = intent.kind === "service"
        ? await db.insert(properties).values({ orgId: org.id, contactId: contact.id, address, zip, city: cityForZip(zip), inServiceArea: !outOfArea, systemType: pick(["central air conditioner", "heat pump", "package unit", "furnace", null]) }).returning()
        : [undefined];

      const [call] = await db
        .insert(calls)
        .values({
          orgId: org.id,
          contactId: contact.id,
          phoneNumberId: phone.id,
          providerCallSid: `DEMO${org.id.slice(0, 8)}${String(++callCount).padStart(5, "0")}`,
          channel: outcome === "missed" ? "missed_call" : "voice",
          fromNumber: phoneNum,
          toNumber: DEMO_COMPANY.phone,
          callerName: outcome === "missed" ? null : name,
          startedAt,
          endedAt: new Date(startedAt.getTime() + duration * 1000),
          durationSeconds: duration,
          status: outcome === "missed" ? "missed" : "completed",
          intent: intentKey,
          serviceCategory: intent.kind === "service" ? intentKey : null,
          urgency,
          serviceAreaStatus: intent.kind === "service" ? (outOfArea ? "out_of_area" : "in_area") : "unknown",
          address: intent.kind === "service" ? address : null,
          outcome,
          transferStatus: outcome === "transferred" ? "completed" : "none",
          afterHours,
          escalated: escalatedCall,
          summary: "",
          transcriptEnabled: true,
          qualification: { name, phone: phoneNum, address: intent.kind === "service" ? address : undefined, zip, description },
          isDemo: true,
          createdAt: startedAt,
        })
        .returning();

      let leadId: string | null = null;
      let apptId: string | null = null;
      const typeKey: AppointmentTypeKey = urgency === "emergency" ? "emergency" : (intent.appointmentType ?? "repair");
      if (hasLead) {
        let stage: LeadStage = "new";
        if (outcome === "booked") stage = ["estimate", "install_consult"].includes(typeKey) ? "estimate_scheduled" : "appointment_booked";
        else if (outcome === "callback_requested" || outcome === "missed" || outcome === "escalated") stage = "needs_follow_up";
        else if (outcome === "lead_captured") stage = "qualified";
        else if (outcome === "out_of_area") stage = "lost";
        // Older booked jobs progress to won/lost.
        if (d > 3 && stage === "appointment_booked") stage = rand() < 0.82 ? "won" : "lost";
        if (d > 7 && stage === "estimate_scheduled") stage = weighted<LeadStage>([["won", 38], ["lost", 30], ["estimate_scheduled", 32]]);
        const [range0, range1] = JOB_VALUE[typeKey];
        const [lead] = await db
          .insert(leads)
          .values({
            orgId: org.id,
            contactId: contact.id,
            callId: call.id,
            stage,
            source: outcome === "missed" ? "missed_call" : afterHours ? "phone (after hours)" : "phone",
            serviceCategory: intent.kind === "service" ? intentKey : null,
            urgency,
            description: outcome === "missed" ? "Missed call — caller did not reach the receptionist." : description,
            estimatedValue: Math.round((range0 + rand() * (range1 - range0)) / 10) * 10,
            lostReason: stage === "lost" ? (outOfArea ? "Outside service area" : pick(["Went with another company", "Price", "Decided to wait", "Fixed it themselves"])) : null,
            isDemo: true,
            createdAt: startedAt,
            updatedAt: startedAt,
          })
          .returning();
        leadId = lead.id;
        if (rand() < 0.25) {
          await db.insert(leadNotes).values({ orgId: org.id, leadId: lead.id, authorUserId: user.id, body: pick(["Called back, confirmed details.", "Customer prefers morning windows.", "Gate code 4411 — dog in yard.", "Sent financing info by email.", "Member — apply Comfort Club discount."]), createdAt: new Date(startedAt.getTime() + 3_600_000) });
        }
      }

      if (outcome === "booked") {
        const daysOut = urgency !== "routine" ? (rand() < 0.6 ? 0 : 1) : 1 + Math.floor(rand() * 4);
        const apptKey = addDaysToKey(key, daysOut);
        const slotHour = pick(["07:00", "09:30", "12:00", "14:30"]);
        const startsAt = zonedTimeToUtc(apptKey, slotHour, tz);
        const endsAt = new Date(startsAt.getTime() + 120 * 60_000);
        const tech = pick(techRows);
        const past = endsAt < now;
        const [appt] = await db
          .insert(appointments)
          .values({
            orgId: org.id,
            contactId: contact.id,
            propertyId: prop?.id ?? null,
            leadId,
            callId: call.id,
            appointmentTypeKey: typeKey,
            technicianId: tech.id,
            startsAt,
            endsAt,
            status: past ? (rand() < 0.93 ? "completed" : "cancelled") : "confirmed",
            summary: `${intent.label} — ${name} @ ${address}: ${description}`,
            isDemo: true,
            createdAt: startedAt,
          })
          .returning();
        apptId = appt.id;
        const status = past ? "completed" : apptKey === todayKey ? pick(["assigned", "en_route", "on_site"] as const) : "assigned";
        await db.insert(dispatchRecords).values({ orgId: org.id, appointmentId: appt.id, technicianId: tech.id, status });
        if (smsConsent) {
          await db.insert(smsMessages).values({ orgId: org.id, contactId: contact.id, callId: call.id, appointmentId: appt.id, toNumber: phoneNum, kind: "appointment_confirmation", body: `${DEMO_COMPANY.name}: your appointment is confirmed. Reply STOP to opt out.`, status: "simulated", createdAt: startedAt });
        }
      }

      if (["callback_requested", "missed", "escalated"].includes(outcome) || (outcome === "lead_captured" && rand() < 0.5)) {
        await db.insert(tasks).values({
          orgId: org.id,
          callId: call.id,
          contactId: contact.id,
          title: outcome === "escalated" ? `URGENT safety follow-up — ${name}` : outcome === "missed" ? `Missed call — call back ${phoneNum}` : `Call back ${name}: ${intent.label}`,
          dueAt: new Date(startedAt.getTime() + 30 * 60_000),
          status: d > 1 ? "done" : "open",
          createdAt: startedAt,
        });
      }

      const summary =
        outcome === "missed"
          ? `Missed call from ${phoneNum}. Callback task created.`
          : outcome === "escalated"
            ? `${name} reported a possible gas smell near the furnace. Caller was told to leave the home and call 911 / the gas utility. SAFETY ESCALATION — on-call team alerted.`
            : `${name} (${contact.customerType} customer) called about ${intent.label}. ${intent.kind === "service" ? `Caller said: "${description}". Address: ${address} (${outOfArea ? "OUTSIDE service area" : "in service area"}).` : description}${urgency !== "routine" ? ` Urgency: ${urgency}.` : ""}${afterHours ? " After-hours call." : ""}${outcome === "booked" ? " Appointment booked." : outcome === "transferred" ? " Transferred to the office." : outcome === "callback_requested" ? " Callback requested." : ""}`;
      await db.update(calls).set({ summary, leadId, appointmentId: apptId }).where(eq(calls.id, call.id));

      // Transcripts for recent calls.
      if (d <= 7 && outcome !== "missed") {
        const lines: [string, string][] = [
          ["agent", `Thanks for calling ${DEMO_COMPANY.name}. I'm the virtual receptionist. How can I help you today?`],
          ["caller", description],
        ];
        if (intent.kind === "service" && !escalatedCall) {
          lines.push(["agent", "I can help with that. Can I get your name?"], ["caller", name], ["agent", "Thanks. Is the number you're calling from the best one to reach you?"], ["caller", "Yes."], ["agent", "What's the address where you need service, including the ZIP code?"], ["caller", address]);
          if (outcome === "booked") lines.push(["agent", "The earliest I have is tomorrow between 9:30 AM and 11:30 AM, or tomorrow between 12 PM and 2 PM. Which works best?"], ["caller", "The first one."], ["agent", "You're all set. Can I text a confirmation to that number?"], ["caller", smsConsent ? "Yes please." : "No thanks."]);
          else if (outOfArea) lines.push(["agent", `I'm sorry — that address is outside the area ${DEMO_COMPANY.name} currently serves.`]);
        } else if (escalatedCall) {
          lines.push(["agent", "That could be a gas leak, and your safety comes first. Please leave the home now and call 911 or your gas utility's emergency line from outside."]);
        }
        await db.insert(transcripts).values(lines.map(([speaker, text], idx) => ({ orgId: org.id, callId: call.id, speaker, text, seq: idx + 1, createdAt: startedAt })));
      }
    }
  }

  console.log(`[seed] created ${callCount} demo calls for ${DEMO_COMPANY.name}`);
  console.log(`[seed] demo login: ${DEMO_USER.email} / ${DEMO_USER.password}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
