export interface Suggestion {
  id: string;
  label: string;
  type: "project" | "request";
}

export interface WorkspaceOption {
  id: string;
  name: string;
}

export interface ConversationListItem {
  id: string;
  createdAt: string;
}

export interface ChatMessage {
  role: string;
  content: string;
}
