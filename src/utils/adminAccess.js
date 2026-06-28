const ADMIN_ROLES = new Set([
  "admin",
  "administrator",
  "platform_admin",
  "dfct_admin",
  "billing_admin",
  "owner",
]);

function roleValue(role) {
  if (!role) return "";

  if (typeof role === "string") return role.toLowerCase();

  return String(
    role.key ||
      role.role_key ||
      role.code ||
      role.name ||
      role.label ||
      "",
  ).toLowerCase();
}

export function getUserAdminIdentity(userData) {
  if (!userData) return "";

  return String(
    userData.user_id ||
      userData.id ||
      userData.email ||
      userData.username ||
      userData.google_id ||
      "",
  ).trim();
}

export function hasExplicitAdminClaim(userData) {
  if (!userData?.access_token) return false;

  if (userData.is_admin || userData.admin) return true;

  const role = String(userData.role || "").toLowerCase();
  if (ADMIN_ROLES.has(role)) return true;

  const roles = userData.roles || userData.user_roles || userData.permissions || [];
  return Array.isArray(roles) && roles.some((item) => ADMIN_ROLES.has(roleValue(item)));
}
