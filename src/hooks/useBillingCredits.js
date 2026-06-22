import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorMessage, useAuthRequest } from "./useAuthRequest";
import { useAutoRefresh } from "./useAutoRefresh";
import {
  getCreditPackages,
  getMyAccessSummary,
  getMyCreditBalance,
  getMyPaymentIntents,
} from "../api/billingCredits";

const BILLING_API_UNAVAILABLE_CACHE_MS = 120000;

let billingApiUnavailableUntil = 0;

function isNotFoundError(err) {
  return Number(err?.status || err?.statusCode || err?.response?.status) === 404;
}

function isBillingApiUnavailableCached() {
  return Date.now() < billingApiUnavailableUntil;
}

function markBillingApiUnavailable() {
  billingApiUnavailableUntil = Date.now() + BILLING_API_UNAVAILABLE_CACHE_MS;
}

function getFirstRejected(results) {
  return results.find((item) => item.status === "rejected")?.reason || null;
}

export function useBillingCredits(user, { autoLoad = true } = {}) {
  const { authRequest } = useAuthRequest(user);
  const authRequestRef = useRef(authRequest);

  const [balance, setBalance] = useState(null);
  const [accessSummary, setAccessSummary] = useState(null);
  const [packages, setPackages] = useState([]);
  const [paymentIntents, setPaymentIntents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(
    isBillingApiUnavailableCached
  );
  const [error, setError] = useState("");

  const canLoad = Boolean(user?.access_token);

  useEffect(() => {
    authRequestRef.current = authRequest;
  }, [authRequest]);

  const refresh = useCallback(async () => {
    if (!canLoad || apiUnavailable || isBillingApiUnavailableCached()) {
      if (isBillingApiUnavailableCached()) setApiUnavailable(true);
      return null;
    }

    setLoading(true);
    setError("");

    try {
      let nextBalance = null;

      try {
        nextBalance = await getMyCreditBalance(authRequestRef.current);
        setBalance(nextBalance);
      } catch (err) {
        if (isNotFoundError(err)) {
          markBillingApiUnavailable();
          setApiUnavailable(true);
          setError("");
          return null;
        }

        throw err;
      }

      const results = await Promise.allSettled([
        getMyAccessSummary(authRequestRef.current),
        getCreditPackages(authRequestRef.current),
        getMyPaymentIntents(authRequestRef.current),
      ]);

      const rejected = results.filter((item) => item.status === "rejected");
      const hasMissingEndpoint = rejected.some((item) =>
        isNotFoundError(item.reason)
      );

      if (hasMissingEndpoint) {
        markBillingApiUnavailable();
        setApiUnavailable(true);
        setError("");
        return { balance: nextBalance };
      }

      const [accessResult, packagesResult, paymentIntentsResult] = results;

      if (accessResult.status === "fulfilled") {
        setAccessSummary(accessResult.value);
      }

      if (packagesResult.status === "fulfilled") {
        setPackages(packagesResult.value);
      }

      if (paymentIntentsResult.status === "fulfilled") {
        setPaymentIntents(paymentIntentsResult.value);
      }

      if (rejected.length > 0) {
        const firstError = getFirstRejected(results);
        setError(
          getApiErrorMessage(
            firstError,
            "Failed to sync billing and credits data."
          )
        );
        throw firstError;
      }

      return {
        balance: nextBalance,
        accessSummary:
          accessResult.status === "fulfilled" ? accessResult.value : null,
        packages:
          packagesResult.status === "fulfilled" ? packagesResult.value : [],
        paymentIntents:
          paymentIntentsResult.status === "fulfilled"
            ? paymentIntentsResult.value
            : [],
      };
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Failed to sync billing and credits data.")
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiUnavailable, canLoad]);

  const { isRefreshing, lastUpdatedAt, consecutiveFailures } = useAutoRefresh({
    enabled:
      autoLoad &&
      canLoad &&
      !apiUnavailable &&
      !isBillingApiUnavailableCached(),
    refresh,
    intervalMs: 90000,
    maxIntervalMs: 600000,
    refreshWhenHidden: false,
    runImmediately: true,
    jitterRatio: 0.2,
    onError: (err) => {
      setError(
        getApiErrorMessage(err, "Failed to sync billing and credits data.")
      );
    },
  });

  return useMemo(
    () => ({
      balance,
      accessSummary,
      packages,
      paymentIntents,
      loading: loading || isRefreshing,
      isRefreshing,
      lastUpdatedAt,
      consecutiveFailures,
      apiUnavailable,
      error,
      refresh,
    }),
    [
      balance,
      accessSummary,
      packages,
      paymentIntents,
      loading,
      isRefreshing,
      lastUpdatedAt,
      consecutiveFailures,
      apiUnavailable,
      error,
      refresh,
    ]
  );
}
