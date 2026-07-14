import { useCallback, useRef, useState } from "react";

import {
  fetchAdminRewardPools,
  fetchAdminRewardSummary,
} from "../api/adminRewards";
import {
  executeTopicRewardDistribution,
  fetchTopicRewardPoolActivity,
  fetchTopicRewardPoolAnalytics,
  fetchTopicRewardPoolReadiness,
  previewTopicRewardDistribution,
} from "../api/rewardPools";
import { getApiErrorMessage, useAuthRequest } from "./useAuthRequest";
import { useAutoRefresh } from "./useAutoRefresh";

function getHttpStatus(err) {
  return Number(err?.status || err?.statusCode || err?.response?.status);
}

function randomToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function normalizeFilters(filters = {}) {
  const clean = { limit: Number(filters.limit || 100) };
  if (filters.status && filters.status !== "all") clean.status = filters.status;
  if (String(filters.query || "").trim()) clean.q = String(filters.query).trim();
  return clean;
}

export function useAdminRewards(user, showToast, t) {
  const { authRequest } = useAuthRequest(user);
  const authRequestRef = useRef(authRequest);
  authRequestRef.current = authRequest;

  const [summary, setSummary] = useState(null);
  const [pools, setPools] = useState([]);
  const [poolDetails, setPoolDetails] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    query: "",
    limit: 100,
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [poolsLoading, setPoolsLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const operationKeysRef = useRef(new Map());

  const canLoad = Boolean(user?.access_token);

  const handleError = useCallback((err, fallback) => {
    if (getHttpStatus(err) === 403) {
      setAccessDenied(true);
      setError("");
      return null;
    }

    const message = getApiErrorMessage(err, fallback);
    setError(message);
    return message;
  }, []);

  const operationKey = useCallback((scope) => {
    const key = String(scope);
    if (!operationKeysRef.current.has(key)) {
      operationKeysRef.current.set(
        key,
        `admin-rewards:${randomToken()}`.slice(0, 80),
      );
    }
    return operationKeysRef.current.get(key);
  }, []);

  const clearOperationKey = useCallback((scope) => {
    operationKeysRef.current.delete(String(scope));
  }, []);

  const loadSummary = useCallback(async ({ silent = false } = {}) => {
    if (!canLoad) return null;
    if (!silent) setSummaryLoading(true);
    setAccessDenied(false);
    setError("");

    try {
      const payload = await fetchAdminRewardSummary(authRequestRef.current, {
        limit: 20,
      });
      setSummary(payload || null);
      setLastUpdatedAt(new Date());
      return payload;
    } catch (err) {
      handleError(
        err,
        t?.("adminRewards.errors.summary") || "Unable to load reward operations.",
      );
      return null;
    } finally {
      if (!silent) setSummaryLoading(false);
    }
  }, [canLoad, handleError, t]);

  const loadPools = useCallback(async ({ silent = false, nextFilters = filters } = {}) => {
    if (!canLoad) return null;
    if (!silent) setPoolsLoading(true);
    setAccessDenied(false);
    setError("");

    try {
      const payload = await fetchAdminRewardPools(
        authRequestRef.current,
        normalizeFilters(nextFilters),
      );
      setPools(Array.isArray(payload?.pools) ? payload.pools : []);
      setLastUpdatedAt(new Date());
      return payload;
    } catch (err) {
      handleError(
        err,
        t?.("adminRewards.errors.pools") || "Unable to load reward pools.",
      );
      return null;
    } finally {
      if (!silent) setPoolsLoading(false);
    }
  }, [canLoad, filters, handleError, t]);

  const loadPoolDetails = useCallback(async (pool, { silent = false } = {}) => {
    const topicId = pool?.topicId;
    if (!canLoad || !topicId) return null;
    if (!silent) setDetailsLoading(true);
    setError("");

    try {
      const [activity, readiness, analytics] = await Promise.all([
        fetchTopicRewardPoolActivity(authRequestRef.current, topicId, { limit: 50 }),
        fetchTopicRewardPoolReadiness(authRequestRef.current, topicId),
        fetchTopicRewardPoolAnalytics(authRequestRef.current, topicId),
      ]);
      const details = { pool, activity, readiness, analytics };
      setPoolDetails(details);
      return details;
    } catch (err) {
      handleError(
        err,
        t?.("adminRewards.errors.details") || "Unable to load reward-pool details.",
      );
      return null;
    } finally {
      if (!silent) setDetailsLoading(false);
    }
  }, [canLoad, handleError, t]);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    await Promise.all([
      loadSummary({ silent }),
      loadPools({ silent }),
    ]);
  }, [loadPools, loadSummary]);

  const previewDistribution = useCallback(async (pool, amount) => {
    const topicId = pool?.topicId;
    if (!canLoad || !topicId || !amount) return null;
    const scope = `preview:${topicId}:${amount}`;
    setActionLoading(`preview:${topicId}`);
    setError("");

    try {
      const payload = await previewTopicRewardDistribution(
        authRequestRef.current,
        topicId,
        {
          amount,
          idempotencyKey: operationKey(scope),
          metadata: { source: "admin_rewards_console" },
        },
      );
      clearOperationKey(scope);
      showToast?.(
        t?.("adminRewards.toasts.previewCreated") || "Distribution preview created.",
        "success",
      );
      await Promise.all([
        refresh({ silent: true }),
        loadPoolDetails(pool, { silent: true }),
      ]);
      return payload;
    } catch (err) {
      const message = handleError(
        err,
        t?.("adminRewards.errors.preview") || "Unable to preview the distribution.",
      );
      if (message) showToast?.(message, "danger");
      return null;
    } finally {
      setActionLoading("");
    }
  }, [canLoad, clearOperationKey, handleError, loadPoolDetails, operationKey, refresh, showToast, t]);

  const executeDistribution = useCallback(async (pool, distributionId) => {
    const topicId = pool?.topicId;
    if (!canLoad || !topicId || !distributionId) return null;
    setActionLoading(`execute:${distributionId}`);
    setError("");

    try {
      const payload = await executeTopicRewardDistribution(
        authRequestRef.current,
        topicId,
        distributionId,
      );
      showToast?.(
        t?.("adminRewards.toasts.distributionCompleted") || "Rewards distributed.",
        "success",
      );
      await Promise.all([
        refresh({ silent: true }),
        loadPoolDetails(pool, { silent: true }),
      ]);
      return payload;
    } catch (err) {
      const message = handleError(
        err,
        t?.("adminRewards.errors.execute") || "Unable to execute the distribution.",
      );
      if (message) showToast?.(message, "danger");
      return null;
    } finally {
      setActionLoading("");
    }
  }, [canLoad, handleError, loadPoolDetails, refresh, showToast, t]);

  const autoRefresh = useAutoRefresh({
    enabled: canLoad,
    refresh: async () => refresh({ silent: true }),
    intervalMs: 45000,
    maxIntervalMs: 300000,
    refreshWhenHidden: false,
    runImmediately: true,
  });

  return {
    summary,
    pools,
    poolDetails,
    setPoolDetails,
    filters,
    setFilters,
    summaryLoading,
    poolsLoading,
    detailsLoading,
    actionLoading,
    accessDenied,
    error,
    setError,
    lastUpdatedAt: autoRefresh.lastUpdatedAt || lastUpdatedAt,
    isRefreshing: autoRefresh.isRefreshing,
    consecutiveFailures: autoRefresh.consecutiveFailures,
    loadSummary,
    loadPools,
    loadPoolDetails,
    refresh,
    previewDistribution,
    executeDistribution,
  };
}

export default useAdminRewards;
