"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Conversation {
  id: string;
  title: string | null;
  updatedAt: string;
}

interface ConversationListProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function ConversationList({ activeId, onSelect, onNew }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      if (res.ok) {
        setConversations(await res.json());
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    loadConversations();
    // Refresh every 30s
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) onNew();
  };

  return (
    <div className="flex w-48 flex-col border-r border-grid-border bg-grid-dark">
      <div className="flex items-center justify-between border-b border-grid-border px-3 py-2">
        <span className="text-[10px] uppercase tracking-widest text-text-muted">
          History
        </span>
        <Button size="icon" variant="ghost" onClick={onNew} className="h-6 w-6">
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* New chat option */}
        <button
          onClick={onNew}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
            !activeId
              ? "border-l-2 border-neon-cyan bg-neon-cyan/5 text-neon-cyan"
              : "border-l-2 border-transparent text-text-secondary hover:bg-grid-panel hover:text-text-primary",
          )}
        >
          <MessageSquare className="h-3 w-3 shrink-0" />
          <span className="truncate">New chat</span>
        </button>

        {conversations.map((conv) => (
          <div
            key={conv.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(conv.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(conv.id); }}
            className={cn(
              "group flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
              activeId === conv.id
                ? "border-l-2 border-neon-cyan bg-neon-cyan/5 text-neon-cyan"
                : "border-l-2 border-transparent text-text-secondary hover:bg-grid-panel hover:text-text-primary",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate">{conv.title || "Untitled"}</p>
              <p className="text-[10px] text-text-muted">
                {formatRelative(conv.updatedAt)}
              </p>
            </div>
            <button
              onClick={(e) => handleDelete(e, conv.id)}
              className="hidden shrink-0 text-text-muted hover:text-neon-red group-hover:block"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
