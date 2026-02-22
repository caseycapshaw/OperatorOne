import type { OrganizationMember } from "@/db/schema";

export type Role = NonNullable<OrganizationMember["role"]>;

export interface AgentDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  instructions: string;
  isSystem: boolean;
  minRole: Role;
  icon?: string | null;
  color?: string | null;
  modelOverride?: string | null;
  modelRecommendation?: string | null;
  maxSteps: number;
  allowedTools: string[];
  toolSettings?: Record<string, Record<string, string>>;
  category: "system" | "template" | "custom";
}

export interface SkillDefinition {
  id: string;
  name: string;
  description?: string | null;
  content: string;
  isActive: boolean;
  sortOrder: number;
}

export interface AgentContext {
  orgId: string;
  clientId: string;
  role: Role;
  orgName: string;
}
