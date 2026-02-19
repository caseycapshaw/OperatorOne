import type { OrganizationMember } from "@/db/schema";
import { consoleReadTools } from "./console-read-tools";
import { consoleWriteTools } from "./console-write-tools";
import { n8nTools } from "./n8n-tools";
import { adminTools } from "./admin-tools";

type Role = NonNullable<OrganizationMember["role"]>;

const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

export function buildToolSet(
  role: Role,
  orgId: string,
  clientId: string,
) {
  const tools: Record<string, unknown> = {};

  // All roles get read tools
  const readTools = consoleReadTools(orgId);
  Object.assign(tools, readTools);

  // member+ get write tools
  if (hasMinRole(role, "member")) {
    const writeTools = consoleWriteTools(orgId, clientId, role);
    Object.assign(tools, writeTools);
  }

  // admin+ get n8n and system tools
  if (hasMinRole(role, "admin")) {
    Object.assign(tools, n8nTools());
    Object.assign(tools, adminTools());
  }

  return tools;
}
