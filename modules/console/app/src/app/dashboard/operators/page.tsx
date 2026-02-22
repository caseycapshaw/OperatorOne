"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Plus,
  ShieldCheck,
  Puzzle,
  Sparkles,
  Power,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { icons as lucideIcons } from "lucide-react";
import { HudFrame } from "@/components/thegridcn/hud-frame";
import { EmptyState } from "@/components/console/empty-state";
import { AgentEditor } from "@/components/agents/agent-editor";
import { TemplateGallery } from "@/components/agents/template-gallery";
import { OperatorOneMark } from "@/components/brand/operator-one-mark";

interface AgentRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
  category: "system" | "template" | "custom";
  icon?: string | null;
  color?: string | null;
  minRole: string;
  maxSteps: number;
  allowedTools: string[];
  instructions: string;
  modelOverride?: string | null;
  modelRecommendation?: string | null;
}

const CATEGORY_BADGE: Record<string, { label: string; color: string; Icon: typeof Bot }> = {
  system: { label: "System", color: "text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10", Icon: ShieldCheck },
  template: { label: "Installed", color: "text-neon-blue border-neon-blue/30 bg-neon-blue/10", Icon: Puzzle },
  custom: { label: "Custom", color: "text-neon-orange border-neon-orange/30 bg-neon-orange/10", Icon: Sparkles },
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentRow | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  async function loadAgents() {
    const res = await fetch("/api/agents");
    if (res.ok) setAgents(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadAgents(); }, []);

  async function toggleActive(e: React.MouseEvent, agent: AgentRow) {
    e.stopPropagation();
    if (agent.isSystem) return;
    await fetch(`/api/agents/${agent.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !agent.isActive }),
    });
    loadAgents();
  }

  async function deleteAgent(e: React.MouseEvent, agent: AgentRow) {
    e.stopPropagation();
    if (agent.isSystem) return;
    await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
    loadAgents();
  }

  function openEditor(agent?: AgentRow) {
    setEditingAgent(agent ?? null);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingAgent(null);
    loadAgents();
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="text-xs text-text-muted uppercase tracking-wider">Loading operators...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-[grid-fade_0.3s_ease-out]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-widest text-text-primary">
            Operators
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Manage AI operators that handle operations
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setGalleryOpen(true)}
            className="flex items-center gap-2 border border-neon-blue/30 bg-neon-blue/5 px-3 py-1.5 text-xs uppercase tracking-wider text-neon-blue transition-colors hover:bg-neon-blue/10"
          >
            <Puzzle className="h-3.5 w-3.5" />
            Templates
          </button>
          <button
            onClick={() => openEditor()}
            className="flex items-center gap-2 border border-neon-cyan/30 bg-neon-cyan/5 px-3 py-1.5 text-xs uppercase tracking-wider text-neon-cyan transition-colors hover:bg-neon-cyan/10"
          >
            <Plus className="h-3.5 w-3.5" />
            New Operator
          </button>
        </div>
      </div>

      {agents.length > 0 ? (
        <>
          {/* Supervisor — always at the top, full width */}
          {agents.filter((a) => a.slug === "operator-one").map((agent) => {
            const badge = CATEGORY_BADGE[agent.category] ?? CATEGORY_BADGE.custom;
            return (
              <HudFrame key={agent.id ?? agent.slug}>
                <button
                  type="button"
                  onClick={() => openEditor(agent)}
                  className="w-full text-left space-y-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <OperatorOneMark size={32} />
                      <div>
                        <h3 className="text-sm font-medium text-text-primary group-hover:text-neon-cyan transition-colors">
                          {agent.name}
                        </h3>
                        <div className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${badge.color}`}>
                          <badge.Icon className="h-2.5 w-2.5" />
                          {badge.label}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-text-muted group-hover:text-neon-cyan transition-colors" />
                  </div>
                  <p className="text-xs text-text-muted line-clamp-2">
                    {agent.description}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <span>supervisor</span>
                    <span className="text-grid-border">|</span>
                    <span>{agent.minRole}+</span>
                    <span className="text-grid-border">|</span>
                    <span>{agent.maxSteps} steps</span>
                  </div>
                </button>
              </HudFrame>
            );
          })}

          {/* Sub-agents grid */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {agents.filter((a) => a.slug !== "operator-one").map((agent) => {
              const badge = CATEGORY_BADGE[agent.category] ?? CATEGORY_BADGE.custom;
              return (
                <HudFrame key={agent.id ?? agent.slug}>
                  <button
                    type="button"
                    onClick={() => openEditor(agent)}
                    className="w-full text-left space-y-3 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-8 w-8 items-center justify-center border border-grid-border"
                          style={{ borderColor: agent.color ? `${agent.color}40` : undefined, backgroundColor: agent.color ? `${agent.color}15` : undefined }}
                        >
                          {(() => {
                            const Icon = agent.icon ? (lucideIcons[agent.icon as keyof typeof lucideIcons] ?? Bot) : Bot;
                            return <Icon className="h-4 w-4" style={{ color: agent.color ?? undefined }} />;
                          })()}
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-text-primary group-hover:text-neon-cyan transition-colors">
                            {agent.name}
                          </h3>
                          <div className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${badge.color}`}>
                            <badge.Icon className="h-2.5 w-2.5" />
                            {badge.label}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!agent.isSystem && (
                          <>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => toggleActive(e, agent)}
                              onKeyDown={(e) => { if (e.key === "Enter") toggleActive(e as unknown as React.MouseEvent, agent); }}
                              className={`p-1 transition-colors ${agent.isActive ? "text-neon-green hover:text-neon-green/70" : "text-text-muted hover:text-text-secondary"}`}
                              title={agent.isActive ? "Deactivate" : "Activate"}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => deleteAgent(e, agent)}
                              onKeyDown={(e) => { if (e.key === "Enter") deleteAgent(e as unknown as React.MouseEvent, agent); }}
                              className="p-1 text-text-muted transition-colors hover:text-neon-red"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </span>
                          </>
                        )}
                        <ChevronRight className="h-3.5 w-3.5 text-text-muted group-hover:text-neon-cyan transition-colors" />
                      </div>
                    </div>
                    <p className="text-xs text-text-muted line-clamp-2">
                      {agent.description}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted">
                      <span>{agent.allowedTools?.length ?? 0} tools</span>
                      <span className="text-grid-border">|</span>
                      <span>{agent.minRole}+</span>
                      <span className="text-grid-border">|</span>
                      <span>{agent.maxSteps} steps</span>
                      {!agent.isActive && (
                        <>
                          <span className="text-grid-border">|</span>
                          <span className="text-neon-red">Inactive</span>
                        </>
                      )}
                    </div>
                  </button>
                </HudFrame>
              );
            })}
          </div>
        </>
      ) : (
        <HudFrame>
          <EmptyState
            icon={<Bot className="h-8 w-8" />}
            title="No operators configured"
            description="Create a custom operator or install a template to get started"
          />
        </HudFrame>
      )}

      {editorOpen && (
        <AgentEditor
          agent={editingAgent}
          onClose={closeEditor}
        />
      )}

      {galleryOpen && (
        <TemplateGallery
          onClose={() => {
            setGalleryOpen(false);
            loadAgents();
          }}
        />
      )}
    </div>
  );
}
