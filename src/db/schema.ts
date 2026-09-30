import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                                */
/* ------------------------------------------------------------------ */

export const memberRole = pgEnum("member_role", ["owner", "admin", "dispatcher", "staff"]);
export const leadStage = pgEnum("lead_stage", [
  "new",
  "qualified",
  "appointment_booked",
  "estimate_scheduled",
  "won",
  "lost",
  "needs_follow_up",
]);
export const urgencyLevel = pgEnum("urgency_level", ["routine", "priority", "emergency"]);
export const serviceAreaStatus = pgEnum("service_area_status", ["in_area", "out_of_area", "unknown"]);
export const callOutcome = pgEnum("call_outcome", [
  "booked",
  "lead_captured",
  "transferred",
  "escalated",
  "faq_answered",
  "callback_requested",
  "out_of_area",
  "missed",
  "abandoned",
  "other",
]);
export const callStatus = pgEnum("call_status", ["in_progress", "completed", "missed", "failed"]);
export const callChannel = pgEnum("call_channel", ["voice", "voice_realtime", "simulator", "missed_call"]);
export const transferStatus = pgEnum("transfer_status", ["none", "attempted", "completed", "failed"]);
export const appointmentStatus = pgEnum("appointment_status", [
  "requested",
  "confirmed",
  "completed",
  "cancelled",
  "rescheduled",
]);
export const dispatchStatus = pgEnum("dispatch_status", [
  "unassigned",
  "assigned",
  "en_route",
  "on_site",
  "completed",
]);
export const subscriptionPlan = pgEnum("subscription_plan", ["starter", "growth", "pro"]);
export const smsStatus = pgEnum("sms_status", [
  "queued",
  "sent",
  "simulated",
  "failed",
  "blocked_no_consent",
]);
export const taskStatus = pgEnum("task_status", ["open", "done", "cancelled"]);

const id = () => uuid("id").primaryKey().defaultRandom();
const orgRef = () =>
  uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ------------------------------------------------------------------ */
/* Identity                                                             */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(sql`lower(${t.email})`)],
);

export const organizations = pgTable(
  "organizations",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    timezone: text("timezone").notNull().default("America/Phoenix"),
    phone: text("phone"),
    website: text("website"),
    businessType: text("business_type").notNull().default("residential_hvac"),
    isDemo: boolean("is_demo").notNull().default(false),
    /** Receptionist / after-hours / SMS configuration. Validated by zod (src/lib/org-settings.ts). */
    settings: jsonb("settings").notNull().default({}),
    onboardingStep: integer("onboarding_step").notNull().default(1),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("organizations_slug_idx").on(t.slug)],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    orgId: orgRef(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("staff"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] }), index("org_members_user_idx").on(t.userId)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 hash of the session token; the raw token only lives in the cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeOrgId: uuid("active_org_id").references(() => organizations.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const invitations = pgTable(
  "invitations",
  {
    id: id(),
    orgId: orgRef(),
    email: text("email").notNull(),
    role: memberRole("role").notNull().default("staff"),
    tokenHash: text("token_hash").notNull().unique(),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("invitations_org_idx").on(t.orgId)],
);

/* ------------------------------------------------------------------ */
/* Company configuration                                                */
/* ------------------------------------------------------------------ */

export const locations = pgTable(
  "locations",
  {
    id: id(),
    orgId: orgRef(),
    name: text("name").notNull(),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("locations_org_idx").on(t.orgId)],
);

export const serviceAreas = pgTable(
  "service_areas",
  {
    id: id(),
    orgId: orgRef(),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    zipCodes: text("zip_codes").array().notNull().default(sql`'{}'::text[]`),
    cities: text("cities").array().notNull().default(sql`'{}'::text[]`),
    /** Reserved for future radius-based territories. Not used for matching yet. */
    centerLat: real("center_lat"),
    centerLng: real("center_lng"),
    radiusMiles: real("radius_miles"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("service_areas_org_idx").on(t.orgId)],
);

export const serviceCategories = pgTable(
  "service_categories",
  {
    id: id(),
    orgId: orgRef(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    appointmentTypeKey: text("appointment_type_key").notNull().default("repair"),
    defaultUrgency: urgencyLevel("default_urgency").notNull().default("routine"),
  },
  (t) => [uniqueIndex("service_categories_org_key_idx").on(t.orgId, t.key)],
);

export const appointmentTypes = pgTable(
  "appointment_types",
  {
    id: id(),
    orgId: orgRef(),
    key: text("key").notNull(), // repair | maintenance | estimate | install_consult | emergency
    name: text("name").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(120),
    bufferMinutes: integer("buffer_minutes").notNull().default(30),
    sameDayAllowed: boolean("same_day_allowed").notNull().default(true),
    leadTimeMinutes: integer("lead_time_minutes").notNull().default(120),
    maxHorizonDays: integer("max_horizon_days").notNull().default(14),
    afterHoursBookable: boolean("after_hours_bookable").notNull().default(false),
    active: boolean("active").notNull().default(true),
  },
  (t) => [uniqueIndex("appointment_types_org_key_idx").on(t.orgId, t.key)],
);

export const technicians = pgTable(
  "technicians",
  {
    id: id(),
    orgId: orgRef(),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    team: text("team"),
    skills: text("skills").array().notNull().default(sql`'{}'::text[]`),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("technicians_org_idx").on(t.orgId)],
);

export const businessHours = pgTable(
  "business_hours",
  {
    id: id(),
    orgId: orgRef(),
    dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday
    openTime: text("open_time").notNull().default("08:00"),
    closeTime: text("close_time").notNull().default("17:00"),
    closed: boolean("closed").notNull().default(false),
  },
  (t) => [uniqueIndex("business_hours_org_day_idx").on(t.orgId, t.dayOfWeek)],
);

export const holidays = pgTable(
  "holidays",
  {
    id: id(),
    orgId: orgRef(),
    date: text("date").notNull(), // YYYY-MM-DD in org timezone
    name: text("name").notNull(),
    closed: boolean("closed").notNull().default(true),
    openTime: text("open_time"),
    closeTime: text("close_time"),
  },
  (t) => [uniqueIndex("holidays_org_date_idx").on(t.orgId, t.date)],
);

export const phoneNumbers = pgTable(
  "phone_numbers",
  {
    id: id(),
    orgId: orgRef(),
    e164: text("e164").notNull(),
    label: text("label").notNull().default("Main line"),
    provider: text("provider").notNull().default("twilio"),
    providerSid: text("provider_sid"),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    /** simulated = demo/test number that never receives real calls. */
    status: text("status").notNull().default("pending"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("phone_numbers_e164_idx").on(t.e164), index("phone_numbers_org_idx").on(t.orgId)],
);

export const faqs = pgTable(
  "faqs",
  {
    id: id(),
    orgId: orgRef(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    category: text("category").notNull().default("general"),
    keywords: text("keywords").array().notNull().default(sql`'{}'::text[]`),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("faqs_org_idx").on(t.orgId)],
);

export const knowledgeDocuments = pgTable(
  "knowledge_documents",
  {
    id: id(),
    orgId: orgRef(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("knowledge_documents_org_kind_idx").on(t.orgId, t.kind)],
);

export const escalationRules = pgTable(
  "escalation_rules",
  {
    id: id(),
    orgId: orgRef(),
    name: text("name").notNull(),
    hazard: text("hazard").notNull(), // gas | carbon_monoxide | fire_smoke | electrical | water | no_heat_vulnerable | no_cooling_heat | custom
    keywords: text("keywords").array().notNull().default(sql`'{}'::text[]`),
    action: text("action").notNull(), // safety_script | transfer_on_call | priority_booking | callback
    script: text("script").notNull(),
    transferNumber: text("transfer_number"),
    active: boolean("active").notNull().default(true),
    priority: integer("priority").notNull().default(100),
  },
  (t) => [index("escalation_rules_org_idx").on(t.orgId)],
);

export const integrations = pgTable(
  "integrations",
  {
    id: id(),
    orgId: orgRef(),
    provider: text("provider").notNull(), // google_calendar
    status: text("status").notNull().default("disconnected"),
    config: jsonb("config").notNull().default({}),
    /** AES-256-GCM encrypted JSON blob (see src/lib/crypto.ts). Never sent to the browser. */
    encryptedCredentials: text("encrypted_credentials"),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("integrations_org_provider_idx").on(t.orgId, t.provider)],
);

/* ------------------------------------------------------------------ */
/* Customers                                                            */
/* ------------------------------------------------------------------ */

export const contacts = pgTable(
  "contacts",
  {
    id: id(),
    orgId: orgRef(),
    name: text("name"),
    phone: text("phone"),
    email: text("email"),
    customerType: text("customer_type").notNull().default("new"), // new | existing
    propertyType: text("property_type").notNull().default("residential"),
    membershipStatus: text("membership_status"),
    referralSource: text("referral_source"),
    smsConsent: boolean("sms_consent").notNull().default(false),
    smsConsentAt: timestamp("sms_consent_at", { withTimezone: true }),
    smsOptedOutAt: timestamp("sms_opted_out_at", { withTimezone: true }),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("contacts_org_phone_idx").on(t.orgId, t.phone)],
);

export const properties = pgTable(
  "properties",
  {
    id: id(),
    orgId: orgRef(),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    inServiceArea: boolean("in_service_area"),
    systemType: text("system_type"),
    createdAt: createdAt(),
  },
  (t) => [index("properties_org_contact_idx").on(t.orgId, t.contactId)],
);

/* ------------------------------------------------------------------ */
/* Calls                                                                */
/* ------------------------------------------------------------------ */

export const calls = pgTable(
  "calls",
  {
    id: id(),
    orgId: orgRef(),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    phoneNumberId: uuid("phone_number_id").references(() => phoneNumbers.id, { onDelete: "set null" }),
    providerCallSid: text("provider_call_sid"),
    channel: callChannel("channel").notNull().default("voice"),
    fromNumber: text("from_number"),
    toNumber: text("to_number"),
    callerName: text("caller_name"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    status: callStatus("status").notNull().default("in_progress"),
    intent: text("intent"),
    serviceCategory: text("service_category"),
    urgency: urgencyLevel("urgency").notNull().default("routine"),
    serviceAreaStatus: serviceAreaStatus("service_area_status").notNull().default("unknown"),
    address: text("address"),
    outcome: callOutcome("outcome"),
    appointmentId: uuid("appointment_id"),
    leadId: uuid("lead_id"),
    transferStatus: transferStatus("transfer_status").notNull().default("none"),
    afterHours: boolean("after_hours").notNull().default(false),
    escalated: boolean("escalated").notNull().default(false),
    summary: text("summary"),
    recordingEnabled: boolean("recording_enabled").notNull().default(false),
    recordingUrl: text("recording_url"),
    transcriptEnabled: boolean("transcript_enabled").notNull().default(true),
    qualification: jsonb("qualification").notNull().default({}),
    /** Serialized conversation state for turn-based (Gather) calls. */
    conversationState: jsonb("conversation_state"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index("calls_org_started_idx").on(t.orgId, t.startedAt),
    index("calls_org_outcome_idx").on(t.orgId, t.outcome),
    uniqueIndex("calls_provider_sid_idx").on(t.providerCallSid),
  ],
);

export const callEvents = pgTable(
  "call_events",
  {
    id: id(),
    orgId: orgRef(),
    callId: uuid("call_id")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    data: jsonb("data").notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("call_events_call_idx").on(t.callId)],
);

export const transcripts = pgTable(
  "transcripts",
  {
    id: id(),
    orgId: orgRef(),
    callId: uuid("call_id")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    speaker: text("speaker").notNull(), // caller | agent | system
    text: text("text").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("transcripts_call_seq_idx").on(t.callId, t.seq)],
);

/* ------------------------------------------------------------------ */
/* Pipeline & scheduling                                                */
/* ------------------------------------------------------------------ */

export const leads = pgTable(
  "leads",
  {
    id: id(),
    orgId: orgRef(),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    callId: uuid("call_id").references(() => calls.id, { onDelete: "set null" }),
    stage: leadStage("stage").notNull().default("new"),
    source: text("source").notNull().default("phone"),
    serviceCategory: text("service_category"),
    urgency: urgencyLevel("urgency").notNull().default("routine"),
    description: text("description"),
    estimatedValue: integer("estimated_value"),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, { onDelete: "set null" }),
    lostReason: text("lost_reason"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("leads_org_stage_idx").on(t.orgId, t.stage), index("leads_org_created_idx").on(t.orgId, t.createdAt)],
);

export const leadNotes = pgTable(
  "lead_notes",
  {
    id: id(),
    orgId: orgRef(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("lead_notes_lead_idx").on(t.leadId)],
);

export const appointments = pgTable(
  "appointments",
  {
    id: id(),
    orgId: orgRef(),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    propertyId: uuid("property_id").references(() => properties.id, { onDelete: "set null" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    callId: uuid("call_id").references(() => calls.id, { onDelete: "set null" }),
    appointmentTypeKey: text("appointment_type_key").notNull(),
    technicianId: uuid("technician_id").references(() => technicians.id, { onDelete: "set null" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: appointmentStatus("status").notNull().default("confirmed"),
    provider: text("provider").notNull().default("internal"),
    externalId: text("external_id"),
    summary: text("summary"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("appointments_org_starts_idx").on(t.orgId, t.startsAt)],
);

export const dispatchRecords = pgTable(
  "dispatch_records",
  {
    id: id(),
    orgId: orgRef(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    technicianId: uuid("technician_id").references(() => technicians.id, { onDelete: "set null" }),
    status: dispatchStatus("status").notNull().default("unassigned"),
    notes: text("notes"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("dispatch_records_appt_idx").on(t.appointmentId), index("dispatch_records_org_idx").on(t.orgId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    orgId: orgRef(),
    callId: uuid("call_id").references(() => calls.id, { onDelete: "set null" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    type: text("type").notNull().default("callback"),
    title: text("title").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: taskStatus("status").notNull().default("open"),
    createdAt: createdAt(),
  },
  (t) => [index("tasks_org_status_idx").on(t.orgId, t.status)],
);

export const smsMessages = pgTable(
  "sms_messages",
  {
    id: id(),
    orgId: orgRef(),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    callId: uuid("call_id").references(() => calls.id, { onDelete: "set null" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    toNumber: text("to_number").notNull(),
    kind: text("kind").notNull(), // appointment_confirmation | lead_ack | reschedule_confirmation | callback_confirmation | reminder
    body: text("body").notNull(),
    status: smsStatus("status").notNull().default("queued"),
    providerSid: text("provider_sid"),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("sms_messages_org_idx").on(t.orgId, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Billing, usage & audit                                               */
/* ------------------------------------------------------------------ */

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    orgId: orgRef(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    plan: subscriptionPlan("plan"),
    status: text("status").notNull().default("none"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("subscriptions_org_idx").on(t.orgId),
    index("subscriptions_customer_idx").on(t.stripeCustomerId),
  ],
);

export const usageRecords = pgTable(
  "usage_records",
  {
    id: id(),
    orgId: orgRef(),
    metric: text("metric").notNull(), // call_minutes | sms_segments
    quantity: integer("quantity").notNull(),
    callId: uuid("call_id"),
    createdAt: createdAt(),
  },
  (t) => [index("usage_records_org_idx").on(t.orgId, t.metric, t.createdAt)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata").notNull().default({}),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_events_org_idx").on(t.orgId, t.createdAt)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookEvents = pgTable("webhook_events", {
  /** Provider event id (e.g. Stripe evt_...) for idempotency. */
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Role = (typeof memberRole.enumValues)[number];
export type LeadStage = (typeof leadStage.enumValues)[number];
export type Urgency = (typeof urgencyLevel.enumValues)[number];
export type CallOutcome = (typeof callOutcome.enumValues)[number];
export type Plan = (typeof subscriptionPlan.enumValues)[number];
