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

export const fetchAdminRewardSummary = (authRequest, params = {}) =>
  get(authRequest, "/api/admin/rewards/summary", params);

export const fetchAdminRewardPools = (authRequest, params = {}) =>
  get(authRequest, "/api/admin/rewards/pools", params);
