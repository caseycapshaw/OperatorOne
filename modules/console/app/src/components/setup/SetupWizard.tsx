"use client";

import { useState, useEffect, useCallback } from "react";

type Step = 1 | 2 | 3 | 4 | 5;

interface ProviderResult {
  success: boolean;
  console: { clientId: string; clientSecretMasked: string };
  grafana: { clientId: string; clientSecretMasked: string };
}

interface ApplyResult {
  success: boolean;
  envWritten: boolean;
  setupComplete: boolean;
  restart: { success: boolean; message: string };
}

export function SetupWizard() {
  const [step, setStep] = useState<Step>(1);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Step 2: Organization identity
  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [operatorEmail, setOperatorEmail] = useState("");

  // Step 3: Provider creation
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerError, setProviderError] = useState("");
  const [providers, setProviders] = useState<ProviderResult | null>(null);

  // Step 4: External services
  const [anthropicKey, setAnthropicKey] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");

  // Step 5: Apply
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [countdown, setCountdown] = useState(10);

  // Countdown after successful apply
  useEffect(() => {
    if (!applyResult?.success) return;
    if (countdown <= 0) {
      window.location.href = "/login";
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [applyResult, countdown]);

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
        body: JSON.stringify({ password }),
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
  }, [password]);

  const handleCreateProviders = useCallback(async () => {
    setProviderLoading(true);
    setProviderError("");
    try {
      const res = await fetch("/api/setup/providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Setup-Request": "1",
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setProviderError(data.error || "Provider creation failed");
        return;
      }
      setProviders(data);
    } catch {
      setProviderError("Network error");
    } finally {
      setProviderLoading(false);
    }
  }, [token]);

  const handleApply = useCallback(async () => {
    if (!providers) return;
    setApplyLoading(true);
    setApplyError("");
    try {
      const res = await fetch("/api/setup/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Setup-Request": "1",
        },
        body: JSON.stringify({
          orgName: orgName || undefined,
          orgDomain: orgDomain || undefined,
          operatorName: operatorName || undefined,
          operatorEmail: operatorEmail || undefined,
          anthropicApiKey: anthropicKey || undefined,
          smtpHost: smtpHost || undefined,
          smtpPort: smtpPort || undefined,
          smtpUser: smtpUser || undefined,
          smtpPass: smtpPass || undefined,
          slackWebhookUrl: slackWebhook || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApplyError(data.error || "Apply failed");
        return;
      }
      setApplyResult(data);
    } catch {
      setApplyError("Network error");
    } finally {
      setApplyLoading(false);
    }
  }, [providers, token, orgName, orgDomain, operatorName, operatorEmail, anthropicKey, smtpHost, smtpPort, smtpUser, smtpPass, slackWebhook]);

  const orgIdentityValid = orgName && orgDomain && operatorName && operatorEmail;

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
        <p className="mt-2 text-xs text-text-muted">
          Step {step} of 5
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex gap-1">
        {([1, 2, 3, 4, 5] as const).map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 ${
              s <= step ? "bg-neon-cyan" : "bg-grid-border"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Authenticate */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-primary">
              Authenticate
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Enter the bootstrap password from your .env file
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-muted">
              Bootstrap Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
              placeholder="AUTHENTIK_BOOTSTRAP_PASSWORD"
              autoFocus
            />
          </div>
          {authError && (
            <p className="text-xs text-red-400">{authError}</p>
          )}
          <button
            onClick={handleAuth}
            disabled={!password || authLoading}
            className="flex w-full items-center justify-center border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-3 text-xs font-medium uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/20 hover:shadow-[var(--shadow-glow-cyan)] disabled:opacity-50"
          >
            {authLoading ? "Verifying..." : "Continue"}
          </button>
        </div>
      )}

      {/* Step 2: Organization Identity */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-primary">
              Organization Identity
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Set up your organization and primary operator
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-text-muted">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
                placeholder="Acme Corp"
                autoFocus
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
                onKeyDown={(e) => e.key === "Enter" && orgIdentityValid && setStep(3)}
                className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
                placeholder="jane@example.com"
              />
            </div>
          </div>

          <button
            onClick={() => setStep(3)}
            disabled={!orgIdentityValid}
            className="flex w-full items-center justify-center border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-3 text-xs font-medium uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/20 hover:shadow-[var(--shadow-glow-cyan)] disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 3: Configure Authentik */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-primary">
              Configure SSO
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Create OAuth2 providers for Console and Grafana in Authentik
            </p>
          </div>

          {!providers ? (
            <>
              <button
                onClick={handleCreateProviders}
                disabled={providerLoading}
                className="flex w-full items-center justify-center border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-3 text-xs font-medium uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/20 hover:shadow-[var(--shadow-glow-cyan)] disabled:opacity-50"
              >
                {providerLoading
                  ? "Creating providers..."
                  : "Configure SSO"}
              </button>
              {providerError && (
                <div className="space-y-2">
                  <p className="text-xs text-red-400">{providerError}</p>
                  <button
                    onClick={handleCreateProviders}
                    className="text-xs text-neon-cyan underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-3 border border-grid-border bg-grid-panel p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-400" />
                    <span className="text-xs font-medium text-text-primary">
                      Console Provider
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-text-muted">
                    Client ID: {providers.console.clientId}
                  </p>
                  <p className="font-mono text-xs text-text-muted">
                    Secret: {providers.console.clientSecretMasked}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-400" />
                    <span className="text-xs font-medium text-text-primary">
                      Grafana Provider
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-text-muted">
                    Client ID: {providers.grafana.clientId}
                  </p>
                  <p className="font-mono text-xs text-text-muted">
                    Secret: {providers.grafana.clientSecretMasked}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStep(4)}
                className="flex w-full items-center justify-center border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-3 text-xs font-medium uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/20 hover:shadow-[var(--shadow-glow-cyan)]"
              >
                Continue
              </button>
            </>
          )}
        </div>
      )}

      {/* Step 4: External Services */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-primary">
              External Services
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Optional - these can be configured later in .env
            </p>
          </div>

          <div className="space-y-3">
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
              />
            </div>

            <details className="group">
              <summary className="cursor-pointer text-xs text-text-muted hover:text-neon-cyan">
                SMTP Settings
              </summary>
              <div className="mt-2 space-y-2 pl-2">
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
                  placeholder="SMTP Host"
                />
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
                  placeholder="SMTP Port"
                />
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
                  placeholder="SMTP User"
                />
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
                  placeholder="SMTP Password"
                />
              </div>
            </details>

            <div>
              <label className="mb-1 block text-xs text-text-muted">
                Slack Webhook URL
              </label>
              <input
                type="text"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="w-full border border-grid-border bg-grid-panel px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-neon-cyan"
                placeholder="https://hooks.slack.com/..."
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(5)}
              className="flex flex-1 items-center justify-center border border-grid-border px-4 py-3 text-xs font-medium uppercase tracking-widest text-text-muted transition-all hover:border-neon-cyan/30 hover:text-text-primary"
            >
              Skip
            </button>
            <button
              onClick={() => setStep(5)}
              className="flex flex-1 items-center justify-center border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-3 text-xs font-medium uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/20 hover:shadow-[var(--shadow-glow-cyan)]"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Apply & Restart */}
      {step === 5 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-primary">
              Apply Configuration
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Review and apply settings to .env
            </p>
          </div>

          {/* Summary */}
          <div className="space-y-2 border border-grid-border bg-grid-panel p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-text-muted">Organization</span>
              <span className={orgName ? "text-green-400" : "text-text-muted"}>
                {orgName || "skipped"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Console OAuth</span>
              <span className="text-green-400">configured</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Grafana OAuth</span>
              <span className="text-green-400">configured</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Anthropic API</span>
              <span className={anthropicKey ? "text-green-400" : "text-text-muted"}>
                {anthropicKey ? "configured" : "skipped"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">SMTP</span>
              <span className={smtpHost ? "text-green-400" : "text-text-muted"}>
                {smtpHost ? "configured" : "skipped"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Slack</span>
              <span className={slackWebhook ? "text-green-400" : "text-text-muted"}>
                {slackWebhook ? "configured" : "skipped"}
              </span>
            </div>
          </div>

          {!applyResult ? (
            <>
              <button
                onClick={handleApply}
                disabled={applyLoading}
                className="flex w-full items-center justify-center border border-neon-cyan/30 bg-neon-cyan/10 px-4 py-3 text-xs font-medium uppercase tracking-widest text-neon-cyan transition-all hover:bg-neon-cyan/20 hover:shadow-[var(--shadow-glow-cyan)] disabled:opacity-50"
              >
                {applyLoading
                  ? "Applying configuration..."
                  : "Apply Configuration"}
              </button>
              {applyError && (
                <p className="text-xs text-red-400">{applyError}</p>
              )}
              <button
                onClick={() => setStep(4)}
                className="w-full text-center text-xs text-text-muted hover:text-neon-cyan"
              >
                Back
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2 border border-green-400/30 bg-green-400/5 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-400" />
                  <span className="text-green-400">.env updated</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-400" />
                  <span className="text-green-400">Setup marked complete</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 ${applyResult.restart.success ? "bg-green-400" : "bg-yellow-400"}`}
                  />
                  <span
                    className={
                      applyResult.restart.success
                        ? "text-green-400"
                        : "text-yellow-400"
                    }
                  >
                    {applyResult.restart.message}
                  </span>
                </div>
              </div>
              <p className="text-center text-xs text-text-muted">
                Setup complete — redirecting to login in {countdown}s
              </p>
              <a
                href="/login"
                className="block text-center text-xs text-neon-cyan underline"
              >
                Go to login now
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
