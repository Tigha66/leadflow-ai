import "server-only";

/** Minimal Twilio REST client using fetch (no SDK needed; works in any Node/edge runtime). */
function creds() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return { sid, auth: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` };
}

export function twilioConfigured(): boolean {
  return creds() !== null;
}

async function post(path: string, params: Record<string, string>) {
  const c = creds();
  if (!c) throw new Error("Twilio is not configured");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${c.sid}${path}`, {
    method: "POST",
    headers: { authorization: c.auth, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Twilio ${path} failed: ${res.status} ${String(data.message ?? "")}`);
  return data;
}

export async function sendSms(opts: { from: string; to: string; body: string; statusCallback?: string }) {
  const data = await post("/Messages.json", {
    From: opts.from,
    To: opts.to,
    Body: opts.body,
    ...(opts.statusCallback ? { StatusCallback: opts.statusCallback } : {}),
  });
  return { sid: String(data.sid) };
}

export async function startCallRecording(callSid: string, statusCallback: string) {
  const data = await post(`/Calls/${callSid}/Recordings.json`, {
    RecordingStatusCallback: statusCallback,
    RecordingChannels: "dual",
  });
  return { sid: String(data.sid) };
}
