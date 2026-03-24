import { db } from "../infra/inMemoryStore.js";
import type { AuditEvent } from "../domain/types.js";

export const appendAuditEvent = (
  workspaceId: string,
  actorId: string,
  action: string,
  outcome: AuditEvent["outcome"],
  details: Record<string, string>
): AuditEvent => {
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    workspaceId,
    actorId,
    action,
    outcome,
    details,
    createdAt: new Date().toISOString()
  };
  db.auditEvents.set(event.id, event);
  return event;
};

export const listAuditEvents = (workspaceId: string): AuditEvent[] =>
  [...db.auditEvents.values()]
    .filter((event) => event.workspaceId === workspaceId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
