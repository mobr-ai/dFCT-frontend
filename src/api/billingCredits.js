const BILLING_REQUEST_TIMEOUT = {
  response: 10000,
  deadline: 20000,
};

function withBillingTimeout(req) {
  return req.timeout(BILLING_REQUEST_TIMEOUT);
}

function normalizeList(body, key) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.[key])) return body[key];
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });

  const text = query.toString();
  return text ? `?${text}` : "";
}

export async function getMyCreditBalance(authRequest) {
  const res = await withBillingTimeout(
    authRequest.get("/api/billing/credits/balance")
  );

  return res.body?.balance || res.body || null;
}

export async function getMyAccessSummary(authRequest) {
  const res = await withBillingTimeout(authRequest.get("/api/billing/access"));
  return res.body?.access || res.body || null;
}

export async function getCreditPackages(authRequest) {
  const res = await withBillingTimeout(
    authRequest.get("/api/billing/credits/packages")
  );

  return normalizeList(res.body, "packages");
}

export async function getMyPaymentIntents(authRequest, { limit = 10 } = {}) {
  const res = await withBillingTimeout(
    authRequest.get(`/api/billing/payment-intents${buildQuery({ limit })}`)
  );

  return normalizeList(res.body, "payment_intents");
}

export async function getAdminCreditUsers(authRequest, params = {}) {
  const res = await withBillingTimeout(
    authRequest.get(`/api/admin/billing/users${buildQuery(params)}`)
  );

  return normalizeList(res.body, "users");
}

export async function getAdminCreditGrants(authRequest, params = {}) {
  const res = await withBillingTimeout(
    authRequest.get(`/api/admin/billing/credit-grants${buildQuery(params)}`)
  );

  return normalizeList(res.body, "grants");
}

export async function createAdminCreditGrant(authRequest, payload = {}) {
  const res = await withBillingTimeout(
    authRequest.post("/api/admin/billing/credit-grants").send(payload)
  );

  return res.body;
}

export async function getAdminPaymentIntents(authRequest, params = {}) {
  const res = await withBillingTimeout(
    authRequest.get(`/api/admin/billing/payment-intents${buildQuery(params)}`)
  );

  return normalizeList(res.body, "payment_intents");
}

export async function getAdminCreditPackages(authRequest) {
  const res = await withBillingTimeout(
    authRequest.get("/api/admin/billing/credits/packages")
  );

  return normalizeList(res.body, "packages");
}

export async function getAdminGatewayStatus(authRequest) {
  const res = await withBillingTimeout(
    authRequest.get("/api/admin/billing/gateways")
  );

  return normalizeList(res.body, "gateways");
}

export async function getAdminAccessTiers(authRequest) {
  const res = await withBillingTimeout(
    authRequest.get("/api/admin/billing/access-tiers")
  );

  return normalizeList(res.body, "access_tiers");
}
