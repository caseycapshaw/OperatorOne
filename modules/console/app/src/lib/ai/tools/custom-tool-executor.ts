import { tool } from "ai";
import { z, type ZodTypeAny } from "zod";
import type { CustomTool } from "@/db/schema";

/**
 * Converts a JSON Schema object into a Zod schema.
 * Supports basic types: string, number, integer, boolean, object, array.
 */
function jsonSchemaToZod(schema: Record<string, unknown>): ZodTypeAny {
  const type = schema.type as string;

  switch (type) {
    case "string":
      return z.string().describe((schema.description as string) || "");
    case "number":
    case "integer":
      return z.number().describe((schema.description as string) || "");
    case "boolean":
      return z.boolean().describe((schema.description as string) || "");
    case "array": {
      const items = (schema.items as Record<string, unknown>) || { type: "string" };
      return z.array(jsonSchemaToZod(items));
    }
    case "object": {
      const properties = (schema.properties as Record<string, Record<string, unknown>>) || {};
      const required = (schema.required as string[]) || [];
      const shape: Record<string, ZodTypeAny> = {};

      for (const [key, propSchema] of Object.entries(properties)) {
        const zodProp = jsonSchemaToZod(propSchema);
        shape[key] = required.includes(key) ? zodProp : zodProp.optional();
      }

      return z.object(shape);
    }
    default:
      return z.string();
  }
}

/**
 * Renders a body template by replacing {{param}} placeholders with values.
 */
function renderTemplate(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : "";
  });
}

/**
 * Builds a Vercel AI `tool()` from a CustomTool database record.
 */
export function buildCustomTool(customTool: CustomTool) {
  const inputSchema = jsonSchemaToZod(
    customTool.inputSchema as Record<string, unknown>,
  ) as z.ZodObject<Record<string, ZodTypeAny>>;

  return tool({
    description: customTool.description,
    inputSchema,
    execute: async (params) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(customTool.httpHeaders as Record<string, string>),
      };

      const fetchOptions: RequestInit = {
        method: customTool.httpMethod,
        headers,
      };

      if (customTool.httpMethod !== "GET" && customTool.httpMethod !== "HEAD") {
        if (customTool.bodyTemplate) {
          fetchOptions.body = renderTemplate(customTool.bodyTemplate, params);
        } else {
          fetchOptions.body = JSON.stringify(params);
        }
      }

      const response = await fetch(customTool.httpEndpoint, fetchOptions);

      if (!response.ok) {
        const text = await response.text();
        return { error: `HTTP ${response.status}: ${text}` };
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return await response.json();
      }
      return { result: await response.text() };
    },
  });
}
