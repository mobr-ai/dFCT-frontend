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

export const fetchAdminAnchorJobs = (authRequest, params = {}) =>
  get(authRequest, "/api/dsm/anchor-jobs", params);

export const fetchAdminAnchorJob = (authRequest, anchorJobId, params = {}) =>
  get(authRequest, `/api/dsm/anchor-jobs/${anchorJobId}`, params);

export const verifyAdminAnchorJobTx = (authRequest, anchorJobId, payload = {}) =>
  post(authRequest, `/api/dsm/anchor-jobs/${anchorJobId}/cardano/verify`, payload);
