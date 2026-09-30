import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb, isDatabaseConfigured } from "@/db";
import { organizationMembers, organizations, sessions, users, type Role } from "@/db/schema";
import { randomToken, sha256 } from "@/lib/crypto";
import { roleAtLeast } from "@/lib/roles";
import { AuthError, ForbiddenError } from "./errors";

const SESSION_TTL_DAYS = 14;
const SECURE = process.env.NODE_ENV === "production";
/** `__Host-` prefix pins the cookie to this host, HTTPS only, path=/ (no subdomain injection). */
export const SESSION_COOKIE = SECURE ? "__Host-hvac_session" : "hvac_session";

export { hashPassword, verifyPassword } from "@/lib/passwords";

export async function createSession(userId: string, activeOrgId: string | null, userAgent?: string): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  await getDb().insert(sessions).values({ id: sha256(token), userId, activeOrgId, expiresAt, userAgent });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && isDatabaseConfigured()) await getDb().delete(sessions).where(eq(sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.userId, userId));
}

export interface SessionUser {
  sessionId: string;
  user: { id: string; email: string; name: string };
  activeOrgId: string | null;
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  if (!isDatabaseConfigured()) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const id = sha256(token);
  const rows = await getDb()
    .select({ sessionId: sessions.id, activeOrgId: sessions.activeOrgId, userId: users.id, email: users.email, name: users.name })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, sql`now()`)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { sessionId: row.sessionId, activeOrgId: row.activeOrgId, user: { id: row.userId, email: row.email, name: row.name } };
});

export interface OrgContext {
  user: SessionUser["user"];
  sessionId: string;
  orgId: string;
  role: Role;
  org: typeof organizations.$inferSelect;
}

/**
 * Resolves the caller's organization from the session AND verifies membership in the database.
 * Every tenant-scoped query must use `ctx.orgId` from here — never an org id from the client.
 */
export const getOrgContext = cache(async (): Promise<OrgContext | null> => {
  const session = await getSession();
  if (!session) return null;
  const db = getDb();
  const memberships = await db
    .select({ role: organizationMembers.role, org: organizations })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.orgId))
    .where(eq(organizationMembers.userId, session.user.id));
  if (!memberships.length) return null;
  const active = memberships.find((m) => m.org.id === session.activeOrgId) ?? memberships[0];
  return { user: session.user, sessionId: session.sessionId, orgId: active.org.id, role: active.role, org: active.org };
});

/** For pages: redirect to login/onboarding instead of throwing. */
export async function requirePageContext(minRole: Role = "staff"): Promise<OrgContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  const ctx = await getOrgContext();
  if (!ctx) redirect("/onboarding");
  if (!roleAtLeast(ctx.role, minRole)) redirect("/dashboard?denied=1");
  return ctx;
}

/** For server actions / route handlers: throw typed errors. */
export async function requireContext(minRole: Role = "staff"): Promise<OrgContext> {
  const ctx = await getOrgContext();
  if (!ctx) throw new AuthError();
  if (!roleAtLeast(ctx.role, minRole)) throw new ForbiddenError();
  return ctx;
}

export async function listUserOrganizations(userId: string) {
  return getDb()
    .select({ id: organizations.id, name: organizations.name, role: organizationMembers.role, isDemo: organizations.isDemo })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.orgId))
    .where(eq(organizationMembers.userId, userId));
}

export async function setActiveOrg(sessionId: string, userId: string, orgId: string): Promise<boolean> {
  const db = getDb();
  const member = await db
    .select({ orgId: organizationMembers.orgId })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.orgId, orgId)))
    .limit(1);
  if (!member.length) return false;
  await db.update(sessions).set({ activeOrgId: orgId }).where(eq(sessions.id, sessionId));
  return true;
}
