import { useCallback, useMemo, useRef, useState } from "react";

import {
  fetchAdminAiBenchmarkCatalog,
  fetchAdminAiBenchmarkDetail,
  fetchAdminAiBenchmarks,
  fetchAdminAiCosts,
  fetchAdminAiExecutionDetail,
  fetchAdminAiFinances,
  fetchAdminAiRuntime,
  fetchAdminQuickCheckRuntime,
  launchAdminAiBenchmark,
  preflightAdminAiBenchmark,
  syncAdminAiAnthropicFinances,
  syncAdminAiOpenAiFinances,
  testAdminAiProvider,
  updateAdminAiProvider,
  updateAdminAiRole,
  updateAdminQuickCheckSettings,
} from "../api/adminAi";
import { getApiErrorMessage, useAuthRequest } from "./useAuthRequest";
import { useAutoRefresh } from "./useAutoRefresh";

function getHttpStatus(err) {
  return Number(err?.status || err?.statusCode || err?.response?.status);
}

export function useAdminAi(user, showToast, t) {
  const { authRequest } = useAuthRequest(user);
  const authRequestRef = useRef(authRequest);
  authRequestRef.current = authRequest;

  const costWindowDaysRef = useRef(30);
  const financeSyncInFlightRef = useRef(false);

  const [aiData, setAiData] = useState(null);
  const [quickCheckData, setQuickCheckData] = useState(null);
  const [costData, setCostData] = useState(null);
  const [financeData, setFinanceData] = useState(null);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [benchmarkCatalog, setBenchmarkCatalog] = useState(null);
  const [benchmarkPreflight, setBenchmarkPreflight] = useState(null);
  const [benchmarkLaunch, setBenchmarkLaunch] = useState(null);
  const [benchmarkDetail, setBenchmarkDetail] = useState(null);
  const [executionDetail, setExecutionDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const canLoad = Boolean(user?.access_token);

  const handleError = useCallback(
    (err, fallback) => {
      if (getHttpStatus(err) === 403) {
        setAccessDenied(true);
        setError("");
        return null;
      }

      const message = getApiErrorMessage(err, fallback);
      setError(message);
      return message;
    },
    [],
  );

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!canLoad || actionLoading) return null;
      if (!silent) setLoading(true);
      setAccessDenied(false);
      setError("");

      try {
        const [
          aiPayload,
          quickCheckPayload,
          costPayload,
          financePayload,
          benchmarkPayload,
        ] = await Promise.all([
          fetchAdminAiRuntime(
            authRequestRef.current,
            { windowDays: 30 },
          ),
          fetchAdminQuickCheckRuntime(
            authRequestRef.current,
            { windowDays: 30 },
          ),
          fetchAdminAiCosts(
            authRequestRef.current,
            {
              windowDays:
                costWindowDaysRef.current,
            },
          ),
          fetchAdminAiFinances(
            authRequestRef.current,
            {
              windowDays:
                costWindowDaysRef.current,
            },
          ),
          fetchAdminAiBenchmarks(
            authRequestRef.current,
            { limit: 50 },
          ),
        ]);

        setAiData(aiPayload);
        setQuickCheckData(quickCheckPayload);
        setCostData(costPayload);
        setFinanceData(financePayload);
        setBenchmarkData(benchmarkPayload);
        setLastUpdatedAt(new Date());

        return {
          ai: aiPayload,
          quickCheck: quickCheckPayload,
          costs: costPayload,
          finances: financePayload,
          benchmarks: benchmarkPayload,
        };
      } catch (err) {
        handleError(
          err,
          t?.("adminAI.errors.load") || "Unable to load AI operations.",
        );
        return null;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [actionLoading, canLoad, handleError, t],
  );

  const saveProvider = useCallback(
    async (providerKey, payload) => {
      if (!canLoad) return null;
      const action = `provider:${providerKey}`;
      setActionLoading(action);
      setError("");

      try {
        const response = await updateAdminAiProvider(
          authRequestRef.current,
          providerKey,
          payload,
          { windowDays: 30 },
        );
        if (response.runtime) setAiData(response.runtime);
        setLastUpdatedAt(new Date());
        return response;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminAI.errors.saveProvider") ||
            "Unable to save provider settings.",
        );
        if (message) showToast?.(message, "danger");
        return null;
      } finally {
        setActionLoading("");
      }
    },
    [canLoad, handleError, showToast, t],
  );

  const probeProvider = useCallback(
    async (providerKey) => {
      if (!canLoad) return null;
      const action = `probe:${providerKey}`;
      setActionLoading(action);
      setError("");

      try {
        const response = await testAdminAiProvider(
          authRequestRef.current,
          providerKey,
        );
        showToast?.(
          t?.("adminAI.toasts.providerTested", { provider: providerKey }) ||
            "Provider connection succeeded.",
          "success",
        );
        return response?.probe || response;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminAI.errors.testProvider") ||
            "Unable to test this provider.",
        );
        if (message) showToast?.(message, "danger");
        return null;
      } finally {
        setActionLoading("");
      }
    },
    [canLoad, handleError, showToast, t],
  );

  const saveRole = useCallback(
    async (roleKey, payload) => {
      if (!canLoad) return null;
      const action = `role:${roleKey}`;
      setActionLoading(action);
      setError("");

      try {
        const response = await updateAdminAiRole(
          authRequestRef.current,
          roleKey,
          payload,
          { windowDays: 30 },
        );
        if (response.runtime) setAiData(response.runtime);
        setLastUpdatedAt(new Date());
        return response;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminAI.errors.saveRole") || "Unable to save model role.",
        );
        if (message) showToast?.(message, "danger");
        return null;
      } finally {
        setActionLoading("");
      }
    },
    [canLoad, handleError, showToast, t],
  );

  const saveQuickCheckSettings = useCallback(
    async (payload) => {
      if (!canLoad) return null;
      const action = "quick-check";
      setActionLoading(action);
      setError("");

      try {
        const response = await updateAdminQuickCheckSettings(
          authRequestRef.current,
          payload,
          { windowDays: 30 },
        );
        setQuickCheckData(response);
        setLastUpdatedAt(new Date());
        return response;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminAI.errors.saveQuickCheck") ||
            "Unable to save quick-check settings.",
        );
        if (message) showToast?.(message, "danger");
        return null;
      } finally {
        setActionLoading("");
      }
    },
    [canLoad, handleError, showToast, t],
  );

  const loadCosts = useCallback(
    async (windowDays = 30) => {
      if (!canLoad) return null;

      const safeWindowDays = Math.max(
        1,
        Math.min(
          Number(windowDays) || 30,
          365,
        ),
      );

      costWindowDaysRef.current =
        safeWindowDays;

      setError("");

      try {
        const payload = await fetchAdminAiCosts(
          authRequestRef.current,
          {
            windowDays:
              safeWindowDays,
          },
        );

        setCostData(payload);
        setLastUpdatedAt(new Date());
        return payload;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminAI.errors.loadCosts") ||
            "Unable to load AI cost observability.",
        );
        if (message) showToast?.(message, "danger");
        return null;
      }
    },
    [canLoad, handleError, showToast, t],
  );

  const loadFinances = useCallback(
    async (windowDays = 30) => {
      if (!canLoad) return null;

      const safeWindowDays = Math.max(
        1,
        Math.min(
          Number(windowDays) || 30,
          365,
        ),
      );

      costWindowDaysRef.current =
        safeWindowDays;

      setError("");

      try {
        const payload = await fetchAdminAiFinances(
          authRequestRef.current,
          {
            windowDays:
              safeWindowDays,
          },
        );

        setFinanceData(payload);
        setLastUpdatedAt(new Date());
        return payload;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminAI.errors.loadFinances") ||
            "Unable to load provider billing.",
        );
        if (message) showToast?.(message, "danger");
        return null;
      }
    },
    [canLoad, handleError, showToast, t],
  );

  const syncProviderFinances = useCallback(
    async (
      providerKey,
      windowDays = 30,
      { silent = false } = {},
    ) => {
      if (!canLoad || financeSyncInFlightRef.current) return null;

      const syncProvider = {
        openai:
          syncAdminAiOpenAiFinances,
        anthropic:
          syncAdminAiAnthropicFinances,
      }[providerKey];

      if (!syncProvider) {
        const message =
          t?.("adminAI.errors.unsupportedFinanceProvider") ||
          "Finance synchronization is not available for this provider.";

        if (!silent) showToast?.(message, "warning");
        return null;
      }

      const action = `finance-sync:${providerKey}`;
      const safeWindowDays = Math.max(
        1,
        Math.min(Number(windowDays) || 30, 365),
      );

      financeSyncInFlightRef.current = true;
      setActionLoading(action);
      setError("");

      try {
        const response = await syncProvider(
          authRequestRef.current,
          { windowDays: safeWindowDays },
        );

        if (response?.finances) {
          setFinanceData(response.finances);
        }

        setLastUpdatedAt(new Date());

        if (!silent) {
          const providerLabel = (
            providerKey === "openai"
              ? "OpenAI"
              : providerKey === "anthropic"
                ? "Anthropic"
                : providerKey
          );

          showToast?.(
            t?.("adminAI.toasts.financesSynced", {
              provider: providerLabel,
            }) ||
              `${providerLabel} provider billing synchronized.`,
            "success",
          );
        }

        return response;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminAI.errors.syncFinances") ||
            "Unable to synchronize provider billing.",
        );

        if (message && !silent) {
          showToast?.(message, "danger");
        }

        return null;
      } finally {
        financeSyncInFlightRef.current = false;
        setActionLoading("");
      }
    },
    [
      canLoad,
      handleError,
      showToast,
      t,
    ],
  );

  const loadBenchmarkCatalog = useCallback(
    async () => {
      if (!canLoad) return null;

      setError("");

      try {
        const response = await fetchAdminAiBenchmarkCatalog(
          authRequestRef.current,
        );

        const catalog = (
          response?.catalog
          || response
          || null
        );

        setBenchmarkCatalog(catalog);
        return catalog;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminAI.errors.loadBenchmarkCatalog") ||
            "Unable to load benchmark catalog.",
        );

        if (message) {
          showToast?.(
            message,
            "danger",
          );
        }

        return null;
      }
    },
    [
      canLoad,
      handleError,
      showToast,
      t,
    ],
  );

  const loadBenchmarks = useCallback(
    async (params = {}) => {
      if (!canLoad) return null;

      setError("");

      try {
        const payload = await fetchAdminAiBenchmarks(
          authRequestRef.current,
          {
            limit: 50,
            ...params,
          },
        );

        setBenchmarkData(payload);
        setLastUpdatedAt(new Date());
        return payload;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminAI.errors.loadBenchmarks") ||
            "Unable to load benchmark history.",
        );
        if (message) showToast?.(message, "danger");
        return null;
      }
    },
    [canLoad, handleError, showToast, t],
  );

  const preflightBenchmark = useCallback(
    async (payload) => {
      if (!canLoad) return null;

      setActionLoading(
        "benchmark-preflight",
      );
      setError("");

      try {
        const response = await preflightAdminAiBenchmark(
          authRequestRef.current,
          payload,
        );

        const preflight = (
          response?.preflight
          || response
          || null
        );

        setBenchmarkPreflight(
          preflight,
        );
        setLastUpdatedAt(
          new Date(),
        );

        return preflight;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminAI.errors.preflightBenchmark") ||
            "Unable to preflight this benchmark.",
        );

        if (message) {
          showToast?.(
            message,
            "danger",
          );
        }

        return null;
      } finally {
        setActionLoading("");
      }
    },
    [
      canLoad,
      handleError,
      showToast,
      t,
    ],
  );

  const launchBenchmark = useCallback(
    async (payload) => {
      if (!canLoad) return null;

      setActionLoading(
        "benchmark-launch",
      );
      setError("");

      try {
        const response = await launchAdminAiBenchmark(
          authRequestRef.current,
          payload,
        );

        const launch = (
          response?.launch
          || response
          || null
        );

        setBenchmarkLaunch(
          launch,
        );

        if (response?.preflight) {
          setBenchmarkPreflight(
            response.preflight,
          );
        }

        setLastUpdatedAt(
          new Date(),
        );

        showToast?.(
          t?.(
            "adminAI.toasts.benchmarkLaunched",
          ) ||
            "Benchmark accepted for execution.",
          "success",
        );

        await loadBenchmarks({
          limit: 50,
        });

        return launch;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminAI.errors.launchBenchmark") ||
            "Unable to launch this benchmark.",
        );

        if (message) {
          showToast?.(
            message,
            "danger",
          );
        }

        return null;
      } finally {
        setActionLoading("");
      }
    },
    [
      canLoad,
      handleError,
      loadBenchmarks,
      showToast,
      t,
    ],
  );

  const loadBenchmarkDetail = useCallback(
    async (
      benchmarkRunId,
      {
        silent = false,
      } = {},
    ) => {
      if (!canLoad || !benchmarkRunId) return null;

      if (!silent) {
        setDetailLoading(true);
      }

      setError("");

      try {
        const payload = await fetchAdminAiBenchmarkDetail(
          authRequestRef.current,
          benchmarkRunId,
        );

        setBenchmarkDetail(payload);
        return payload;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminAI.errors.loadBenchmarkDetail") ||
            "Unable to load benchmark execution details.",
        );

        if (message && !silent) {
          showToast?.(
            message,
            "danger",
          );
        }

        return null;
      } finally {
        if (!silent) {
          setDetailLoading(false);
        }
      }
    },
    [canLoad, handleError, showToast, t],
  );

  const loadExecutionDetail = useCallback(
    async (analysisRunId) => {
      if (!canLoad || !analysisRunId) return null;

      setDetailLoading(true);
      setError("");

      try {
        const payload = await fetchAdminAiExecutionDetail(
          authRequestRef.current,
          analysisRunId,
        );

        setExecutionDetail(payload);
        return payload;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminAI.errors.loadExecutionDetail") ||
            "Unable to load extraction execution details.",
        );
        if (message) showToast?.(message, "danger");
        return null;
      } finally {
        setDetailLoading(false);
      }
    },
    [canLoad, handleError, showToast, t],
  );

  const benchmarkLaunchTaskId = (
    benchmarkLaunch?.celeryTaskId
    || benchmarkLaunch?.taskId
    || ""
  );

  const activeBenchmarkRun = useMemo(
    () => {
      const items = Array.isArray(
        benchmarkData?.items,
      )
        ? benchmarkData.items
        : [];

      const launchedRun = benchmarkLaunchTaskId
        ? (
            items.find(
              (run) => (
                String(
                  run?.celeryTaskId
                  || "",
                )
                === String(
                  benchmarkLaunchTaskId,
                )
              ),
            )
            || null
          )
        : null;

      if (launchedRun) {
        return launchedRun;
      }

      /*
       * The launch response is volatile React state. BenchmarkRun is the
       * durable source of truth, so recover the newest non-terminal run
       * when this view is remounted after navigation or refresh.
       */
      return (
        items.find(
          (run) => {
            const status = String(
              run?.status || "",
            ).toLowerCase();

            const outcome = String(
              run?.outcome || "",
            ).toLowerCase();

            return (
              ![
                "succeeded",
                "failed",
              ].includes(status)
              && ![
                "passed",
                "failed",
                "incomplete",
              ].includes(outcome)
            );
          },
        )
        || null
      );
    },
    [
      benchmarkData,
      benchmarkLaunchTaskId,
    ],
  );

  const activeBenchmarkTerminal = Boolean(
    activeBenchmarkRun
    && (
      [
        "succeeded",
        "failed",
      ].includes(
        String(
          activeBenchmarkRun.status
          || "",
        ).toLowerCase(),
      )
      || [
        "passed",
        "failed",
        "incomplete",
      ].includes(
        String(
          activeBenchmarkRun.outcome
          || "",
        ).toLowerCase(),
      )
    ),
  );

  const benchmarkActiveTrackingId = (
    benchmarkLaunchTaskId
    || activeBenchmarkRun?.celeryTaskId
    || activeBenchmarkRun?.benchmarkRunId
    || ""
  );

  const benchmarkActiveRefresh = useAutoRefresh({
    enabled: Boolean(
      canLoad
      && benchmarkActiveTrackingId
      && !activeBenchmarkTerminal
    ),
    refresh: async () => {
      await loadBenchmarks({
        limit: 50,
      });
    },
    intervalMs: 5000,
    maxIntervalMs: 30000,
    refreshWhenHidden: false,
    runImmediately: true,
    jitterRatio: 0.04,
    onError: () => {},
  });

  const autoRefresh = useAutoRefresh({
    enabled: canLoad,
    refresh: async () => {
      await load({ silent: true });
    },
    intervalMs: 60000,
    maxIntervalMs: 300000,
    refreshWhenHidden: false,
    runImmediately: true,
  });

  return {
    aiData,
    quickCheckData,
    providers: Array.isArray(aiData?.providers) ? aiData.providers : [],
    roles: Array.isArray(aiData?.roles) ? aiData.roles : [],
    aiUsage: aiData?.usage || {},
    aiCapabilities: aiData?.capabilities || {},
    quickCheckSettings: quickCheckData?.settings || null,
    quickCheckCapabilities: quickCheckData?.capabilities || {},
    quickCheckUsage: quickCheckData?.usage || {},
    costData,
    financeData,
    benchmarkData,
    benchmarkCatalog,
    benchmarkPreflight,
    benchmarkLaunch,
    activeBenchmarkRun,
    benchmarkActiveRefreshing:
      benchmarkActiveRefresh.isRefreshing,
    benchmarkActiveLastUpdatedAt:
      benchmarkActiveRefresh.lastUpdatedAt,
    benchmarkDetail,
    executionDetail,
    detailLoading,
    loading,
    accessDenied,
    error,
    setError,
    actionLoading,
    lastUpdatedAt: autoRefresh.lastUpdatedAt || lastUpdatedAt,
    isRefreshing: autoRefresh.isRefreshing,
    load,
    saveProvider,
    probeProvider,
    saveRole,
    saveQuickCheckSettings,
    loadCosts,
    loadFinances,
    syncProviderFinances,
    loadBenchmarkCatalog,
    loadBenchmarks,
    preflightBenchmark,
    launchBenchmark,
    loadBenchmarkDetail,
    loadExecutionDetail,
    setBenchmarkDetail,
    setExecutionDetail,
  };
}

export default useAdminAi;
