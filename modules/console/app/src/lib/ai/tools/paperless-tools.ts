// Paperless-ngx AI tools
// 15 tools for document management via Paperless REST API.
// Follows the same pattern as n8n-tools.ts.

import { tool } from "ai";
import { z } from "zod";
import { paperlessClient } from "../paperless-client";

export function paperlessTools() {
  return {
    // ─── Documents (Read) ─────────────────────────────────

    search_paperless_documents: tool({
      description:
        "Full-text search across all documents in Paperless-ngx. Returns matching documents with title, correspondent, type, tags, and date.",
      inputSchema: z.object({
        query: z.string().describe("Search query (full-text)"),
        page: z.number().min(1).optional().describe("Page number for pagination"),
      }),
      execute: async ({ query, page }) => {
        return paperlessClient.searchDocuments(query, page);
      },
    }),

    list_paperless_documents: tool({
      description:
        "List documents in Paperless-ngx with optional filters for correspondent, document type, or tags",
      inputSchema: z.object({
        page: z.number().min(1).optional().describe("Page number"),
        correspondent: z.number().optional().describe("Filter by correspondent ID"),
        document_type: z.number().optional().describe("Filter by document type ID"),
        tags__id__in: z
          .string()
          .optional()
          .describe("Comma-separated tag IDs to filter by"),
        ordering: z
          .string()
          .optional()
          .describe("Sort field (e.g. '-created', 'title', '-added')"),
      }),
      execute: async (opts) => {
        return paperlessClient.listDocuments(opts);
      },
    }),

    get_paperless_document: tool({
      description:
        "Get full details of a specific document including all metadata, tags, and content preview",
      inputSchema: z.object({
        documentId: z.number().describe("Paperless document ID"),
      }),
      execute: async ({ documentId }) => {
        return paperlessClient.getDocument(documentId);
      },
    }),

    // ─── Documents (Write) ────────────────────────────────

    upload_paperless_document: tool({
      description:
        "Upload a new document to Paperless-ngx with optional metadata (correspondent, type, tags)",
      inputSchema: z.object({
        title: z.string().describe("Document title"),
        document: z
          .string()
          .describe("Base64-encoded document content"),
        correspondent: z.number().optional().describe("Correspondent ID"),
        document_type: z.number().optional().describe("Document type ID"),
        tags: z.array(z.number()).optional().describe("Array of tag IDs"),
      }),
      execute: async ({ title, document, correspondent, document_type, tags }) => {
        return paperlessClient.uploadDocument(title, document, {
          correspondent,
          document_type,
          tags,
        });
      },
    }),

    update_paperless_document: tool({
      description:
        "Update metadata on an existing document (title, correspondent, document type, tags)",
      inputSchema: z.object({
        documentId: z.number().describe("Paperless document ID"),
        title: z.string().optional().describe("New title"),
        correspondent: z.number().nullable().optional().describe("Correspondent ID (null to clear)"),
        document_type: z.number().nullable().optional().describe("Document type ID (null to clear)"),
        tags: z.array(z.number()).optional().describe("Replace all tags with these IDs"),
        archive_serial_number: z
          .number()
          .nullable()
          .optional()
          .describe("Archive serial number"),
      }),
      execute: async ({ documentId, ...body }) => {
        return paperlessClient.updateDocument(documentId, body);
      },
    }),

    delete_paperless_document: tool({
      description: "Permanently delete a document from Paperless-ngx",
      inputSchema: z.object({
        documentId: z.number().describe("Paperless document ID"),
      }),
      execute: async ({ documentId }) => {
        return paperlessClient.deleteDocument(documentId);
      },
    }),

    // ─── Tags ─────────────────────────────────────────────

    list_paperless_tags: tool({
      description: "List all tags in Paperless-ngx with document counts",
      inputSchema: z.object({}),
      execute: async () => {
        return paperlessClient.listTags();
      },
    }),

    create_paperless_tag: tool({
      description: "Create a new tag in Paperless-ngx",
      inputSchema: z.object({
        name: z.string().describe("Tag name"),
        color: z
          .string()
          .optional()
          .describe("Hex color code (e.g. '#ff0000')"),
      }),
      execute: async ({ name, color }) => {
        return paperlessClient.createTag(name, color);
      },
    }),

    delete_paperless_tag: tool({
      description: "Delete a tag from Paperless-ngx",
      inputSchema: z.object({
        tagId: z.number().describe("Tag ID to delete"),
      }),
      execute: async ({ tagId }) => {
        return paperlessClient.deleteTag(tagId);
      },
    }),

    // ─── Correspondents ───────────────────────────────────

    list_paperless_correspondents: tool({
      description:
        "List all correspondents (senders/authors) in Paperless-ngx with document counts",
      inputSchema: z.object({}),
      execute: async () => {
        return paperlessClient.listCorrespondents();
      },
    }),

    create_paperless_correspondent: tool({
      description: "Create a new correspondent in Paperless-ngx",
      inputSchema: z.object({
        name: z.string().describe("Correspondent name"),
      }),
      execute: async ({ name }) => {
        return paperlessClient.createCorrespondent(name);
      },
    }),

    delete_paperless_correspondent: tool({
      description: "Delete a correspondent from Paperless-ngx",
      inputSchema: z.object({
        correspondentId: z.number().describe("Correspondent ID to delete"),
      }),
      execute: async ({ correspondentId }) => {
        return paperlessClient.deleteCorrespondent(correspondentId);
      },
    }),

    // ─── Document Types ───────────────────────────────────

    list_paperless_document_types: tool({
      description:
        "List all document types in Paperless-ngx with document counts",
      inputSchema: z.object({}),
      execute: async () => {
        return paperlessClient.listDocumentTypes();
      },
    }),

    create_paperless_document_type: tool({
      description: "Create a new document type in Paperless-ngx",
      inputSchema: z.object({
        name: z.string().describe("Document type name"),
      }),
      execute: async ({ name }) => {
        return paperlessClient.createDocumentType(name);
      },
    }),

    delete_paperless_document_type: tool({
      description: "Delete a document type from Paperless-ngx",
      inputSchema: z.object({
        documentTypeId: z.number().describe("Document type ID to delete"),
      }),
      execute: async ({ documentTypeId }) => {
        return paperlessClient.deleteDocumentType(documentTypeId);
      },
    }),

    // ─── Taxonomy Updates ─────────────────────────────────

    update_paperless_tag: tool({
      description: "Update/rename a tag in Paperless-ngx",
      inputSchema: z.object({
        tagId: z.number().describe("Tag ID to update"),
        name: z.string().optional().describe("New tag name"),
        color: z.string().optional().describe("New hex color code (e.g. '#ff0000')"),
      }),
      execute: async ({ tagId, ...body }) => {
        return paperlessClient.updateTag(tagId, body);
      },
    }),

    update_paperless_correspondent: tool({
      description: "Update/rename a correspondent in Paperless-ngx",
      inputSchema: z.object({
        correspondentId: z.number().describe("Correspondent ID to update"),
        name: z.string().optional().describe("New correspondent name"),
      }),
      execute: async ({ correspondentId, ...body }) => {
        return paperlessClient.updateCorrespondent(correspondentId, body);
      },
    }),

    update_paperless_document_type: tool({
      description: "Update/rename a document type in Paperless-ngx",
      inputSchema: z.object({
        documentTypeId: z.number().describe("Document type ID to update"),
        name: z.string().optional().describe("New document type name"),
      }),
      execute: async ({ documentTypeId, ...body }) => {
        return paperlessClient.updateDocumentType(documentTypeId, body);
      },
    }),

    // ─── Storage Paths ────────────────────────────────────

    list_storage_paths: tool({
      description: "List all storage paths in Paperless-ngx with document counts",
      inputSchema: z.object({}),
      execute: async () => {
        return paperlessClient.listStoragePaths();
      },
    }),

    create_storage_path: tool({
      description: "Create a new storage path in Paperless-ngx",
      inputSchema: z.object({
        name: z.string().describe("Storage path display name"),
        path: z.string().describe("File path template (e.g. '{correspondent}/{title}')"),
      }),
      execute: async ({ name, path }) => {
        return paperlessClient.createStoragePath(name, path);
      },
    }),

    update_storage_path: tool({
      description: "Update a storage path in Paperless-ngx",
      inputSchema: z.object({
        storagePathId: z.number().describe("Storage path ID to update"),
        name: z.string().optional().describe("New display name"),
        path: z.string().optional().describe("New file path template"),
      }),
      execute: async ({ storagePathId, ...body }) => {
        return paperlessClient.updateStoragePath(storagePathId, body);
      },
    }),

    delete_storage_path: tool({
      description: "Delete a storage path from Paperless-ngx",
      inputSchema: z.object({
        storagePathId: z.number().describe("Storage path ID to delete"),
      }),
      execute: async ({ storagePathId }) => {
        return paperlessClient.deleteStoragePath(storagePathId);
      },
    }),

    // ─── Custom Fields ────────────────────────────────────

    list_custom_fields: tool({
      description: "List all custom fields defined in Paperless-ngx",
      inputSchema: z.object({}),
      execute: async () => {
        return paperlessClient.listCustomFields();
      },
    }),

    create_custom_field: tool({
      description: "Create a new custom field in Paperless-ngx",
      inputSchema: z.object({
        name: z.string().describe("Custom field name"),
        dataType: z
          .enum(["string", "url", "date", "boolean", "integer", "float", "monetary", "document_link"])
          .describe("Data type for the field"),
      }),
      execute: async ({ name, dataType }) => {
        return paperlessClient.createCustomField(name, dataType);
      },
    }),

    delete_custom_field: tool({
      description: "Delete a custom field from Paperless-ngx",
      inputSchema: z.object({
        customFieldId: z.number().describe("Custom field ID to delete"),
      }),
      execute: async ({ customFieldId }) => {
        return paperlessClient.deleteCustomField(customFieldId);
      },
    }),

    // ─── Document Notes ───────────────────────────────────

    list_document_notes: tool({
      description: "List all notes on a specific document in Paperless-ngx",
      inputSchema: z.object({
        documentId: z.number().describe("Paperless document ID"),
      }),
      execute: async ({ documentId }) => {
        return paperlessClient.listDocumentNotes(documentId);
      },
    }),

    add_document_note: tool({
      description: "Add a note to a document in Paperless-ngx",
      inputSchema: z.object({
        documentId: z.number().describe("Paperless document ID"),
        note: z.string().describe("Note content"),
      }),
      execute: async ({ documentId, note }) => {
        return paperlessClient.addDocumentNote(documentId, note);
      },
    }),

    delete_document_note: tool({
      description: "Delete a note from a document in Paperless-ngx",
      inputSchema: z.object({
        documentId: z.number().describe("Paperless document ID"),
        noteId: z.number().describe("Note ID to delete"),
      }),
      execute: async ({ documentId, noteId }) => {
        return paperlessClient.deleteDocumentNote(documentId, noteId);
      },
    }),

    // ─── Bulk & Discovery ─────────────────────────────────

    bulk_edit_paperless_documents: tool({
      description:
        "Bulk edit multiple documents in Paperless-ngx. Supports methods: set_correspondent, set_document_type, set_storage_path, add_tag, remove_tag, modify_tags, delete, redo_ocr, set_permissions",
      inputSchema: z.object({
        documents: z.array(z.number()).describe("Array of document IDs to modify"),
        method: z
          .enum([
            "set_correspondent",
            "set_document_type",
            "set_storage_path",
            "add_tag",
            "remove_tag",
            "modify_tags",
            "delete",
            "redo_ocr",
            "set_permissions",
          ])
          .describe("Bulk edit method"),
        parameters: z
          .record(z.string(), z.unknown())
          .describe("Method-specific parameters (e.g. { correspondent: 5 })"),
      }),
      execute: async ({ documents, method, parameters }) => {
        return paperlessClient.bulkEditDocuments(documents, method, parameters);
      },
    }),

    get_similar_documents: tool({
      description:
        "Find documents similar to a given document using Paperless-ngx's content similarity matching",
      inputSchema: z.object({
        documentId: z.number().describe("Document ID to find similar documents for"),
        page: z.number().min(1).optional().describe("Page number for pagination"),
      }),
      execute: async ({ documentId, page }) => {
        return paperlessClient.getSimilarDocuments(documentId, page);
      },
    }),

    get_paperless_tasks: tool({
      description:
        "Get background task status from Paperless-ngx (file consumption, OCR processing, etc.)",
      inputSchema: z.object({}),
      execute: async () => {
        return paperlessClient.getTasks();
      },
    }),

    search_autocomplete: tool({
      description: "Get search term suggestions from Paperless-ngx for autocomplete",
      inputSchema: z.object({
        term: z.string().describe("Partial search term to autocomplete"),
      }),
      execute: async ({ term }) => {
        return paperlessClient.searchAutocomplete(term);
      },
    }),
  };
}
