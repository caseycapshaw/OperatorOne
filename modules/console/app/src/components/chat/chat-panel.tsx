"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { ConversationList } from "./conversation-list";
import { useState, useCallback, useMemo } from "react";

export function ChatPanel() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { conversationId },
      }),
    [conversationId],
  );

  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";

  const handleNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
  }, [setMessages]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      setConversationId(id);
      try {
        const res = await fetch(`/api/chat/conversations/${id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(
            (data.messages ?? []).map(
              (m: { id: string; role: string; content: string }) => ({
                id: m.id,
                role: m.role as "user" | "assistant",
                content: m.content,
                parts: [{ type: "text" as const, text: m.content }],
              }),
            ),
          );
        }
      } catch {
        setMessages([]);
      }
    },
    [setMessages],
  );

  const onSubmit = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue("");
    sendMessage({ text });
  }, [inputValue, isLoading, sendMessage]);

  return (
    <div className="flex h-full">
      {/* Conversation sidebar */}
      <ConversationList
        activeId={conversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
      />

      {/* Chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        <ChatMessages messages={messages} isLoading={isLoading} />
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
