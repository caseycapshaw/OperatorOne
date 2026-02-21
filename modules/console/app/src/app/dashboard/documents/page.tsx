import { FileText, Search, ExternalLink } from "lucide-react";
import { HudFrame } from "@/components/thegridcn/hud-frame";
import { EmptyState } from "@/components/console/empty-state";
import { paperlessClient } from "@/lib/ai/paperless-client";

interface PaperlessDocument {
  id: number;
  title: string;
  correspondent: number | null;
  document_type: number | null;
  tags: number[];
  created: string;
  added: string;
  archive_serial_number: number | null;
}

interface PaperlessTag {
  id: number;
  name: string;
  color: string | null;
  document_count: number;
}

interface PaperlessCorrespondent {
  id: number;
  name: string;
  document_count: number;
}

interface PaperlessDocumentType {
  id: number;
  name: string;
  document_count: number;
}

function formatDate(date: string | null) {
  if (!date) return "---";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Paperless web UI URL for linking to individual documents
const PAPERLESS_WEB_URL =
  process.env.PAPERLESS_URL || process.env.PAPERLESS_API_URL?.replace("/api", "") || "";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1", 10);

  let documents: PaperlessDocument[] = [];
  let totalCount = 0;
  let tags: PaperlessTag[] = [];
  let correspondents: PaperlessCorrespondent[] = [];
  let documentTypes: PaperlessDocumentType[] = [];
  let paperlessAvailable = true;

  try {
    const [docResult, tagResult, corrResult, typeResult] = await Promise.all([
      query
        ? paperlessClient.searchDocuments(query, page)
        : paperlessClient.listDocuments({ page, ordering: "-created" }),
      paperlessClient.listTags(),
      paperlessClient.listCorrespondents(),
      paperlessClient.listDocumentTypes(),
    ]);

    if (docResult && !("error" in docResult)) {
      documents = docResult.results ?? [];
      totalCount = docResult.count ?? 0;
    }
    if (tagResult && !("error" in tagResult)) {
      tags = Array.isArray(tagResult) ? tagResult : [];
    }
    if (corrResult && !("error" in corrResult)) {
      correspondents = Array.isArray(corrResult) ? corrResult : [];
    }
    if (typeResult && !("error" in typeResult)) {
      documentTypes = Array.isArray(typeResult) ? typeResult : [];
    }
  } catch {
    paperlessAvailable = false;
  }

  // Build lookup maps for display names
  const tagMap = new Map(tags.map((t) => [t.id, t.name]));
  const corrMap = new Map(correspondents.map((c) => [c.id, c.name]));
  const typeMap = new Map(documentTypes.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-6 animate-[grid-fade_0.3s_ease-out]">
      <div>
        <h1 className="text-lg font-bold uppercase tracking-widest text-text-primary">
          Documents
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          {paperlessAvailable
            ? `${totalCount} document${totalCount !== 1 ? "s" : ""} in Paperless-ngx`
            : "Document management powered by Paperless-ngx"}
        </p>
      </div>

      {/* Search bar */}
      <HudFrame>
        <form method="GET" className="flex items-center gap-3 p-3">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search documents..."
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted/50"
          />
          <button
            type="submit"
            className="border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-1 text-xs font-medium uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/20"
          >
            Search
          </button>
          {query && (
            <a
              href="/dashboard/documents"
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Clear
            </a>
          )}
        </form>
      </HudFrame>

      {/* Document list */}
      {!paperlessAvailable ? (
        <HudFrame>
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="Paperless-ngx unavailable"
            description="Could not connect to the document management system. Check that the Paperless container is running."
          />
        </HudFrame>
      ) : documents.length > 0 ? (
        <HudFrame>
          <div className="divide-y divide-grid-border">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-3"
              >
                <div className="flex h-8 w-8 items-center justify-center border border-grid-border bg-grid-dark">
                  <FileText className="h-4 w-4 text-neon-cyan/50" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {doc.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {doc.correspondent && (
                      <span className="text-[10px] text-neon-cyan/70">
                        {corrMap.get(doc.correspondent) ?? `#${doc.correspondent}`}
                      </span>
                    )}
                    {doc.document_type && (
                      <span className="text-[10px] text-text-muted">
                        {typeMap.get(doc.document_type) ?? `Type #${doc.document_type}`}
                      </span>
                    )}
                    <span className="text-[10px] text-text-muted">
                      {formatDate(doc.created)}
                    </span>
                    {doc.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        {doc.tags.slice(0, 3).map((tagId) => (
                          <span
                            key={tagId}
                            className="border border-grid-border px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-muted"
                          >
                            {tagMap.get(tagId) ?? `#${tagId}`}
                          </span>
                        ))}
                        {doc.tags.length > 3 && (
                          <span className="text-[9px] text-text-muted/50">
                            +{doc.tags.length - 3}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                {PAPERLESS_WEB_URL && (
                  <a
                    href={`${PAPERLESS_WEB_URL}/documents/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center border border-grid-border text-text-muted transition-colors hover:border-neon-cyan/30 hover:text-neon-cyan"
                    title="Open in Paperless"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalCount > 25 && (
            <div className="flex items-center justify-between border-t border-grid-border px-3 py-2">
              <span className="text-[10px] text-text-muted">
                Page {page} of {Math.ceil(totalCount / 25)}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <a
                    href={`/dashboard/documents?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page - 1) })}`}
                    className="border border-grid-border px-3 py-1 text-[10px] text-text-muted transition-colors hover:border-neon-cyan/30 hover:text-neon-cyan"
                  >
                    Prev
                  </a>
                )}
                {page * 25 < totalCount && (
                  <a
                    href={`/dashboard/documents?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page + 1) })}`}
                    className="border border-grid-border px-3 py-1 text-[10px] text-text-muted transition-colors hover:border-neon-cyan/30 hover:text-neon-cyan"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </HudFrame>
      ) : (
        <HudFrame>
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title={query ? "No matching documents" : "No documents"}
            description={
              query
                ? "Try a different search query"
                : "Upload documents through Paperless-ngx or ask the AI agent"
            }
          />
        </HudFrame>
      )}
    </div>
  );
}
