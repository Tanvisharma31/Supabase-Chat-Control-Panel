export const panelStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "14px",
  boxShadow: "var(--shadow-sm)",
  overflow: "hidden" as const
};

export const panelHeader = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "13px 16px",
  borderBottom: "1px solid var(--border)",
  fontSize: "0.62rem",
  fontWeight: 800,
  color: "var(--muted)",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const
};

export const fieldGroup = { display: "flex", flexDirection: "column" as const, gap: "4px" };
export const fieldLabel = { fontSize: "0.65rem", fontWeight: 700, color: "var(--muted)" };

export const smallInput = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  color: "var(--text)",
  padding: "10px 12px",
  fontSize: "0.8125rem",
  outline: "none",
  width: "100%" as const
};

export const mainInput = {
  width: "100%",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--text)",
  padding: "12px 14px 12px 34px",
  fontSize: "0.9rem",
  fontFamily: "var(--font-mono)",
  outline: "none"
};

export const sendButton = {
  background: "var(--accent)",
  color: "var(--bg)",
  border: "none",
  borderRadius: "12px",
  width: "48px",
  height: "48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
  transition: "transform 0.12s ease, opacity 0.12s ease, background 0.12s ease",
  boxShadow: "var(--shadow-sm)"
};

export const tagStyle = {
  background: "var(--surface-hover)",
  border: "1px solid var(--border)",
  color: "var(--muted)",
  fontSize: "0.65rem",
  padding: "6px 11px",
  borderRadius: "999px",
  cursor: "pointer",
  fontFamily: "var(--font-mono)",
  transition: "background 0.12s ease, border-color 0.12s ease, color 0.12s ease"
};

export const initializeButton = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "var(--accent)",
  color: "var(--bg)",
  border: "none",
  fontSize: "0.84rem",
  fontWeight: 700,
  cursor: "pointer",
  marginTop: "4px",
  transition: "opacity 0.15s ease, transform 0.1s ease",
  boxShadow: "var(--shadow-sm)"
};

export const toolboxGroupTitle = { marginTop: "8px", fontSize: "0.65rem", color: "var(--muted)", fontWeight: 700 };
export const historyBtnStyle = { ...tagStyle, textAlign: "left" as const, width: "100%", padding: "8px 10px", transition: "all 0.12s" };
