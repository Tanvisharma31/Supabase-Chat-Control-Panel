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
    style={{
      background: "var(--surface)",
      color: "var(--text)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "6px 10px",
      minHeight: 30,
      fontSize: "0.72rem",
      fontWeight: 600,
      lineHeight: 1,
      whiteSpace: "nowrap",
      cursor: "pointer"
    }}
    onClick={onToggle}
    aria-label="Toggle theme"
  >
    {theme === "light" ? "Switch to dark" : "Switch to light"}
  </button>
);
