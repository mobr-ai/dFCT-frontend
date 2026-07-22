import { useCallback, useRef, useState } from "react";

import {
  fetchAdminAiRuntime,
  fetchAdminQuickCheckRuntime,
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

  const [aiData, setAiData] = useState(null);
  const [quickCheckData, setQuickCheckData] = useState(null);
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
        const [aiPayload, quickCheckPayload] = await Promise.all([
          fetchAdminAiRuntime(authRequestRef.current, { windowDays: 30 }),
          fetchAdminQuickCheckRuntime(authRequestRef.current, { windowDays: 30 }),
        ]);

        setAiData(aiPayload);
        setQuickCheckData(quickCheckPayload);
        setLastUpdatedAt(new Date());
        return { ai: aiPayload, quickCheck: quickCheckPayload };
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
        showToast?.(
          t?.("adminAI.toasts.providerSaved", { provider: providerKey }) ||
            "Provider settings saved.",
          "success",
        );
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
        showToast?.(
          t?.("adminAI.toasts.roleSaved", { role: roleKey }) ||
            "Model role saved.",
          "success",
        );
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
        showToast?.(
          t?.("adminAI.toasts.quickCheckSaved") ||
            "Quick-check settings saved.",
          "success",
        );
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
  };
}

export default useAdminAi;
