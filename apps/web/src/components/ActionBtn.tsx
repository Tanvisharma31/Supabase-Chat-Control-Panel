import type { ReactNode } from "react";

interface ActionBtnProps {
  label: string;
  cmd: string;
  onClick: (cmd: string) => void;
  /** Optional leading icon (e.g. Lucide icon) */
  icon?: ReactNode;
  tone?: "default" | "danger";
}

export function ActionBtn({ label, cmd, onClick, icon, tone = "default" }: ActionBtnProps) {
  const danger = tone === "danger";
  return (
    <button
      type="button"
      onClick={() => onClick(cmd)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        textAlign: "left",
        padding: "9px 11px",
        borderRadius: "10px",
        border: danger ? "1px solid color-mix(in srgb, #ef4444 35%, var(--border))" : "1px solid transparent",
        background: danger ? "color-mix(in srgb, #ef4444 6%, transparent)" : "transparent",
        color: "var(--text)",
        fontSize: "0.8rem",
        fontWeight: 500,
        cursor: "pointer",
        transition: "background 0.12s ease, border-color 0.12s ease, transform 0.1s ease, box-shadow 0.12s ease",
        boxShadow: "none"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? "color-mix(in srgb, #ef4444 12%, var(--surface-hover))"
          : "var(--surface-hover)";
        e.currentTarget.style.borderColor = danger ? "color-mix(in srgb, #ef4444 50%, var(--border))" : "var(--border)";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = danger ? "color-mix(in srgb, #ef4444 6%, transparent)" : "transparent";
        e.currentTarget.style.borderColor = danger ? "color-mix(in srgb, #ef4444 35%, var(--border))" : "transparent";
        e.currentTarget.style.boxShadow = "none";
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = "scale(0.99)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {icon != null ? (
        <span
          style={{
            display: "flex",
            flexShrink: 0,
            color: danger ? "#f87171" : "var(--muted)",
            opacity: danger ? 1 : 0.92
          }}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <span style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>{label}</span>
    </button>
  );
}
