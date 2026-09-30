import type { Urgency } from "@/db/schema";

export type AppointmentTypeKey = "repair" | "maintenance" | "estimate" | "install_consult" | "emergency";

export type IntentKind = "service" | "account" | "info" | "human" | "other";

export interface IntentDef {
  key: string;
  label: string;
  kind: IntentKind;
  /** Appointment type offered when the intent is bookable. */
  appointmentType?: AppointmentTypeKey;
  defaultUrgency: Urgency;
  /** Lower-case keyword patterns. Matched as regular expressions against normalized speech. */
  patterns: string[];
}

/**
 * Every intent the receptionist understands. Order matters only for tie-breaking — the classifier
 * scores all intents and picks the best match.
 */
export const INTENTS: IntentDef[] = [
  {
    key: "ac_not_cooling",
    label: "AC not cooling",
    kind: "service",
    appointmentType: "repair",
    defaultUrgency: "priority",
    patterns: [
      "(ac|a\\.c\\.|air condition\\w*|air|unit|system).{0,30}(not|isn'?t|won'?t|stopped|no longer).{0,15}(cool|cold)",
      "blowing (warm|hot)",
      "warm air",
      "not cooling",
      "no (cool|cold) air",
      "house is (so )?hot",
      "(it'?s|getting) (really )?hot in (here|the house)",
    ],
  },
  {
    key: "ac_not_turning_on",
    label: "AC not turning on",
    kind: "service",
    appointmentType: "repair",
    defaultUrgency: "priority",
    patterns: [
      "(ac|a\\.c\\.|air condition\\w*|condenser).{0,30}(won'?t|not|isn'?t|doesn'?t|will not).{0,10}(turn on|start|come on|kick on|run)",
      "(ac|air condition\\w*) (is )?(dead|off)",
    ],
  },
  {
    key: "furnace_not_heating",
    label: "Furnace not heating",
    kind: "service",
    appointmentType: "repair",
    defaultUrgency: "priority",
    patterns: [
      "(furnace|heat(er|ing)?|heat).{0,30}(not|isn'?t|won'?t|stopped).{0,15}(heat|warm)",
      "blowing cold",
      "no heat",
      "house is (so )?(cold|freezing)",
      "not heating",
    ],
  },
  {
    key: "furnace_not_turning_on",
    label: "Furnace not turning on",
    kind: "service",
    appointmentType: "repair",
    defaultUrgency: "priority",
    patterns: [
      "(furnace|heater|boiler).{0,30}(won'?t|not|isn'?t|doesn'?t|will not).{0,10}(turn on|start|come on|kick on|ignite|light)",
      "pilot light",
    ],
  },
  {
    key: "heat_pump_problem",
    label: "Heat pump problem",
    kind: "service",
    appointmentType: "repair",
    defaultUrgency: "routine",
    patterns: ["heat pump", "iced over", "ice on (the )?(outside|outdoor) unit", "defrost"],
  },
  {
    key: "thermostat_problem",
    label: "Thermostat problem",
    kind: "service",
    appointmentType: "repair",
    defaultUrgency: "routine",
    patterns: ["thermostat", "nest", "ecobee", "honeywell", "screen is blank"],
  },
  {
    key: "strange_noise",
    label: "Strange noise",
    kind: "service",
    appointmentType: "repair",
    defaultUrgency: "routine",
    patterns: ["noise", "noisy", "banging", "rattl", "squeal", "grinding", "buzz", "humming", "clicking", "loud"],
  },
  {
    key: "strange_smell",
    label: "Strange smell",
    kind: "service",
    appointmentType: "repair",
    defaultUrgency: "priority",
    patterns: ["smell", "odor", "musty", "stink"],
  },
  {
    key: "water_leak",
    label: "Water / leak around equipment",
    kind: "service",
    appointmentType: "repair",
    defaultUrgency: "priority",
    patterns: ["leak", "water (on|around|under|in)", "dripping", "puddle", "drain line", "condensate", "flood"],
  },
  {
    key: "maintenance",
    label: "Maintenance / tune-up",
    kind: "service",
    appointmentType: "maintenance",
    defaultUrgency: "routine",
    patterns: ["tune[- ]?up", "maintenance", "check[- ]?up", "inspection", "clean(ing)?", "annual service", "seasonal"],
  },
  {
    key: "new_system_estimate",
    label: "New system estimate",
    kind: "service",
    appointmentType: "estimate",
    defaultUrgency: "routine",
    patterns: ["estimate", "quote", "new (ac|a\\.c\\.|system|unit|furnace|heat pump)", "how much (for|to|would|is) (a )?new"],
  },
  {
    key: "system_replacement",
    label: "System replacement",
    kind: "service",
    appointmentType: "install_consult",
    defaultUrgency: "routine",
    patterns: ["replace", "replacement", "upgrade (my|the|our) (system|unit)", "install(ation)?", "old (system|unit)"],
  },
  {
    key: "indoor_air_quality",
    label: "Indoor air quality",
    kind: "service",
    appointmentType: "estimate",
    defaultUrgency: "routine",
    patterns: ["air quality", "air purif", "humidif", "dehumidif", "uv light", "allerg", "air filter", "dust"],
  },
  {
    key: "ductwork",
    label: "Ductwork",
    kind: "service",
    appointmentType: "estimate",
    defaultUrgency: "routine",
    patterns: ["duct", "vents?", "airflow", "rooms? (is|are) (hotter|colder)", "upstairs is (hot|warm|cold)"],
  },
  {
    key: "commercial_inquiry",
    label: "Commercial HVAC inquiry",
    kind: "service",
    appointmentType: "estimate",
    defaultUrgency: "routine",
    patterns: ["commercial", "rooftop", "rtu", "office building", "restaurant", "warehouse", "my business", "our store"],
  },
  {
    key: "existing_appointment",
    label: "Existing appointment",
    kind: "account",
    defaultUrgency: "routine",
    patterns: [
      "my appointment",
      "(existing|scheduled|upcoming) appointment",
      "when is (the|my) (tech|technician)",
      "technician (coming|arriv)",
      "running late",
      "eta",
    ],
  },
  {
    key: "reschedule",
    label: "Reschedule",
    kind: "account",
    defaultUrgency: "routine",
    patterns: ["reschedule", "move my appointment", "change (my|the) appointment", "different (day|time)"],
  },
  {
    key: "cancellation",
    label: "Cancellation request",
    kind: "account",
    defaultUrgency: "routine",
    patterns: ["cancel"],
  },
  {
    key: "warranty_question",
    label: "Warranty question",
    kind: "info",
    defaultUrgency: "routine",
    patterns: ["warrant(y|ies)", "under warranty", "guarantee"],
  },
  {
    key: "membership_question",
    label: "Membership / service plan",
    kind: "info",
    defaultUrgency: "routine",
    patterns: ["membership", "member", "service plan", "maintenance plan", "club", "agreement"],
  },
  {
    key: "billing_question",
    label: "Billing question",
    kind: "info",
    defaultUrgency: "routine",
    patterns: ["bill(ing)?", "invoice", "payment", "charged", "pay my", "refund", "financing"],
  },
  {
    key: "pricing_question",
    label: "Pricing question",
    kind: "info",
    defaultUrgency: "routine",
    patterns: ["how much", "price", "pricing", "cost", "charge for", "service fee", "trip (charge|fee)", "dispatch fee", "diagnostic fee"],
  },
  {
    key: "hours",
    label: "Hours",
    kind: "info",
    defaultUrgency: "routine",
    patterns: ["hours", "what time (do|are) you", "are you open", "open (on|today|tomorrow|now|weekends?)", "when do you (open|close)"],
  },
  {
    key: "service_area_question",
    label: "Service area",
    kind: "info",
    defaultUrgency: "routine",
    patterns: ["service area", "do you (service|serve|cover|come to|go to)", "areas? (do )?you (serve|cover)"],
  },
  {
    key: "speak_with_staff",
    label: "Speak with staff",
    kind: "human",
    defaultUrgency: "routine",
    patterns: [
      "(speak|talk) (to|with) (a |an )?(human|person|someone|real|manager|owner|representative|agent|dispatcher|staff)",
      "real person",
      "operator",
      "representative",
      "transfer me",
    ],
  },
  {
    key: "other",
    label: "Other",
    kind: "other",
    defaultUrgency: "routine",
    patterns: [],
  },
];

export const INTENT_BY_KEY = Object.fromEntries(INTENTS.map((i) => [i.key, i])) as Record<string, IntentDef>;

export const SERVICE_INTENTS = INTENTS.filter((i) => i.kind === "service");

export const APPOINTMENT_TYPE_DEFAULTS: Record<
  AppointmentTypeKey,
  { name: string; durationMinutes: number; bufferMinutes: number; sameDayAllowed: boolean; leadTimeMinutes: number; maxHorizonDays: number; afterHoursBookable: boolean }
> = {
  repair: { name: "Repair / service call", durationMinutes: 120, bufferMinutes: 30, sameDayAllowed: true, leadTimeMinutes: 120, maxHorizonDays: 14, afterHoursBookable: false },
  maintenance: { name: "Maintenance / tune-up", durationMinutes: 90, bufferMinutes: 30, sameDayAllowed: false, leadTimeMinutes: 720, maxHorizonDays: 30, afterHoursBookable: false },
  estimate: { name: "Estimate", durationMinutes: 90, bufferMinutes: 30, sameDayAllowed: false, leadTimeMinutes: 720, maxHorizonDays: 21, afterHoursBookable: false },
  install_consult: { name: "Installation consultation", durationMinutes: 120, bufferMinutes: 30, sameDayAllowed: false, leadTimeMinutes: 1440, maxHorizonDays: 21, afterHoursBookable: false },
  emergency: { name: "Emergency / priority service", durationMinutes: 120, bufferMinutes: 0, sameDayAllowed: true, leadTimeMinutes: 60, maxHorizonDays: 2, afterHoursBookable: true },
};

export const KNOWLEDGE_KINDS: { kind: string; title: string; help: string }[] = [
  { kind: "company_description", title: "Company description", help: "Who you are, how long you've been in business, what makes you different." },
  { kind: "services", title: "Services", help: "Services you offer (repair, maintenance, installs, IAQ, ductwork, commercial)." },
  { kind: "business_hours_notes", title: "Business hours notes", help: "Anything callers should know about hours beyond the schedule." },
  { kind: "membership", title: "Membership programs", help: "Plan names, what's included, how to join. Only what you want the AI to say." },
  { kind: "financing", title: "Financing FAQs", help: "Financing partners and general terms. Avoid rate promises." },
  { kind: "brands", title: "Manufacturer / brand information", help: "Brands you install and service." },
  { kind: "maintenance_plans", title: "Maintenance plans", help: "Tune-up scope and frequency." },
  { kind: "pricing_policy", title: "Pricing policy", help: "Explicitly approved prices or ranges. The AI will ONLY quote what is written here." },
  { kind: "dispatch_fee", title: "Dispatch / diagnostic fee", help: "Your trip/diagnostic fee, if you want callers told about it." },
  { kind: "warranty", title: "Warranty policies", help: "Labor/parts warranty terms you want shared." },
  { kind: "promotions", title: "Promotions", help: "Current approved promotions with end dates." },
  { kind: "territory", title: "Service territory notes", help: "Plain-language description of where you work." },
];
