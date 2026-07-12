import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createTopicRewardPool,
  executeTopicRewardDistribution,
  fetchTopicRewardPool,
  fetchTopicRewardPoolActivity,
  fundTopicRewardPool,
  previewTopicRewardDistribution,
} from "../api/rewardPools";
import { getApiErrorMessage, useAuthRequest } from "./useAuthRequest";

const EMPTY_PERMISSIONS = Object.freeze({
  canCreate: false,
  canFund: false,
  canPreviewDistribution: false,
  canExecuteDistribution: false,
  canViewActivity: false,
});

function randomToken() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function apiError(err, fallback) {
  const body = err?.response?.body || err?.body || {};
  const code = body.code || body.error || "";

  return {
    code: String(code || ""),
    message: getApiErrorMessage(err, fallback),
  };
}

function dispatchRewardPoolEvents(topicId, source, payload) {
  window.dispatchEvent(
    new CustomEvent("dfct:reward-pool-updated", {
      detail: { source, topicId, payload },
    }),
  );

  window.dispatchEvent(
    new CustomEvent("dfct:topic-lifecycle-updated", {
      detail: { source, topicId },
    }),
  );

  window.dispatchEvent(
    new CustomEvent("dfct:billing-updated", {
      detail: { source, topicId },
    }),
  );
}

export function useRewardPool({
  user,
  topicId,
  enabled = true,
  onUpdated,
} = {}) {
  const { authRequest } = useAuthRequest(user);
  const [summary, setSummary] = useState(null);
  const [preview, setPreview] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(null);
  const operationKeysRef = useRef(new Map());

  const operationKey = useCallback(
    (scope) => {
      const key = `${scope}`;
      if (!operationKeysRef.current.has(key)) {
        operationKeysRef.current.set(
          key,
          `rp:${topicId}:${randomToken()}`.slice(0, 80),
        );
      }
      return operationKeysRef.current.get(key);
    },
    [topicId],
  );

  const clearOperationKey = useCallback((scope) => {
    operationKeysRef.current.delete(`${scope}`);
  }, []);

  const applySummary = useCallback(
    (payload, source = "reward_pool_refresh") => {
      if (!payload) {
        setSummary(null);
        onUpdated?.(null);
        return null;
      }

      setSummary((current) => ({
        ...(current || {}),
        ...payload,
        rewardPool: payload.rewardPool ?? current?.rewardPool ?? null,
        permissions: payload.permissions || current?.permissions || {},
        viewer: payload.viewer ?? current?.viewer ?? null,
      }));
      onUpdated?.(payload);
      dispatchRewardPoolEvents(topicId, source, payload);
      return payload;
    },
    [onUpdated, topicId],
  );

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!enabled || !topicId || !authRequest?.get) return null;

      if (!silent) setLoading(true);
      setError(null);

      try {
        const payload = await fetchTopicRewardPool(authRequest, topicId, {
          authenticated: Boolean(user?.access_token),
        });
        setSummary(payload || null);
        onUpdated?.(payload || null);
        return payload;
      } catch (err) {
        setError(apiError(err, "Unable to load the reward pool."));
        throw err;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [authRequest, enabled, onUpdated, topicId, user?.access_token],
  );

  const loadActivity = useCallback(
    async ({ silent = false } = {}) => {
      if (!topicId || !authRequest?.get) return null;

      if (!silent) setBusy("activity");
      setError(null);

      try {
        const payload = await fetchTopicRewardPoolActivity(
          authRequest,
          topicId,
          { limit: 50 },
        );
        setActivity(payload || null);
        return payload;
      } catch (err) {
        setError(apiError(err, "Unable to load reward-pool activity."));
        throw err;
      } finally {
        if (!silent) setBusy("");
      }
    },
    [authRequest, topicId],
  );

  const createPool = useCallback(
    async (initialAmount) => {
      const scope = `create:${initialAmount}`;
      setBusy("create");
      setError(null);

      try {
        const payload = await createTopicRewardPool(authRequest, topicId, {
          initialAmount,
          idempotencyKey: operationKey(scope),
          metadata: { source: "topic_reward_pool_modal" },
        });
        clearOperationKey(scope);
        setPreview(null);
        setActivity(null);
        return applySummary(payload, "reward_pool_created");
      } catch (err) {
        setError(apiError(err, "Unable to activate the reward pool."));
        throw err;
      } finally {
        setBusy("");
      }
    },
    [
      applySummary,
      authRequest,
      clearOperationKey,
      operationKey,
      topicId,
    ],
  );

  const fundPool = useCallback(
    async (amount) => {
      const scope = `fund:${amount}`;
      setBusy("fund");
      setError(null);

      try {
        const payload = await fundTopicRewardPool(authRequest, topicId, {
          amount,
          idempotencyKey: operationKey(scope),
          metadata: { source: "topic_reward_pool_modal" },
        });
        clearOperationKey(scope);
        setPreview(null);
        setActivity(null);
        return applySummary(payload, "reward_pool_funded");
      } catch (err) {
        setError(apiError(err, "Unable to add credits to the reward pool."));
        throw err;
      } finally {
        setBusy("");
      }
    },
    [
      applySummary,
      authRequest,
      clearOperationKey,
      operationKey,
      topicId,
    ],
  );

  const previewDistribution = useCallback(
    async (amount) => {
      const scope = `preview:${amount}`;
      setBusy("preview");
      setError(null);

      try {
        const payload = await previewTopicRewardDistribution(
          authRequest,
          topicId,
          {
            amount,
            idempotencyKey: operationKey(scope),
            metadata: { source: "topic_reward_pool_modal" },
          },
        );
        clearOperationKey(scope);
        setSummary((current) => ({
          ...(current || {}),
          rewardPool: payload?.rewardPool || current?.rewardPool || null,
          permissions: payload?.permissions || current?.permissions || {},
        }));
        setPreview(payload?.distribution || null);
        return payload;
      } catch (err) {
        setError(apiError(err, "Unable to preview the distribution."));
        throw err;
      } finally {
        setBusy("");
      }
    },
    [authRequest, clearOperationKey, operationKey, topicId],
  );

  const executeDistribution = useCallback(
    async (distributionId) => {
      setBusy("execute");
      setError(null);

      try {
        const payload = await executeTopicRewardDistribution(
          authRequest,
          topicId,
          distributionId,
        );
        setPreview(payload?.distribution || null);
        setActivity(null);
        return applySummary(payload, "reward_distribution_executed");
      } catch (err) {
        setError(apiError(err, "Unable to distribute the rewards."));
        throw err;
      } finally {
        setBusy("");
      }
    },
    [applySummary, authRequest, topicId],
  );

  useEffect(() => {
    setSummary(null);
    setPreview(null);
    setActivity(null);
    setError(null);
    operationKeysRef.current.clear();
  }, [topicId]);

  useEffect(() => {
    if (!enabled) return;
    load().catch(() => {});
  }, [enabled, load, user?.access_token]);

  const permissions = summary?.permissions || EMPTY_PERMISSIONS;

  return useMemo(
    () => ({
      summary,
      pool: summary?.rewardPool || null,
      viewer: summary?.viewer || null,
      permissions,
      preview,
      activity,
      loading,
      busy,
      error,
      refresh: load,
      loadActivity,
      createPool,
      fundPool,
      previewDistribution,
      executeDistribution,
      clearError: () => setError(null),
      clearPreview: () => setPreview(null),
    }),
    [
      activity,
      busy,
      createPool,
      error,
      executeDistribution,
      fundPool,
      load,
      loadActivity,
      loading,
      permissions,
      preview,
      previewDistribution,
      summary,
    ],
  );
}
