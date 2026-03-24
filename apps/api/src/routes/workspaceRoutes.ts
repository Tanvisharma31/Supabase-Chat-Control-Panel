import { Router } from "express";
import { z } from "zod";
import { resolveUserFromHeaders } from "../auth/authContext.js";
import { upsertMembership } from "../auth/rbac.js";
import { db } from "../infra/inMemoryStore.js";

const createWorkspaceSchema = z.object({
  name: z.string().min(2)
});

export const workspaceRouter = Router();

workspaceRouter.post("/", (request, response) => {
  try {
    const actor = resolveUserFromHeaders(request);
    const parsed = createWorkspaceSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const workspaceId = crypto.randomUUID();
    const workspace = {
      id: workspaceId,
      name: parsed.data.name,
      createdBy: actor.id
    };

    db.workspaces.set(workspace.id, workspace);
    upsertMembership({
      workspaceId: workspace.id,
      userId: actor.id,
      role: "owner"
    });

    response.status(201).json(workspace);
  } catch (error) {
    response.status(401).json({ error: (error as Error).message });
  }
});

workspaceRouter.get("/", (request, response) => {
  try {
    const actor = resolveUserFromHeaders(request);
    const list = [...db.workspaces.values()].filter((workspace) =>
      db.memberships.has(db.membershipKey(workspace.id, actor.id))
    );
    response.json(list);
  } catch (error) {
    response.status(401).json({ error: (error as Error).message });
  }
});
