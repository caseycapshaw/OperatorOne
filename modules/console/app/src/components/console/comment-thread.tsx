"use client";

import type { RequestComment } from "@/db/schema";
import { formatRelative } from "@/lib/utils";

interface CommentThreadProps {
  comments: RequestComment[];
  formAction: (formData: FormData) => void;
  entityId: string;
  entityIdField: string;
}

export function CommentThread({
  comments,
  formAction,
  entityId,
  entityIdField,
}: CommentThreadProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs uppercase tracking-widest text-text-muted">
        Comments ({comments.length})
      </h3>

      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="border border-grid-border bg-grid-dark/50 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-neon-cyan">
                  {comment.authorName}
                </span>
                <span className="text-[10px] text-text-muted">
                  {formatRelative(comment.createdAt)}
                </span>
              </div>
              <p className="text-sm text-text-primary whitespace-pre-wrap">
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-muted">No comments yet.</p>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name={entityIdField} value={entityId} />
        <textarea
          name="body"
          placeholder="Add a comment..."
          required
          rows={3}
          className="flex min-h-[80px] w-full border border-grid-border bg-grid-dark/80 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:border-neon-cyan/50"
        />
        <button
          type="submit"
          className="border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-2 text-xs font-medium uppercase tracking-wider text-neon-cyan transition-all hover:bg-neon-cyan/20"
        >
          Post Comment
        </button>
      </form>
    </div>
  );
}
