export interface ServiceAreaInput {
  id?: string;
  name: string;
  zipCodes: string[];
  cities: string[];
  active: boolean;
  /** Reserved for future radius territories. */
  centerLat?: number | null;
  centerLng?: number | null;
  radiusMiles?: number | null;
}

export interface ServiceAreaCheck {
  status: "in_area" | "out_of_area" | "unknown";
  matchedArea?: string;
  reason: string;
}

export function extractZip(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (m) return m[1];
  // Spoken digits: "eight five two five one"
  const words: Record<string, string> = { zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };
  const digits = text
    .toLowerCase()
    .split(/[\s,.-]+/)
    .map((w) => words[w] ?? (/^\d$/.test(w) ? w : ""))
    .join("");
  const dm = digits.match(/\d{5}/);
  return dm ? dm[0] : null;
}

const normCity = (c: string) => c.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();

/**
 * Checks a ZIP and/or city against configured territories. ZIP matches are authoritative; city
 * matching is used when no ZIP is known. Returns "unknown" when we can't tell — callers must
 * never be promised service in that case.
 */
export function checkServiceArea(areas: ServiceAreaInput[], input: { zip?: string | null; city?: string | null; text?: string | null }): ServiceAreaCheck {
  const active = areas.filter((a) => a.active);
  if (active.length === 0) return { status: "unknown", reason: "No service areas configured" };
  const zip = input.zip ?? extractZip(input.text);
  if (zip) {
    const hit = active.find((a) => a.zipCodes.map((z) => z.trim()).includes(zip));
    if (hit) return { status: "in_area", matchedArea: hit.name, reason: `ZIP ${zip} is in ${hit.name}` };
    const anyZipsConfigured = active.some((a) => a.zipCodes.length > 0);
    if (anyZipsConfigured) {
      // ZIP given but not listed; allow a configured city to still match if explicitly named.
      const cityHit = input.city ? findCity(active, input.city) : null;
      if (cityHit) return { status: "in_area", matchedArea: cityHit.name, reason: `City ${input.city} is in ${cityHit.name}` };
      return { status: "out_of_area", reason: `ZIP ${zip} is outside configured territories` };
    }
  }
  const cityText = input.city ?? input.text ?? "";
  const cityHit = findCity(active, cityText, !input.city);
  if (cityHit) return { status: "in_area", matchedArea: cityHit.name, reason: `City matched ${cityHit.name}` };
  if (input.city) return { status: "out_of_area", reason: `City ${input.city} is outside configured territories` };
  return { status: "unknown", reason: "No ZIP or recognizable city provided" };
}

function findCity(areas: ServiceAreaInput[], text: string, substring = false): ServiceAreaInput | null {
  const t = normCity(text);
  if (!t) return null;
  for (const a of areas) {
    for (const c of a.cities) {
      const nc = normCity(c);
      if (!nc) continue;
      if (substring ? new RegExp(`\\b${nc}\\b`).test(t) : nc === t) return a;
    }
  }
  return null;
}
