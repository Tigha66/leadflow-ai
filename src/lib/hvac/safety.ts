/**
 * Conservative safety escalation. When a caller describes a potentially life-threatening condition
 * the receptionist stops qualifying, gives the configured safety script (leave the area / call 911 /
 * call the gas utility) and escalates. It NEVER troubleshoots gas, CO, electrical or combustion issues.
 */

export type Hazard =
  | "gas"
  | "carbon_monoxide"
  | "fire_smoke"
  | "electrical"
  | "water"
  | "no_heat_vulnerable"
  | "no_cooling_heat"
  | "custom";

export type EscalationAction = "safety_script" | "transfer_on_call" | "priority_booking" | "callback";

export interface EscalationRuleInput {
  id?: string;
  name: string;
  hazard: Hazard | string;
  keywords: string[];
  action: EscalationAction | string;
  script: string;
  transferNumber?: string | null;
  active: boolean;
  priority: number;
}

/** Hazards that are life-safety: always direct to emergency services, never book first. */
export const LIFE_SAFETY_HAZARDS: Hazard[] = ["gas", "carbon_monoxide", "fire_smoke", "electrical"];

export const DEFAULT_ESCALATION_RULES: EscalationRuleInput[] = [
  {
    name: "Suspected gas leak",
    hazard: "gas",
    keywords: ["smell gas", "gas smell", "gas leak", "rotten egg", "smells like gas", "hissing gas", "natural gas", "propane smell"],
    action: "safety_script",
    script:
      "That could be a gas leak, and your safety comes first. Please leave the home now, don't flip any switches or use anything that could make a spark, and once you're outside call 911 or your gas utility's emergency line. I'm flagging this for our on-call team right now.",
    active: true,
    priority: 1,
  },
  {
    name: "Carbon monoxide alarm",
    hazard: "carbon_monoxide",
    keywords: ["carbon monoxide", "co alarm", "co detector", "c o alarm", "co2 alarm", "monoxide", "detector is going off", "alarm is going off"],
    action: "safety_script",
    script:
      "A carbon monoxide alarm needs to be treated as an emergency. Please get everyone, including pets, outside into fresh air right away and call 911 from outside. Don't go back in until emergency responders say it's safe. I'm alerting our on-call team now.",
    active: true,
    priority: 2,
  },
  {
    name: "Smoke or fire",
    hazard: "fire_smoke",
    keywords: ["fire", "smoke", "flames", "on fire", "smoking"],
    action: "safety_script",
    script:
      "If there's smoke or fire, please leave the building immediately and call 911. Don't try to shut anything off yourself. I'm alerting our on-call team as well.",
    active: true,
    priority: 3,
  },
  {
    name: "Electrical burning / sparking",
    hazard: "electrical",
    keywords: ["burning smell", "electrical smell", "sparking", "sparks", "sparked", "melting", "burning plastic", "electrical burning", "breaker keeps", "arcing"],
    action: "safety_script",
    script:
      "A burning smell or sparking can be dangerous. Please stay away from the equipment and don't touch it. If you see smoke or it's getting worse, leave the home and call 911. I'm flagging this as urgent for our team right now.",
    active: true,
    priority: 4,
  },
  {
    name: "No heat with vulnerable occupants",
    hazard: "no_heat_vulnerable",
    keywords: ["elderly", "newborn", "baby", "infant", "oxygen", "medical condition", "disabled", "senior"],
    action: "priority_booking",
    script: "Thanks for telling me that — I'm marking this as a priority so our team gets to you as quickly as possible.",
    active: true,
    priority: 20,
  },
];

function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ")} `;
}

/** Phrases that negate a hazard keyword ("I don't smell gas", "no smoke"). */
const NEGATIONS = ["don't", "do not", "doesn't", "no", "not", "never", "without"];

function isNegated(text: string, keyword: string): boolean {
  const idx = text.indexOf(keyword);
  if (idx < 0) return false;
  const before = text.slice(Math.max(0, idx - 18), idx);
  return NEGATIONS.some((n) => new RegExp(`\\b${n}\\b`).test(before));
}

export interface HazardMatch {
  rule: EscalationRuleInput;
  keyword: string;
  lifeSafety: boolean;
}

export function detectHazard(text: string, rules: EscalationRuleInput[] = DEFAULT_ESCALATION_RULES): HazardMatch | null {
  const norm = normalize(text);
  const active = [...rules].filter((r) => r.active).sort((a, b) => a.priority - b.priority);
  for (const rule of active) {
    for (const raw of rule.keywords) {
      const kw = normalize(raw).trim();
      if (!kw) continue;
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (re.test(norm) && !isNegated(norm, kw)) {
        return { rule, keyword: raw, lifeSafety: LIFE_SAFETY_HAZARDS.includes(rule.hazard as Hazard) };
      }
    }
  }
  return null;
}
