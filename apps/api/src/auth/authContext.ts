import type { Request } from "express";
import { z } from "zod";
import type { User } from "../domain/types.js";
import { repository } from "../infra/database.js";

const headerSchema = z.object({
  "x-user-id": z.string().min(1),
  "x-user-email": z.string().email().optional(),
  "x-user-name": z.string().min(1).optional()
});

export const resolveUserFromHeaders = async (request: Request): Promise<User> => {
  const authHeader = request.header("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const sessionToken = authHeader.slice(7).trim();
    const session = await repository.findSession(sessionToken);
    if (!session) {
      throw new Error("Invalid or expired session.");
    }
    const sessionUser = await repository.findUserById(session.userId);
    if (!sessionUser) {
      throw new Error("Session user not found.");
    }
    return sessionUser;
  }

  const parsed = headerSchema.safeParse({
    "x-user-id": request.header("x-user-id") ?? "",
    "x-user-email": request.header("x-user-email") ?? undefined,
    "x-user-name": request.header("x-user-name") ?? undefined
  });

  if (!parsed.success) {
    throw new Error("Missing or invalid authentication headers.");
  }

  const userId = parsed.data["x-user-id"];
  const existing = await repository.findUserById(userId);
  if (existing) {
    return existing;
  }

  const created: User = {
    id: userId,
    email: parsed.data["x-user-email"] ?? `${userId}@local.dev`,
    displayName: parsed.data["x-user-name"] ?? `User ${userId}`
  };

  await repository.upsertUser(created);
  return created;
};
