"use client";

import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatToolResult } from "./chat-tool-result";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UIMessage } from "ai";

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center border",
          isUser
            ? "border-neon-blue/30 bg-neon-blue/10 text-neon-blue"
            : "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan",
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      <div className={cn("min-w-0 max-w-[85%] space-y-2", isUser && "text-right")}>
        {message.parts.map((part, i) => {
          if (part.type.startsWith("tool-") && part.type !== "text") {
            const toolPart = part as { type: string; toolCallId: string; toolName: string; state: string };
            return (
              <ChatToolResult
                key={i}
                toolName={toolPart.toolName ?? part.type.replace("tool-", "")}
                state={toolPart.state}
              />
            );
          }
          if (part.type === "text" && "text" in part && part.text) {
            return (
              <div
                key={i}
                className={cn(
                  "inline-block border px-3 py-2 text-sm",
                  isUser
                    ? "border-neon-blue/20 bg-neon-blue/5 text-text-primary"
                    : "border-grid-border bg-grid-panel text-text-primary",
                )}
              >
                <div className="prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_code]:text-neon-cyan [&_code]:bg-grid-dark [&_code]:px-1 [&_pre]:bg-grid-dark [&_pre]:border [&_pre]:border-grid-border [&_a]:text-neon-cyan">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {part.text}
                  </ReactMarkdown>
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
