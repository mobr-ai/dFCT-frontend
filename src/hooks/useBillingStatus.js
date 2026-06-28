import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getMyAccessSummary,
  getMyCreditBalance,
} from "../api/billingCredits";
import { useAuthRequest } from "./useAuthRequest";
import { useAutoRefresh } from "./useAutoRefresh";

const BILLING_STATUS_API_UNAVAILABLE_KEY = "dfct_billing_status_api_unavailable_until";

function getHttpStatus(err) {
  return Number(err?.status || err?.statusCode || err?.response?.status);
}

function isNotFoundError(err) {
  return getHttpStatus(err) === 404;
}

function isBillingStatusApiUnavailableCached() {
  const until = Number(window.localStorage.getItem(BILLING_STATUS_API_UNAVAILABLE_KEY) || 0);
  return until > Date.now();
}

function markBillingStatusApiUnavailable() {
  window.localStorage.setItem(
    BILLING_STATUS_API_UNAVAILABLE_KEY,
    String(Date.now() + 120000),
  );
}

function clearBillingStatusApiUnavailable() {
  window.localStorage.removeItem(BILLING_STATUS_API_UNAVAILABLE_KEY);
}

function numberFrom(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeBalance(payload = {}) {
  const source = payload.balance && typeof payload.balance === "object"
    ? payload.balance
    : payload;

  const credits = numberFrom(
    source.credits_available,
    source.available_credits,
    source.balance,
    source.amount,
  );

  return {
    ...source,
    currency_code: source.currency_code || "DFCT",
    credits_available: credits,
    available_credits: credits,
    balance: credits,
  };
}

function normalizeAccess(payload = {}) {
  const source = payload.access && typeof payload.access === "object"
    ? payload.access
    : payload;

  return {
    ...source,
    access_tier: source.access_tier || source.tier || "standard",
    tier: source.tier || source.access_tier || "standard",
    free_topics_remaining:
      source.free_topics_remaining ?? source.freeTopicsRemaining ?? 0,
    topic_publish_credit_cost:
      source.topic_publish_credit_cost ?? source.topicPublishCreditCost ?? 1,
    can_publish_topic: source.can_publish_topic ?? source.canPublishTopic ?? true,
    wallet_required: source.wallet_required ?? false,
  };
}

export function useBillingStatus(user) {
  const { authRequest } = useAuthRequest(user);

  const [balance, setBalance] = useState(() => normalizeBalance());
  const [access, setAccess] = useState(() => normalizeAccess());
  const [loaded, setLoaded] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(isBillingStatusApiUnavailableCached);

  const canLoad = Boolean(user?.access_token);

  const loadStatus = useCallback(
    async () => {
      if (!canLoad || apiUnavailable) return null;

      try {
        const [balancePayload, accessPayload] = await Promise.all([
          getMyCreditBalance(authRequest),
          getMyAccessSummary(authRequest),
        ]);

        clearBillingStatusApiUnavailable();
        setApiUnavailable(false);
        setBalance(normalizeBalance(balancePayload));
        setAccess(normalizeAccess(accessPayload));
        setLoaded(true);

        return true;
      } catch (err) {
        if (isNotFoundError(err)) {
          markBillingStatusApiUnavailable();
          setApiUnavailable(true);
        }

        return null;
      }
    },
    [apiUnavailable, authRequest, canLoad],
  );

  const autoRefresh = useAutoRefresh({
    enabled: canLoad && !apiUnavailable,
    refresh: loadStatus,
    intervalMs: 60000,
    maxIntervalMs: 300000,
    refreshWhenHidden: false,
    runImmediately: true,
  });

  useEffect(() => {
    if (!canLoad) return undefined;

    const handleBillingRefresh = () => {
      loadStatus();
    };

    window.addEventListener("dfct:billing-status-refresh", handleBillingRefresh);
    window.addEventListener("dfct:billing-updated", handleBillingRefresh);

    return () => {
      window.removeEventListener("dfct:billing-status-refresh", handleBillingRefresh);
      window.removeEventListener("dfct:billing-updated", handleBillingRefresh);
    };
  }, [canLoad, loadStatus]);


  return useMemo(
    () => ({
      balance,
      access,
      loaded,
      apiUnavailable,
      isRefreshing: autoRefresh.isRefreshing,
      lastUpdatedAt: autoRefresh.lastUpdatedAt,
      refresh: loadStatus,
    }),
    [
      balance,
      access,
      loaded,
      apiUnavailable,
      autoRefresh.isRefreshing,
      autoRefresh.lastUpdatedAt,
      loadStatus,
    ],
  );
}
