import { useEffect, useMemo, useState, useRef, FormEvent, ChangeEvent } from "react";
import { apiUrl } from "./apiBase.js";
import { ChatPanel } from "./components/ChatPanel.js";
import { LeftSidebar } from "./components/LeftSidebar.js";
import { LoginView } from "./components/LoginView.js";
import { RightSidebar } from "./components/RightSidebar.js";
import { ChatMessage, ConversationListItem, Suggestion, WorkspaceOption } from "./components/types.js";

const WELCOME_MESSAGE = `Welcome to the control plane.

Commands:
- create project <name>
- delete project [<project_ref>] (needs approval; uses sidebar ref if omitted)
- list projects
- create database <db_name> in <project_ref>
- list databases
- list tables
- seed ecommerce
- grant admin to <user_id>
- list requests / approve request <id> / reject request <id>

Set Project Ref and Schema (logical database) in the sidebar before running SQL.
Use @ to mention projects or pending requests.`;

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [email, setEmail] = useState("owner@example.com");
  const [displayName, setDisplayName] = useState("Demo Owner");
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem("cp_auth_token") ?? "");
  const [userId, setUserId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("My Organization");
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [conversationList, setConversationList] = useState<ConversationListItem[]>([]);
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

  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: WELCOME_MESSAGE }]);
  const [sessionPreview, setSessionPreview] = useState("");
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

  const loadHistory = async (nextWorkspaceId: string) => {
    const res = await fetch(apiUrl(`/workspaces/${nextWorkspaceId}/conversations`), { headers: authHeaders });
    if (!res.ok) return;
    const rows = await res.json();
    setConversationList(rows.map((row: { id: string; createdAt: string }) => ({ id: row.id, createdAt: row.createdAt })));
  };

  const loadConversationMessages = async (wsId: string, nextConversationId: string) => {
    if (!wsId || !nextConversationId) return;
    const response = await fetch(
      apiUrl(`/workspaces/${wsId}/conversations/${nextConversationId}/messages`),
      { headers: authHeaders }
    );
    if (!response.ok) return;
    const items = await response.json();
    setConversationId(nextConversationId);
    setMessages(
      items.length > 0
        ? items.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }))
        : [{ role: "assistant", content: WELCOME_MESSAGE }]
    );
  };

  const startNewConversation = async (wsId: string) => {
    const cRes = await fetch(apiUrl(`/workspaces/${wsId}/conversations`), {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders },
      body: JSON.stringify({ channel: "web" })
    });
    if (!cRes.ok) return;
    const c = await cRes.json();
    setConversationId(c.id);
    await loadHistory(wsId);
    setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
  };

  useEffect(() => {
    const hydrate = async () => {
      if (!authToken) return;
      const res = await fetch(apiUrl("/auth/me"), { headers: authHeaders });
      if (!res.ok) {
        localStorage.removeItem("cp_auth_token");
        setAuthToken("");
        return;
      }
      const payload = await res.json();
      setUserId(payload.user.id);
      setSessionPreview(payload.session?.id ?? authToken.slice(0, 8));

      const workspaceRes = await fetch(apiUrl("/workspaces"), { headers: authHeaders });
      if (workspaceRes.ok) {
        const rows = await workspaceRes.json();
        setWorkspaces(rows.map((row: { id: string; name: string }) => ({ id: row.id, name: row.name })));
        if (rows[0]?.id) {
          const wid = rows[0].id as string;
          setWorkspaceId(wid);
          const meWs = await fetch(`${apiUrl("/auth/me")}?workspaceId=${encodeURIComponent(wid)}`, {
            headers: authHeaders
          });
          if (meWs.ok) {
            const scoped = await meWs.json();
            setIsSupabaseConnected(Boolean(scoped.integration));
            if (scoped.integration?.organizationId) {
              setOrganizationId(scoped.integration.organizationId);
            }
          }
          await loadHistory(wid);
          const convRes = await fetch(apiUrl(`/workspaces/${wid}/conversations`), { headers: authHeaders });
          if (convRes.ok) {
            const convRows = await convRes.json();
            if (convRows[0]?.id) {
              await loadConversationMessages(wid, convRows[0].id as string);
            } else {
              await startNewConversation(wid);
            }
          }
        }
      }
      setStatus("Online");
    };
    void hydrate();
  }, [authToken, authHeaders]);

  const login = async () => {
    setStatus("Logging in...");
    const res = await fetch(apiUrl("/auth/login"), {
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
    setSessionPreview(String(payload.token).slice(0, 8));
    setIsSupabaseConnected(Boolean(payload.hasSupabaseIntegration));
    setStatus("Authenticated");
  };

  const logout = async () => {
    if (authToken) {
      await fetch(apiUrl("/auth/logout"), {
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
    setMessages([{ role: "assistant", content: WELCOME_MESSAGE }]);
    setSessionPreview("");
    setStatus("Offline");
  };

  const connectSupabase = async () => {
    if (!authToken || !accessToken.trim() || !workspaceId) return;
    setStatus("Connecting Supabase...");
    const res = await fetch(apiUrl("/auth/supabase/connect"), {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders },
      body: JSON.stringify({
        accessToken,
        organizationId: organizationId || undefined,
        workspaceId
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

  const bootstrap = async () => {
    if (!authToken) return;
    setStatus("Bootstrapping...");
    const res = await fetch(apiUrl("/workspaces"), {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders },
      body: JSON.stringify({ name: workspaceName })
    });
    if (!res.ok) { setStatus("Error"); return; }
    const ws = await res.json();
    setWorkspaceId(ws.id);
    setWorkspaces((prev) => [{ id: ws.id, name: ws.name }, ...prev.filter((item) => item.id !== ws.id)]);
    const cRes = await fetch(apiUrl(`/workspaces/${ws.id}/conversations`), {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders },
      body: JSON.stringify({ channel: "web" })
    });
    const c = await cRes.json();
    await loadHistory(ws.id);
    await loadConversationMessages(ws.id, c.id);
    setStatus("Online");
  };

  const switchWorkspace = async (nextWorkspaceId: string) => {
    if (!nextWorkspaceId) return;
    setWorkspaceId(nextWorkspaceId);
    setConversationId("");
    setMessages([{ role: "assistant", content: "Switching workspace…" }]);
    const meWs = await fetch(`${apiUrl("/auth/me")}?workspaceId=${encodeURIComponent(nextWorkspaceId)}`, {
      headers: authHeaders
    });
    if (meWs.ok) {
      const scoped = await meWs.json();
      setIsSupabaseConnected(Boolean(scoped.integration));
      if (scoped.integration?.organizationId) {
        setOrganizationId(scoped.integration.organizationId);
      }
    }
    await loadHistory(nextWorkspaceId);
    const convRes = await fetch(apiUrl(`/workspaces/${nextWorkspaceId}/conversations`), { headers: authHeaders });
    if (!convRes.ok) return;
    const convRows = await convRes.json();
    if (convRows[0]?.id) {
      await loadConversationMessages(nextWorkspaceId, convRows[0].id as string);
    } else {
      await startNewConversation(nextWorkspaceId);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
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
      apiUrl(`/workspaces/${workspaceId}/conversations/${conversationId}/messages`),
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
      <LoginView
        email={email}
        displayName={displayName}
        onEmailChange={setEmail}
        onDisplayNameChange={setDisplayName}
        onLogin={() => {
          void login();
        }}
      />
    );
  }

  return (
    <main
      style={{
        display: "flex",
        alignItems: "stretch",
        minHeight: 0,
        height: "100vh",
        maxHeight: "100vh",
        boxSizing: "border-box",
        padding: "20px",
        gap: "18px",
        backgroundColor: "var(--bg)",
        overflow: "hidden"
      }}
    >
      
      <LeftSidebar
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        userId={userId}
        workspaceName={workspaceName}
        onWorkspaceNameChange={setWorkspaceName}
        workspaceId={workspaceId}
        workspaces={workspaces}
        status={status}
        isOnline={isOnline}
        onSwitchWorkspace={(value) => {
          void switchWorkspace(value);
        }}
        onBootstrap={() => {
          void bootstrap();
        }}
        onLogout={() => {
          void logout();
        }}
        accessToken={accessToken}
        onAccessTokenChange={setAccessToken}
        organizationId={organizationId}
        onOrganizationIdChange={setOrganizationId}
        isSupabaseConnected={isSupabaseConnected}
        onConnectSupabase={() => {
          void connectSupabase();
        }}
        projectRef={projectRef}
        onProjectRefChange={setProjectRef}
        databaseName={databaseName}
        onDatabaseNameChange={setDatabaseName}
        conversationList={conversationList}
        conversationId={conversationId}
        onLoadConversationMessages={(id) => {
          void loadConversationMessages(workspaceId, id);
        }}
        onNewChat={() => {
          if (workspaceId) void startNewConversation(workspaceId);
        }}
      />

      <ChatPanel
        workspaceId={workspaceId}
        conversationId={conversationId}
        sessionPreview={sessionPreview}
        status={status}
        isOnline={isOnline}
        messages={messages}
        bottomRef={bottomRef}
        inputRef={inputRef}
        input={input}
        onInputChange={handleInputChange}
        onSubmit={(e, override) => {
          void sendMessage(e, override);
        }}
        showMentions={showMentions}
        filteredSuggestions={filteredSuggestions}
        onSelectMention={selectMention}
      />

      <RightSidebar onSetInput={setInput} />
    </main>
  );
}
