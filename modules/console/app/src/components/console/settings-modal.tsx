"use client";

import { useEffect, useCallback } from "react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  accentColor?: string;
  children: React.ReactNode;
}

export function SettingsModal({
  open,
  onClose,
  title,
  accentColor = "var(--color-neon-cyan)",
  children,
}: SettingsModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-grid-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg border border-grid-border bg-grid-panel shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 h-4 w-[2px]" style={{ backgroundColor: accentColor }} />
        <div className="absolute top-0 left-0 h-[2px] w-4" style={{ backgroundColor: accentColor }} />
        <div className="absolute top-0 right-0 h-4 w-[2px]" style={{ backgroundColor: accentColor }} />
        <div className="absolute top-0 right-0 h-[2px] w-4" style={{ backgroundColor: accentColor }} />
        <div className="absolute bottom-0 left-0 h-4 w-[2px]" style={{ backgroundColor: accentColor }} />
        <div className="absolute bottom-0 left-0 h-[2px] w-4" style={{ backgroundColor: accentColor }} />
        <div className="absolute bottom-0 right-0 h-4 w-[2px]" style={{ backgroundColor: accentColor }} />
        <div className="absolute bottom-0 right-0 h-[2px] w-4" style={{ backgroundColor: accentColor }} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-grid-border px-5 py-3">
          <span
            className="text-xs font-medium uppercase tracking-widest"
            style={{ color: accentColor }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            className="text-text-muted transition-colors hover:text-text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
