import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorMessage, useAuthRequest } from "./useAuthRequest";
import { useAutoRefresh } from "./useAutoRefresh";
import {
  createAdminCreditGrant,
  getAdminAccessTiers,
  getAdminCreditGrants,
  getAdminCreditPackages,
  getAdminCreditUsers,
  getAdminGatewayStatus,
  getAdminPaymentIntents,
} from "../api/billingCredits";

const ADMIN_BILLING_API_UNAVAILABLE_CACHE_MS = 120000;

let adminBillingApiUnavailableUntil = 0;

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
  return Date.now() < adminBillingApiUnavailableUntil;
}

function markAdminBillingApiUnavailable() {
  adminBillingApiUnavailableUntil =
    Date.now() + ADMIN_BILLING_API_UNAVAILABLE_CACHE_MS;
}

function getFirstRejected(results) {
  return results.find((item) => item.status === "rejected")?.reason || null;
}

export function useAdminBillingCredits(user, { autoLoad = true } = {}) {
  const { authRequest } = useAuthRequest(user);
  const authRequestRef = useRef(authRequest);

  const [users, setUsers] = useState([]);
  const [grants, setGrants] = useState([]);
  const [paymentIntents, setPaymentIntents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [accessTiers, setAccessTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(
    isAdminBillingApiUnavailableCached
  );
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState("");

  const canLoad = Boolean(user?.access_token);

  useEffect(() => {
    authRequestRef.current = authRequest;
  }, [authRequest]);

  const refresh = useCallback(async () => {
    if (
      !canLoad ||
      apiUnavailable ||
      isAdminBillingApiUnavailableCached()
    ) {
      if (isAdminBillingApiUnavailableCached()) setApiUnavailable(true);
      return null;
    }

    setLoading(true);
    setAccessDenied(false);
    setError("");

    try {
      let nextUsers = [];

      try {
        nextUsers = await getAdminCreditUsers(authRequestRef.current, {
          limit: 50,
        });
        setUsers(nextUsers);
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

        throw err;
      }

      const results = await Promise.allSettled([
        getAdminCreditGrants(authRequestRef.current, { limit: 25 }),
        getAdminPaymentIntents(authRequestRef.current, { limit: 25 }),
        getAdminCreditPackages(authRequestRef.current),
        getAdminGatewayStatus(authRequestRef.current),
        getAdminAccessTiers(authRequestRef.current),
      ]);

      const rejected = results.filter((item) => item.status === "rejected");
      const hasMissingEndpoint = rejected.some((item) =>
        isNotFoundError(item.reason)
      );

      if (hasMissingEndpoint) {
        markAdminBillingApiUnavailable();
        setApiUnavailable(true);
        setError("");
        return { users: nextUsers };
      }

      const [
        grantsResult,
        paymentIntentsResult,
        packagesResult,
        gatewaysResult,
        accessTiersResult,
      ] = results;

      if (grantsResult.status === "fulfilled") setGrants(grantsResult.value);
      if (paymentIntentsResult.status === "fulfilled") {
        setPaymentIntents(paymentIntentsResult.value);
      }
      if (packagesResult.status === "fulfilled") setPackages(packagesResult.value);
      if (gatewaysResult.status === "fulfilled") setGateways(gatewaysResult.value);
      if (accessTiersResult.status === "fulfilled") {
        setAccessTiers(accessTiersResult.value);
      }

      if (rejected.length > 0) {
        const firstError = getFirstRejected(results);
        setError(
          getApiErrorMessage(firstError, "Failed to sync admin billing data.")
        );
        throw firstError;
      }

      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to sync admin billing data."));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiUnavailable, canLoad]);

  const grantCredits = useCallback(
    async (payload) => {
      setActionLoading(true);
      setError("");

      try {
        const result = await createAdminCreditGrant(
          authRequestRef.current,
          payload
        );
        await refresh();
        return result;
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to grant credits."));
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [refresh]
  );

  const { isRefreshing, lastUpdatedAt, consecutiveFailures } = useAutoRefresh({
    enabled:
      autoLoad &&
      canLoad &&
      !apiUnavailable &&
      !isAdminBillingApiUnavailableCached(),
    refresh,
    intervalMs: 120000,
    maxIntervalMs: 900000,
    refreshWhenHidden: false,
    runImmediately: true,
    jitterRatio: 0.2,
    onError: (err) => {
      setError(getApiErrorMessage(err, "Failed to sync admin billing data."));
    },
  });

  return useMemo(
    () => ({
      users,
      grants,
      paymentIntents,
      packages,
      gateways,
      accessTiers,
      loading: loading || isRefreshing,
      isRefreshing,
      actionLoading,
      accessDenied,
      lastUpdatedAt,
      consecutiveFailures,
      apiUnavailable,
      error,
      refresh,
      grantCredits,
    }),
    [
      users,
      grants,
      paymentIntents,
      packages,
      gateways,
      accessTiers,
      loading,
      isRefreshing,
      actionLoading,
      accessDenied,
      lastUpdatedAt,
      consecutiveFailures,
      apiUnavailable,
      error,
      refresh,
      grantCredits,
    ]
  );
}
