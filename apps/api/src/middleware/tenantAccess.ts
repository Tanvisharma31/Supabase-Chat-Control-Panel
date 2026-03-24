import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { resolveUserFromHeaders } from "../auth/authContext.js";
import { getMembership, hasRoleAtLeast } from "../auth/rbac.js";
import type { Role, User, WorkspaceMembership } from "../domain/types.js";
import { db } from "../infra/inMemoryStore.js";

export interface TenantRequest extends Request {
  actor?: User;
  workspaceId?: string;
  membership?: WorkspaceMembership;
}

const paramsSchema = z.object({
  workspaceId: z.string().min(1)
});

export const withTenantAccess =
  (requiredRole: Role = "viewer") =>
  (request: TenantRequest, response: Response, next: NextFunction) => {
    try {
      const actor = resolveUserFromHeaders(request);
      const parsed = paramsSchema.safeParse(request.params);

      if (!parsed.success) {
        response.status(400).json({ error: "workspaceId is required." });
        return;
      }

      const workspace = db.workspaces.get(parsed.data.workspaceId);
      if (!workspace) {
        response.status(404).json({ error: "Workspace not found." });
        return;
      }

      const membership = getMembership(workspace.id, actor.id);
      if (!hasRoleAtLeast(membership, requiredRole)) {
        response.status(403).json({ error: "Access denied for workspace role." });
        return;
      }

      request.actor = actor;
      request.workspaceId = workspace.id;
      request.membership = membership;
      next();
    } catch (error) {
      response
        .status(401)
        .json({ error: (error as Error).message || "Unauthorized." });
    }
  };
