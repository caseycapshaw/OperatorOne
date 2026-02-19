"use client";

interface IntegrationCardProps {
  name: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  status?: "configured" | "not-configured" | "coming-soon";
  statusLabel?: string;
  onClick?: () => void;
}

export function IntegrationCard({
  name,
  subtitle,
  icon,
  accentColor,
  status,
  statusLabel,
  onClick,
}: IntegrationCardProps) {
  const statusDot =
    status === "configured"
      ? "bg-neon-green"
      : status === "not-configured"
        ? "bg-text-muted/50"
        : "bg-neon-yellow/50";

  const statusText =
    statusLabel ??
    (status === "configured"
      ? "Connected"
      : status === "not-configured"
        ? "Not configured"
        : "Coming soon");

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-start border border-grid-border bg-grid-panel/60 p-4 text-left transition-all hover:border-grid-border-bright hover:bg-grid-panel"
      style={
        {
          "--card-accent": accentColor,
        } as React.CSSProperties
      }
    >
      {/* Corner accents on hover */}
      <div
        className="absolute top-0 left-0 h-2 w-[1px] opacity-0 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: accentColor }}
      />
      <div
        className="absolute top-0 left-0 h-[1px] w-2 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: accentColor }}
      />
      <div
        className="absolute bottom-0 right-0 h-2 w-[1px] opacity-0 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: accentColor }}
      />
      <div
        className="absolute bottom-0 right-0 h-[1px] w-2 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: accentColor }}
      />

      {/* Icon */}
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center border text-sm font-bold"
        style={{
          borderColor: `color-mix(in srgb, ${accentColor} 30%, transparent)`,
          backgroundColor: `color-mix(in srgb, ${accentColor} 8%, transparent)`,
          color: accentColor,
        }}
      >
        {icon}
      </div>

      {/* Name */}
      <span className="text-sm font-medium text-text-primary">{name}</span>

      {/* Subtitle */}
      <span className="mt-0.5 text-[11px] text-text-muted">{subtitle}</span>

      {/* Status */}
      <div className="mt-3 flex items-center gap-1.5">
        <div className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
        <span className="text-[10px] uppercase tracking-widest text-text-muted">
          {statusText}
        </span>
      </div>
    </button>
  );
}

interface AddCardProps {
  label: string;
  onClick?: () => void;
}

export function AddCard({ label, onClick }: AddCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center justify-center border border-dashed border-grid-border bg-transparent p-4 text-center transition-all hover:border-grid-border-bright hover:bg-grid-panel/30"
      style={{ minHeight: 140 }}
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center border border-dashed border-grid-border text-lg text-text-muted transition-colors group-hover:border-grid-border-bright group-hover:text-text-secondary">
        +
      </div>
      <span className="text-[11px] uppercase tracking-widest text-text-muted transition-colors group-hover:text-text-secondary">
        {label}
      </span>
    </button>
  );
}
