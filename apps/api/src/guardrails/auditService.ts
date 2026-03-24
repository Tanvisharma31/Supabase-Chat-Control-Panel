import type { AuditEvent } from "../domain/types.js";
import { repository } from "../infra/database.js";

export const appendAuditEvent = (
  workspaceId: string,
  actorId: string,
  action: string,
  outcome: AuditEvent["outcome"],
  details: Record<string, string>
): Promise<AuditEvent> => repository.appendAuditEvent(workspaceId, actorId, action, outcome, details);

export const listAuditEvents = (workspaceId: string): Promise<AuditEvent[]> =>
  repository.listAuditEvents(workspaceId);
