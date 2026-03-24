import { Router } from "express";
import { z } from "zod";
import { repository } from "../infra/database.js";

const loginSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2)
});

const connectSupabaseSchema = z.object({
  accessToken: z.string().min(20),
  organizationId: z.string().min(1).optional(),
  workspaceId: z.string().uuid()
});

const supabaseApi = async (accessToken: string, endpoint: string): Promise<Response> =>
  fetch(`https://api.supabase.com/v1${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });

export const authRouter = Router();

authRouter.post("/login", async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existingUser = await repository.findUserByEmail(parsed.data.email);

  const user =
    existingUser ??
    {
      id: `u_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
      email: parsed.data.email,
      displayName: parsed.data.displayName
    };

  await repository.upsertUser(user);
  const session = await repository.createSession(user.id);
  const integration = await repository.getLatestSupabaseIntegrationForUser(user.id);

  response.status(200).json({
    token: session.token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName
    },
    hasSupabaseIntegration: Boolean(integration)
  });
});

authRouter.post("/logout", async (request, response) => {
  const authHeader = request.header("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (token) {
    await repository.deleteSession(token);
  }
  response.status(204).send();
});

authRouter.get("/me", async (request, response) => {
  const authHeader = request.header("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const session = token ? await repository.findSession(token) : undefined;
  const user = session ? await repository.findUserById(session.userId) : undefined;

  if (!session || !user) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  const workspaceQuery = request.query.workspaceId;
  const workspaceId =
    typeof workspaceQuery === "string" && workspaceQuery.length > 0 ? workspaceQuery : undefined;

  const integration = workspaceId
    ? await repository.getSupabaseIntegration(workspaceId, user.id)
    : await repository.getLatestSupabaseIntegrationForUser(user.id);

  response.json({
    user,
    session: { id: session.token.slice(0, 8) },
    integration: integration
      ? {
          workspaceId: integration.workspaceId,
          organizationId: integration.organizationId,
          connectedAt: integration.connectedAt
        }
      : null
  });
});

authRouter.post("/supabase/connect", async (request, response) => {
  const authHeader = request.header("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const session = token ? await repository.findSession(token) : undefined;

  if (!session) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = connectSupabaseSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const orgResponse = await supabaseApi(parsed.data.accessToken, "/organizations");
  if (!orgResponse.ok) {
    const details = await orgResponse.text();
    response.status(400).json({
      error: "Failed to validate Supabase access token.",
      details
    });
    return;
  }

  const organizations = (await orgResponse.json()) as Array<{ id: string; name: string }>;
  const resolvedOrgId = parsed.data.organizationId ?? organizations[0]?.id;
  if (!resolvedOrgId) {
    response.status(400).json({
      error: "No organization found for this access token."
    });
    return;
  }

  await repository.upsertSupabaseIntegration({
    workspaceId: parsed.data.workspaceId,
    userId: session.userId,
    accessToken: parsed.data.accessToken,
    organizationId: resolvedOrgId,
    connectedAt: new Date().toISOString()
  });

  response.status(200).json({
    ok: true,
    organizationId: resolvedOrgId,
    organizations
  });
});
