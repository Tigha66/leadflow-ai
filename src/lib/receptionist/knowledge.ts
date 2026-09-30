import type { BusinessHoursInput, HolidayInput } from "@/lib/scheduling/hours";
import type { ServiceAreaInput } from "@/lib/service-area";

export interface FaqInput {
  question: string;
  answer: string;
  keywords: string[];
  active: boolean;
}

export interface KnowledgeInput {
  faqs: FaqInput[];
  documents: { kind: string; content: string }[];
  hours: BusinessHoursInput[];
  holidays?: HolidayInput[];
  serviceAreas: ServiceAreaInput[];
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmt(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hr}:${String(m).padStart(2, "0")} ${suffix}` : `${hr} ${suffix}`;
}

export function describeHours(hours: BusinessHoursInput[]): string {
  const open = hours.filter((h) => !h.closed).sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7));
  if (!open.length) return "Our office hours haven't been set up yet.";
  // Group consecutive days with identical hours.
  const groups: { days: number[]; open: string; close: string }[] = [];
  for (const h of open) {
    const g = groups[groups.length - 1];
    if (g && g.open === h.openTime && g.close === h.closeTime && (g.days[g.days.length - 1] + 1) % 7 === h.dayOfWeek) g.days.push(h.dayOfWeek);
    else groups.push({ days: [h.dayOfWeek], open: h.openTime, close: h.closeTime });
  }
  const parts = groups.map((g) => {
    const label = g.days.length > 2 ? `${DAYS[g.days[0]]} through ${DAYS[g.days[g.days.length - 1]]}` : g.days.map((d) => DAYS[d]).join(" and ");
    return `${label} ${fmt(g.open)} to ${fmt(g.close)}`;
  });
  const closed = hours.filter((h) => h.closed).map((h) => DAYS[h.dayOfWeek]);
  return `Our office is open ${parts.join(", and ")}${closed.length ? `. We're closed ${closed.join(" and ")}` : ""}.`;
}

function doc(k: KnowledgeInput, kind: string): string | null {
  const d = k.documents.find((x) => x.kind === kind && x.content.trim());
  return d ? d.content.trim() : null;
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2));
}

export function matchFaq(k: KnowledgeInput, text: string): FaqInput | null {
  const t = text.toLowerCase();
  const tw = words(text);
  let best: { faq: FaqInput; score: number } | null = null;
  for (const faq of k.faqs.filter((f) => f.active)) {
    let score = 0;
    for (const kw of faq.keywords) if (kw && t.includes(kw.toLowerCase())) score += 3;
    for (const w of words(faq.question)) if (tw.has(w)) score += 1;
    if (score >= 3 && (!best || score > best.score)) best = { faq, score };
  }
  return best?.faq ?? null;
}

/**
 * Answers informational questions ONLY from company-approved content. Returns null when there is no
 * approved answer so the agent offers a callback instead of guessing. Pricing is never invented.
 */
export function answerFromKnowledge(k: KnowledgeInput, intentKey: string, text: string): string | null {
  const faq = matchFaq(k, text);
  switch (intentKey) {
    case "pricing_question": {
      if (faq && /price|cost|fee|\$/i.test(faq.answer)) return faq.answer;
      const fee = doc(k, "dispatch_fee");
      const policy = doc(k, "pricing_policy");
      if (/dispatch|trip|diagnostic|service (call|fee)|come out/i.test(text) && fee) return fee;
      return policy ?? fee ?? null;
    }
    case "hours":
      return faq?.answer ?? describeHours(k.hours);
    case "service_area_question": {
      const cities = Array.from(new Set(k.serviceAreas.filter((a) => a.active).flatMap((a) => a.cities)));
      const territory = doc(k, "territory");
      if (territory) return territory;
      if (!cities.length) return null;
      return `We serve ${cities.slice(0, 8).join(", ")}${cities.length > 8 ? " and surrounding areas" : ""}. If you give me your ZIP code during booking, I'll confirm.`;
    }
    case "warranty_question":
      return faq?.answer ?? doc(k, "warranty");
    case "membership_question":
      return faq?.answer ?? doc(k, "membership") ?? doc(k, "maintenance_plans");
    case "billing_question":
      if (/financ/i.test(text)) return doc(k, "financing") ?? faq?.answer ?? null;
      return faq?.answer ?? null;
    default:
      return faq?.answer ?? null;
  }
}
