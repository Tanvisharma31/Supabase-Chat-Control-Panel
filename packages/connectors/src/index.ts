export interface ConnectorEnvelope {
  workspaceId: string;
  conversationId: string;
  actorId: string;
  channel: "slack" | "discord" | "teams";
  content: string;
}

export interface ConnectorAdapter<TPayload> {
  normalize(payload: TPayload): ConnectorEnvelope;
  formatReply(message: string): unknown;
}

export class SlackAdapter implements ConnectorAdapter<Record<string, string>> {
  normalize(payload: Record<string, string>): ConnectorEnvelope {
    return {
      workspaceId: payload.workspaceId,
      conversationId: payload.threadTs ?? payload.eventId,
      actorId: payload.userId,
      channel: "slack",
      content: payload.text ?? ""
    };
  }

  formatReply(message: string): unknown {
    return { text: message };
  }
}

export class DiscordAdapter implements ConnectorAdapter<Record<string, string>> {
  normalize(payload: Record<string, string>): ConnectorEnvelope {
    return {
      workspaceId: payload.workspaceId,
      conversationId: payload.channelId,
      actorId: payload.authorId,
      channel: "discord",
      content: payload.content ?? ""
    };
  }

  formatReply(message: string): unknown {
    return { content: message };
  }
}

export class TeamsAdapter implements ConnectorAdapter<Record<string, string>> {
  normalize(payload: Record<string, string>): ConnectorEnvelope {
    return {
      workspaceId: payload.workspaceId,
      conversationId: payload.conversationId,
      actorId: payload.fromId,
      channel: "teams",
      content: payload.text ?? ""
    };
  }

  formatReply(message: string): unknown {
    return { type: "message", text: message };
  }
}
