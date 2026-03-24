import { db } from "../infra/inMemoryStore.js";
import type { Conversation, Message } from "../domain/types.js";

export const createConversation = (
  workspaceId: string,
  userId: string,
  channel: Conversation["channel"]
): Conversation => {
  const conversation: Conversation = {
    id: crypto.randomUUID(),
    workspaceId,
    channel,
    createdBy: userId,
    createdAt: new Date().toISOString()
  };
  db.conversations.set(conversation.id, conversation);
  return conversation;
};

export const appendMessage = (
  conversationId: string,
  workspaceId: string,
  role: Message["role"],
  content: string
): Message => {
  const message: Message = {
    id: crypto.randomUUID(),
    conversationId,
    workspaceId,
    role,
    content,
    createdAt: new Date().toISOString()
  };
  db.messages.set(message.id, message);
  return message;
};

export const listConversationMessages = (conversationId: string): Message[] =>
  [...db.messages.values()]
    .filter((message) => message.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
