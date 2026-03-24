import { Router } from "express";
import { z } from "zod";
import { resolveUserFromHeaders } from "../auth/authContext.js";
import { upsertMembership } from "../auth/rbac.js";
import { repository } from "../infra/database.js";

const createWorkspaceSchema = z.object({
  name: z.string().min(2)
});

export const workspaceRouter = Router();

workspaceRouter.post("/", async (request, response) => {
  try {
    const actor = await resolveUserFromHeaders(request);
    const parsed = createWorkspaceSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const workspace = await repository.createWorkspace(parsed.data.name, actor.id);
    await upsertMembership({
      workspaceId: workspace.id,
      userId: actor.id,
      role: "owner"
    });

    response.status(201).json(workspace);
  } catch (error) {
    response.status(401).json({ error: (error as Error).message });
  }
});

workspaceRouter.get("/", async (request, response) => {
  try {
    const actor = await resolveUserFromHeaders(request);
    const list = await repository.listWorkspacesForUser(actor.id);
    response.json(list);
  } catch (error) {
    response.status(401).json({ error: (error as Error).message });
  }
});
