// Shared role hierarchy and authorization utilities.
// Used across API routes, AI agents, and tool registries.

import type { Role } from "@/lib/ai/agents/types";

export const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}
