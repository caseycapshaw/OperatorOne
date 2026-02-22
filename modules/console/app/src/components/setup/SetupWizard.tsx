"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type Step = 1 | 2 | 3;

interface StepResult {
  step: string;
  success: boolean;
  message: string;
}

interface DoneEvent {
  done: true;
  success: boolean;
}

type SSEEvent = StepResult | DoneEvent;

const STEP_LABELS: Record<string, string> = {
  authentikPassword: "Authentik admin password",
  openbaoInit: "Secrets vault (OpenBao)",
  ssoProviders: "SSO providers",
  paperlessToken: "Paperless API",
  secretsStored: "Secrets stored",
  envUpdated: "Configuration saved",
  setupComplete: "Setup finalized",
  servicesRestarted: "Services restarted",
};

export function SetupWizard() {
  const [step, setStep] = useState<Step>(1);
  const [token, setToken] = useState("");

  // Step 1: Identity & Password
  const [setupCode, setSetupCode] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [operatorEmail, setOperatorEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Step 2: AI Provider
  const [aiProvider, setAiProvider] = useState<"anthropic" | "openrouter">(
    "anthropic",
  );
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");

  // Step 3: Apply
  const [applyProgress, setApplyProgress] = useState<StepResult[]>([]);
  const [applyDone, setApplyDone] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applyStarted, setApplyStarted] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // Ref to prevent double-start
  const applyStartedRef = useRef(false);

  // Countdown after successful apply
  useEffect(() => {
    if (!applyDone || !applySuccess) return;
    if (countdown <= 0) {
      window.location.href = "/login";
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [applyDone, applySuccess, countdown]);

  // Step 1: Verify setup code
  const handleAuth = useCallback(async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/setup/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Setup-Request": "1",
        },
        body: JSON.stringify({ setupCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Authentication failed");
        return;
      }
      setToken(data.token);
      setStep(2);
    } catch {
      setAuthError("Network error");
    } finally {
      setAuthLoading(false);
    }
  }, [setupCode]);

  // Step 3: Apply configuration via SSE
  const handleApply = useCallback(async () => {
    if (applyStartedRef.current) return;
    applyStartedRef.current = true;
    setApplyStarted(true);
    setApplyError("");
    setApplyProgress([]);

    try {
      const res = await fetch("/api/setup/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Setup-Request": "1",
        },
        body: JSON.stringify({
          adminPassword,
          orgName,
          orgDomain,
          operatorName,
          operatorEmail,
          aiProvider: aiProvider !== "anthropic" ? aiProvider : undefined,
          anthropicApiKey: anthropicKey || undefined,
          openrouterApiKey: openrouterKey || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setApplyError(data.error || "Apply failed");
        applyStartedRef.current = false;
        setApplyStarted(false);
        return;
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) {
        setApplyError("Stream not available");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          try {
            const event = JSON.parse(json) as SSEEvent;
            if ("done" in event) {
              setApplyDone(true);
              setApplySuccess(event.success);
            } else {
              setApplyProgress((prev) => [...prev, event]);
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch {
      setApplyError("Network error");
      applyStartedRef.current = false;
      setApplyStarted(false);
    }
  }, [
    token,
    adminPassword,
    orgName,
    orgDomain,
    operatorName,
    operatorEmail,
    aiProvider,
    anthropicKey,
    openrouterKey,
  ]);

  // Auto-start apply when entering step 3
  useEffect(() => {
    if (step === 3 && !applyStartedRef.current) {
      handleApply();
    }
  }, [step, handleApply]);

  const passwordsMatch =
    adminPassword.length >= 12 && adminPassword === adminPasswordConfirm;
  const step1Valid =
    setupCode && passwordsMatch && orgName && orgDomain && operatorName && operatorEmail;

  return (
    <div className="relative w-full max-w-lg border border-grid-border bg-grid-panel/80 p-8 shadow-[var(--shadow-glow-cyan)]">
      {/* Corner accents */}
      <div className="absolute top-0 left-0 h-4 w-[1px] bg-neon-cyan" />
      <div className="absolute top-0 left-0 h-[1px] w-4 bg-neon-cyan" />
      <div className="absolute top-0 right-0 h-4 w-[1px] bg-neon-cyan" />
      <div className="absolute top-0 right-0 h-[1px] w-4 bg-neon-cyan" />
      <div className="absolute bottom-0 left-0 h-4 w-[1px] bg-neon-cyan" />
      <div className="absolute bottom-0 left-0 h-[1px] w-4 bg-neon-cyan" />
      <div className="absolute bottom-0 right-0 h-4 w-[1px] bg-neon-cyan" />
      <div className="absolute bottom-0 right-0 h-[1px] w-4 bg-neon-cyan" />

      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-neon-cyan/50 bg-neon-cyan/10">
          <div className="h-4 w-4 bg-neon-cyan" />
        </div>
        <h1 className="text-lg font-bold uppercase tracking-widest text-neon-cyan">
          System Init
        </h1>
        <p className="mt-2 text-xs text-text-muted">Step {step} of 3</p>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex gap-1">
        {([1, 2, 3] as const).map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 ${
              s <= step ? "bg-neon-cyan" : "bg-grid-border"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Identity & Password */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-primary">
              Identity &amp; Password
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Enter the setup code from your terminal and set your admin
              password
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-text-muted">
                Setup Code
              </label>
              <input
                type="text"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value)}
                className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
                placeholder="op1-abc123"
                autoFocus
              />
            </div>

            <div className="border-t border-grid-border pt-3">
              <label className="mb-1 block text-xs text-text-muted">
                Admin Password (min 12 characters)
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
                placeholder="Choose a strong password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">
                Confirm Password
              </label>
              <input
                type="password"
                value={adminPasswordConfirm}
                onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                className={`w-full border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan ${
                  adminPasswordConfirm && !passwordsMatch
                    ? "border-red-400/50"
                    : "border-grid-border"
                }`}
                placeholder="Confirm password"
              />
              {adminPasswordConfirm && !passwordsMatch && (
                <p className="mt-1 text-xs text-red-400">
                  {adminPassword.length < 12
                    ? "Password must be at least 12 characters"
                    : "Passwords do not match"}
                </p>
              )}
            </div>

            <div className="border-t border-grid-border pt-3">
              <label className="mb-1 block text-xs text-text-muted">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
                placeholder="Acme Corp"
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
            <div>
              <label className="mb-1 block text-xs text-text-muted">
                Human Operator Name
              </label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">
                Human Operator Email
              </label>
              <input
                type="text"
                value={operatorEmail}
                onChange={(e) => setOperatorEmail(e.target.value)}
                className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
                placeholder="jane@example.com"
              />
            </div>
          </div>

          {authError && <p className="text-xs text-red-400">{authError}</p>}

          <button
            onClick={handleAuth}
            disabled={!step1Valid || authLoading}
            className="flex w-full items-center justify-center border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-3 text-xs font-medium uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/20 hover:shadow-[var(--shadow-glow-cyan)] disabled:opacity-50"
          >
            {authLoading ? "Verifying..." : "Continue"}
          </button>
        </div>
      )}

      {/* Step 2: AI Provider */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-primary">
              AI Provider
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Optional &mdash; can be configured later on the Admin page
            </p>
          </div>

          <div className="space-y-3">
            {/* Provider toggle */}
            <div>
              <label className="mb-2 block text-xs text-text-muted">
                Provider
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAiProvider("anthropic")}
                  className={`flex-1 border px-3 py-2 text-xs font-medium uppercase tracking-widest transition-all ${
                    aiProvider === "anthropic"
                      ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan"
                      : "border-grid-border text-text-muted hover:border-grid-border/80"
                  }`}
                >
                  Anthropic (Direct)
                </button>
                <button
                  onClick={() => setAiProvider("openrouter")}
                  className={`flex-1 border px-3 py-2 text-xs font-medium uppercase tracking-widest transition-all ${
                    aiProvider === "openrouter"
                      ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan"
                      : "border-grid-border text-text-muted hover:border-grid-border/80"
                  }`}
                >
                  OpenRouter
                </button>
              </div>
            </div>

            {/* Anthropic key */}
            {aiProvider === "anthropic" && (
              <div>
                <label className="mb-1 block text-xs text-text-muted">
                  Anthropic API Key
                </label>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
                  placeholder="sk-ant-..."
                  autoFocus
                />
                <div className="mt-2 space-y-2 border border-grid-border bg-grid-black/30 p-3">
                  <p className="text-xs text-text-muted">
                    OperatorOne requires a{" "}
                    <span className="text-text-primary">developer API key</span>{" "}
                    from Anthropic. A Claude Pro/Max subscription cannot be used
                    &mdash; Anthropic keeps chat subscriptions and API access
                    separate.
                  </p>
                  <p className="text-xs text-text-muted">To get a key:</p>
                  <ol className="list-inside list-decimal space-y-0.5 text-xs text-text-muted">
                    <li>
                      Go to{" "}
                      <a
                        href="https://console.anthropic.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neon-cyan underline"
                      >
                        console.anthropic.com
                      </a>
                    </li>
                    <li>Sign up or log in, then add a payment method</li>
                    <li>
                      Navigate to{" "}
                      <span className="text-text-primary">API Keys</span> and
                      create a new key
                    </li>
                    <li>
                      Paste the{" "}
                      <span className="font-mono text-text-primary">
                        sk-ant-...
                      </span>{" "}
                      key above
                    </li>
                  </ol>
                  <p className="mt-1 text-[10px] text-text-muted/60">
                    Typical cost for a small business: $5&ndash;$20/month.
                    Claude Sonnet is $3 per 1M input tokens and $15 per 1M
                    output tokens.
                  </p>
                </div>
              </div>
            )}

            {/* OpenRouter key */}
            {aiProvider === "openrouter" && (
              <div>
                <label className="mb-1 block text-xs text-text-muted">
                  OpenRouter API Key
                </label>
                <input
                  type="password"
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
                  placeholder="sk-or-..."
                  autoFocus
                />
                <div className="mt-2 space-y-2 border border-grid-border bg-grid-black/30 p-3">
                  <p className="text-xs text-text-muted">
                    <span className="text-text-primary">OpenRouter</span> lets
                    you access Claude models through unified billing instead of
                    managing a separate Anthropic developer account.
                  </p>
                  <p className="text-xs text-text-muted">To get a key:</p>
                  <ol className="list-inside list-decimal space-y-0.5 text-xs text-text-muted">
                    <li>
                      Go to{" "}
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neon-cyan underline"
                      >
                        openrouter.ai/keys
                      </a>
                    </li>
                    <li>Sign up or log in, then add credits</li>
                    <li>Create a new API key</li>
                    <li>
                      Paste the{" "}
                      <span className="font-mono text-text-primary">
                        sk-or-...
                      </span>{" "}
                      key above
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(3)}
              className="flex flex-1 items-center justify-center border border-grid-border px-4 py-3 text-xs font-medium uppercase tracking-widest text-text-muted transition-all hover:border-neon-cyan/30 hover:text-text-primary"
            >
              Skip for now
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex flex-1 items-center justify-center border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-3 text-xs font-medium uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/20 hover:shadow-[var(--shadow-glow-cyan)]"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Apply */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-primary">
              Configuring System
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              {applyDone
                ? applySuccess
                  ? "Configuration complete"
                  : "Configuration finished with errors"
                : "Auto-configuring all services..."}
            </p>
          </div>

          {/* Progress steps */}
          <div className="space-y-2 border border-grid-border bg-grid-panel p-3">
            {applyProgress.map((result, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div
                  className={`mt-0.5 h-2 w-2 shrink-0 ${
                    result.success ? "bg-green-400" : "bg-yellow-400"
                  }`}
                />
                <span
                  className={
                    result.success ? "text-green-400" : "text-yellow-400"
                  }
                >
                  {result.message}
                </span>
              </div>
            ))}

            {/* Spinner for in-progress */}
            {applyStarted && !applyDone && !applyError && (
              <div className="flex items-center gap-2 text-xs">
                <div className="mt-0.5 h-2 w-2 shrink-0 animate-pulse bg-neon-cyan" />
                <span className="text-neon-cyan">
                  {STEP_LABELS[
                    getNextStep(applyProgress.map((p) => p.step))
                  ] || "Processing..."}
                </span>
              </div>
            )}
          </div>

          {applyError && (
            <div className="space-y-2">
              <p className="text-xs text-red-400">{applyError}</p>
              <button
                onClick={() => {
                  applyStartedRef.current = false;
                  setApplyStarted(false);
                  handleApply();
                }}
                className="text-xs text-neon-cyan underline"
              >
                Retry
              </button>
            </div>
          )}

          {applyDone && applySuccess && (
            <div className="space-y-3">
              <p className="text-center text-xs text-text-muted">
                Setup complete &mdash; redirecting to login in {countdown}s
              </p>
              <a
                href="/login"
                className="block text-center text-xs text-neon-cyan underline"
              >
                Go to login now
              </a>
              <div className="border-t border-grid-border pt-3">
                <p className="text-[10px] text-text-muted/60">
                  To connect n8n workflows, generate an API key in n8n Settings
                  &rarr; API and enter it on the Admin page.
                </p>
              </div>
            </div>
          )}

          {applyDone && !applySuccess && (
            <div className="space-y-2">
              <p className="text-xs text-yellow-400">
                Some steps failed. Check the console log for details and retry
                or configure manually on the Admin page.
              </p>
              <button
                onClick={() => {
                  applyStartedRef.current = false;
                  setApplyStarted(false);
                  setApplyDone(false);
                  setApplyProgress([]);
                  handleApply();
                }}
                className="flex w-full items-center justify-center border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-3 text-xs font-medium uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/20 hover:shadow-[var(--shadow-glow-cyan)]"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Determine the next expected step based on completed steps.
 */
const STEP_ORDER: string[] = [
  "authentikPassword",
  "openbaoInit",
  "ssoProviders",
  "paperlessToken",
  "secretsStored",
  "envUpdated",
  "setupComplete",
  "servicesRestarted",
];

function getNextStep(completedSteps: string[]): string {
  const completedSet = new Set(completedSteps);
  for (const step of STEP_ORDER) {
    if (!completedSet.has(step)) return step;
  }
  return "";
}
