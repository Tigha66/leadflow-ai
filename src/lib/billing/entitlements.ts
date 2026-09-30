import type { Plan } from "@/db/schema";
import { PLANS, type Feature, type PlanDef } from "./plans";

export interface SubscriptionSnapshot {
  plan: Plan | null;
  status: string; // stripe status or "none"
  currentPeriodEnd?: Date | null;
}

export interface OrgBillingSnapshot {
  isDemo: boolean;
  trialEndsAt?: Date | null;
  subscription?: SubscriptionSnapshot | null;
}

export type EffectiveAccess =
  | { state: "active"; plan: PlanDef; source: "subscription" | "demo" }
  | { state: "trial"; plan: PlanDef; endsAt: Date }
  | { state: "past_due"; plan: PlanDef }
  | { state: "inactive"; plan: null };

const ACTIVE = new Set(["active", "trialing"]);

/**
 * Resolves what an organization is entitled to. Stripe is the source of truth for paid plans;
 * new accounts get a Starter-level trial window; demo orgs get Pro so every screen can be explored.
 */
export function resolveAccess(org: OrgBillingSnapshot, now = new Date()): EffectiveAccess {
  if (org.isDemo) return { state: "active", plan: PLANS.pro, source: "demo" };
  const sub = org.subscription;
  if (sub?.plan && ACTIVE.has(sub.status)) return { state: "active", plan: PLANS[sub.plan], source: "subscription" };
  if (sub?.plan && sub.status === "past_due") return { state: "past_due", plan: PLANS[sub.plan] };
  if (org.trialEndsAt && org.trialEndsAt > now) return { state: "trial", plan: PLANS.starter, endsAt: org.trialEndsAt };
  return { state: "inactive", plan: null };
}

export function hasFeature(access: EffectiveAccess, feature: Feature): boolean {
  if (!access.plan) return false;
  return access.plan.features.includes(feature);
}

export function withinLimit(access: EffectiveAccess, limit: keyof PlanDef["limits"], currentCount: number): boolean {
  if (!access.plan) return false;
  return currentCount < access.plan.limits[limit];
}

/** Live phone answering requires an active/trial/past-due (grace) plan. */
export function canAnswerLiveCalls(access: EffectiveAccess): boolean {
  return access.state !== "inactive";
}
