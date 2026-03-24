import React from "react";
import "./theme.css";

export const ThemeToggle = ({
  theme,
  onToggle
}: {
  theme: "light" | "dark";
  onToggle: () => void;
}) => (
  <button
    type="button"
    style={{
      background: "var(--surface-hover)",
      color: "var(--text)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "7px 12px",
      minHeight: 32,
      fontSize: "0.7rem",
      fontWeight: 600,
      lineHeight: 1,
      whiteSpace: "nowrap",
      cursor: "pointer",
      transition: "background 0.15s ease, border-color 0.15s ease"
    }}
    onClick={onToggle}
    aria-label="Toggle theme"
  >
    {theme === "light" ? "Switch to dark" : "Switch to light"}
  </button>
);
