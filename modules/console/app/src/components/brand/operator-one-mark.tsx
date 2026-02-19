interface OperatorOneMarkProps {
  size?: number;
  className?: string;
}

export function OperatorOneMark({ size = 24, className }: OperatorOneMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="10"
        y="10"
        width="100"
        height="100"
        rx="12"
        stroke="var(--color-neon-cyan)"
        strokeWidth="3"
        fill="var(--color-grid-dark)"
      />
      <text
        x="35"
        y="75"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="48"
        fontWeight="600"
        fill="var(--color-text-primary)"
      >
        O
      </text>
      <text
        x="68"
        y="75"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="48"
        fontWeight="600"
        fill="var(--color-neon-cyan)"
      >
        1
      </text>
    </svg>
  );
}
