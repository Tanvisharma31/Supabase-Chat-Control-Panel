import type { CSSProperties, ReactNode } from "react";
import { Activity, Database, Key, LogOut, Settings, TerminalSquare, Zap } from "lucide-react";
import { ThemeToggle } from "../../../../packages/ui/src/index.js";
import { ConversationListItem, WorkspaceOption } from "./types.js";
import { fieldGroup, fieldLabel, historyBtnStyle, initializeButton, panelHeader, panelStyle, smallInput, tagStyle } from "./styles.js";

interface LeftSidebarProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  userId: string;
  workspaceName: string;
  onWorkspaceNameChange: (value: string) => void;
  workspaceId: string;
  workspaces: WorkspaceOption[];
  status: string;
  isOnline: boolean;
  onSwitchWorkspace: (value: string) => void;
  onBootstrap: () => void;
  onLogout: () => void;
  accessToken: string;
  onAccessTokenChange: (value: string) => void;
  organizationId: string;
  onOrganizationIdChange: (value: string) => void;
  isSupabaseConnected: boolean;
  onConnectSupabase: () => void;
  projectRef: string;
  onProjectRefChange: (value: string) => void;
  databaseName: string;
  onDatabaseNameChange: (value: string) => void;
  conversationList: ConversationListItem[];
  conversationId: string;
  onLoadConversationMessages: (id: string) => void;
  onNewChat: () => void;
}

function SidebarCard({ title, icon, children, footer }: { title: string; icon: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <section style={{ ...panelStyle, flexShrink: 0 }}>
      <div style={panelHeader}>
        {icon}
        {title}
      </div>
      {children}
      {footer}
    </section>
  );
}

const shellAside: CSSProperties = {
  width: "300px",
  minWidth: "300px",
  maxWidth: "300px",
  flexShrink: 0,
  alignSelf: "stretch",
  minHeight: 0,
  height: "100%",
  maxHeight: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  boxSizing: "border-box"
};

const brandBar: CSSProperties = {
  ...panelStyle,
  flexShrink: 0,
  padding: "12px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  minHeight: "56px"
};

const logoutButton: CSSProperties = {
  ...tagStyle,
  marginTop: "6px",
  width: "100%",
  padding: "9px 12px",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  fontWeight: 600,
  color: "var(--text)",
  background: "transparent",
  borderColor: "var(--border)"
};

const hintBox: CSSProperties = {
  fontSize: "0.72rem",
  color: "var(--muted)",
  lineHeight: 1.5,
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "color-mix(in srgb, var(--bg) 75%, var(--surface))"
};

export function LeftSidebar(props: LeftSidebarProps) {
  const {
    theme,
    onToggleTheme,
    userId,
    workspaceName,
    onWorkspaceNameChange,
    workspaceId,
    workspaces,
    status,
    isOnline,
    onSwitchWorkspace,
    onBootstrap,
    onLogout,
    accessToken,
    onAccessTokenChange,
    organizationId,
    onOrganizationIdChange,
    isSupabaseConnected,
    onConnectSupabase,
    projectRef,
    onProjectRefChange,
    databaseName,
    onDatabaseNameChange,
    conversationList,
    conversationId,
    onLoadConversationMessages,
    onNewChat
  } = props;

  return (
    <aside style={shellAside} aria-label="Workspace and connection">
      <div style={brandBar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
          <div
            style={{
              background: "var(--text)",
              color: "var(--bg)",
              borderRadius: "8px",
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <TerminalSquare size={17} strokeWidth={2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ margin: 0, fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.14em", color: "var(--muted)" }}>CONTROL</div>
            <h1 style={{ margin: "2px 0 0 0", fontSize: "0.82rem", fontWeight: 800, lineHeight: 1.2, color: "var(--text)" }}>Plane</h1>
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>

      <div className="cp-left-sidebar-scroll">
        <SidebarCard title="Connection" icon={<Settings size={13} strokeWidth={2} />}>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={fieldGroup}>
              <label style={fieldLabel}>User ID</label>
              <input value={userId} readOnly style={{ ...smallInput, fontFamily: "var(--font-mono)", fontSize: "0.75rem" }} />
            </div>
            <div style={fieldGroup}>
              <label style={fieldLabel}>Workspace name</label>
              <input value={workspaceName} onChange={(e) => onWorkspaceNameChange(e.target.value)} style={smallInput} />
            </div>
            <div style={fieldGroup}>
              <label style={fieldLabel}>Active workspace</label>
              <select value={workspaceId} onChange={(e) => onSwitchWorkspace(e.target.value)} style={{ ...smallInput, cursor: "pointer" }}>
                <option value="">Select workspace</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name} ({ws.id.slice(0, 8)})
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={onBootstrap} disabled={status === "Bootstrapping..."} style={{ ...initializeButton, opacity: status === "Bootstrapping..." ? 0.55 : 1 }}>
              <Zap size={15} fill="currentColor" />
              {status === "Bootstrapping..." ? "Initializing…" : "Create workspace"}
            </button>
            <button type="button" onClick={onLogout} style={logoutButton}>
              <LogOut size={14} strokeWidth={2} />
              Sign out
            </button>
          </div>
          <div
            style={{
              borderTop: "1px solid var(--border)",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.62rem",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "var(--muted)",
              textTransform: "uppercase"
            }}
          >
            <span>Status</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: isOnline ? "#10b981" : "var(--muted)" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: isOnline ? "#10b981" : "var(--muted)", flexShrink: 0 }} aria-hidden />
              <span style={{ fontWeight: 700, color: "var(--text)", opacity: 0.92 }}>{status}</span>
            </div>
          </div>
        </SidebarCard>

        <SidebarCard title="Supabase link" icon={<Key size={13} strokeWidth={2} />}>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{ ...hintBox, margin: 0 }}>
              Use <strong style={{ color: "var(--text)" }}>Profile → Access tokens</strong> to create a token, then paste it here to connect.
            </p>
            <div style={fieldGroup}>
              <label style={fieldLabel}>Access token</label>
              <input value={accessToken} onChange={(e) => onAccessTokenChange(e.target.value)} style={smallInput} placeholder="sbp_…" autoComplete="off" spellCheck={false} />
            </div>
            <div style={fieldGroup}>
              <label style={fieldLabel}>Org ID (optional)</label>
              <input value={organizationId} onChange={(e) => onOrganizationIdChange(e.target.value)} style={smallInput} />
            </div>
            <button type="button" onClick={onConnectSupabase} disabled={!accessToken.trim() || !workspaceId} style={{ ...initializeButton, opacity: !accessToken.trim() || !workspaceId ? 0.5 : 1 }}>
              Connect Supabase
            </button>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: isSupabaseConnected ? "#10b981" : "var(--muted)" }}>
              {isSupabaseConnected ? "● Connected" : "○ Not connected"}
            </div>
          </div>
        </SidebarCard>

        <SidebarCard title="Environment" icon={<Database size={13} strokeWidth={2} />}>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={fieldGroup}>
              <label style={fieldLabel}>Project ref</label>
              <input value={projectRef} onChange={(e) => onProjectRefChange(e.target.value)} style={{ ...smallInput, fontFamily: "var(--font-mono)" }} placeholder="e.g. abcdefghijkl" />
            </div>
            <div style={fieldGroup}>
              <label style={fieldLabel}>Schema</label>
              <input value={databaseName} onChange={(e) => onDatabaseNameChange(e.target.value)} style={{ ...smallInput, fontFamily: "var(--font-mono)" }} placeholder="public" />
            </div>
          </div>
        </SidebarCard>

        <SidebarCard title="History" icon={<Activity size={13} strokeWidth={2} />}>
          <div style={{ padding: "12px 14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              type="button"
              onClick={onNewChat}
              disabled={!workspaceId}
              style={{
                ...initializeButton,
                marginTop: 0,
                opacity: workspaceId ? 1 : 0.45,
                fontSize: "0.8rem"
              }}
            >
              New chat
            </button>
            {conversationList.length === 0 && (
              <span style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.45 }}>No conversations yet. Create a workspace or pick one above.</span>
            )}
            {conversationList.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => onLoadConversationMessages(c.id)}
                style={{
                  ...historyBtnStyle,
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "10px",
                  background: conversationId === c.id ? "var(--surface-hover)" : "transparent",
                  color: conversationId === c.id ? "var(--text)" : "var(--muted)",
                  borderColor: conversationId === c.id ? "var(--border)" : "transparent"
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>{c.id.slice(0, 8)}…</span>
                <span style={{ marginLeft: "auto", fontSize: "0.68rem", opacity: 0.85 }}>{new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </button>
            ))}
          </div>
        </SidebarCard>
      </div>
    </aside>
  );
}
