import { Router } from "express";
import { z } from "zod";
import { withTenantAccess, type TenantRequest } from "../middleware/tenantAccess.js";
import { repository } from "../infra/database.js";

const createProjectSchema = z.object({
  name: z.string().min(2),
  projectRef: z.string().min(3),
  encryptedAccessToken: z.string().min(8)
});

export const projectRouter = Router({ mergeParams: true });

projectRouter.get("/", withTenantAccess("viewer"), async (request: TenantRequest, response) => {
  const workspaceProjects = await repository.listProjects(String(request.workspaceId));
  response.json(workspaceProjects);
});

projectRouter.post("/", withTenantAccess("admin"), async (request: TenantRequest, response) => {
  const parsed = createProjectSchema.safeParse(request.body);
  if (!parsed.success || !request.workspaceId || !request.actor) {
    response.status(400).json({ error: "Invalid payload." });
    return;
  }

  const project = await repository.createProject({
    workspaceId: request.workspaceId,
    createdBy: request.actor.id,
    ...parsed.data
  });
  response.status(201).json(project);
});
