import { createHmac } from "node:crypto";
import { safeEqual } from "@/lib/crypto";

/**
 * Twilio request validation (X-Twilio-Signature): HMAC-SHA1 over the full URL followed by every POST
 * parameter name+value sorted alphabetically by name, base64-encoded, keyed with the auth token.
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function computeTwilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
}

export function validateTwilioSignature(authToken: string, signature: string | null, url: string, params: Record<string, string>): boolean {
  if (!signature || !authToken) return false;
  const expected = computeTwilioSignature(authToken, url, params);
  if (safeEqual(expected, signature)) return true;
  // Twilio may sign with or without the default port; try the alternate form.
  try {
    const u = new URL(url);
    if (!u.port) {
      u.port = u.protocol === "https:" ? "443" : "80";
      return safeEqual(computeTwilioSignature(authToken, u.toString(), params), signature);
    }
    u.port = "";
    return safeEqual(computeTwilioSignature(authToken, u.toString(), params), signature);
  } catch {
    return false;
  }
}
