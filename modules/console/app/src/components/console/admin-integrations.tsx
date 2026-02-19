"use client";

import { useEffect, useState } from "react";
import { HudFrame } from "@/components/thegridcn/hud-frame";
import { IntegrationCard, AddCard } from "./integration-card";
import { SettingsModal } from "./settings-modal";

/* ── Types ────────────────────────────────────── */

interface KeyStatus {
  configured: boolean;
  masked: string;
  source: "openbao" | "env" | "none";
}

interface SecretsResponse {
  anthropicApiKey: KeyStatus;
  n8nApiKey: KeyStatus;
  openrouterApiKey: KeyStatus;
  aiProvider: "anthropic" | "openrouter";
  openbaoAvailable: boolean;
}

type ModalId = "anthropic" | "openrouter" | "n8n" | "slack" | "email" | "sms" | null;

/* ── Key Settings Form (reused inside modals) ─ */

function KeySettingsForm({
  label,
  placeholder,
  bodyKey,
  status,
  openbaoAvailable,
  onSaved,
}: {
  label: string;
  placeholder: string;
  bodyKey: string;
  status: KeyStatus | null;
  openbaoAvailable: boolean;
  onSaved: () => void;
}) {
  const [newKey, setNewKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const sourceBadge =
    status?.source === "openbao"
      ? { label: "OpenBao", className: "text-neon-cyan" }
      : status?.source === "env"
        ? { label: "ENV", className: "text-yellow-400" }
        : null;

  async function handleSave() {
    if (!newKey.trim()) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/secrets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [bodyKey]: newKey }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Save failed");
        return;
      }
      setSaved(true);
      setNewKey("");
      onSaved();
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Current status */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs text-text-muted">Current Status</span>
          {sourceBadge && (
            <span
              className={`text-[10px] font-medium uppercase tracking-widest ${sourceBadge.className}`}
            >
              {sourceBadge.label}
            </span>
          )}
        </div>
        <div className="border border-grid-border bg-grid-black/50 px-3 py-2 font-mono text-sm text-text-muted">
          {status === null
            ? "Loading..."
            : status.configured
              ? status.masked
              : "Not configured"}
        </div>
      </div>

      {/* Input */}
      <div>
        <label className="mb-1 block text-xs text-text-muted">{label}</label>
        <input
          type="password"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-grid-border bg-grid-black/50 px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
          disabled={!openbaoAvailable}
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !newKey.trim() || !openbaoAvailable}
          className="flex items-center justify-center border border-neon-cyan/30 bg-neon-cyan/10 px-6 py-2 text-xs font-medium uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/20 hover:shadow-[var(--shadow-glow-cyan)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Key"}
        </button>
        {saved && <span className="text-xs text-green-400">Saved to OpenBao</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>

      {/* OpenBao status */}
      <div className="flex items-center gap-2 border-t border-grid-border pt-3">
        <div
          className={`h-1.5 w-1.5 rounded-full ${openbaoAvailable ? "bg-green-400" : "bg-red-400"}`}
        />
        <p className="text-xs text-text-muted/60">
          {openbaoAvailable
            ? "OpenBao connected — secrets stored securely"
            : "OpenBao unavailable — cannot save secrets"}
        </p>
      </div>
    </div>
  );
}

/* ── Coming Soon Placeholder ──────────────────── */

function ComingSoonContent({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 text-2xl text-text-muted/30">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="4" y="4" width="32" height="32" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
          <path d="M14 20h12M20 14v12" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <p className="text-xs uppercase tracking-widest text-text-muted">
        {name} integration
      </p>
      <p className="mt-1 text-xs text-text-muted/50">
        Coming in a future update
      </p>
    </div>
  );
}

/* ── Main Component ───────────────────────────── */

export function AdminIntegrations() {
  const [secrets, setSecrets] = useState<SecretsResponse | null>(null);
  const [activeModal, setActiveModal] = useState<ModalId>(null);

  function fetchSecrets() {
    fetch("/api/admin/secrets")
      .then((res) => res.json())
      .then((data: SecretsResponse) => setSecrets(data))
      .catch(() => {});
  }

  useEffect(() => {
    fetchSecrets();
  }, []);

  const anthropicStatus = secrets?.anthropicApiKey;
  const openrouterStatus = secrets?.openrouterApiKey;
  const n8nStatus = secrets?.n8nApiKey;
  const activeProvider = secrets?.aiProvider ?? "anthropic";

  return (
    <>
      {/* ── Agents & LLMs ─────────────────────── */}
      <HudFrame title="Agents & LLMs">
        {/* Active provider indicator */}
        <div className="mb-3 flex items-center gap-2 text-xs text-text-muted">
          <span>Active provider:</span>
          <span className="font-medium uppercase tracking-wider text-neon-cyan">
            {activeProvider === "openrouter" ? "OpenRouter" : "Anthropic"}
          </span>
          <span className="text-text-muted/40">
            (set via AI_PROVIDER env var)
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <IntegrationCard
            name="Anthropic"
            subtitle="Claude AI models (direct)"
            icon="A"
            accentColor="var(--color-neon-orange)"
            status={anthropicStatus?.configured ? "configured" : "not-configured"}
            statusLabel={
              anthropicStatus?.configured
                ? `Connected (${anthropicStatus.source === "openbao" ? "OpenBao" : "ENV"})${activeProvider === "anthropic" ? " · Active" : ""}`
                : "Not configured"
            }
            onClick={() => setActiveModal("anthropic")}
          />
          <IntegrationCard
            name="OpenRouter"
            subtitle="Claude via OpenRouter"
            icon="OR"
            accentColor="var(--color-neon-purple)"
            status={openrouterStatus?.configured ? "configured" : "not-configured"}
            statusLabel={
              openrouterStatus?.configured
                ? `Connected (${openrouterStatus.source === "openbao" ? "OpenBao" : "ENV"})${activeProvider === "openrouter" ? " · Active" : ""}`
                : "Not configured"
            }
            onClick={() => setActiveModal("openrouter")}
          />
          <AddCard label="Add Agent" />
        </div>
      </HudFrame>

      {/* ── Tools ─────────────────────────────── */}
      <HudFrame title="Tools">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <IntegrationCard
            name="n8n Automation"
            subtitle="Workflow automation engine"
            icon="n8n"
            accentColor="var(--color-neon-green)"
            status={n8nStatus?.configured ? "configured" : "not-configured"}
            statusLabel={
              n8nStatus?.configured
                ? `Connected (${n8nStatus.source === "openbao" ? "OpenBao" : "ENV"})`
                : "Not configured"
            }
            onClick={() => setActiveModal("n8n")}
          />
          <AddCard label="Add Tool" />
        </div>
      </HudFrame>

      {/* ── Communications ────────────────────── */}
      <HudFrame title="Communications">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <IntegrationCard
            name="Slack"
            subtitle="Team messaging"
            icon="S"
            accentColor="var(--color-neon-purple)"
            status="coming-soon"
            onClick={() => setActiveModal("slack")}
          />
          <IntegrationCard
            name="Email"
            subtitle="Email notifications"
            icon="@"
            accentColor="var(--color-neon-blue)"
            status="coming-soon"
            onClick={() => setActiveModal("email")}
          />
          <IntegrationCard
            name="Text Message"
            subtitle="SMS alerts"
            icon="TX"
            accentColor="var(--color-neon-cyan)"
            status="coming-soon"
            onClick={() => setActiveModal("sms")}
          />
        </div>
      </HudFrame>

      {/* ── Modals ────────────────────────────── */}

      <SettingsModal
        open={activeModal === "anthropic"}
        onClose={() => setActiveModal(null)}
        title="Anthropic Settings"
        accentColor="var(--color-neon-orange)"
      >
        <div className="space-y-5">
          <div className="space-y-2 border border-grid-border bg-grid-black/30 p-3">
            <p className="text-xs text-text-muted">
              Operator One uses a <span className="text-text-primary">developer API key</span> from
              Anthropic to power the AI agent. A Claude Pro/Max chat subscription
              cannot be used &mdash; Anthropic keeps chat subscriptions and API
              access separate.
            </p>
            <p className="text-xs text-text-muted">
              Get a key at{" "}
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon-cyan underline"
              >
                console.anthropic.com
              </a>
              {" "}&rarr; API Keys &rarr; Create Key
            </p>
            <div className="flex items-center gap-2 border-t border-grid-border pt-2">
              <span className="text-[10px] uppercase tracking-widest text-text-muted/60">
                Est. cost
              </span>
              <span className="text-xs text-text-muted">
                $5&ndash;$20/mo typical &middot; Sonnet: $3/$15 per 1M tokens (in/out)
              </span>
            </div>
          </div>
          <KeySettingsForm
            label="API Key"
            placeholder="sk-ant-..."
            bodyKey="anthropicApiKey"
            status={anthropicStatus ?? null}
            openbaoAvailable={secrets?.openbaoAvailable ?? false}
            onSaved={fetchSecrets}
          />
        </div>
      </SettingsModal>

      <SettingsModal
        open={activeModal === "openrouter"}
        onClose={() => setActiveModal(null)}
        title="OpenRouter Settings"
        accentColor="var(--color-neon-purple)"
      >
        <div className="space-y-5">
          <div className="space-y-2 border border-grid-border bg-grid-black/30 p-3">
            <p className="text-xs text-text-muted">
              <span className="text-text-primary">OpenRouter</span> is an alternative
              way to access Claude models. Instead of managing an Anthropic developer
              account directly, you pay through OpenRouter&apos;s unified billing.
            </p>
            <p className="text-xs text-text-muted">
              Get a key at{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon-cyan underline"
              >
                openrouter.ai/keys
              </a>
            </p>
            <div className="space-y-1 border-t border-grid-border pt-2">
              <p className="text-[10px] uppercase tracking-widest text-text-muted/60">
                To activate
              </p>
              <p className="text-xs text-text-muted">
                Set <span className="font-mono text-text-primary">AI_PROVIDER=openrouter</span> in
                your .env file and restart the console container.
              </p>
            </div>
          </div>
          <KeySettingsForm
            label="API Key"
            placeholder="sk-or-..."
            bodyKey="openrouterApiKey"
            status={openrouterStatus ?? null}
            openbaoAvailable={secrets?.openbaoAvailable ?? false}
            onSaved={fetchSecrets}
          />
        </div>
      </SettingsModal>

      <SettingsModal
        open={activeModal === "n8n"}
        onClose={() => setActiveModal(null)}
        title="n8n Automation Settings"
        accentColor="var(--color-neon-green)"
      >
        <KeySettingsForm
          label="API Key"
          placeholder="n8n API key"
          bodyKey="n8nApiKey"
          status={n8nStatus ?? null}
          openbaoAvailable={secrets?.openbaoAvailable ?? false}
          onSaved={fetchSecrets}
        />
      </SettingsModal>

      <SettingsModal
        open={activeModal === "slack"}
        onClose={() => setActiveModal(null)}
        title="Slack Settings"
        accentColor="var(--color-neon-purple)"
      >
        <ComingSoonContent name="Slack" />
      </SettingsModal>

      <SettingsModal
        open={activeModal === "email"}
        onClose={() => setActiveModal(null)}
        title="Email Settings"
        accentColor="var(--color-neon-blue)"
      >
        <ComingSoonContent name="Email" />
      </SettingsModal>

      <SettingsModal
        open={activeModal === "sms"}
        onClose={() => setActiveModal(null)}
        title="Text Message Settings"
        accentColor="var(--color-neon-cyan)"
      >
        <ComingSoonContent name="Text Message" />
      </SettingsModal>
    </>
  );
}
