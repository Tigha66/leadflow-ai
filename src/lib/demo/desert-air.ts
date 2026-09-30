/**
 * Fictional demo company used for the seeded dashboard and the public /demo call simulator.
 * All names, numbers and addresses are fictional. Phone numbers use the 555-01xx range.
 */
import type { BusinessHoursInput } from "@/lib/scheduling/hours";
import type { ServiceAreaInput } from "@/lib/service-area";
import type { FaqInput } from "@/lib/receptionist/knowledge";
import { DEFAULT_ESCALATION_RULES } from "@/lib/hvac/safety";
import { orgSettingsSchema } from "@/lib/org-settings";

export const DEMO_COMPANY = {
  name: "Desert Air Heating & Cooling",
  slug: "desert-air-demo",
  timezone: "America/Phoenix",
  phone: "+16025550142",
  website: "https://desertair.example",
};

export const DEMO_USER = {
  email: "demo@desertair.example",
  name: "Dana Whitfield",
  password: "demo-password-desert-air",
};

export const DEMO_SETTINGS = orgSettingsSchema.parse({
  receptionist: { agentName: "Sage", tone: "warm", askReferralSource: true },
  recording: { enabled: false, transcriptsEnabled: true },
  afterHours: {
    onCallNumber: "+16025550199",
    transferUrgent: false,
    allowOvernightBooking: true,
    createCallbackTask: true,
  },
  transfers: { mainNumber: "+16025550142", billingNumber: "" },
  sms: { enabled: true },
});

export const DEMO_HOURS: BusinessHoursInput[] = [
  { dayOfWeek: 0, openTime: "08:00", closeTime: "12:00", closed: true },
  { dayOfWeek: 1, openTime: "07:00", closeTime: "18:00", closed: false },
  { dayOfWeek: 2, openTime: "07:00", closeTime: "18:00", closed: false },
  { dayOfWeek: 3, openTime: "07:00", closeTime: "18:00", closed: false },
  { dayOfWeek: 4, openTime: "07:00", closeTime: "18:00", closed: false },
  { dayOfWeek: 5, openTime: "07:00", closeTime: "18:00", closed: false },
  { dayOfWeek: 6, openTime: "08:00", closeTime: "14:00", closed: false },
];

export const DEMO_SERVICE_AREAS: ServiceAreaInput[] = [
  {
    name: "Central Phoenix",
    zipCodes: ["85003", "85004", "85006", "85007", "85008", "85012", "85013", "85014", "85015", "85016", "85018", "85020", "85021"],
    cities: ["Phoenix"],
    active: true,
  },
  {
    name: "East Valley",
    zipCodes: ["85201", "85202", "85203", "85204", "85210", "85224", "85225", "85226", "85233", "85234", "85281", "85282", "85283", "85284"],
    cities: ["Mesa", "Tempe", "Chandler", "Gilbert"],
    active: true,
  },
  {
    name: "Scottsdale & Paradise Valley",
    zipCodes: ["85250", "85251", "85253", "85254", "85257", "85258", "85259", "85260"],
    cities: ["Scottsdale", "Paradise Valley"],
    active: true,
  },
];

export const DEMO_TECHNICIANS = [
  { name: "Marcus Reyes", team: "Service", skills: ["repair", "emergency", "heat pump"], phone: "+16025550111" },
  { name: "Priya Nandakumar", team: "Service", skills: ["repair", "maintenance", "thermostat"], phone: "+16025550112" },
  { name: "Tom Albrecht", team: "Install / Sales", skills: ["estimate", "install_consult", "ductwork"], phone: "+16025550113" },
  { name: "Lena Ortiz", team: "Maintenance", skills: ["maintenance", "indoor_air_quality"], phone: "+16025550114" },
];

export const DEMO_FAQS: (FaqInput & { category: string })[] = [
  {
    category: "general",
    question: "Do you offer financing on new systems?",
    answer: "Yes — we offer financing on new system installations through a third-party lender, subject to credit approval. Our comfort advisor can walk you through options at your estimate.",
    keywords: ["financing", "finance", "payment plan", "monthly payments"],
    active: true,
  },
  {
    category: "membership",
    question: "What is the Desert Air Comfort Club?",
    answer: "The Comfort Club is our maintenance membership. It includes two tune-ups a year — one for cooling in spring and one for heating in fall — plus priority scheduling for members.",
    keywords: ["comfort club", "membership", "member", "maintenance plan"],
    active: true,
  },
  {
    category: "brands",
    question: "What brands do you service?",
    answer: "We service all major brands, and we install Trane, Carrier and Goodman equipment.",
    keywords: ["brand", "brands", "trane", "carrier", "goodman", "lennox", "rheem"],
    active: true,
  },
  {
    category: "warranty",
    question: "Do you warranty your repairs?",
    answer: "Our repairs come with a one-year labor warranty, and parts are covered by the manufacturer's warranty. The office can look up the details for your specific repair.",
    keywords: ["warranty", "guarantee"],
    active: true,
  },
  {
    category: "general",
    question: "Do you work on commercial buildings?",
    answer: "Yes, we handle light commercial HVAC such as offices, retail and restaurants. I can set up a visit for someone from our commercial team.",
    keywords: ["commercial", "office building", "restaurant"],
    active: true,
  },
];

export const DEMO_DOCUMENTS: { kind: string; title: string; content: string }[] = [
  {
    kind: "company_description",
    title: "Company description",
    content: "Desert Air Heating & Cooling is a family-owned HVAC company serving the Phoenix metro area, offering repair, maintenance, and new system installation for homes and light commercial properties.",
  },
  { kind: "services", title: "Services", content: "AC and heat pump repair, furnace repair, seasonal tune-ups, new system installation, ductwork, indoor air quality, and light commercial HVAC." },
  {
    kind: "dispatch_fee",
    title: "Dispatch / diagnostic fee",
    content: "Our diagnostic visit is $89, and that fee is applied toward the repair if you go ahead with the work.",
  },
  {
    kind: "pricing_policy",
    title: "Pricing policy",
    content: "Our diagnostic visit is $89. Repair pricing depends on what the technician finds, and they'll give you an upfront price before any work starts. New system pricing is provided at a free in-home estimate.",
  },
  { kind: "membership", title: "Membership programs", content: "The Comfort Club includes two tune-ups a year plus priority scheduling for members." },
  { kind: "warranty", title: "Warranty policies", content: "One-year labor warranty on repairs. Parts are covered by the manufacturer's warranty." },
  { kind: "territory", title: "Service territory notes", content: "We serve Phoenix, Scottsdale, Paradise Valley, Tempe, Mesa, Chandler and Gilbert." },
];

export const DEMO_ESCALATION_RULES = DEFAULT_ESCALATION_RULES;
