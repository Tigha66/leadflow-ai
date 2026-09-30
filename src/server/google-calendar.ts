import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { integrations } from "@/db/schema";
import { decryptJson } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import type { BusyInterval } from "@/lib/scheduling/availability";

/**
 * Google Calendar connector (OAuth 2.0, offline access). Only active when GOOGLE_CLIENT_ID/SECRET are
 * configured AND the organization completed the OAuth connection. Uses the REST API directly.
 */
export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

interface StoredCreds {
  refresh_token: string;
}

async function getConnection(orgId: string) {
  if (!googleConfigured()) return null;
  const [row] = await getDb()
    .select()
    .from(integrations)
    .where(and(eq(integrations.orgId, orgId), eq(integrations.provider, "google_calendar"), eq(integrations.status, "connected")))
    .limit(1);
  if (!row?.encryptedCredentials) return null;
  const creds = decryptJson<StoredCreds>(row.encryptedCredentials);
  const calendarId = (row.config as { calendarId?: string }).calendarId ?? "primary";
  return { creds, calendarId };
}

async function accessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed (${res.status})`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function googleBusy(orgId: string, from: Date, to: Date): Promise<BusyInterval[]> {
  const conn = await getConnection(orgId);
  if (!conn) return [];
  try {
    const token = await accessToken(conn.creds.refresh_token);
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: conn.calendarId }] }),
    });
    if (!res.ok) throw new Error(`freeBusy ${res.status}`);
    const data = (await res.json()) as { calendars: Record<string, { busy: { start: string; end: string }[] }> };
    return (data.calendars[conn.calendarId]?.busy ?? []).map((b) => ({ startsAt: new Date(b.start), endsAt: new Date(b.end), technicianId: null }));
  } catch (err) {
    logger.warn("google.freebusy_failed", { orgId, err });
    return [];
  }
}

export async function googleCreateEvent(orgId: string, event: { summary: string; description: string; startsAt: Date; endsAt: Date; location?: string }): Promise<string | null> {
  const conn = await getConnection(orgId);
  if (!conn) return null;
  try {
    const token = await accessToken(conn.creds.refresh_token);
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendarId)}/events`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: { dateTime: event.startsAt.toISOString() },
        end: { dateTime: event.endsAt.toISOString() },
      }),
    });
    if (!res.ok) throw new Error(`events.insert ${res.status}`);
    const data = (await res.json()) as { id: string };
    return data.id;
  } catch (err) {
    logger.warn("google.create_event_failed", { orgId, err });
    return null;
  }
}

export function googleAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function googleExchangeCode(code: string, redirectUri: string): Promise<{ refresh_token?: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google code exchange failed (${res.status})`);
  return (await res.json()) as { refresh_token?: string };
}
