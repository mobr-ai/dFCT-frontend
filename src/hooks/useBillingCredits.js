import { useCallback, useMemo, useState } from "react";

import {
  createPaymentIntent,
  getCreditPackages,
  getMyAccessSummary,
  getMyCreditBalance,
  getMyPaymentIntents,
} from "../api/billingCredits";
import { getApiErrorMessage, useAuthRequest } from "./useAuthRequest";
import { useAutoRefresh } from "./useAutoRefresh";

const BILLING_API_UNAVAILABLE_KEY = "dfct_billing_api_unavailable_until";

function getHttpStatus(err) {
  return Number(err?.status || err?.statusCode || err?.response?.status);
}

function isNotFoundError(err) {
  return getHttpStatus(err) === 404;
}

function isBillingApiUnavailableCached() {
  const until = Number(window.localStorage.getItem(BILLING_API_UNAVAILABLE_KEY) || 0);
  return until > Date.now();
}

function markBillingApiUnavailable() {
  window.localStorage.setItem(
    BILLING_API_UNAVAILABLE_KEY,
    String(Date.now() + 120000),
  );
}

function clearBillingApiUnavailable() {
  window.localStorage.removeItem(BILLING_API_UNAVAILABLE_KEY);
}

function numberFrom(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function arrayFrom(payload, key) {
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
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
    lifetime_granted: numberFrom(source.lifetime_granted),
    lifetime_spent: numberFrom(source.lifetime_spent),
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

export function useBillingCredits(user) {
  const { authRequest } = useAuthRequest(user);

  const [balance, setBalance] = useState(() => normalizeBalance());
  const [access, setAccess] = useState(() => normalizeAccess());
  const [creditPackages, setCreditPackages] = useState([]);
  const [paymentIntents, setPaymentIntents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(isBillingApiUnavailableCached);
  const [error, setError] = useState("");
  const [manualLastUpdatedAt, setManualLastUpdatedAt] = useState(null);

  const canLoad = Boolean(user?.access_token);

  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!canLoad || apiUnavailable) return null;

      if (!silent) setLoading(true);
      setError("");

      try {
        const [balancePayload, accessPayload, packagesPayload, intentsPayload] =
          await Promise.all([
            getMyCreditBalance(authRequest),
            getMyAccessSummary(authRequest),
            getCreditPackages(authRequest),
            getMyPaymentIntents(authRequest, { limit: 50 }),
          ]);

        clearBillingApiUnavailable();
        setApiUnavailable(false);

        setBalance(normalizeBalance(balancePayload));
        setAccess(normalizeAccess(accessPayload));
        setCreditPackages(arrayFrom(packagesPayload, "packages"));
        setPaymentIntents(arrayFrom(intentsPayload, "payment_intents"));

        const now = new Date();
        setManualLastUpdatedAt(now);
        return true;
      } catch (err) {
        if (isNotFoundError(err)) {
          markBillingApiUnavailable();
          setApiUnavailable(true);
          setError("");
          return null;
        }

        setError(getApiErrorMessage(err, "Unable to load billing data."));
        throw err;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [apiUnavailable, authRequest, canLoad],
  );

  const purchasePackage = useCallback(
    async (pkg, options = {}) => {
      if (!canLoad) return null;

      const packageId = pkg?.package_id ?? pkg?.id;
      const packageKey = pkg?.key ?? pkg?.package_key ?? pkg?.code;

      if (!packageId && !packageKey) {
        throw new Error("Missing billing package identifier.");
      }

      setPurchaseLoading(true);
      setError("");

      try {
        const payload = {
          gateway: pkg?.gateway || "cardano",
        };

        if (options.preferredCurrency) {
          payload.preferred_currency = options.preferredCurrency;
        }

        if (packageId) {
          payload.package_id = packageId;
        } else {
          payload.package_key = packageKey;
        }

        const response = await createPaymentIntent(authRequest, payload);
        const intent = response?.payment_intent || response?.intent || response;

        if (intent) {
          const intentId = intent.payment_intent_id || intent.id;
          setPaymentIntents((current) => [
            intent,
            ...current.filter((item) => {
              const itemId = item.payment_intent_id || item.id;
              return !intentId || itemId !== intentId;
            }),
          ]);
        }

        await loadAll({ silent: true });
        return intent;
      } catch (err) {
        setError(getApiErrorMessage(err, "Unable to create payment intent."));
        throw err;
      } finally {
        setPurchaseLoading(false);
      }
    },
    [authRequest, canLoad, loadAll],
  );

  const autoRefresh = useAutoRefresh({
    enabled: canLoad && !apiUnavailable,
    refresh: () => loadAll({ silent: true }),
    intervalMs: 60000,
    maxIntervalMs: 300000,
    refreshWhenHidden: false,
    runImmediately: true,
  });

  return useMemo(
    () => ({
      balance,
      creditBalance: balance,
      access,
      accessSummary: access,
      creditPackages,
      packages: creditPackages,
      paymentIntents,
      loading,
      purchaseLoading,
      apiUnavailable,
      error,
      consecutiveFailures: autoRefresh.consecutiveFailures,
      isRefreshing: autoRefresh.isRefreshing,
      lastUpdatedAt: autoRefresh.lastUpdatedAt || manualLastUpdatedAt,
      refresh: loadAll,
      purchasePackage,
      createPurchaseIntent: purchasePackage,
    }),
    [
      balance,
      access,
      creditPackages,
      paymentIntents,
      loading,
      purchaseLoading,
      apiUnavailable,
      error,
      autoRefresh.consecutiveFailures,
      autoRefresh.isRefreshing,
      autoRefresh.lastUpdatedAt,
      manualLastUpdatedAt,
      loadAll,
      purchasePackage,
    ],
  );
}
