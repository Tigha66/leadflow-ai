import "server-only";
import OpenAI from "openai";
import { INTENTS } from "@/lib/hvac/catalog";
import { logger } from "@/lib/logger";

/**
 * Optional OpenAI assistance for the turn-based engine. The deterministic engine owns the call flow,
 * safety and booking; the model only helps classify unusual phrasing and polish summaries. Nothing here
 * runs unless OPENAI_API_KEY is set.
 */
let client: OpenAI | null = null;
function openai(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 6000, maxRetries: 0 });
  return client;
}

const TEXT_MODEL = () => process.env.OPENAI_TEXT_MODEL || "gpt-5-mini";

export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function classifyIntentWithAi(text: string): Promise<string | null> {
  const ai = openai();
  if (!ai) return null;
  try {
    const keys = INTENTS.map((i) => i.key);
    const res = await ai.responses.create({
      model: TEXT_MODEL(),
      instructions: `Classify an HVAC company caller's utterance into exactly one intent key. Keys: ${keys.join(", ")}. Reply with only the key.`,
      input: text.slice(0, 500),
    });
    const key = res.output_text.trim().toLowerCase();
    return keys.includes(key) ? key : null;
  } catch (err) {
    logger.warn("ai.classify_failed", { err });
    return null;
  }
}

export async function polishSummaryWithAi(summary: string, transcript: string): Promise<string | null> {
  const ai = openai();
  if (!ai) return null;
  try {
    const res = await ai.responses.create({
      model: TEXT_MODEL(),
      instructions:
        "Rewrite this HVAC call summary for a dispatcher in 2-3 short sentences. Keep every fact (names, address, urgency, booking, safety escalation). Do not add facts, diagnoses or prices not present in the input.",
      input: `Draft summary: ${summary}\n\nTranscript:\n${transcript.slice(0, 6000)}`,
    });
    const out = res.output_text.trim();
    return out.length > 20 ? out : null;
  } catch (err) {
    logger.warn("ai.summary_failed", { err });
    return null;
  }
}
