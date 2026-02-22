"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Save,
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  Settings,
} from "lucide-react";
import { SkillEditor } from "./skill-editor";
import { TOOL_SETTINGS_SCHEMA } from "@/lib/ai/agents/tool-settings-schema";
import { INTEGRATIONS, ALWAYS_ON_CATEGORIES } from "@/lib/ai/agents/integrations";

// ─── Types ────────────────────────────────────────────────

interface ToolOption {
  name: string;
  description: string;
  category: string;
}

interface SkillData {
  id: string;
  name: string;
  description: string | null;
  content: string;
  isActive: boolean;
  sortOrder: number;
}

interface AgentData {
  id?: string;
  slug: string;
  name: string;
  description: string;
  instructions: string;
  minRole: string;
  icon: string;
  color: string;
  modelOverride: string;
  maxSteps: number;
  allowedTools: string[];
  toolSettings: Record<string, Record<string, string>>;
  category?: string;
}

interface AgentEditorProps {
  agent?: {
    id: string;
    slug: string;
    name: string;
    description: string;
    instructions: string;
    minRole: string;
    icon?: string | null;
    color?: string | null;
    modelOverride?: string | null;
    modelRecommendation?: string | null;
    maxSteps: number;
    allowedTools: string[];
    toolSettings?: Record<string, Record<string, string>>;
    isSystem?: boolean;
    category?: string;
  } | null;
  onClose: () => void;
}

type Tab = "general" | "skills" | "tools";

// ─── Helpers ──────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

// ─── Component ────────────────────────────────────────────

export function AgentEditor({ agent, onClose }: AgentEditorProps) {
  const isDbRecord = !!agent?.id && /^[0-9a-f]{8}-/.test(agent.id);
  const isSupervisor = agent?.slug === "operator-one";

  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [form, setForm] = useState<AgentData>({
    slug: agent?.slug ?? "",
    name: agent?.name ?? "",
    description: agent?.description ?? "",
    instructions: agent?.instructions ?? "",
    minRole: agent?.minRole ?? "viewer",
    icon: agent?.icon ?? "",
    color: agent?.color ?? "#00d4ff",
    modelOverride: agent?.modelOverride ?? "",
    maxSteps: agent?.maxSteps ?? 5,
    allowedTools: agent?.allowedTools ?? [],
    toolSettings: agent?.toolSettings ?? {},
    category: agent?.category,
  });

  const [tools, setTools] = useState<ToolOption[]>([]);
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Model dropdown state
  const [availableModels, setAvailableModels] = useState<
    { id: string; name: string; shortName: string; provider?: string; contextLength?: number }[]
  >([]);
  const [modelProvider, setModelProvider] = useState<"anthropic" | "openrouter">("anthropic");
  const [modelsLoading, setModelsLoading] = useState(false);

  // Skills UI state
  const [editingSkill, setEditingSkill] = useState<string | null>(null); // skill id or "new"
  const [skillsLoading, setSkillsLoading] = useState(false);

  // Tools UI state
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [expandedToolSettings, setExpandedToolSettings] = useState<Set<string>>(new Set());
  const [toolsAccordionOpen, setToolsAccordionOpen] = useState(true);
  const [scopesAccordionOpen, setScopesAccordionOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isNew = !agent;
  const headerLabel = isNew
    ? "New Operator"
    : isDbRecord
      ? "Edit Operator"
      : "Customize System Operator";

  // ─── Data loading ─────────────────────────────────────

  useEffect(() => {
    fetch("/api/agents/tools")
      .then((r) => r.json())
      .then(setTools)
      .catch(() => {});
  }, []);

  const loadModels = useCallback((refresh = false) => {
    setModelsLoading(true);
    fetch(`/api/admin/models${refresh ? "?refresh=true" : ""}`)
      .then((r) => r.json())
      .then((data) => {
        setAvailableModels(data.models ?? []);
        setModelProvider(data.provider ?? "anthropic");
      })
      .catch(() => {})
      .finally(() => setModelsLoading(false));
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const loadSkills = useCallback(() => {
    if (!isDbRecord || !agent?.id) return;
    setSkillsLoading(true);
    fetch(`/api/agents/${agent.id}/skills`)
      .then((r) => r.json())
      .then(setSkills)
      .catch(() => {})
      .finally(() => setSkillsLoading(false));
  }, [isDbRecord, agent?.id]);

  useEffect(() => {
    if (activeTab === "skills") loadSkills();
  }, [activeTab, loadSkills]);

  // ─── Form helpers ─────────────────────────────────────

  function updateField(field: keyof AgentData, value: unknown) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && isNew) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  }

  function toggleTool(name: string) {
    setForm((prev) => ({
      ...prev,
      allowedTools: prev.allowedTools.includes(name)
        ? prev.allowedTools.filter((t) => t !== name)
        : [...prev.allowedTools, name],
    }));
  }

  function toggleCategory(category: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  function selectAllInCategory(category: string) {
    const categoryTools = tools.filter((t) => t.category === category);
    const allSelected = categoryTools.every((t) => form.allowedTools.includes(t.name));

    setForm((prev) => {
      if (allSelected) {
        return {
          ...prev,
          allowedTools: prev.allowedTools.filter(
            (name) => !categoryTools.some((t) => t.name === name),
          ),
        };
      } else {
        const newTools = categoryTools
          .filter((t) => !prev.allowedTools.includes(t.name))
          .map((t) => t.name);
        return {
          ...prev,
          allowedTools: [...prev.allowedTools, ...newTools],
        };
      }
    });
  }

  function updateToolSetting(toolName: string, key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      toolSettings: {
        ...prev.toolSettings,
        [toolName]: {
          ...(prev.toolSettings[toolName] || {}),
          [key]: value,
        },
      },
    }));
  }

  function toggleToolSettings(toolName: string) {
    setExpandedToolSettings((prev) => {
      const next = new Set(prev);
      if (next.has(toolName)) {
        next.delete(toolName);
      } else {
        next.add(toolName);
      }
      return next;
    });
  }

  // ─── Integration toggles ─────────────────────────────

  function getIntegrationToolNames(integrationId: string): string[] {
    const integration = INTEGRATIONS.find((i) => i.id === integrationId);
    if (!integration) return [];
    return tools
      .filter((t) => integration.categories.includes(t.category))
      .map((t) => t.name);
  }

  function isIntegrationEnabled(integrationId: string): boolean {
    const integrationTools = getIntegrationToolNames(integrationId);
    return integrationTools.length > 0 && integrationTools.some((t) => form.allowedTools.includes(t));
  }

  function toggleIntegration(integrationId: string) {
    const integrationTools = getIntegrationToolNames(integrationId);
    const enabled = isIntegrationEnabled(integrationId);

    setForm((prev) => {
      if (enabled) {
        // Remove all tools from this integration
        return {
          ...prev,
          allowedTools: prev.allowedTools.filter(
            (t) => !integrationTools.includes(t),
          ),
        };
      } else {
        // Add all tools from this integration
        const newTools = integrationTools.filter(
          (t) => !prev.allowedTools.includes(t),
        );
        return {
          ...prev,
          allowedTools: [...prev.allowedTools, ...newTools],
        };
      }
    });
  }

  // Derive which categories are visible in scopes (always-on + enabled integrations)
  const enabledIntegrationIds = INTEGRATIONS
    .filter((i) => isIntegrationEnabled(i.id))
    .map((i) => i.id);
  const visibleCategories = new Set<string>(ALWAYS_ON_CATEGORIES);
  for (const integration of INTEGRATIONS) {
    if (enabledIntegrationIds.includes(integration.id)) {
      for (const cat of integration.categories) {
        visibleCategories.add(cat);
      }
    }
  }

  // ─── Skills CRUD ──────────────────────────────────────

  async function createSkill(data: { name: string; description: string; content: string }) {
    if (!agent?.id) return;
    const res = await fetch(`/api/agents/${agent.id}/skills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setEditingSkill(null);
      loadSkills();
    }
  }

  async function updateSkill(
    skillId: string,
    data: Partial<{ name: string; description: string; content: string; isActive: boolean }>,
  ) {
    if (!agent?.id) return;
    const res = await fetch(`/api/agents/${agent.id}/skills/${skillId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setEditingSkill(null);
      loadSkills();
    }
  }

  async function deleteSkill(skillId: string) {
    if (!agent?.id) return;
    const res = await fetch(`/api/agents/${agent.id}/skills/${skillId}`, {
      method: "DELETE",
    });
    if (res.ok) loadSkills();
  }

  async function toggleSkillActive(skill: SkillData) {
    await updateSkill(skill.id, { isActive: !skill.isActive });
  }

  async function exportSkills() {
    if (!agent?.id) return;
    const res = await fetch(`/api/agents/${agent.id}/skills/export`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${agent.slug || "agent"}-skills.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importSkills(file: File) {
    if (!agent?.id) return;
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      setError("Invalid JSON file");
      return;
    }
    const res = await fetch(`/api/agents/${agent.id}/skills/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      loadSkills();
    } else {
      const result = await res.json();
      setError(result.error || "Import failed");
    }
  }

  // ─── Save handler ─────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      icon: form.icon || null,
      color: form.color || null,
      modelOverride: form.modelOverride || null,
    };

    let url: string;
    let method: string;

    if (isDbRecord) {
      url = `/api/agents/${agent!.id}`;
      method = "PUT";
    } else {
      url = "/api/agents";
      method = "POST";
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save operator");
      setSaving(false);
      return;
    }

    setSaving(false);
    onClose();
  }

  // ─── Derived data ─────────────────────────────────────

  const toolCategories = tools.reduce<Record<string, ToolOption[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-grid-dark/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-grid-border bg-grid-panel shadow-[var(--shadow-glow-cyan-sm)]">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-grid-border bg-grid-panel">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs uppercase tracking-widest text-neon-cyan">
              {headerLabel}
            </span>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-grid-border">
            {(["general", "skills", "tools"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-neon-cyan text-neon-cyan bg-neon-cyan/5"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 p-4">
          {error && (
            <div className="border border-neon-red/30 bg-neon-red/5 px-3 py-2 text-xs text-neon-red">
              {error}
            </div>
          )}

          {/* ═══ General Tab ═══ */}
          {activeTab === "general" && (
            <>
              {agent && !isDbRecord && (
                <div className="border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-2 text-xs text-neon-cyan">
                  Saving will create a customized copy of this system operator for your organization.
                </div>
              )}

              {/* Name + Slug */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
                    Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="w-full border border-grid-border bg-grid-dark px-3 py-1.5 text-sm text-text-primary outline-none focus:border-neon-cyan/50"
                    placeholder="My Operator"
                    readOnly={isSupervisor}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
                    Slug
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
                    className="w-full border border-grid-border bg-grid-dark px-3 py-1.5 text-sm text-text-primary outline-none focus:border-neon-cyan/50"
                    placeholder="my-operator"
                    readOnly={isDbRecord || isSupervisor}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="w-full border border-grid-border bg-grid-dark px-3 py-1.5 text-sm text-text-primary outline-none focus:border-neon-cyan/50"
                  placeholder="What does this operator do?"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
                  {isSupervisor ? "Custom Instructions" : "Instructions (system prompt)"}
                </label>
                {isSupervisor && (
                  <p className="mb-1.5 text-[10px] text-text-muted">
                    These are appended to the core supervisor prompt. Use them for personality,
                    tone, or org-specific context.
                  </p>
                )}
                <textarea
                  value={form.instructions}
                  onChange={(e) => updateField("instructions", e.target.value)}
                  rows={6}
                  className="w-full border border-grid-border bg-grid-dark px-3 py-1.5 text-sm text-text-primary outline-none focus:border-neon-cyan/50 font-mono"
                  placeholder={
                    isSupervisor
                      ? "Be direct and concise..."
                      : "You are an agent that..."
                  }
                />
              </div>

              {/* Settings row */}
              <div
                className={`grid gap-3 ${isSupervisor ? "sm:grid-cols-2" : "sm:grid-cols-4"}`}
              >
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
                    Min Role
                  </label>
                  <select
                    value={form.minRole}
                    onChange={(e) => updateField("minRole", e.target.value)}
                    className="w-full border border-grid-border bg-grid-dark px-3 py-1.5 text-sm text-text-primary outline-none focus:border-neon-cyan/50"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
                    Max Steps
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.maxSteps}
                    onChange={(e) =>
                      updateField("maxSteps", parseInt(e.target.value) || 5)
                    }
                    className="w-full border border-grid-border bg-grid-dark px-3 py-1.5 text-sm text-text-primary outline-none focus:border-neon-cyan/50"
                  />
                </div>
                {!isSupervisor && (
                  <>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
                        Icon
                      </label>
                      <input
                        type="text"
                        value={form.icon}
                        onChange={(e) => updateField("icon", e.target.value)}
                        className="w-full border border-grid-border bg-grid-dark px-3 py-1.5 text-sm text-text-primary outline-none focus:border-neon-cyan/50"
                        placeholder="Bot"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
                        Color
                      </label>
                      <input
                        type="color"
                        value={form.color}
                        onChange={(e) => updateField("color", e.target.value)}
                        className="h-8 w-full border border-grid-border bg-grid-dark px-1 outline-none cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Model override */}
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <label className="block text-[10px] uppercase tracking-wider text-text-muted">
                    Model Override (optional)
                  </label>
                  {!modelsLoading && (
                    <button
                      type="button"
                      onClick={() => loadModels(true)}
                      className="text-[10px] text-text-muted/50 transition-colors hover:text-neon-cyan"
                    >
                      Refresh
                    </button>
                  )}
                </div>
                {modelsLoading ? (
                  <div className="w-full border border-grid-border bg-grid-dark px-3 py-1.5 text-sm text-text-muted/50">
                    Loading models...
                  </div>
                ) : (
                  <select
                    value={form.modelOverride}
                    onChange={(e) => updateField("modelOverride", e.target.value)}
                    className="w-full border border-grid-border bg-grid-dark px-3 py-1.5 text-sm text-text-primary outline-none focus:border-neon-cyan/50"
                  >
                    <option value="">Use org default</option>
                    {modelProvider === "openrouter" ? (
                      Object.entries(
                        availableModels.reduce<Record<string, typeof availableModels>>((acc, m) => {
                          const group = m.provider || "other";
                          if (!acc[group]) acc[group] = [];
                          acc[group].push(m);
                          return acc;
                        }, {})
                      ).map(([provider, models]) => (
                        <optgroup
                          key={provider}
                          label={
                            {
                              anthropic: "Anthropic",
                              openai: "OpenAI",
                              google: "Google",
                              moonshotai: "MoonshotAI",
                              "meta-llama": "Meta",
                              mistralai: "Mistral",
                              deepseek: "DeepSeek",
                              cohere: "Cohere",
                            }[provider] || provider
                          }
                        >
                          {models.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.shortName}
                              {m.contextLength ? ` (${Math.round(m.contextLength / 1000)}k)` : ""}
                            </option>
                          ))}
                        </optgroup>
                      ))
                    ) : (
                      availableModels.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))
                    )}
                  </select>
                )}
                {agent?.modelRecommendation && (
                  <p className="mt-1 text-[10px] text-neon-cyan/70">
                    {agent.modelRecommendation}
                  </p>
                )}
              </div>
            </>
          )}

          {/* ═══ Skills Tab ═══ */}
          {activeTab === "skills" && (
            <>
              {!isDbRecord ? (
                <div className="border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-2 text-xs text-neon-cyan">
                  Save this operator first to add skills. Skills are stored per-operator in the
                  database.
                </div>
              ) : (
                <>
                  {/* Skills toolbar */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingSkill("new")}
                      disabled={editingSkill === "new"}
                      className="flex items-center gap-1.5 border border-neon-cyan/30 bg-neon-cyan/10 px-3 py-1.5 text-xs text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-50"
                    >
                      <Plus className="h-3 w-3" />
                      Add Skill
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 border border-grid-border px-3 py-1.5 text-xs text-text-muted hover:text-text-primary"
                    >
                      <Upload className="h-3 w-3" />
                      Import
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          importSkills(file);
                          e.target.value = "";
                        }
                      }}
                    />
                    {skills.length > 0 && (
                      <button
                        onClick={exportSkills}
                        className="flex items-center gap-1.5 border border-grid-border px-3 py-1.5 text-xs text-text-muted hover:text-text-primary"
                      >
                        <Download className="h-3 w-3" />
                        Export
                      </button>
                    )}
                  </div>

                  {/* New skill form */}
                  {editingSkill === "new" && (
                    <SkillEditor
                      onSave={createSkill}
                      onCancel={() => setEditingSkill(null)}
                    />
                  )}

                  {/* Skills list */}
                  {skillsLoading ? (
                    <div className="py-4 text-center text-xs text-text-muted">
                      Loading skills...
                    </div>
                  ) : skills.length === 0 && editingSkill !== "new" ? (
                    <div className="py-8 text-center text-xs text-text-muted">
                      No skills yet. Add one to inject instructions into this operator&apos;s
                      system prompt.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {skills.map((skill) => (
                        <div key={skill.id}>
                          {editingSkill === skill.id ? (
                            <SkillEditor
                              initial={{
                                name: skill.name,
                                description: skill.description || "",
                                content: skill.content,
                              }}
                              onSave={(data) => updateSkill(skill.id, data)}
                              onCancel={() => setEditingSkill(null)}
                            />
                          ) : (
                            <div className="flex items-start gap-3 border border-grid-border bg-grid-dark p-3">
                              {/* Active toggle */}
                              <button
                                onClick={() => toggleSkillActive(skill)}
                                className={`mt-0.5 h-4 w-7 rounded-full transition-colors ${
                                  skill.isActive
                                    ? "bg-neon-cyan/60"
                                    : "bg-grid-border"
                                } relative`}
                              >
                                <span
                                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                                    skill.isActive ? "left-3.5" : "left-0.5"
                                  }`}
                                />
                              </button>

                              {/* Skill info */}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-text-primary font-medium">
                                  {skill.name}
                                </div>
                                {skill.description && (
                                  <div className="text-[10px] text-text-muted mt-0.5">
                                    {skill.description}
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setEditingSkill(skill.id)}
                                  className="p-1 text-text-muted hover:text-text-primary"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => deleteSkill(skill.id)}
                                  className="p-1 text-text-muted hover:text-neon-red"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ═══ Tools Tab ═══ */}
          {activeTab === "tools" && (
            <>
              {isSupervisor ? (
                <div className="border border-neon-cyan/20 bg-neon-cyan/5 px-3 py-2 text-xs text-neon-cyan">
                  The supervisor uses delegation tools, not direct tools. Configure tools on
                  individual sub-operators.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* ── Available Tools (integration toggles) ── */}
                  <div className="border border-grid-border bg-grid-dark">
                    <button
                      onClick={() => setToolsAccordionOpen((p) => !p)}
                      className="flex w-full items-center gap-2 px-3 py-2.5"
                    >
                      {toolsAccordionOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
                      )}
                      <span className="flex-1 text-left text-xs font-medium uppercase tracking-wider text-text-primary">
                        Available Tools
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {enabledIntegrationIds.length} of {INTEGRATIONS.length} enabled
                      </span>
                    </button>

                    {toolsAccordionOpen && (
                      <div className="border-t border-grid-border px-3 py-2 space-y-2">
                        {/* Console tools — always on, shown as info */}
                        <div className="flex items-center justify-between py-1.5">
                          <div>
                            <span className="text-xs text-text-primary">Console</span>
                            <p className="text-[10px] text-text-muted">
                              Requests, tickets, projects, documents, activity
                            </p>
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-text-muted/60">
                            Always on
                          </span>
                        </div>

                        {/* Integration toggles */}
                        {INTEGRATIONS.map((integration) => {
                          const enabled = isIntegrationEnabled(integration.id);
                          const toolCount = getIntegrationToolNames(integration.id).length;

                          return (
                            <div
                              key={integration.id}
                              className="flex items-center justify-between py-1.5"
                            >
                              <div>
                                <span className="text-xs text-text-primary">
                                  {integration.name}
                                </span>
                                <p className="text-[10px] text-text-muted">
                                  {toolCount} tool{toolCount !== 1 ? "s" : ""}
                                </p>
                              </div>
                              <button
                                onClick={() => toggleIntegration(integration.id)}
                                className={`relative h-5 w-9 rounded-full transition-colors ${
                                  enabled ? "bg-neon-cyan/40" : "bg-grid-border"
                                }`}
                                role="switch"
                                aria-checked={enabled}
                              >
                                <span
                                  className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                                    enabled
                                      ? "left-[18px] bg-neon-cyan"
                                      : "left-0.5 bg-text-muted/50"
                                  }`}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ── Available Scopes (per-tool checkboxes) ── */}
                  <div className="border border-grid-border bg-grid-dark">
                    <button
                      onClick={() => setScopesAccordionOpen((p) => !p)}
                      className="flex w-full items-center gap-2 px-3 py-2.5"
                    >
                      {scopesAccordionOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
                      )}
                      <span className="flex-1 text-left text-xs font-medium uppercase tracking-wider text-text-primary">
                        Available Scopes
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {form.allowedTools.length} selected
                      </span>
                    </button>

                    {scopesAccordionOpen && (
                      <div className="border-t border-grid-border">
                        <div className="space-y-1 p-1.5">
                          {Object.entries(toolCategories)
                            .filter(([category]) => visibleCategories.has(category))
                            .map(([category, categoryTools]) => {
                              const isCollapsed = collapsedCategories.has(category);
                              const allSelected = categoryTools.every((t) =>
                                form.allowedTools.includes(t.name),
                              );
                              const someSelected = categoryTools.some((t) =>
                                form.allowedTools.includes(t.name),
                              );

                              return (
                                <div
                                  key={category}
                                  className="border border-grid-border/50"
                                >
                                  {/* Category header */}
                                  <div className="flex items-center gap-2 px-3 py-2">
                                    <button
                                      onClick={() => toggleCategory(category)}
                                      className="text-text-muted hover:text-text-primary"
                                    >
                                      {isCollapsed ? (
                                        <ChevronRight className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                    <span className="flex-1 text-xs font-medium text-text-primary">
                                      {category}
                                    </span>
                                    <button
                                      onClick={() => selectAllInCategory(category)}
                                      className={`text-[10px] px-2 py-0.5 border transition-colors ${
                                        allSelected
                                          ? "border-neon-cyan/30 text-neon-cyan"
                                          : someSelected
                                            ? "border-neon-cyan/20 text-neon-cyan/60"
                                            : "border-grid-border text-text-muted hover:text-text-primary"
                                      }`}
                                    >
                                      {allSelected ? "Deselect All" : "Select All"}
                                    </button>
                                  </div>

                                  {/* Category tools */}
                                  {!isCollapsed && (
                                    <div className="border-t border-grid-border/50 px-3 py-1.5">
                                      <div className="grid gap-1 sm:grid-cols-2">
                                        {categoryTools.map((t) => {
                                          const hasSettings =
                                            TOOL_SETTINGS_SCHEMA[t.name] !== undefined;
                                          const isSettingsExpanded =
                                            expandedToolSettings.has(t.name);

                                          return (
                                            <div key={t.name}>
                                              <label className="flex items-start gap-2 p-1.5 cursor-pointer hover:bg-grid-panel/50">
                                                <input
                                                  type="checkbox"
                                                  checked={form.allowedTools.includes(t.name)}
                                                  onChange={() => toggleTool(t.name)}
                                                  className="mt-0.5 accent-neon-cyan"
                                                />
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-xs text-text-primary">
                                                      {t.name}
                                                    </span>
                                                    {hasSettings && (
                                                      <button
                                                        onClick={(e) => {
                                                          e.preventDefault();
                                                          toggleToolSettings(t.name);
                                                        }}
                                                        className="p-0.5 text-text-muted hover:text-neon-cyan"
                                                        title="Tool settings"
                                                      >
                                                        <Settings className="h-3 w-3" />
                                                      </button>
                                                    )}
                                                  </div>
                                                  <p className="text-[10px] text-text-muted">
                                                    {t.description}
                                                  </p>
                                                </div>
                                              </label>

                                              {/* Per-tool settings panel */}
                                              {hasSettings && isSettingsExpanded && (
                                                <div className="ml-6 mb-2 space-y-2 border-l-2 border-neon-cyan/20 pl-3 py-2">
                                                  {TOOL_SETTINGS_SCHEMA[t.name].map((field) => (
                                                    <div key={field.key}>
                                                      <label className="mb-0.5 block text-[10px] text-text-muted">
                                                        {field.label}
                                                      </label>
                                                      <input
                                                        type={
                                                          field.type === "url"
                                                            ? "url"
                                                            : field.type === "number"
                                                              ? "number"
                                                              : "text"
                                                        }
                                                        value={
                                                          form.toolSettings[t.name]?.[
                                                            field.key
                                                          ] ?? ""
                                                        }
                                                        onChange={(e) =>
                                                          updateToolSetting(
                                                            t.name,
                                                            field.key,
                                                            e.target.value,
                                                          )
                                                        }
                                                        className="w-full border border-grid-border bg-grid-panel px-2 py-1 text-[11px] text-text-primary outline-none focus:border-neon-cyan/50"
                                                        placeholder={field.description}
                                                      />
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Save button — visible on all tabs */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={
                saving ||
                !form.name ||
                !form.slug ||
                !form.description ||
                !form.instructions
              }
              className="flex items-center gap-2 border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-2 text-xs uppercase tracking-wider text-neon-cyan transition-colors hover:bg-neon-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-3.5 w-3.5" />
              {saving
                ? "Saving..."
                : isDbRecord
                  ? "Update Operator"
                  : isNew
                    ? "Create Operator"
                    : "Save Customization"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
