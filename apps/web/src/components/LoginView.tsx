import { Settings } from "lucide-react";
import { fieldLabel, initializeButton, panelHeader, panelStyle, smallInput } from "./styles.js";

interface LoginViewProps {
  email: string;
  displayName: string;
  onEmailChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onLogin: () => void;
}

export function LoginView({ email, displayName, onEmailChange, onDisplayNameChange, onLogin }: LoginViewProps) {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "var(--bg)", padding: "24px" }}>
      <section style={{ ...panelStyle, width: "440px", boxShadow: "var(--shadow-lg)" }}>
        <div style={panelHeader}>
          <Settings size={12} /> LOGIN
        </div>
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "1rem" }}>Supabase Chat Control Plane</h2>
          <label style={fieldLabel}>Email</label>
          <input value={email} onChange={(e) => onEmailChange(e.target.value)} style={smallInput} />
          <label style={fieldLabel}>Display Name</label>
          <input value={displayName} onChange={(e) => onDisplayNameChange(e.target.value)} style={smallInput} />
          <button onClick={onLogin} style={initializeButton}>
            Sign In
          </button>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            Multi-tenant mode: each login gets isolated workspace memberships and chat history.
          </span>
        </div>
      </section>
    </main>
  );
}
