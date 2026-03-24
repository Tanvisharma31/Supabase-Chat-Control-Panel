import type { Role } from "../domain/types.js";
import { hasRoleAtLeast } from "../auth/rbac.js";
import type { CommandSpec } from "../../../../packages/mcp-core/src/types.js";

export interface PolicyDecision {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
}

export const evaluatePolicy = (
  command: CommandSpec | undefined,
  actorRole: Role | undefined
): PolicyDecision => {
  if (!command || !actorRole) {
    return { allowed: false, requiresApproval: false, reason: "Missing policy context." };
  }

  const membership = { workspaceId: "", userId: "", role: actorRole };
  const canRun = hasRoleAtLeast(membership, command.requiredRole);

  if (!canRun) {
    return { allowed: false, requiresApproval: false, reason: "Role too low for command." };
  }

  return {
    allowed: true,
    requiresApproval: command.requiresApproval
  };
};
