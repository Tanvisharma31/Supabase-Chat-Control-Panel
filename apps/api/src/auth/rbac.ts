import type { Role, WorkspaceMembership } from "../domain/types.js";
import { db } from "../infra/inMemoryStore.js";

const rolePower: Record<Role, number> = {
  viewer: 10,
  operator: 20,
  admin: 30,
  owner: 40
};

export const getMembership = (
  workspaceId: string,
  userId: string
): WorkspaceMembership | undefined =>
  db.memberships.get(db.membershipKey(workspaceId, userId));

export const upsertMembership = (membership: WorkspaceMembership): void => {
  db.memberships.set(
    db.membershipKey(membership.workspaceId, membership.userId),
    membership
  );
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
