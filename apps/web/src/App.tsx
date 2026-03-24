import { useEffect, useMemo, useState, useRef, FormEvent } from "react";
import { ThemeToggle } from "../../../packages/ui/src/index.js";
import { User, Send, Bot, TerminalSquare, Settings, Zap, ShieldCheck, Command, Key, Database, Activity, LogOut } from "lucide-react";

interface Suggestion {
  id: string;
  label: string;
  type: 'project' | 'request';
}

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [email, setEmail] = useState("owner@example.com");
  const [displayName, setDisplayName] = useState("Demo Owner");
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem("cp_auth_token") ?? "");
  const [userId, setUserId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("My Organization");
  const [workspaceId, setWorkspaceId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [conversationList, setConversationList] = useState<Array<{ id: string; createdAt: string }>>([]);
  const [projectRef, setProjectRef] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [input, setInput] = useState("");
  
  const [projects, setProjects] = useState<Suggestion[]>([]);
  const [approvals, setApprovals] = useState<Suggestion[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(-1);

  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: "assistant",
      content: "Control Plane initialized. Use @ to mention projects or requests."
    }
  ]);
  const [status, setStatus] = useState("Offline");
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${authToken}`
    }),
    [authToken]
  );

  useEffect(() => {
    if (!authToken) {
      return;
    }
    localStorage.setItem("cp_auth_token", authToken);
  }, [authToken]);

  useEffect(() => {
    const hydrate = async () => {
      if (!authToken) return;
      const res = await fetch("/api/auth/me", { headers: authHeaders });
      if (!res.ok) {
        localStorage.removeItem("cp_auth_token");
        setAuthToken("");
        return;
      }
      const payload = await res.json();
      setUserId(payload.user.id);
      setIsSupabaseConnected(Boolean(payload.integration));
      if (payload.integration?.organizationId) {
        setOrganizationId(payload.integration.organizationId);
      }
      setStatus("Online");
    };
    void hydrate();
  }, [authToken, authHeaders]);

  const login = async () => {
    setStatus("Logging in...");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, displayName })
    });
    if (!res.ok) {
      setStatus("Login failed");
      return;
    }
    const payload = await res.json();
    setAuthToken(payload.token);
    setUserId(payload.user.id);
    setIsSupabaseConnected(Boolean(payload.hasSupabaseIntegration));
    setStatus("Authenticated");
  };

  const logout = async () => {
    if (authToken) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: authHeaders
      });
    }
    localStorage.removeItem("cp_auth_token");
    setAuthToken("");
    setUserId("");
    setWorkspaceId("");
    setConversationId("");
    setConversationList([]);
    setMessages([
      {
        role: "assistant",
        content: "Control Plane initialized. Use @ to mention projects or requests."
      }
    ]);
    setStatus("Offline");
  };

  const connectSupabase = async () => {
    if (!authToken || !accessToken.trim()) return;
    setStatus("Connecting Supabase...");
    const res = await fetch("/api/auth/supabase/connect", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders },
      body: JSON.stringify({
        accessToken,
        organizationId: organizationId || undefined
      })
    });
    const payload = await res.json();
    if (!res.ok) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ Supabase connect failed: ${payload.error ?? "Unknown error"}` }
      ]);
      setStatus("Online");
      return;
    }
    setIsSupabaseConnected(true);
    setOrganizationId(payload.organizationId ?? organizationId);
    setStatus("Online");
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Supabase connected. Organization: ${payload.organizationId}.`
      }
    ]);
  };

  const loadConversationMessages = async (nextConversationId: string) => {
    if (!workspaceId || !nextConversationId) return;
    const response = await fetch(
      `/api/workspaces/${workspaceId}/conversations/${nextConversationId}/messages`,
      { headers: authHeaders }
    );
    if (!response.ok) return;
    const items = await response.json();
    setConversationId(nextConversationId);
    setMessages(items.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })));
  };

  const loadHistory = async (nextWorkspaceId: string) => {
    const res = await fetch(`/api/workspaces/${nextWorkspaceId}/conversations`, { headers: authHeaders });
    if (!res.ok) return;
    const rows = await res.json();
    setConversationList(rows.map((row: { id: string; createdAt: string }) => ({ id: row.id, createdAt: row.createdAt })));
  };

  const bootstrap = async () => {
    if (!authToken) return;
    setStatus("Bootstrapping...");
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders },
      body: JSON.stringify({ name: workspaceName })
    });
    if (!res.ok) { setStatus("Error"); return; }
    const ws = await res.json();
    setWorkspaceId(ws.id);
    const cRes = await fetch(`/api/workspaces/${ws.id}/conversations`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders },
      body: JSON.stringify({ channel: "web" })
    });
    const c = await cRes.json();
    setConversationId(c.id);
    await loadHistory(ws.id);
    setStatus("Online");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setInput(val);

    const textBeforeCursor = val.slice(0, pos);
    const lastAt = textBeforeCursor.lastIndexOf("@");
    
    if (lastAt >= 0) {
      const query = textBeforeCursor.slice(lastAt + 1);
      if (!query.includes(" ")) {
        setMentionQuery(query.toLowerCase());
        setMentionIndex(lastAt);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
    setMentionIndex(-1);
  };

  const selectMention = (s: Suggestion) => {
    if (mentionIndex < 0) return;
    
    const prefix = input.slice(0, mentionIndex);
    const textAfterAt = input.slice(mentionIndex);
    const firstSpaceAfterAt = textAfterAt.indexOf(" ");
    
    // Replace from @ to next space or end of string
    const suffix = firstSpaceAfterAt === -1 ? "" : textAfterAt.slice(firstSpaceAfterAt);
    
    setInput(`${prefix}${s.id}${suffix} `);
    setShowMentions(false);
    setMentionIndex(-1);
    
    // Focus back and move cursor - setTimeout to let React update first
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const sendMessage = async (e?: FormEvent, overrideInput?: string) => {
    e?.preventDefault();
    const finalInput = overrideInput ?? input;
    if (!workspaceId || !conversationId || !finalInput.trim() || !authToken) return;
    
    setStatus("Running...");
    if (!overrideInput) setInput("");
    setShowMentions(false);
    
    setMessages((prev) => [...prev, { role: "user", content: finalInput }]);

    const response = await fetch(
      `/api/workspaces/${workspaceId}/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders },
        body: JSON.stringify({
          content: finalInput,
          projectRef: projectRef || undefined,
          databaseName: databaseName || undefined
        })
      }
    );

    const payload = await response.json();

    if (!response.ok) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ Fault: ${payload.error ?? "Failed."}` }]);
      setStatus("Online");
      return;
    }

    // UPDATE SMART STATE
    if (payload.intent?.action === "list_projects" && payload.result?.ok) {
      let projectData = payload.result.data;
      
      // Handle nested MCP tool output (common in real MCP responses)
      if (projectData?.content?.[0]?.text) {
        try {
          projectData = JSON.parse(projectData.content[0].text);
        } catch (e) {
          console.error("Failed to parse project list from text content", e);
        }
      }

      if (Array.isArray(projectData)) {
        setProjects(projectData.map((p: any) => ({ 
          id: p.id || p.projectRef || p.ref || "unknown", 
          label: p.name || "Untitled Project", 
          type: 'project' 
        })));
      }
    }
    
    if (payload.intent?.action === "list_approvals" && payload.result?.ok) {
        // Similar parsing for approvals if needed
    }
    // Simple parsing for approvals if they are list format
    if (payload.assistantMessage?.content.includes("Pending Approvals:")) {
       const lines = payload.assistantMessage.content.split("\n").filter((l:string) => l.startsWith("- ["));
       const parsed = lines.map((l:string) => {
          const id = l.match(/\[(.*?)\]/)?.[1] || "";
          const cmd = l.split("] ")[1]?.split(" by")[0] || "Request";
          return { id, label: cmd, type: 'request' };
       });
       setApprovals(parsed);
    }

    setMessages(prev => {
      const withoutOptimistic = prev.slice(0, prev.length - 1);
      return [...withoutOptimistic, payload.userMessage, payload.assistantMessage];
    });
    await loadHistory(workspaceId);
    setStatus("Online");
  };

  const filteredSuggestions = useMemo(() => {
    const all = [...projects, ...approvals];
    return all.filter(s => 
      (s.id?.toLowerCase().includes(mentionQuery) || false) || 
      (s.label?.toLowerCase().includes(mentionQuery) || false)
    );
  }, [projects, approvals, mentionQuery]);

  const isOnline = status === "Online";

  if (!authToken) {
    return (
      <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "var(--bg)", padding: "24px" }}>
        <section style={{ ...panelStyle, width: "440px", boxShadow: "var(--shadow-lg)" }}>
          <div style={panelHeader}><Settings size={12} /> LOGIN</div>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h2 style={{ margin: "0 0 4px 0", fontSize: "1rem" }}>Supabase Chat Control Plane</h2>
            <label style={fieldLabel}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} style={smallInput} />
            <label style={fieldLabel}>Display Name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={smallInput} />
            <button onClick={login} style={initializeButton}>Sign In</button>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              Multi-tenant mode: each login gets isolated workspace memberships and chat history.
            </span>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main style={{ display: "flex", height: "100vh", padding: "20px", gap: "18px", backgroundColor: "var(--bg)", overflow: "hidden" }}>
      
      {/* LEFT */}
      <aside style={{ width: "280px", minWidth: "280px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", paddingRight: "6px" }}>
        <div style={{...panelStyle, padding: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", minHeight: "64px"}}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <div style={{ background: "var(--text)", color: "var(--bg)", borderRadius: "6px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TerminalSquare size={16} />
            </div>
            <h1 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>CONTROL PLANE</h1>
          </div>
          <ThemeToggle theme={theme} onToggle={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />
        </div>

        <div style={panelStyle}>
          <div style={panelHeader}><Settings size={12} /> CONNECTION</div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
             <div style={fieldGroup}>
                <label style={fieldLabel}>User ID</label>
                <input value={userId} readOnly style={smallInput} />
             </div>
             <div style={fieldGroup}>
                <label style={fieldLabel}>Workspace Name</label>
                <input value={workspaceName} onChange={e=>setWorkspaceName(e.target.value)} style={smallInput} />
             </div>
             <button 
                onClick={bootstrap} 
                disabled={status === "Bootstrapping..." || isOnline}
                style={{...initializeButton, opacity: (status === 'Bootstrapping...' || isOnline) ? 0.5 : 1}}
             >
                <Zap size={14} fill="currentColor" />
                {status === "Bootstrapping..." ? "INITIALIZING..." : isOnline ? "CONNECTED" : "Initialize"}
             </button>
             <button onClick={logout} style={{ ...tagStyle, marginTop: "4px", width: "100%", padding: "8px" }}>
              <LogOut size={12} style={{ marginRight: "6px", verticalAlign: "middle" }} /> logout
             </button>
          </div>
          <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.65rem", fontWeight: 700 }}>
             <span style={{ color: "var(--muted)" }}>STATUS</span>
             <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: isOnline ? "#10b981" : "var(--muted)" }} />
                <span style={{ opacity: 0.8 }}>{status.toUpperCase()}</span>
             </div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={panelHeader}><Key size={12} /> SUPABASE LINK</div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
             <div style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.4 }}>
              Profile &gt; Access Tokens se token create karo, then yahan paste karke connect karo.
             </div>
             <div style={fieldGroup}><label style={fieldLabel}>Access Token</label><input value={accessToken} onChange={e=>setAccessToken(e.target.value)} style={smallInput} placeholder="sbp_xxx" /></div>
             <div style={fieldGroup}><label style={fieldLabel}>Org ID (optional)</label><input value={organizationId} onChange={e=>setOrganizationId(e.target.value)} style={smallInput} /></div>
             <button onClick={connectSupabase} disabled={!accessToken.trim()} style={initializeButton}>Connect Supabase</button>
             <div style={{ fontSize: "0.7rem", color: isSupabaseConnected ? "#10b981" : "var(--muted)" }}>
              {isSupabaseConnected ? "Connected" : "Not connected"}
             </div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={panelHeader}><Database size={12} /> ENVIRONMENT</div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={fieldGroup}><label style={fieldLabel}>Project Ref</label><input value={projectRef} onChange={e=>setProjectRef(e.target.value)} style={smallInput} /></div>
            <div style={fieldGroup}><label style={fieldLabel}>Schema</label><input value={databaseName} onChange={e=>setDatabaseName(e.target.value)} style={smallInput} /></div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={panelHeader}><Activity size={12} /> HISTORY</div>
          <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", maxHeight: "320px" }}>
            {conversationList.length === 0 && <span style={{fontSize: "0.7rem", color:"var(--muted)"}}>No chats yet.</span>}
            {conversationList.map((c) => (
              <button
                key={c.id}
                onClick={() => loadConversationMessages(c.id)}
                  style={{
                    ...historyBtnStyle,
                    background: conversationId === c.id ? "var(--surface-hover)" : "transparent",
                    color: conversationId === c.id ? "var(--text)" : "var(--muted)",
                    borderColor: conversationId === c.id ? "var(--border)" : "transparent"
                  }}
              >
                {c.id.slice(0, 8)}... {new Date(c.createdAt).toLocaleTimeString()}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* CENTER */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column", ...panelStyle, backgroundColor: "var(--surface)", position: "relative", boxShadow: "var(--shadow-md)" }}>
        <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg)", opacity: 0.92 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>Chat Workspace</div>
            {workspaceId && <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{workspaceId.slice(0, 10)}...</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.7rem", fontWeight: 700, color: isOnline ? "#10b981" : "var(--muted)" }}>
             <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: isOnline ? "#10b981" : "var(--muted)" }} />
             {status.toUpperCase()}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "26px", display: "flex", flexDirection: "column", gap: "20px", background: "linear-gradient(180deg, transparent 0%, rgba(127,127,127,0.03) 100%)" }}>
          {messages.map((m, i) => (
             <div key={i} style={{ display: "flex", gap: "12px", maxWidth: m.role === 'assistant' ? "90%" : "82%", alignSelf: m.role === 'assistant' ? "flex-start" : "flex-end", flexDirection: m.role === 'assistant' ? "row" : "row-reverse" }}>
               <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: m.role==='assistant' ? "var(--bg)" : "var(--text)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: m.role==='assistant' ? "var(--text)" : "var(--bg)", flexShrink: 0 }}>
                 {m.role==='assistant' ? <Bot size={16}/> : <User size={16}/>}
               </div>
               <div style={{ background: m.role==='assistant' ? "rgba(127,127,127,0.06)" : "var(--bg)", color: "var(--text)", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--border)", fontSize: "0.9rem", lineHeight: 1.45, fontFamily: m.role==='assistant' ? "var(--font-mono)" : "inherit", whiteSpace: "pre-wrap", boxShadow: "var(--shadow-sm)" }}>
                 {m.content}
               </div>
             </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* INPUT AREA WITH MENTIONS */}
        <div style={{ padding: "18px 20px 20px", borderTop: "1px solid var(--border)", background: "var(--bg)", position: "relative" }}>
           
           {showMentions && filteredSuggestions.length > 0 && (
             <div style={{ position: "absolute", bottom: "100%", left: "20px", width: "280px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", boxShadow: "var(--shadow-lg)", marginBottom: "8px", zIndex: 1000, overflow: "hidden" }}>
                <div style={{ padding: "8px 12px", fontSize: "0.65rem", fontWeight: 800, color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>SUGGESTIONS</div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                   {filteredSuggestions.map(s => (
                      <div key={s.id} onClick={() => selectMention(s)} style={{ padding: "10px 12px", fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", transition: "all 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                         {s.type === 'project' ? <Database size={12} /> : <ShieldCheck size={12} />}
                         <div style={{display: "flex", flexDirection: "column"}}>
                            <span style={{fontWeight:500}}>{s.label}</span>
                            <span style={{fontSize: "0.7rem", opacity: 0.5}}>{s.id}</span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           )}

           <form onSubmit={sendMessage} style={{ position: "relative", maxWidth: "860px", margin: "0 auto", display: "flex", gap: "10px" }}>
              <div style={{ flex: 1, position: "relative" }}>
                 <span style={{ position: "absolute", left: "14px", top: "12px", color: "var(--muted)", fontWeight: 700 }}>$</span>
                 <input ref={inputRef} value={input} onChange={handleInputChange} disabled={!workspaceId} placeholder="Type @ to mention..." style={mainInput} />
              </div>
              <button type="submit" disabled={!workspaceId || !input.trim()} style={sendButton}><Send size={18} /></button>
           </form>
           
           <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "12px" }}>
              <button onClick={() => sendMessage(undefined, "list projects")} style={tagStyle}>list projects</button>
              <button onClick={() => sendMessage(undefined, "list pending")} style={tagStyle}>list requests</button>
           </div>
        </div>
      </section>

      {/* RIGHT */}
      <aside style={{ width: "280px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", paddingRight: "6px" }}>
        <div style={{...panelStyle, flex: 1, display: "flex", flexDirection: "column"}}>
          <div style={panelHeader}><Command size={12} /> TOOLBOX</div>
          <div style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={toolboxGroupTitle}>Projects</span>
            <ActionBtn label="List Projects" cmd="list projects" onClick={setInput} />
            <ActionBtn label="Create Project" cmd="create project " onClick={setInput} />
            <span style={toolboxGroupTitle}>Databases</span>
            <ActionBtn label="List Databases" cmd="list databases" onClick={setInput} />
            <ActionBtn label="Create Database" cmd="create database tenant_a in proj_" onClick={setInput} />
            <ActionBtn label="List Tables" cmd="list tables" onClick={setInput} />
            <span style={toolboxGroupTitle}>Governance</span>
            <ActionBtn label="List Requests" cmd="list requests" onClick={setInput} />
            <ActionBtn label="Approve Request" cmd="approve request " onClick={setInput} />
            <ActionBtn label="Reject Request" cmd="reject request " onClick={setInput} />
            <ActionBtn label="Grant Admin" cmd="grant admin to " onClick={setInput} />
          </div>
        </div>
        <div style={panelStyle}>
          <div style={panelHeader}><Activity size={12} /> SYSTEM STATUS</div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                <span style={{color:"var(--muted)"}}>MCP Engine</span>
                <span style={{color: "#10b981", fontWeight: 700}}>READY</span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                <span style={{color:"var(--muted)"}}>Governance</span>
                <span style={{color: "#10b981", fontWeight: 700}}>ACTIVE</span>
             </div>
          </div>
        </div>
      </aside>
    </main>
  );
}

function ActionBtn({ label, cmd, onClick }: { label: string, cmd: string, onClick: any }) {
  return (
    <button onClick={() => onClick(cmd)} style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: "10px", border: "1px solid transparent", background: "transparent", color: "var(--text)", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", transition: "all 0.12s" }} onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.borderColor = "var(--border)"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
      {label}
    </button>
  );
}

const panelStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", boxShadow: "var(--shadow-sm)", overflow: "hidden" as const };
const panelHeader = { display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: "0.65rem", fontWeight: 800, color: "var(--muted)", letterSpacing: "0.1em" };
const fieldGroup = { display: "flex", flexDirection: "column" as const, gap: "4px" };
const fieldLabel = { fontSize: "0.65rem", fontWeight: 700, color: "var(--muted)" };
const smallInput = { background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", padding: "9px 10px", fontSize: "0.8rem", outline: "none" };
const mainInput = { width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", color: "var(--text)", padding: "11px 12px 11px 30px", fontSize: "0.9rem", fontFamily: "var(--font-mono)", outline: "none" };
const sendButton = { background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: "10px", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };
const tagStyle = { background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.65rem", padding: "4px 10px", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-mono)" };
const initializeButton = { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "11px", borderRadius: "10px", background: "var(--text)", color: "var(--bg)", border: "none", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", marginTop: "4px" };
const toolboxGroupTitle = { marginTop: "8px", fontSize: "0.65rem", color: "var(--muted)", fontWeight: 700 };
const historyBtnStyle = { ...tagStyle, textAlign: "left" as const, width: "100%", padding: "8px 10px", transition: "all 0.12s" };
