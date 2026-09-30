import { INTENTS, INTENT_BY_KEY, type IntentDef } from "./catalog";

export interface IntentResult {
  intent: IntentDef;
  confidence: number; // 0..1
  matched: string[];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ").trim();
}

const compiled = INTENTS.map((intent) => ({
  intent,
  regexes: intent.patterns.map((p) => new RegExp(p, "i")),
}));

/**
 * Rule-based intent classifier. Deterministic, fast and testable; used on every turn and as the
 * fallback when no LLM is configured. Specific problems beat generic ones (e.g. "AC not turning on"
 * over "strange noise") via pattern length weighting.
 */
export function classifyIntent(text: string): IntentResult {
  const norm = normalize(text);
  let best: IntentResult | null = null;
  for (const { intent, regexes } of compiled) {
    const matched: string[] = [];
    let score = 0;
    for (const re of regexes) {
      const m = norm.match(re);
      if (m) {
        matched.push(m[0]);
        score += 1 + Math.min(m[0].length, 40) / 40;
      }
    }
    if (score > 0 && (!best || score > best.confidence)) {
      best = { intent, confidence: score, matched };
    }
  }
  if (!best) return { intent: INTENT_BY_KEY.other, confidence: 0, matched: [] };
  return { ...best, confidence: Math.min(1, best.confidence / 2) };
}

export function isResidentialOrCommercial(text: string): "residential" | "commercial" | null {
  const t = normalize(text);
  if (/\b(commercial|business|office|store|restaurant|warehouse|building|shop)\b/.test(t)) return "commercial";
  if (/\b(home|house|residential|residence|apartment|condo|townhouse|my place)\b/.test(t)) return "residential";
  return null;
}

export function detectCustomerType(text: string): "new" | "existing" | null {
  const t = normalize(text);
  if (/\b(existing|current|been (here|out) before|used you|you guys came|you came out|you've been|returning|member)\b/.test(t)) return "existing";
  if (/\b(new customer|first time|never used|haven't used|not yet)\b/.test(t)) return "new";
  return null;
}

export function detectSystemType(text: string): string | null {
  const t = normalize(text);
  if (/heat pump/.test(t)) return "heat pump";
  if (/mini[- ]?split|ductless/.test(t)) return "ductless mini-split";
  if (/boiler/.test(t)) return "boiler";
  if (/(gas )?furnace/.test(t)) return "furnace";
  if (/package unit|packaged unit|rooftop/.test(t)) return "package unit";
  if (/swamp cooler|evaporative/.test(t)) return "evaporative cooler";
  if (/central air|\bac\b|air condition/.test(t)) return "central air conditioner";
  return null;
}
