import { useMemo } from "react";

export const SYSTEM_ADMIN_ROLE = "system_admin";

function isExpired(value) {
  if (!value) return false;

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return false;

  return timestamp <= Date.now();
}

function isActiveGrant(grant) {
  if (!grant || typeof grant !== "object") return true;

  const revokedAt = grant.revokedAt ?? grant.revoked_at;
  const expiresAt = grant.expiresAt ?? grant.expires_at;

  return !revokedAt && !isExpired(expiresAt);
}

function roleKeyFrom(value) {
  if (!value) return null;

  if (typeof value === "string") {
    return value;
  }

  if (typeof value !== "object") {
    return null;
  }

  return value.key ?? value.role?.key ?? null;
}

export function getActiveRoleKeys(user) {
  if (!user) return [];

  const directRoles = Array.isArray(user.roles) ? user.roles : [];

  const grantedRoles = [
    ...(Array.isArray(user.userRoles) ? user.userRoles : []),
    ...(Array.isArray(user.user_roles) ? user.user_roles : []),
  ].filter(isActiveGrant);

  return Array.from(
    new Set(
      [...directRoles, ...grantedRoles]
        .map(roleKeyFrom)
        .filter(Boolean)
        .map((key) => String(key).toLowerCase())
    )
  );
}

export function hasRole(user, roleKey) {
  return getActiveRoleKeys(user).includes(String(roleKey).toLowerCase());
}

export function hasAdminClaim(user) {
  return hasRole(user, SYSTEM_ADMIN_ROLE);
}

export function useAdminAccess(user) {
  const roleKeys = useMemo(() => getActiveRoleKeys(user), [user]);

  return {
    isAdmin: roleKeys.includes(SYSTEM_ADMIN_ROLE),
    isCheckingAdmin: false,
    roleKeys,
  };
}

export default useAdminAccess;
