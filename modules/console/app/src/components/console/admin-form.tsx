"use client";

import { useState } from "react";

interface AdminFormProps {
  initial: {
    orgName: string;
    orgDomain: string;
    operatorName: string;
    operatorEmail: string;
  };
}

export function AdminForm({ initial }: AdminFormProps) {
  const [orgName, setOrgName] = useState(initial.orgName);
  const [orgDomain, setOrgDomain] = useState(initial.orgDomain);
  const [operatorName, setOperatorName] = useState(initial.operatorName);
  const [operatorEmail, setOperatorEmail] = useState(initial.operatorEmail);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName, orgDomain, operatorName, operatorEmail }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Save failed");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-neon-cyan">
          Organization
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-text-muted">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">
              Website Domain
            </label>
            <input
              type="text"
              value={orgDomain}
              onChange={(e) => setOrgDomain(e.target.value)}
              className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
              placeholder="example.com"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-neon-cyan">
          Human Operator
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-text-muted">
              Operator Name
            </label>
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">
              Operator Email
            </label>
            <input
              type="text"
              value={operatorEmail}
              onChange={(e) => setOperatorEmail(e.target.value)}
              className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center border border-neon-cyan/30 bg-neon-cyan/10 px-6 py-2 text-xs font-medium uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/20 hover:shadow-[var(--shadow-glow-cyan)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saved && (
          <span className="text-xs text-green-400">Saved</span>
        )}
        {error && (
          <span className="text-xs text-red-400">{error}</span>
        )}
      </div>
    </div>
  );
}
