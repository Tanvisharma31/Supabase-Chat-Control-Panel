import { Router } from "express";
import { z } from "zod";
import { db } from "../infra/inMemoryStore.js";

const loginSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2)
});

const connectSupabaseSchema = z.object({
  accessToken: z.string().min(20),
  organizationId: z.string().min(1).optional()
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

  const existingUser = [...db.users.values()].find(
    (user) => user.email.toLowerCase() === parsed.data.email.toLowerCase()
  );

  const user =
    existingUser ??
    {
      id: `u_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
      email: parsed.data.email,
      displayName: parsed.data.displayName
    };

  db.users.set(user.id, user);

  const sessionToken = crypto.randomUUID();
  db.sessions.set(sessionToken, {
    token: sessionToken,
    userId: user.id,
    createdAt: new Date().toISOString()
  });

  response.status(200).json({
    token: sessionToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName
    },
    hasSupabaseIntegration: db.integrations.has(user.id)
  });
});

authRouter.post("/logout", (request, response) => {
  const authHeader = request.header("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (token) {
    db.sessions.delete(token);
  }
  response.status(204).send();
});

authRouter.get("/me", (request, response) => {
  const authHeader = request.header("authorization");
  const token = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const session = token ? db.sessions.get(token) : undefined;
  const user = session ? db.users.get(session.userId) : undefined;

  if (!session || !user) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  const integration = db.integrations.get(user.id);
  response.json({
    user,
    integration: integration
      ? {
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
  const session = token ? db.sessions.get(token) : undefined;

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

  db.integrations.set(session.userId, {
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
