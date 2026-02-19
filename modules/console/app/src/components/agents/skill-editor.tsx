"use client";

import { useState } from "react";
import { Save, X } from "lucide-react";

interface SkillEditorProps {
  initial?: {
    name: string;
    description: string;
    content: string;
  };
  onSave: (data: { name: string; description: string; content: string }) => void;
  onCancel: () => void;
}

export function SkillEditor({ initial, onSave, onCancel }: SkillEditorProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [content, setContent] = useState(initial?.content ?? "");

  const canSave = name.trim() && content.trim();

  return (
    <div className="space-y-3 border border-neon-cyan/20 bg-grid-dark p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-grid-border bg-grid-panel px-3 py-1.5 text-sm text-text-primary outline-none focus:border-neon-cyan/50"
            placeholder="Skill name"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-grid-border bg-grid-panel px-3 py-1.5 text-sm text-text-primary outline-none focus:border-neon-cyan/50"
            placeholder="Brief description (optional)"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-muted">
          Content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className="w-full border border-grid-border bg-grid-panel px-3 py-1.5 text-sm text-text-primary outline-none focus:border-neon-cyan/50 font-mono"
          placeholder="Instructions that will be injected into the agent's system prompt..."
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 border border-grid-border px-3 py-1.5 text-xs text-text-muted hover:text-text-primary"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
        <button
          onClick={() => canSave && onSave({ name: name.trim(), description: description.trim(), content: content.trim() })}
          disabled={!canSave}
          className="flex items-center gap-1.5 border border-neon-cyan/30 bg-neon-cyan/10 px-3 py-1.5 text-xs text-neon-cyan hover:bg-neon-cyan/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-3 w-3" />
          Save Skill
        </button>
      </div>
    </div>
  );
}
