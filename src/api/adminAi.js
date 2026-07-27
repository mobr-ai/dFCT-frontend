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

function put(authRequest, url, payload = {}) {
  return authRequest.put(url).send(payload).then(unwrap);
}

export const fetchAdminAiRuntime = (authRequest, params = {}) =>
  get(authRequest, "/api/admin/ai", params);

export const fetchAdminAiCosts = (
  authRequest,
  params = {},
) =>
  get(
    authRequest,
    "/api/admin/ai/costs",
    params,
  );

export const fetchAdminAiFinances = (
  authRequest,
  params = {},
) =>
  get(
    authRequest,
    "/api/admin/ai/finances",
    params,
  );

export const syncAdminAiOpenAiFinances = (
  authRequest,
  params = {},
) =>
  post(
    authRequest,
    `/api/admin/ai/finances/openai/sync${queryString(params)}`,
  );

export const syncAdminAiAnthropicFinances = (
  authRequest,
  params = {},
) =>
  post(
    authRequest,
    `/api/admin/ai/finances/anthropic/sync${queryString(params)}`,
  );

export const fetchAdminAiBenchmarks = (
  authRequest,
  params = {},
) =>
  get(
    authRequest,
    "/api/admin/ai/benchmarks",
    params,
  );

export const fetchAdminAiBenchmarkDetail = (
  authRequest,
  benchmarkRunId,
) =>
  get(
    authRequest,
    `/api/admin/ai/benchmarks/${encodeURIComponent(benchmarkRunId)}`,
  );

export const fetchAdminAiExecutionDetail = (
  authRequest,
  analysisRunId,
) =>
  get(
    authRequest,
    `/api/admin/ai/executions/${encodeURIComponent(analysisRunId)}`,
  );

export const updateAdminAiProvider = (
  authRequest,
  providerKey,
  payload = {},
  params = {},
) =>
  put(
    authRequest,
    `/api/admin/ai/providers/${encodeURIComponent(providerKey)}${queryString(params)}`,
    payload,
  );

export const testAdminAiProvider = (authRequest, providerKey) =>
  post(
    authRequest,
    `/api/admin/ai/providers/${encodeURIComponent(providerKey)}/test`,
  );

export const updateAdminAiRole = (
  authRequest,
  roleKey,
  payload = {},
  params = {},
) =>
  put(
    authRequest,
    `/api/admin/ai/roles/${encodeURIComponent(roleKey)}${queryString(params)}`,
    payload,
  );

export const fetchAdminQuickCheckRuntime = (authRequest, params = {}) =>
  get(authRequest, "/api/admin/quick-check", params);

export const updateAdminQuickCheckSettings = (
  authRequest,
  payload = {},
  params = {},
) =>
  put(
    authRequest,
    `/api/admin/quick-check/settings${queryString(params)}`,
    payload,
  );
