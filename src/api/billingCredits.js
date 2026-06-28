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

export const fetchBillingCreditBalance = (authRequest) =>
  get(authRequest, "/api/billing/credits/balance");

export const fetchBillingAccess = (authRequest) =>
  get(authRequest, "/api/billing/access");

export const fetchBillingCreditPackages = (authRequest) =>
  get(authRequest, "/api/billing/credits/packages");

export const fetchMyBillingPaymentIntents = (authRequest, params = {}) =>
  get(authRequest, "/api/billing/payment-intents", params);

export const fetchMyCreditLedger = (authRequest, params = {}) =>
  get(authRequest, "/api/billing/credits/ledger", params);

export const createBillingPaymentIntent = (authRequest, payload = {}) =>
  post(authRequest, "/api/billing/payment-intents", payload);

export const fetchCardanoPaymentQuote = (authRequest, paymentIntentId) =>
  get(authRequest, `/api/billing/payment-intents/${paymentIntentId}/cardano/quote`);

export const submitCardanoPayment = (authRequest, paymentIntentId, payload = {}) =>
  post(authRequest, `/api/billing/payment-intents/${paymentIntentId}/cardano/submit`, payload);

export const publishTopicWithBilling = (authRequest, userId, topicId, payload = {}) =>
  post(authRequest, `/api/topic/${userId}/${topicId}/publish`, payload);

export const fetchAdminBillingUsers = (authRequest, params = {}) =>
  get(authRequest, "/api/admin/billing/users", params);

export const fetchAdminCreditGrants = (authRequest, params = {}) =>
  get(authRequest, "/api/admin/billing/credit-grants", params);

export const createAdminCreditGrant = (authRequest, payload = {}) =>
  post(authRequest, "/api/admin/billing/credit-grants", payload);

export const fetchAdminPaymentIntents = (authRequest, params = {}) =>
  get(authRequest, "/api/admin/billing/payment-intents", params);

export const fulfillAdminPaymentIntent = (authRequest, paymentIntentId, payload = {}) =>
  post(authRequest, `/api/admin/billing/payment-intents/${paymentIntentId}/fulfill`, payload);

export const fetchAdminCreditPackages = (authRequest, params = {}) =>
  get(authRequest, "/api/admin/billing/credits/packages", params);

export const fetchAdminGateways = (authRequest) =>
  get(authRequest, "/api/admin/billing/gateways");

export const fetchAdminAccessTiers = (authRequest) =>
  get(authRequest, "/api/admin/billing/access-tiers");

// Backward-compatible aliases for hooks/pages that may already import these names.
export const getBillingCreditBalance = fetchBillingCreditBalance;
export const getBillingAccess = fetchBillingAccess;
export const listBillingCreditPackages = fetchBillingCreditPackages;
export const listMyBillingPaymentIntents = fetchMyBillingPaymentIntents;
export const listAdminBillingUsers = fetchAdminBillingUsers;
export const listAdminCreditGrants = fetchAdminCreditGrants;
export const grantAdminCredits = createAdminCreditGrant;
export const grantCredits = createAdminCreditGrant;
export const listAdminPaymentIntents = fetchAdminPaymentIntents;
export const markAdminPaymentIntentPaid = fulfillAdminPaymentIntent;
export const listAdminCreditPackages = fetchAdminCreditPackages;
export const listAdminGateways = fetchAdminGateways;
export const listAdminAccessTiers = fetchAdminAccessTiers;

// Compatibility aliases used by the user-facing billing hook.
export const getMyCreditBalance = fetchBillingCreditBalance;
export const getMyAccessSummary = fetchBillingAccess;
export const getCreditPackages = fetchBillingCreditPackages;
export const getMyPaymentIntents = fetchMyBillingPaymentIntents;
export const getMyCreditLedger = fetchMyCreditLedger;
export const createPaymentIntent = createBillingPaymentIntent;
export const getCardanoPaymentQuote = fetchCardanoPaymentQuote;
export const submitCardanoPaymentTx = submitCardanoPayment;
export const publishTopic = publishTopicWithBilling;
