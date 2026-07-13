function unwrap(res) {
  return res?.body || {};
}

function queryString(params = {}) {
  const clean = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => [key, String(value)]);

  if (!clean.length) return "";

  return `?${new URLSearchParams(clean).toString()}`;
}

function get(authRequest, url, params) {
  return authRequest.get(`${url}${queryString(params)}`).then(unwrap);
}

function post(authRequest, url, payload = {}) {
  return authRequest.post(url).send(payload).then(unwrap);
}

export const fetchAdminWorkflowSummary = (authRequest, params = {}) =>
  get(authRequest, "/api/admin/workflow/summary", params);

export const fetchAdminWorkflowTasks = (authRequest, params = {}) =>
  get(authRequest, "/api/admin/workflow/tasks", params);

export const fetchAdminWorkflowReviewers = (authRequest, params = {}) =>
  get(authRequest, "/api/admin/workflow/reviewers", params);

export const grantAdminWorkflowReviewerRole = (authRequest, payload = {}) =>
  post(authRequest, "/api/admin/workflow/reviewer-roles", payload);

export const revokeAdminWorkflowReviewerRole = (
  authRequest,
  userRoleId,
  payload = {},
) =>
  post(
    authRequest,
    `/api/admin/workflow/reviewer-roles/${userRoleId}/revoke`,
    payload,
  );

export const offerAdminWorkflowTask = (authRequest, taskId, payload = {}) =>
  post(authRequest, `/api/admin/workflow/tasks/${taskId}/offer`, payload);
