/** Tiny, dependency-free TwiML builder. All text is XML-escaped. */
export function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

type Node = string;

export const twiml = {
  response: (...children: Node[]) => `<?xml version="1.0" encoding="UTF-8"?><Response>${children.join("")}</Response>`,
  say: (text: string, voice = "Polly.Joanna-Neural") => `<Say voice="${xmlEscape(voice)}">${xmlEscape(text)}</Say>`,
  gather: (opts: { action: string; say?: string; voice?: string; timeout?: number; hints?: string }) =>
    `<Gather input="speech" action="${xmlEscape(opts.action)}" method="POST" speechTimeout="auto" timeout="${opts.timeout ?? 6}" speechModel="phone_call" enhanced="true" actionOnEmptyResult="true"${opts.hints ? ` hints="${xmlEscape(opts.hints)}"` : ""}>${opts.say ? twiml.say(opts.say, opts.voice) : ""}</Gather>`,
  dial: (number: string, opts: { action?: string; callerId?: string; timeout?: number } = {}) =>
    `<Dial timeout="${opts.timeout ?? 25}"${opts.action ? ` action="${xmlEscape(opts.action)}" method="POST"` : ""}${opts.callerId ? ` callerId="${xmlEscape(opts.callerId)}"` : ""}>${xmlEscape(number)}</Dial>`,
  redirect: (url: string) => `<Redirect method="POST">${xmlEscape(url)}</Redirect>`,
  hangup: () => `<Hangup/>`,
  pause: (length = 1) => `<Pause length="${length}"/>`,
  connectStream: (url: string, params: Record<string, string>) =>
    `<Connect><Stream url="${xmlEscape(url)}">${Object.entries(params)
      .map(([k, v]) => `<Parameter name="${xmlEscape(k)}" value="${xmlEscape(v)}"/>`)
      .join("")}</Stream></Connect>`,
};
