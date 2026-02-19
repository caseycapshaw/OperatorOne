"use client";

import { useEffect, useState } from "react";

interface KeyStatus {
  configured: boolean;
  masked: string;
  source: "openbao" | "env" | "none";
}

interface SecretsResponse {
  anthropicApiKey: KeyStatus;
  n8nApiKey: KeyStatus;
  openbaoAvailable: boolean;
}

interface KeyFieldState {
  editing: boolean;
  newKey: string;
  saving: boolean;
  saved: boolean;
  error: string;
}

const initialKeyFieldState: KeyFieldState = {
  editing: false,
  newKey: "",
  saving: false,
  saved: false,
  error: "",
};

function KeyField({
  label,
  placeholder,
  bodyKey,
  status,
  openbaoAvailable,
  state,
  onStateChange,
  onRefresh,
}: {
  label: string;
  placeholder: string;
  bodyKey: string;
  status: KeyStatus | null;
  openbaoAvailable: boolean;
  state: KeyFieldState;
  onStateChange: (update: Partial<KeyFieldState>) => void;
  onRefresh: () => void;
}) {
  const sourceBadge =
    status?.source === "openbao"
      ? { label: "OpenBao", className: "text-neon-cyan" }
      : status?.source === "env"
        ? { label: "ENV", className: "text-yellow-400" }
        : null;

  async function handleSave() {
    if (!state.newKey.trim()) return;
    onStateChange({ saving: true, error: "", saved: false });
    try {
      const res = await fetch("/api/admin/secrets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [bodyKey]: state.newKey }),
      });
      if (!res.ok) {
        const data = await res.json();
        onStateChange({ error: data.error || "Save failed", saving: false });
        return;
      }
      onStateChange({ saved: true, editing: false, newKey: "", saving: false });
      onRefresh();
      setTimeout(() => onStateChange({ saved: false }), 3000);
    } catch {
      onStateChange({ error: "Network error", saving: false });
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <label className="block text-xs text-text-muted">{label}</label>
        {sourceBadge && (
          <span
            className={`text-[10px] font-medium uppercase tracking-widest ${sourceBadge.className}`}
          >
            {sourceBadge.label}
          </span>
        )}
      </div>
      {!state.editing ? (
        <div className="flex items-center gap-3">
          <div
            onClick={() => openbaoAvailable && onStateChange({ editing: true })}
            className={`flex-1 border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-muted ${openbaoAvailable ? "cursor-pointer hover:border-neon-cyan/50" : ""}`}
          >
            {status === null
              ? "Loading..."
              : status.configured
                ? status.masked
                : "Not configured"}
          </div>
          <button
            onClick={() => onStateChange({ editing: true })}
            disabled={!openbaoAvailable}
            className="shrink-0 border border-grid-border px-4 py-2 text-xs font-medium uppercase tracking-widest text-text-muted transition-all hover:border-neon-cyan hover:text-neon-cyan disabled:opacity-50 disabled:hover:border-grid-border disabled:hover:text-text-muted"
            title={!openbaoAvailable ? "OpenBao is not available" : undefined}
          >
            {status?.configured ? "Update" : "Set Key"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="password"
            value={state.newKey}
            onChange={(e) => onStateChange({ newKey: e.target.value })}
            placeholder={placeholder}
            className="w-full border border-neon-cyan/50 bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
            autoFocus
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={state.saving || !state.newKey.trim()}
              className="flex items-center justify-center border border-neon-cyan/30 bg-neon-cyan/10 px-6 py-2 text-xs font-medium uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/20 hover:shadow-[var(--shadow-glow-cyan)] disabled:opacity-50"
            >
              {state.saving ? "Saving..." : "Save Key"}
            </button>
            <button
              onClick={() =>
                onStateChange({ editing: false, newKey: "", error: "" })
              }
              className="px-4 py-2 text-xs font-medium uppercase tracking-widest text-text-muted transition-all hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {state.saved && (
        <span className="mt-2 block text-xs text-green-400">
          Key saved to OpenBao
        </span>
      )}
      {state.error && (
        <span className="mt-2 block text-xs text-red-400">{state.error}</span>
      )}
    </div>
  );
}

export function ApiKeysForm() {
  const [secrets, setSecrets] = useState<SecretsResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [anthropicState, setAnthropicState] =
    useState<KeyFieldState>(initialKeyFieldState);
  const [n8nState, setN8nState] =
    useState<KeyFieldState>(initialKeyFieldState);

  function fetchSecrets() {
    fetch("/api/admin/secrets")
      .then((res) => res.json())
      .then((data: SecretsResponse) => setSecrets(data))
      .catch(() => setLoadError("Failed to load key status"));
  }

  useEffect(() => {
    fetchSecrets();
  }, []);

  return (
    <div className="space-y-6">
      <KeyField
        label="Anthropic API Key"
        placeholder="sk-ant-..."
        bodyKey="anthropicApiKey"
        status={secrets?.anthropicApiKey ?? null}
        openbaoAvailable={secrets?.openbaoAvailable ?? false}
        state={anthropicState}
        onStateChange={(u) =>
          setAnthropicState((s) => ({ ...s, ...u }))
        }
        onRefresh={fetchSecrets}
      />

      <KeyField
        label="n8n API Key"
        placeholder="n8n API key"
        bodyKey="n8nApiKey"
        status={secrets?.n8nApiKey ?? null}
        openbaoAvailable={secrets?.openbaoAvailable ?? false}
        state={n8nState}
        onStateChange={(u) => setN8nState((s) => ({ ...s, ...u }))}
        onRefresh={fetchSecrets}
      />

      {loadError && (
        <span className="text-xs text-red-400">{loadError}</span>
      )}

      <div className="flex items-center gap-2">
        <div
          className={`h-1.5 w-1.5 rounded-full ${secrets?.openbaoAvailable ? "bg-green-400" : "bg-red-400"}`}
        />
        <p className="text-xs text-text-muted/60">
          {secrets?.openbaoAvailable
            ? "OpenBao connected — secrets stored securely"
            : "OpenBao unavailable — using environment variables as fallback"}
        </p>
      </div>
    </div>
  );
}
