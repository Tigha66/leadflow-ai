import type { Role } from "@/db/schema";

export const ROLE_RANK: Record<Role, number> = { staff: 1, dispatcher: 2, admin: 3, owner: 4 };

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  dispatcher: "Dispatcher",
  staff: "Staff",
};

export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Permission map used by server actions/routes. UI hiding is cosmetic; these checks are enforced server-side. */
export const PERMISSIONS = {
  viewDashboard: "staff",
  addLeadNote: "staff",
  manageLeads: "dispatcher",
  manageAppointments: "dispatcher",
  manageDispatch: "dispatcher",
  runSimulator: "dispatcher",
  configureReceptionist: "admin",
  manageServiceAreas: "admin",
  manageKnowledge: "admin",
  managePhoneNumbers: "admin",
  manageIntegrations: "admin",
  manageTeam: "admin",
  manageSettings: "admin",
  manageBilling: "owner",
} as const satisfies Record<string, Role>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return roleAtLeast(role, PERMISSIONS[permission]);
}

/** Owners can assign any role; admins can assign up to admin; nobody else manages roles. */
export function canAssignRole(actor: Role, target: Role): boolean {
  if (actor === "owner") return true;
  if (actor === "admin") return target !== "owner";
  return false;
}
