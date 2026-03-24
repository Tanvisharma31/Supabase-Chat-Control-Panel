import { Bot, Database, Send, ShieldCheck, User } from "lucide-react";
import type { CSSProperties } from "react";
import { ChangeEvent, FormEvent, RefObject } from "react";
import { AssistantMessageContent } from "./AssistantMessageContent.js";
import { ChatMessage, Suggestion } from "./types.js";
import { mainInput, panelStyle, sendButton, tagStyle } from "./styles.js";

interface ChatPanelProps {
  workspaceId: string;
  conversationId: string;
  sessionPreview: string;
  status: string;
  isOnline: boolean;
  messages: ChatMessage[];
  bottomRef: RefObject<HTMLDivElement>;
  inputRef: RefObject<HTMLInputElement>;
  input: string;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e?: FormEvent, overrideInput?: string) => void;
  showMentions: boolean;
  filteredSuggestions: Suggestion[];
  onSelectMention: (s: Suggestion) => void;
}

const outerShell: CSSProperties = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  backgroundColor: "var(--surface)",
  position: "relative",
  boxShadow: "var(--shadow-md)"
};

const headerBar: CSSProperties = {
  flexShrink: 0,
  padding: "12px 18px",
  borderBottom: "1px solid var(--border)",
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: "12px",
  background: "var(--bg)",
  boxSizing: "border-box"
};

const composerShell: CSSProperties = {
  flexShrink: 0,
  padding: "14px 18px 16px",
  borderTop: "1px solid var(--border)",
  background: "var(--bg)",
  position: "relative",
  boxSizing: "border-box"
};

const contentRail: CSSProperties = {
  width: "100%",
  maxWidth: "920px",
  margin: "0 auto",
  padding: "18px 20px 28px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: "14px"
};

export function ChatPanel({
  workspaceId,
  conversationId,
  sessionPreview,
  status,
  isOnline,
  messages,
  bottomRef,
  inputRef,
  input,
  onInputChange,
  onSubmit,
  showMentions,
  filteredSuggestions,
  onSelectMention
}: ChatPanelProps) {
  const metaParts: string[] = [];
  if (workspaceId) metaParts.push(`ws:${workspaceId.slice(0, 8)}`);
  if (conversationId) metaParts.push(`chat:${conversationId.slice(0, 8)}`);
  if (sessionPreview) metaParts.push(`session:${sessionPreview}`);

  const canType = Boolean(workspaceId && conversationId);

  return (
    <section style={{ ...panelStyle, ...outerShell }} aria-label="Control plane terminal">
      <header style={headerBar}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 800, letterSpacing: "0.02em", color: "var(--text)" }}>Terminal</span>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--muted)"
              }}
            >
              Control plane
            </span>
          </div>
          <div
            style={{
              fontSize: "0.68rem",
              fontFamily: "var(--font-mono)",
              color: "var(--muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%"
            }}
            title={metaParts.join(" · ")}
          >
            {metaParts.length > 0 ? metaParts.join(" · ") : "Select a workspace and chat to run commands."}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.68rem",
            fontWeight: 800,
            color: isOnline ? "#10b981" : "var(--muted)",
            whiteSpace: "nowrap",
            flexShrink: 0
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isOnline ? "#10b981" : "var(--muted)" }} aria-hidden />
          {status.toUpperCase()}
        </div>
      </header>

      <div className="cp-chat-scroll">
        <div style={contentRail}>
          {messages.map((m, i) => {
            const isAssistant = m.role === "assistant";
            return (
              <div
                key={`${i}-${m.role}`}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: isAssistant ? "flex-start" : "flex-end"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: isAssistant ? "row" : "row-reverse",
                    gap: "11px",
                    alignItems: "flex-start",
                    maxWidth: isAssistant ? "100%" : "min(88%, 640px)",
                    width: isAssistant ? "100%" : "auto"
                  }}
                >
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      background: isAssistant ? "var(--surface)" : "var(--text)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isAssistant ? "var(--text)" : "var(--bg)",
                      flexShrink: 0,
                      marginTop: "2px"
                    }}
                    aria-hidden
                  >
                    {isAssistant ? <Bot size={17} strokeWidth={2} /> : <User size={17} strokeWidth={2} />}
                  </div>
                  <div
                    style={{
                      flex: isAssistant ? "1" : undefined,
                      minWidth: 0,
                      background: isAssistant ? "color-mix(in srgb, var(--surface) 55%, var(--bg))" : "var(--bg)",
                      color: "var(--text)",
                      padding: isAssistant ? "12px 14px" : "10px 14px",
                      borderRadius: "12px",
                      border: "1px solid var(--border)",
                      fontSize: isAssistant ? "0.8125rem" : "0.84rem",
                      lineHeight: 1.5,
                      fontFamily: isAssistant ? "var(--font-sans)" : "inherit",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      boxShadow: "var(--shadow-sm)",
                      borderLeft: isAssistant ? "3px solid color-mix(in srgb, var(--accent) 70%, var(--border))" : undefined
                    }}
                  >
                    {isAssistant ? <AssistantMessageContent text={m.content} /> : m.content}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div style={composerShell}>
        {showMentions && filteredSuggestions.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: "18px",
              right: "18px",
              maxWidth: "360px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              boxShadow: "var(--shadow-lg)",
              marginBottom: "10px",
              zIndex: 50,
              overflow: "hidden"
            }}
          >
            <div style={{ padding: "8px 12px", fontSize: "0.62rem", fontWeight: 800, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>SUGGESTIONS</div>
            <div className="cp-dropdown-scroll">
              {filteredSuggestions.map((s) => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectMention(s)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectMention(s);
                    }
                  }}
                  style={{
                    padding: "10px 12px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {s.type === "project" ? <Database size={12} /> : <ShieldCheck size={12} />}
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontWeight: 600 }}>{s.label}</span>
                    <span style={{ fontSize: "0.7rem", opacity: 0.55, fontFamily: "var(--font-mono)" }}>{s.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          style={{
            width: "100%",
            maxWidth: "920px",
            margin: "0 auto",
            display: "flex",
            gap: "10px",
            alignItems: "stretch",
            boxSizing: "border-box"
          }}
        >
          <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                pointerEvents: "none"
              }}
            >
              $
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={onInputChange}
              disabled={!canType}
              placeholder={canType ? "Run a command… (@ to mention)" : "Pick a workspace and chat first…"}
              style={{ ...mainInput, width: "100%", boxSizing: "border-box" }}
            />
          </div>
          <button type="submit" disabled={!canType || !input.trim()} style={sendButton} aria-label="Send">
            <Send size={18} />
          </button>
        </form>

        <div
          style={{
            width: "100%",
            maxWidth: "920px",
            margin: "12px auto 0",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
            justifyContent: "flex-start",
            boxSizing: "border-box"
          }}
        >
          <button type="button" disabled={!canType} onClick={() => onSubmit(undefined, "connect supabase")} style={{ ...tagStyle, opacity: canType ? 1 : 0.45 }}>
            connect supabase
          </button>
          <button type="button" disabled={!canType} onClick={() => onSubmit(undefined, "list projects")} style={{ ...tagStyle, opacity: canType ? 1 : 0.45 }}>
            list projects
          </button>
          <button type="button" disabled={!canType} onClick={() => onSubmit(undefined, "list pending")} style={{ ...tagStyle, opacity: canType ? 1 : 0.45 }}>
            list requests
          </button>
        </div>
      </div>
    </section>
  );
}
