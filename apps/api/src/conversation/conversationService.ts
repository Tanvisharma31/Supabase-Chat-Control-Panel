import type { Conversation, Message } from "../domain/types.js";
import { repository } from "../infra/database.js";

export const createConversation = (
  workspaceId: string,
  userId: string,
  channel: Conversation["channel"]
): Promise<Conversation> => repository.createConversation(workspaceId, userId, channel);

export const appendMessage = (
  conversationId: string,
  workspaceId: string,
  role: Message["role"],
  content: string
): Promise<Message> => repository.appendMessage(conversationId, workspaceId, role, content);

export const listConversationMessages = (
  workspaceId: string,
  conversationId: string
): Promise<Message[]> => repository.listConversationMessages(workspaceId, conversationId);
