// Paperless-ngx REST API client
// Follows the same pattern as n8n-client.ts — thin fetch wrapper with typed methods.

import { getPaperlessApiToken } from "@/lib/secrets";

const PAPERLESS_API_URL =
  process.env.PAPERLESS_API_URL || "http://op1-paperless:8000/api";

async function paperlessFetch(path: string, options?: RequestInit) {
  const token = (await getPaperlessApiToken()) ?? "";
  const res = await fetch(`${PAPERLESS_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    return { error: `Paperless API error (${res.status}): ${text}` };
  }

  return res.json();
}

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

function enc(id: string | number) {
  return encodeURIComponent(String(id));
}

export const paperlessClient = {
  // ─── Documents ──────────────────────────────────────────

  async searchDocuments(query: string, page?: number) {
    const data = await paperlessFetch(
      `/documents/${buildQuery({ query, page })}`,
    );
    if (data && "error" in data) return data;
    return {
      count: data.count,
      results: (data.results ?? []).map((d: Record<string, unknown>) => ({
        id: d.id,
        title: d.title,
        correspondent: d.correspondent,
        document_type: d.document_type,
        tags: d.tags,
        created: d.created,
        added: d.added,
        archive_serial_number: d.archive_serial_number,
      })),
    };
  },

  async listDocuments(opts?: {
    page?: number;
    correspondent?: number;
    document_type?: number;
    tags__id__in?: string;
    ordering?: string;
  }) {
    const data = await paperlessFetch(
      `/documents/${buildQuery(opts ?? {})}`,
    );
    if (data && "error" in data) return data;
    return {
      count: data.count,
      results: (data.results ?? []).map((d: Record<string, unknown>) => ({
        id: d.id,
        title: d.title,
        correspondent: d.correspondent,
        document_type: d.document_type,
        tags: d.tags,
        created: d.created,
        added: d.added,
        archive_serial_number: d.archive_serial_number,
      })),
    };
  },

  async getDocument(id: number) {
    return paperlessFetch(`/documents/${enc(id)}/`);
  },

  async uploadDocument(
    title: string,
    document: string,
    opts?: {
      correspondent?: number;
      document_type?: number;
      tags?: number[];
    },
  ) {
    // Paperless upload expects multipart/form-data for file upload,
    // but we can create via the API with a base64 document field
    return paperlessFetch("/documents/post_document/", {
      method: "POST",
      body: JSON.stringify({ title, document, ...opts }),
    });
  },

  async updateDocument(
    id: number,
    body: Record<string, unknown>,
  ) {
    return paperlessFetch(`/documents/${enc(id)}/`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async deleteDocument(id: number) {
    return paperlessFetch(`/documents/${enc(id)}/`, { method: "DELETE" });
  },

  // ─── Tags ───────────────────────────────────────────────

  async listTags() {
    const data = await paperlessFetch("/tags/");
    if (data && "error" in data) return data;
    return (data.results ?? data ?? []).map((t: Record<string, unknown>) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      document_count: t.document_count,
    }));
  },

  async createTag(name: string, color?: string) {
    return paperlessFetch("/tags/", {
      method: "POST",
      body: JSON.stringify({ name, color }),
    });
  },

  async deleteTag(id: number) {
    return paperlessFetch(`/tags/${enc(id)}/`, { method: "DELETE" });
  },

  // ─── Correspondents ─────────────────────────────────────

  async listCorrespondents() {
    const data = await paperlessFetch("/correspondents/");
    if (data && "error" in data) return data;
    return (data.results ?? data ?? []).map((c: Record<string, unknown>) => ({
      id: c.id,
      name: c.name,
      document_count: c.document_count,
    }));
  },

  async createCorrespondent(name: string) {
    return paperlessFetch("/correspondents/", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async deleteCorrespondent(id: number) {
    return paperlessFetch(`/correspondents/${enc(id)}/`, { method: "DELETE" });
  },

  // ─── Document Types ─────────────────────────────────────

  async listDocumentTypes() {
    const data = await paperlessFetch("/document_types/");
    if (data && "error" in data) return data;
    return (data.results ?? data ?? []).map((t: Record<string, unknown>) => ({
      id: t.id,
      name: t.name,
      document_count: t.document_count,
    }));
  },

  async createDocumentType(name: string) {
    return paperlessFetch("/document_types/", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async deleteDocumentType(id: number) {
    return paperlessFetch(`/document_types/${enc(id)}/`, { method: "DELETE" });
  },
};
