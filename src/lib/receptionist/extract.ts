import { extractZip } from "@/lib/service-area";
import { normalizePhone } from "@/lib/utils";

const DIGIT_WORDS: Record<string, string> = {
  zero: "0", oh: "0", o: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
};

export function extractPhone(text: string): string | null {
  const direct = text.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  if (direct) return normalizePhone(direct[0]);
  const spoken = text
    .toLowerCase()
    .split(/[\s,.-]+/)
    .map((w) => DIGIT_WORDS[w] ?? (/^\d+$/.test(w) ? w : ""))
    .join("");
  const m = spoken.match(/1?\d{10}/);
  return m ? normalizePhone(m[0]) : null;
}

export { extractZip };

const NAME_STOP = new Set([
  "calling", "here", "the", "a", "an", "and", "my", "i", "im", "i'm", "it", "its", "it's", "is", "hi", "hello", "hey", "yes", "yeah",
  "about", "because", "with", "from", "at", "ac", "furnace", "heater", "having", "trying", "looking", "need", "just", "so", "but",
]);

function cleanName(raw: string): string | null {
  const words = raw
    .replace(/[^a-zA-Z' -]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    if (NAME_STOP.has(w.toLowerCase())) {
      if (out.length) break;
      continue;
    }
    out.push(w[0].toUpperCase() + w.slice(1).toLowerCase());
    if (out.length === 3) break;
  }
  const name = out.join(" ").trim();
  return name.length >= 2 ? name : null;
}

/** Finds a name the caller volunteered ("this is Maria", "my name is John Smith"). */
export function extractVolunteeredName(text: string): string | null {
  const m = text.match(/\b(?:my name is|my name's|this is|name is)\s+([a-zA-Z' -]{2,40})/i);
  if (!m) return null;
  return cleanName(m[1]);
}

/** Parses an answer to "Can I get your name?" */
export function extractNameAnswer(text: string): string | null {
  const volunteered = extractVolunteeredName(text);
  if (volunteered) return volunteered;
  const stripped = text.replace(/^(it'?s|i'?m|i am|sure|yeah|yes|ok(ay)?|um+|uh+)[,\s]+/i, "").replace(/^(it'?s|i'?m|i am)\s+/i, "");
  if (stripped.split(/\s+/).length > 5) return null;
  return cleanName(stripped);
}

export function parseYesNo(text: string): "yes" | "no" | null {
  const t = text.toLowerCase();
  if (/\b(no|nope|nah|not really|don'?t|do not|negative|that'?s (all|it)|i'?m good|i'?m all set|all set|nothing( else)?)\b/.test(t)) return "no";
  if (/\b(yes|yeah|yep|yup|sure|correct|right|ok(ay)?|please|sounds good|that works|absolutely|of course|go ahead|affirmative|that'?s (fine|right|correct))\b/.test(t)) return "yes";
  return null;
}

export function extractEmail(text: string): string | null {
  const m = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (m) return m[0].toLowerCase();
  const spoken = text.toLowerCase().replace(/\s+at\s+/g, "@").replace(/\s+dot\s+/g, ".").replace(/\s+/g, "");
  const s = spoken.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/);
  return s ? s[0] : null;
}

/** Heuristic: text looks like a street address ("123 Main St", "4410 north 7th avenue"). */
export function looksLikeAddress(text: string): boolean {
  return /\b\d{2,6}\s+(?:[nsew]\.?\s+|north\s+|south\s+|east\s+|west\s+)?[a-z0-9]+(?:\s+[a-z0-9]+){0,4}\b/i.test(text);
}

export function cleanAddress(text: string): string {
  return text
    .replace(/^(it'?s|the address is|address is|we'?re at|i'?m at|i live at|sure|yeah|ok(ay)?)[,:\s]+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.]+$/, "");
}

/** Maps "the first one", "second", "Tuesday", "tomorrow morning", "2" to an index into offered options. */
export function chooseOption(text: string, labels: string[]): number | null {
  const t = text.toLowerCase();
  const ordinals: [RegExp, number][] = [
    [/\b(second|2nd|number (2|two)|option (2|two)|middle)\b|^\s*(two|2)\W*$/, 1],
    [/\b(third|3rd|last one|number (3|three)|option (3|three))\b|^\s*(three|3)\W*$/, 2],
    [/\b(first|1st|earliest|soonest|number (1|one)|option (1|one))\b|^\s*(one|1)\W*$/, 0],
  ];
  for (const [re, idx] of ordinals) if (re.test(t) && idx < labels.length) return idx;
  const tokens = ["today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayHit = tokens.find((d) => t.includes(d));
  const wantsMorning = /\bmorning|\bam\b|early/.test(t);
  const wantsAfternoon = /afternoon|\bpm\b|later|evening/.test(t);
  const candidates = labels
    .map((l, i) => ({ l: l.toLowerCase(), i }))
    .filter(({ l }) => (dayHit ? l.includes(dayHit) : true));
  if (!candidates.length) return null;
  if (wantsMorning || wantsAfternoon) {
    const hit = candidates.find(({ l }) => {
      const m = l.match(/between (\d+)(?::\d+)?\s*(am|pm)/i);
      if (!m) return false;
      const isAm = m[2].toLowerCase() === "am";
      return wantsMorning ? isAm : !isAm;
    });
    if (hit) return hit.i;
  }
  if (dayHit) return candidates[0].i;
  const time = t.match(/\b(\d{1,2})(?::\d{2})?\s*(am|pm)?\b/);
  if (time) {
    const hit = labels.findIndex((l) => l.toLowerCase().includes(`between ${time[1]}`));
    if (hit >= 0) return hit;
  }
  return null;
}
