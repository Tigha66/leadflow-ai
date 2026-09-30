import type { Plan } from "@/db/schema";

export type Feature =
  | "ai_call_answering"
  | "basic_booking"
  | "sms"
  | "call_summaries"
  | "core_analytics"
  | "multiple_numbers"
  | "multiple_territories"
  | "advanced_routing"
  | "advanced_reporting"
  | "google_calendar"
  | "multi_location"
  | "advanced_dispatch"
  | "custom_workflows"
  | "realtime_voice";

export interface PlanDef {
  key: Plan;
  name: string;
  priceMonthly: number;
  tagline: string;
  highlights: string[];
  limits: { locations: number; phoneNumbers: number; serviceAreas: number; users: number; includedCallMinutes: number };
  features: Feature[];
  priceEnv: string;
}

const STARTER_FEATURES: Feature[] = ["ai_call_answering", "basic_booking", "sms", "call_summaries", "core_analytics", "realtime_voice"];
const GROWTH_FEATURES: Feature[] = [...STARTER_FEATURES, "multiple_numbers", "multiple_territories", "advanced_routing", "advanced_reporting", "google_calendar"];
const PRO_FEATURES: Feature[] = [...GROWTH_FEATURES, "multi_location", "advanced_dispatch", "custom_workflows"];

export const PLANS: Record<Plan, PlanDef> = {
  starter: {
    key: "starter",
    name: "Starter",
    priceMonthly: 999,
    tagline: "For owner-operated shops that can't catch every call.",
    highlights: ["Single location", "24/7 AI call answering", "Basic booking to your calendar", "SMS confirmations", "Call summaries", "Core analytics"],
    limits: { locations: 1, phoneNumbers: 1, serviceAreas: 1, users: 3, includedCallMinutes: 1500 },
    features: STARTER_FEATURES,
    priceEnv: "STRIPE_PRICE_STARTER",
  },
  growth: {
    key: "growth",
    name: "Growth",
    priceMonthly: 1999,
    tagline: "For busy dispatch teams handling seasonal surges.",
    highlights: ["Everything in Starter", "More included usage", "Multiple numbers & territories", "Advanced routing", "Advanced reporting", "Additional users", "Google Calendar sync"],
    limits: { locations: 1, phoneNumbers: 5, serviceAreas: 10, users: 15, includedCallMinutes: 4000 },
    features: GROWTH_FEATURES,
    priceEnv: "STRIPE_PRICE_GROWTH",
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceMonthly: 2999,
    tagline: "For multi-location operators.",
    highlights: ["Everything in Growth", "Multi-location", "Higher usage limits", "Advanced dispatch board", "Custom workflows", "Priority onboarding & support"],
    limits: { locations: 10, phoneNumbers: 25, serviceAreas: 50, users: 75, includedCallMinutes: 10000 },
    features: PRO_FEATURES,
    priceEnv: "STRIPE_PRICE_PRO",
  },
};

export const PLAN_ORDER: Plan[] = ["starter", "growth", "pro"];

export function priceIdFor(plan: Plan): string | undefined {
  return process.env[PLANS[plan].priceEnv] || undefined;
}

export function planFromPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  for (const p of PLAN_ORDER) if (priceIdFor(p) === priceId) return p;
  return null;
}
