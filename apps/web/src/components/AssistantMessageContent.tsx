import type { CSSProperties, ReactNode } from "react";

type McpEnvelope = {
  content?: Array<{ type?: string; text?: string }>;
  isError?: boolean;
};

const tryParseJson = (s: string): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

/** Unwrap MCP tool result: optional isError + content[0].text JSON string */
const unwrapMcpPayload = (parsed: unknown): { isError: boolean; body: unknown } => {
  if (!parsed || typeof parsed !== "object") {
    return { isError: false, body: parsed };
  }
  const o = parsed as McpEnvelope;
  if (o.isError && o.content?.[0]?.text != null) {
    return { isError: true, body: o.content[0].text };
  }
  const text = o.content?.[0]?.text;
  if (typeof text === "string") {
    const inner = tryParseJson(text);
    if (inner !== null) {
      return { isError: false, body: inner };
    }
    return { isError: false, body: text };
  }
  return { isError: false, body: parsed };
};

const labelRow: CSSProperties = {
  fontSize: "0.62rem",
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--muted)",
  marginBottom: "10px",
  fontFamily: "var(--font-sans)"
};

const errorBox: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "0.8125rem",
  lineHeight: 1.5,
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid color-mix(in srgb, #ef4444 45%, var(--border))",
  background: "color-mix(in srgb, #ef4444 12%, var(--surface))",
  color: "var(--text)"
};

const successBox: CSSProperties = {
  ...errorBox,
  border: "1px solid color-mix(in srgb, var(--success-bright) 40%, var(--border))",
  background: "var(--success-soft)"
};

const tableWrap: CSSProperties = {
  overflowX: "auto",
  borderRadius: "8px",
  border: "1px solid var(--border)",
  fontFamily: "var(--font-sans)",
  fontSize: "0.78rem"
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontWeight: 700,
  background: "var(--bg)",
  borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap"
};

const td: CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "top"
};

const statusPill = (status: string): CSSProperties => ({
  display: "inline-block",
  fontSize: "0.65rem",
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: "999px",
  background:
    /healthy|active/i.test(status)
      ? "var(--success-soft)"
      : "color-mix(in srgb, var(--muted) 18%, transparent)",
  color: /healthy|active/i.test(status) ? "var(--success-bright)" : "var(--muted)"
});

const chipsWrap: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  fontFamily: "var(--font-sans)"
};

const chip: CSSProperties = {
  fontSize: "0.72rem",
  padding: "4px 10px",
  borderRadius: "6px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  fontFamily: "var(--font-mono)",
  color: "var(--text)"
};

const monoPre: CSSProperties = {
  margin: 0,
  maxHeight: "min(320px, 50vh)",
  overflow: "auto",
  fontSize: "0.72rem",
  lineHeight: 1.45,
  fontFamily: "var(--font-mono)",
  padding: "10px",
  borderRadius: "8px",
  background: "var(--bg)",
  border: "1px solid var(--border)"
};

const ErrorCallout = ({ children }: { children: ReactNode }) => (
  <div style={errorBox} role="alert">
    {children}
  </div>
);

const renderProjects = (rows: Record<string, unknown>[]) => (
  <>
    <div style={labelRow}>Projects</div>
    <div style={tableWrap}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Ref</th>
            <th style={th}>Region</th>
            <th style={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            const ref = String(p.ref ?? p.id ?? "");
            const st = String(p.status ?? "—");
            return (
              <tr key={`${ref}-${i}`}>
                <td style={td}>{String(p.name ?? "—")}</td>
                <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>{ref || "—"}</td>
                <td style={td}>{String(p.region ?? "—")}</td>
                <td style={td}>
                  <span style={statusPill(st)}>{st}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </>
);

const renderNameChips = (rows: Array<{ name?: string }>, title: string) => {
  const names = rows.map((r) => r.name).filter(Boolean) as string[];
  return (
    <>
      <div style={labelRow}>{title}</div>
      <div style={chipsWrap}>
        {names.map((n) => (
          <span key={n} style={chip}>
            {n}
          </span>
        ))}
      </div>
      <div style={{ ...labelRow, marginTop: "10px", marginBottom: 0, opacity: 0.85 }}>
        {names.length} item{names.length === 1 ? "" : "s"}
      </div>
    </>
  );
};

const renderBranchRows = (rows: unknown[]) => (
  <>
    <div style={labelRow}>Branches</div>
    <div style={tableWrap}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Id</th>
            <th style={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((raw, i) => {
            const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
            return (
              <tr key={i}>
                <td style={td}>{String(r.name ?? "—")}</td>
                <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>{String(r.id ?? "—")}</td>
                <td style={td}>
                  {r.status != null ? <span style={statusPill(String(r.status))}>{String(r.status)}</span> : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </>
);

const renderExecutedBody = (command: string, rawParsed: unknown): ReactNode => {
  const { isError, body } = unwrapMcpPayload(rawParsed);

  if (isError) {
    return <ErrorCallout>{String(body)}</ErrorCallout>;
  }

  if (typeof body === "string" && body.includes("Supabase API Error")) {
    return <ErrorCallout>{body}</ErrorCallout>;
  }

  if (command === "list_projects" && Array.isArray(body)) {
    return renderProjects(body as Record<string, unknown>[]);
  }

  if ((command === "list_tables" || command === "list_databases") && Array.isArray(body)) {
    const allNamed = body.every((x) => x && typeof x === "object" && typeof (x as { name?: string }).name === "string");
    if (allNamed) {
      return renderNameChips(body as { name: string }[], command === "list_tables" ? "Tables" : "Schemas / databases");
    }
  }

  if (command === "list_branches" && Array.isArray(body)) {
    return renderBranchRows(body);
  }

  if (command === "list_edge_functions" && Array.isArray(body)) {
    const names = body
      .map((x) => (x && typeof x === "object" ? (x as { name?: string; slug?: string }).name ?? (x as { slug?: string }).slug : null))
      .filter(Boolean) as string[];
    if (names.length > 0) {
      return renderNameChips(names.map((name) => ({ name })), "Edge functions");
    }
  }

  if (command === "delete_project" && body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    if (o.deleted === true) {
      const ref = String(o.project_id ?? o.projectRef ?? "");
      return (
        <div style={successBox}>
          <strong>Project deleted</strong>
          {ref ? (
            <>
              {": "}
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>{ref}</span>
            </>
          ) : null}
          . Supabase may take a few minutes to finish teardown.
        </div>
      );
    }
  }

  return <pre style={monoPre}>{JSON.stringify(body, null, 2)}</pre>;
};

const renderPlain = (text: string): ReactNode => {
  const fail = text.match(/^Failed ([a-z_]+):\s*(.*)$/);
  if (fail) {
    const [, cmd, msg] = fail;
    return (
      <>
        <div style={labelRow}>Failed · {cmd}</div>
        <ErrorCallout>{msg}</ErrorCallout>
      </>
    );
  }

  const exec = text.match(/^Executed ([a-z_]+):\s*(.*)$/s);
  if (exec) {
    const [, command, jsonPart] = exec;
    const parsed = tryParseJson(jsonPart.trim());
    if (parsed === null) {
      return (
        <>
          <div style={labelRow}>Result · {command}</div>
          <pre style={monoPre}>{jsonPart}</pre>
        </>
      );
    }
    return (
      <>
        <div style={labelRow}>Result · {command.replaceAll("_", " ")}</div>
        {renderExecutedBody(command, parsed)}
      </>
    );
  }

  return text;
};

export function AssistantMessageContent({ text }: { text: string }) {
  return <div style={{ fontFamily: "var(--font-sans)", width: "100%" }}>{renderPlain(text)}</div>;
}
