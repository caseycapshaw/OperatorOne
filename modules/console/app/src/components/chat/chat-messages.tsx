"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "./chat-message";
import type { UIMessage } from "ai";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <div className="mx-auto h-12 w-12 border border-neon-cyan/20 bg-neon-cyan/5 flex items-center justify-center">
            <div className="h-4 w-4 border border-neon-cyan/40 bg-neon-cyan/10" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest">
            <span className="text-text-primary">Operator</span><span className="text-neon-cyan">One</span>
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Ask about requests, tickets, projects, or workflows.
            Create new items, check statuses, or get system insights.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {[
              "Show open requests",
              "What's the system status?",
              "List active projects",
            ].map((suggestion) => (
              <span
                key={suggestion}
                className="border border-grid-border px-2 py-1 text-[10px] text-text-secondary"
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isLoading && (() => {
        const lastMsg = messages[messages.length - 1];
        // Show thinking dots if last message is user (initial wait)
        // OR if assistant message has no visible text yet (tool calls in progress, no reply text)
        const showThinking =
          lastMsg?.role === "user" ||
          (lastMsg?.role === "assistant" &&
            !lastMsg.parts.some(
              (p) => p.type === "text" && "text" in p && (p as { text: string }).text?.trim(),
            ));
        return showThinking ? (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-neon-cyan/30 bg-neon-cyan/10">
              <div className="h-2 w-2 animate-pulse rounded-full bg-neon-cyan" />
            </div>
            <div className="border border-grid-border bg-grid-panel px-3 py-2">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-cyan/50" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-cyan/50 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-cyan/50 [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        ) : null;
      })()}
      <div ref={endRef} />
    </div>
  );
}
