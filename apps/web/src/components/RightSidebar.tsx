import type { CSSProperties, ReactNode } from "react";
import {
  Activity,
  CheckCircle,
  ClipboardList,
  Code,
  Command,
  Database,
  FolderOpen,
  FolderPlus,
  GitBranch,
  Package,
  Plus,
  Rocket,
  Shield,
  Table,
  XCircle
} from "lucide-react";
import { ActionBtn } from "./ActionBtn.js";
import { panelHeader, panelStyle } from "./styles.js";

interface RightSidebarProps {
  onSetInput: (value: string) => void;
}

const asideShell: CSSProperties = {
  width: "288px",
  minWidth: "288px",
  maxWidth: "288px",
  flexShrink: 0,
  alignSelf: "stretch",
  height: "100%",
  maxHeight: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  overflow: "hidden",
  boxSizing: "border-box"
};

const toolboxPanel: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden"
};

const sectionShell: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid var(--border)",
  background: "color-mix(in srgb, var(--bg) 55%, var(--surface))",
  padding: "10px 8px 8px",
  display: "flex",
  flexDirection: "column",
  gap: "2px"
};

const sectionTitleRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "0 6px 8px",
  borderBottom: "1px solid color-mix(in srgb, var(--border) 85%, transparent)",
  marginBottom: "4px"
};

const sectionTitleText: CSSProperties = {
  fontSize: "0.68rem",
  fontWeight: 800,
  color: "var(--muted)",
  letterSpacing: "0.07em",
  textTransform: "uppercase"
};

function ToolboxSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div style={sectionShell}>
      <div style={sectionTitleRow}>
        <span style={{ display: "flex", color: "var(--muted)" }}>{icon}</span>
        <span style={sectionTitleText}>{title}</span>
      </div>
      {children}
    </div>
  );
}

const statusRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "10px 12px",
  borderRadius: "10px",
  background: "var(--success-soft)",
  border: "1px solid color-mix(in srgb, var(--success-bright) 28%, var(--border))"
};

const statusLabel: CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "var(--text)"
};

const statusBadge: CSSProperties = {
  fontSize: "0.62rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  color: "var(--success-bright)"
};

export function RightSidebar({ onSetInput }: RightSidebarProps) {
  const ic = (size: number) => ({ size, strokeWidth: 2 });

  return (
    <aside style={asideShell} aria-label="Command toolbox">
      <div style={{ ...panelStyle, ...toolboxPanel }}>
        <div style={panelHeader}>
          <Command size={14} strokeWidth={2} />
          Toolbox
        </div>
        <div className="cp-right-sidebar-scroll">
          <ToolboxSection title="Projects" icon={<FolderOpen {...ic(15)} />}>
            <ActionBtn icon={<FolderOpen {...ic(15)} />} label="List Projects" cmd="list projects" onClick={onSetInput} />
            <ActionBtn icon={<FolderPlus {...ic(15)} />} label="Create Project" cmd="create project " onClick={onSetInput} />
          </ToolboxSection>

          <ToolboxSection title="Databases" icon={<Database {...ic(15)} />}>
            <ActionBtn icon={<Database {...ic(15)} />} label="List Databases" cmd="list databases" onClick={onSetInput} />
            <ActionBtn icon={<Plus {...ic(15)} />} label="Create Database" cmd="create database tenant_a in proj_" onClick={onSetInput} />
            <ActionBtn icon={<Table {...ic(15)} />} label="List Tables" cmd="list tables" onClick={onSetInput} />
            <ActionBtn icon={<Package {...ic(15)} />} label="Seed Ecommerce" cmd="seed ecommerce" onClick={onSetInput} />
          </ToolboxSection>

          <ToolboxSection title="Environments" icon={<GitBranch {...ic(15)} />}>
            <ActionBtn icon={<GitBranch {...ic(15)} />} label="List Branches" cmd="list branches" onClick={onSetInput} />
            <ActionBtn icon={<Plus {...ic(15)} />} label="Create Branch" cmd="create branch staging" onClick={onSetInput} />
          </ToolboxSection>

          <ToolboxSection title="Edge Functions" icon={<Code {...ic(15)} />}>
            <ActionBtn icon={<Code {...ic(15)} />} label="List Edge Functions" cmd="list edge functions" onClick={onSetInput} />
            <ActionBtn icon={<Rocket {...ic(15)} />} label="Deploy Edge Function" cmd="deploy edge function hello-world" onClick={onSetInput} />
          </ToolboxSection>

          <ToolboxSection title="Governance" icon={<Shield {...ic(15)} />}>
            <ActionBtn icon={<ClipboardList {...ic(15)} />} label="List Requests" cmd="list requests" onClick={onSetInput} />
            <ActionBtn icon={<CheckCircle {...ic(15)} />} label="Approve Request" cmd="approve request " onClick={onSetInput} />
            <ActionBtn icon={<XCircle {...ic(15)} />} label="Reject Request" cmd="reject request " onClick={onSetInput} />
            <ActionBtn icon={<Shield {...ic(15)} />} label="Grant Admin" cmd="grant admin to " onClick={onSetInput} />
          </ToolboxSection>
        </div>
      </div>

      <div style={{ ...panelStyle, flexShrink: 0 }}>
        <div style={panelHeader}>
          <Activity size={14} strokeWidth={2} />
          System status
        </div>
        <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={statusRow}>
            <span style={statusLabel}>MCP Engine</span>
            <span style={statusBadge}>READY</span>
          </div>
          <div style={statusRow}>
            <span style={statusLabel}>Governance</span>
            <span style={statusBadge}>ACTIVE</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
