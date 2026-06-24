import { useCallback, useMemo, useRef, useState } from "react";

import {
  createAdminCreditGrant,
  fetchAdminAccessTiers,
  fetchAdminBillingUsers,
  fetchAdminCreditGrants,
  fetchAdminCreditPackages,
  fetchAdminGateways,
  fetchAdminPaymentIntents,
  fulfillAdminPaymentIntent,
} from "../api/billingCredits";
import { getApiErrorMessage, useAuthRequest } from "./useAuthRequest";
import { useAutoRefresh } from "./useAutoRefresh";

const ADMIN_BILLING_API_UNAVAILABLE_KEY = "dfct_admin_billing_api_unavailable_until";

function getHttpStatus(err) {
  return Number(err?.status || err?.statusCode || err?.response?.status);
}

function isNotFoundError(err) {
  return getHttpStatus(err) === 404;
}

function isForbiddenError(err) {
  return getHttpStatus(err) === 403;
}

function isAdminBillingApiUnavailableCached() {
  const until = Number(window.localStorage.getItem(ADMIN_BILLING_API_UNAVAILABLE_KEY) || 0);
  return until > Date.now();
}

function markAdminBillingApiUnavailable() {
  window.localStorage.setItem(
    ADMIN_BILLING_API_UNAVAILABLE_KEY,
    String(Date.now() + 120000),
  );
}

function clearAdminBillingApiUnavailable() {
  window.localStorage.removeItem(ADMIN_BILLING_API_UNAVAILABLE_KEY);
}

function arrayFrom(payload, key) {
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

const DEFAULT_PAYMENT_INTENT_PARAMS = {
  limit: 25,
  offset: 0,
};

function normalizePaymentIntentParams(params = {}) {
  const clean = {
    limit: Number(params.limit || DEFAULT_PAYMENT_INTENT_PARAMS.limit),
    offset: Number(params.offset || DEFAULT_PAYMENT_INTENT_PARAMS.offset),
  };

  if (params.status && params.status !== "all") {
    clean.status = String(params.status).trim().toLowerCase();
  }

  if (params.gateway && params.gateway !== "all") {
    clean.gateway = String(params.gateway).trim().toLowerCase();
  }

  if (params.user_id !== undefined && params.user_id !== null && params.user_id !== "") {
    clean.user_id = params.user_id;
  }

  return clean;
}

function paymentIntentMetaFromPayload(payload = {}, params = {}) {
  const items = arrayFrom(payload, "payment_intents");
  const limit = Number(payload?.limit ?? params.limit ?? DEFAULT_PAYMENT_INTENT_PARAMS.limit);
  const offset = Number(payload?.offset ?? params.offset ?? DEFAULT_PAYMENT_INTENT_PARAMS.offset);
  const count = Number(payload?.count ?? items.length);
  const total = Number(payload?.total ?? count);

  return {
    count,
    total,
    limit,
    offset,
    hasMore: Boolean(payload?.has_more),
    filters: payload?.filters || {},
  };
}

export function useAdminBillingCredits(user) {
  const { authRequest } = useAuthRequest(user);

  const [users, setUsers] = useState([]);
  const [creditGrants, setCreditGrants] = useState([]);
  const [paymentIntents, setPaymentIntents] = useState([]);
  const [paymentIntentMeta, setPaymentIntentMeta] = useState(() =>
    paymentIntentMetaFromPayload({}, DEFAULT_PAYMENT_INTENT_PARAMS),
  );
  const paymentIntentParamsRef = useRef(DEFAULT_PAYMENT_INTENT_PARAMS);
  const [creditPackages, setCreditPackages] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [accessTiers, setAccessTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(isAdminBillingApiUnavailableCached);
  const [error, setError] = useState("");
  const [manualLastUpdatedAt, setManualLastUpdatedAt] = useState(null);

  const canLoad = Boolean(user?.access_token);

  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!canLoad || apiUnavailable) return null;

      if (!silent) setLoading(true);
      setAccessDenied(false);
      setError("");

      try {
        const [
          usersPayload,
          grantsPayload,
          intentsPayload,
          packagesPayload,
          gatewaysPayload,
          tiersPayload,
        ] = await Promise.all([
          fetchAdminBillingUsers(authRequest, { limit: 250 }),
          fetchAdminCreditGrants(authRequest, { limit: 100 }),
          fetchAdminPaymentIntents(authRequest, paymentIntentParamsRef.current),
          fetchAdminCreditPackages(authRequest),
          fetchAdminGateways(authRequest),
          fetchAdminAccessTiers(authRequest),
        ]);

        clearAdminBillingApiUnavailable();
        setApiUnavailable(false);

        setUsers(arrayFrom(usersPayload, "users"));
        setCreditGrants(arrayFrom(grantsPayload, "grants"));
        setPaymentIntents(arrayFrom(intentsPayload, "payment_intents"));
        setPaymentIntentMeta(paymentIntentMetaFromPayload(intentsPayload, paymentIntentParamsRef.current));
        setCreditPackages(arrayFrom(packagesPayload, "packages"));
        setGateways(arrayFrom(gatewaysPayload, "gateways"));
        setAccessTiers(arrayFrom(tiersPayload, "access_tiers"));

        const now = new Date();
        setManualLastUpdatedAt(now);

        return {
          usersPayload,
          grantsPayload,
          intentsPayload,
          packagesPayload,
          gatewaysPayload,
          tiersPayload,
        };
      } catch (err) {
        if (isNotFoundError(err)) {
          markAdminBillingApiUnavailable();
          setApiUnavailable(true);
          setError("");
          return null;
        }

        if (isForbiddenError(err)) {
          setAccessDenied(true);
          setError("");
          return null;
        }

        setError(getApiErrorMessage(err, "Unable to load admin billing data."));
        throw err;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [apiUnavailable, authRequest, canLoad],
  );

  const autoRefresh = useAutoRefresh({
    enabled: canLoad && !apiUnavailable,
    refresh: () => loadAll({ silent: true }),
    intervalMs: 60000,
    maxIntervalMs: 300000,
    refreshWhenHidden: false,
    runImmediately: true,
  });

  const loadPaymentIntents = useCallback(
    async (params = {}, { silent = true } = {}) => {
      if (!canLoad || apiUnavailable) return null;

      const cleanParams = normalizePaymentIntentParams(params);
      paymentIntentParamsRef.current = cleanParams;

      if (!silent) setActionLoading("paymentIntents");
      setError("");

      try {
        const payload = await fetchAdminPaymentIntents(authRequest, cleanParams);
        setPaymentIntents(arrayFrom(payload, "payment_intents"));
        setPaymentIntentMeta(paymentIntentMetaFromPayload(payload, cleanParams));
        clearAdminBillingApiUnavailable();
        setApiUnavailable(false);
        return payload;
      } catch (err) {
        if (isNotFoundError(err)) {
          markAdminBillingApiUnavailable();
          setApiUnavailable(true);
          setError("");
          return null;
        }

        if (isForbiddenError(err)) {
          setAccessDenied(true);
          setError("");
          return null;
        }

        setError(getApiErrorMessage(err, "Unable to load payment requests."));
        throw err;
      } finally {
        if (!silent) setActionLoading("");
      }
    },
    [apiUnavailable, authRequest, canLoad],
  );

  const grantCredits = useCallback(
    async ({ user_id, amount, reason, note, idempotency_key } = {}) => {
      if (!canLoad) return null;

      setActionLoading("grantCredits");
      setError("");

      try {
        const payload = await createAdminCreditGrant(authRequest, {
          user_id,
          amount,
          reason,
          note,
          idempotency_key,
        });

        await loadAll({ silent: true });
        return payload;
      } catch (err) {
        setError(getApiErrorMessage(err, "Unable to grant credits."));
        throw err;
      } finally {
        setActionLoading("");
      }
    },
    [authRequest, canLoad, loadAll],
  );

  const fulfillPaymentIntent = useCallback(
    async (paymentIntentId, { note } = {}) => {
      if (!canLoad || !paymentIntentId) return null;

      setActionLoading(`fulfillPaymentIntent:${paymentIntentId}`);
      setError("");

      try {
        const payload = await fulfillAdminPaymentIntent(authRequest, paymentIntentId, {
          note,
        });

        await loadAll({ silent: true });
        return payload;
      } catch (err) {
        setError(getApiErrorMessage(err, "Unable to fulfill payment request."));
        throw err;
      } finally {
        setActionLoading("");
      }
    },
    [authRequest, canLoad, loadAll],
  );

  return useMemo(
    () => ({
      users,
      creditGrants,
      paymentIntents,
      paymentIntentMeta,
      creditPackages,
      gateways,
      accessTiers,
      loading,
      actionLoading,
      accessDenied,
      apiUnavailable,
      error,
      consecutiveFailures: autoRefresh.consecutiveFailures,
      isRefreshing: autoRefresh.isRefreshing,
      lastUpdatedAt: autoRefresh.lastUpdatedAt || manualLastUpdatedAt,
      refresh: loadAll,
      loadPaymentIntents,
      grantCredits,
      fulfillPaymentIntent,
    }),
    [
      users,
      creditGrants,
      paymentIntents,
      paymentIntentMeta,
      creditPackages,
      gateways,
      accessTiers,
      loading,
      actionLoading,
      accessDenied,
      apiUnavailable,
      error,
      autoRefresh.consecutiveFailures,
      autoRefresh.isRefreshing,
      autoRefresh.lastUpdatedAt,
      manualLastUpdatedAt,
      loadAll,
      loadPaymentIntents,
      grantCredits,
      fulfillPaymentIntent,
    ],
  );
}
