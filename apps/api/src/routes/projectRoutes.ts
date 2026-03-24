import { Router } from "express";
import { z } from "zod";
import { withTenantAccess, type TenantRequest } from "../middleware/tenantAccess.js";
import { db } from "../infra/inMemoryStore.js";

const createProjectSchema = z.object({
  name: z.string().min(2),
  projectRef: z.string().min(3),
  encryptedAccessToken: z.string().min(8)
});

export const projectRouter = Router({ mergeParams: true });

projectRouter.get("/", withTenantAccess("viewer"), (request: TenantRequest, response) => {
  const workspaceProjects = [...db.projects.values()].filter(
    (project) => project.workspaceId === request.workspaceId
  );
  response.json(workspaceProjects);
});

projectRouter.post("/", withTenantAccess("admin"), (request: TenantRequest, response) => {
  const parsed = createProjectSchema.safeParse(request.body);
  if (!parsed.success || !request.workspaceId || !request.actor) {
    response.status(400).json({ error: "Invalid payload." });
    return;
  }

  const project = {
    id: crypto.randomUUID(),
    workspaceId: request.workspaceId,
    createdBy: request.actor.id,
    ...parsed.data
  };
  db.projects.set(project.id, project);
  response.status(201).json(project);
});
