import type { Role, WorkspaceMembership } from "../domain/types.js";
import { repository } from "../infra/database.js";

const rolePower: Record<Role, number> = {
  viewer: 10,
  operator: 20,
  admin: 30,
  owner: 40
};

export const getMembership = (
  workspaceId: string,
  userId: string
): Promise<WorkspaceMembership | undefined> =>
  repository.getMembership(workspaceId, userId);

export const upsertMembership = async (membership: WorkspaceMembership): Promise<void> => {
  await repository.upsertMembership(membership.workspaceId, membership.userId, membership.role);
};

export const hasRoleAtLeast = (
  membership: WorkspaceMembership | undefined,
  requiredRole: Role
): boolean => {
  if (!membership) {
    return false;
  }
  return rolePower[membership.role] >= rolePower[requiredRole];
};
