export interface IntegrationDefinition {
  id: string;
  name: string;
  categories: string[];
}

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: "n8n",
    name: "n8n Automation",
    categories: [
      "n8n Workflows",
      "n8n Executions",
      "n8n Credentials",
      "n8n Tags",
      "n8n Variables",
      "n8n Users",
      "n8n Projects",
      "n8n Admin",
    ],
  },
  {
    id: "paperless",
    name: "Paperless-ngx Documents",
    categories: [
      "Paperless (Read)",
      "Paperless (Write)",
      "Paperless (Tags)",
      "Paperless (Meta)",
      "Paperless (Storage Paths)",
      "Paperless (Custom Fields)",
      "Paperless (Notes)",
      "Paperless (Bulk & Discovery)",
    ],
  },
  {
    id: "system-admin",
    name: "System Administration",
    categories: ["System Admin"],
  },
];

export const ALWAYS_ON_CATEGORIES = [
  "Console (Read)",
  "Console (Write)",
  "Paperless (Read)",
];

export function getEnabledCategories(enabledIds: string[]): Set<string> {
  const categories = new Set<string>(ALWAYS_ON_CATEGORIES);
  for (const integration of INTEGRATIONS) {
    if (enabledIds.includes(integration.id)) {
      for (const cat of integration.categories) {
        categories.add(cat);
      }
    }
  }
  return categories;
}
