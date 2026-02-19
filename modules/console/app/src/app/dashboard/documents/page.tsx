import { FileText, Download } from "lucide-react";
import { getDocuments } from "@/lib/queries";
import { HudFrame } from "@/components/thegridcn/hud-frame";
import { EmptyState } from "@/components/console/empty-state";
import { formatDate } from "@/lib/utils";

function formatFileSize(bytes: number | null) {
  if (!bytes) return "---";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage() {
  const documents = await getDocuments();

  return (
    <div className="space-y-6 animate-[grid-fade_0.3s_ease-out]">
      <div>
        <h1 className="text-lg font-bold uppercase tracking-widest text-text-primary">
          Documents
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Shared files and documents
        </p>
      </div>

      {documents.length > 0 ? (
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
                    {doc.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted">
                      {formatFileSize(doc.fileSize)}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {formatDate(doc.createdAt)}
                    </span>
                    {doc.mimeType && (
                      <span className="text-[10px] text-text-muted">
                        {doc.mimeType}
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center border border-grid-border text-text-muted transition-colors hover:border-neon-cyan/30 hover:text-neon-cyan"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </HudFrame>
      ) : (
        <HudFrame>
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No documents"
            description="Shared documents will appear here"
          />
        </HudFrame>
      )}
    </div>
  );
}
