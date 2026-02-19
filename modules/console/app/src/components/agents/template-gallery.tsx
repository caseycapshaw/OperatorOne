"use client";

import { useState, useEffect } from "react";
import { X, Download, Check, Bot } from "lucide-react";

interface TemplateData {
  slug: string;
  name: string;
  description: string;
  icon?: string | null;
  color?: string | null;
  minRole: string;
  maxSteps: number;
  allowedTools: string[];
  installed: boolean;
}

interface TemplateGalleryProps {
  onClose: () => void;
}

export function TemplateGallery({ onClose }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents/templates")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function install(slug: string) {
    setInstalling(slug);
    const res = await fetch("/api/agents/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });

    if (res.ok) {
      setTemplates((prev) =>
        prev.map((t) => (t.slug === slug ? { ...t, installed: true } : t)),
      );
    }
    setInstalling(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-grid-dark/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-grid-border bg-grid-panel shadow-[var(--shadow-glow-cyan-sm)]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-grid-border bg-grid-panel px-4 py-3">
          <span className="text-xs uppercase tracking-widest text-neon-blue">
            Operator Templates
          </span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <span className="text-xs text-text-muted uppercase tracking-wider">Loading templates...</span>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {templates.map((t) => (
                <div
                  key={t.slug}
                  className="border border-grid-border bg-grid-dark p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center border border-grid-border"
                      style={{
                        borderColor: t.color ? `${t.color}40` : undefined,
                        backgroundColor: t.color ? `${t.color}15` : undefined,
                      }}
                    >
                      <Bot className="h-5 w-5" style={{ color: t.color ?? undefined }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-text-primary">{t.name}</h3>
                      <p className="mt-1 text-xs text-text-muted line-clamp-2">{t.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <span>{t.allowedTools.length} tools</span>
                    <span className="text-grid-border">|</span>
                    <span>{t.minRole}+</span>
                  </div>

                  <div className="flex justify-end">
                    {t.installed ? (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-neon-green">
                        <Check className="h-3 w-3" />
                        Installed
                      </span>
                    ) : (
                      <button
                        onClick={() => install(t.slug)}
                        disabled={installing === t.slug}
                        className="flex items-center gap-1.5 border border-neon-blue/30 bg-neon-blue/5 px-3 py-1 text-[10px] uppercase tracking-wider text-neon-blue transition-colors hover:bg-neon-blue/10 disabled:opacity-50"
                      >
                        <Download className="h-3 w-3" />
                        {installing === t.slug ? "Installing..." : "Install"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
