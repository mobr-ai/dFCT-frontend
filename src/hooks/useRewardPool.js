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

  const authRequestRef = useRef(authRequest);
  const onUpdatedRef = useRef(onUpdated);
  const summaryRef = useRef(null);
  const loadPromiseRef = useRef(null);
  const activityPromiseRef = useRef(null);
  const loadedKeyRef = useRef("");
  const operationKeysRef = useRef(new Map());

  useEffect(() => {
    authRequestRef.current = authRequest;
  }, [authRequest]);

  useEffect(() => {
    onUpdatedRef.current = onUpdated;
  }, [onUpdated]);

  useEffect(() => {
    summaryRef.current = summary;
  }, [summary]);

  const currentLoadKey = useCallback(
    () =>
      [
        topicId || "",
        Boolean(user?.access_token),
        user?.user_id ?? user?.id ?? "",
      ].join(":"),
    [
      topicId,
      user?.access_token,
      user?.id,
      user?.user_id,
    ],
  );

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
        summaryRef.current = null;
        setSummary(null);
        onUpdatedRef.current?.(null);
        return null;
      }

      let nextSummary = null;
      setSummary((current) => {
        nextSummary = {
          ...(current || {}),
          ...payload,
          rewardPool: payload.rewardPool ?? current?.rewardPool ?? null,
          permissions: payload.permissions || current?.permissions || {},
          viewer: payload.viewer ?? current?.viewer ?? null,
        };
        summaryRef.current = nextSummary;
        return nextSummary;
      });

      loadedKeyRef.current = currentLoadKey();
      onUpdatedRef.current?.(payload);
      dispatchRewardPoolEvents(topicId, source, payload);
      return payload;
    },
    [currentLoadKey, topicId],
  );

  const load = useCallback(
    async ({ silent = false, force = false } = {}) => {
      const requestClient = authRequestRef.current;
      if (!enabled || !topicId || !requestClient?.get) return null;

      const loadKey = currentLoadKey();

      if (
        !force &&
        loadedKeyRef.current === loadKey &&
        summaryRef.current
      ) {
        return summaryRef.current;
      }

      if (loadPromiseRef.current) return loadPromiseRef.current;

      if (!silent) setLoading(true);
      setError(null);

      const request = fetchTopicRewardPool(requestClient, topicId, {
        authenticated: Boolean(user?.access_token),
      })
        .then((payload) => {
          const nextSummary = payload || null;
          loadedKeyRef.current = loadKey;
          summaryRef.current = nextSummary;
          setSummary(nextSummary);
          onUpdatedRef.current?.(nextSummary);
          return nextSummary;
        })
        .catch((err) => {
          setError(apiError(err, "Unable to load the reward pool."));
          throw err;
        })
        .finally(() => {
          if (loadPromiseRef.current === request) {
            loadPromiseRef.current = null;
          }
          if (!silent) setLoading(false);
        });

      loadPromiseRef.current = request;
      return request;
    },
    [
      currentLoadKey,
      enabled,
      topicId,
      user?.access_token,
    ],
  );

  const loadActivity = useCallback(
    async ({ silent = false, force = false } = {}) => {
      const requestClient = authRequestRef.current;
      if (!topicId || !requestClient?.get) return null;

      if (!force && activity) return activity;
      if (activityPromiseRef.current) return activityPromiseRef.current;

      if (!silent) setBusy("activity");
      setError(null);

      const request = fetchTopicRewardPoolActivity(
        requestClient,
        topicId,
        { limit: 50 },
      )
        .then((payload) => {
          setActivity(payload || null);
          return payload;
        })
        .catch((err) => {
          setError(apiError(err, "Unable to load reward-pool activity."));
          throw err;
        })
        .finally(() => {
          if (activityPromiseRef.current === request) {
            activityPromiseRef.current = null;
          }
          if (!silent) setBusy("");
        });

      activityPromiseRef.current = request;
      return request;
    },
    [activity, topicId],
  );

  const createPool = useCallback(
    async (initialAmount) => {
      const requestClient = authRequestRef.current;
      const scope = `create:${initialAmount}`;
      setBusy("create");
      setError(null);

      try {
        const payload = await createTopicRewardPool(requestClient, topicId, {
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
      clearOperationKey,
      operationKey,
      topicId,
    ],
  );

  const fundPool = useCallback(
    async (amount) => {
      const requestClient = authRequestRef.current;
      const scope = `fund:${amount}`;
      setBusy("fund");
      setError(null);

      try {
        const payload = await fundTopicRewardPool(requestClient, topicId, {
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
      clearOperationKey,
      operationKey,
      topicId,
    ],
  );

  const previewDistribution = useCallback(
    async (amount) => {
      const requestClient = authRequestRef.current;
      const scope = `preview:${amount}`;
      setBusy("preview");
      setError(null);

      try {
        const payload = await previewTopicRewardDistribution(
          requestClient,
          topicId,
          {
            amount,
            idempotencyKey: operationKey(scope),
            metadata: { source: "topic_reward_pool_modal" },
          },
        );
        clearOperationKey(scope);
        setSummary((current) => {
          const nextSummary = {
            ...(current || {}),
            rewardPool: payload?.rewardPool || current?.rewardPool || null,
            permissions: payload?.permissions || current?.permissions || {},
          };
          summaryRef.current = nextSummary;
          return nextSummary;
        });
        setPreview(payload?.distribution || null);
        return payload;
      } catch (err) {
        setError(apiError(err, "Unable to preview the distribution."));
        throw err;
      } finally {
        setBusy("");
      }
    },
    [clearOperationKey, operationKey, topicId],
  );

  const executeDistribution = useCallback(
    async (distributionId) => {
      const requestClient = authRequestRef.current;
      setBusy("execute");
      setError(null);

      try {
        const payload = await executeTopicRewardDistribution(
          requestClient,
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
    [applySummary, topicId],
  );

  useEffect(() => {
    setSummary(null);
    summaryRef.current = null;
    loadedKeyRef.current = "";
    loadPromiseRef.current = null;
    activityPromiseRef.current = null;
    setPreview(null);
    setActivity(null);
    setError(null);
    operationKeysRef.current.clear();
  }, [topicId]);

  useEffect(() => {
    if (!enabled) {
      loadedKeyRef.current = "";
      loadPromiseRef.current = null;
      return;
    }
    load().catch(() => {});
  }, [enabled, load]);

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
