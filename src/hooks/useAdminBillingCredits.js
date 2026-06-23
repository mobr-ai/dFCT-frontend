import { useCallback, useMemo, useState } from "react";

import {
  createAdminCreditGrant,
  fetchAdminAccessTiers,
  fetchAdminBillingUsers,
  fetchAdminCreditGrants,
  fetchAdminCreditPackages,
  fetchAdminGateways,
  fetchAdminPaymentIntents,
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

export function useAdminBillingCredits(user) {
  const { authRequest } = useAuthRequest(user);

  const [users, setUsers] = useState([]);
  const [creditGrants, setCreditGrants] = useState([]);
  const [paymentIntents, setPaymentIntents] = useState([]);
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
          fetchAdminPaymentIntents(authRequest, { limit: 100 }),
          fetchAdminCreditPackages(authRequest),
          fetchAdminGateways(authRequest),
          fetchAdminAccessTiers(authRequest),
        ]);

        clearAdminBillingApiUnavailable();
        setApiUnavailable(false);

        setUsers(arrayFrom(usersPayload, "users"));
        setCreditGrants(arrayFrom(grantsPayload, "grants"));
        setPaymentIntents(arrayFrom(intentsPayload, "payment_intents"));
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

  return useMemo(
    () => ({
      users,
      creditGrants,
      paymentIntents,
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
      grantCredits,
    }),
    [
      users,
      creditGrants,
      paymentIntents,
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
      grantCredits,
    ],
  );
}
