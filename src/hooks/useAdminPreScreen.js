import { useCallback, useRef, useState } from "react";

import {
  fetchAdminWorkflowPreScreen,
  updateAdminWorkflowPreScreenSettings,
} from "../api/adminWorkflow";
import { getApiErrorMessage, useAuthRequest } from "./useAuthRequest";
import { useAutoRefresh } from "./useAutoRefresh";

function getHttpStatus(err) {
  return Number(err?.status || err?.statusCode || err?.response?.status);
}

export function useAdminPreScreen(user, showToast, t) {
  const { authRequest } = useAuthRequest(user);
  const authRequestRef = useRef(authRequest);
  authRequestRef.current = authRequest;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState("");
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
      if (!canLoad || savingRef.current) return null;
      if (!silent) setLoading(true);
      setAccessDenied(false);
      setError("");
      try {
        const payload = await fetchAdminWorkflowPreScreen(authRequestRef.current, {
          windowHours: 24,
          limit: 25,
        });
        setData(payload);
        setLastUpdatedAt(new Date());
        return payload;
      } catch (err) {
        handleError(
          err,
          t?.("adminWorkflow.prescreen.errors.load") ||
            "Unable to load pre-screen operations.",
        );
        return null;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [canLoad, handleError, t],
  );

  const saveSettings = useCallback(
    async (settings) => {
      if (!canLoad) return null;
      savingRef.current = true;
      setSaving(true);
      setError("");
      try {
        const payload = await updateAdminWorkflowPreScreenSettings(
          authRequestRef.current,
          settings,
        );
        setData(payload);
        setLastUpdatedAt(new Date());
        showToast?.(
          t?.("adminWorkflow.prescreen.toasts.saved") ||
            "Pre-screen settings saved.",
          "success",
        );
        return payload;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminWorkflow.prescreen.errors.save") ||
            "Unable to save pre-screen settings.",
        );
        if (message) showToast?.(message, "danger");
        return null;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [canLoad, handleError, showToast, t],
  );

  const autoRefresh = useAutoRefresh({
    enabled: canLoad,
    refresh: async () => {
      await load({ silent: true });
    },
    intervalMs: 45000,
    maxIntervalMs: 300000,
    refreshWhenHidden: false,
    runImmediately: true,
  });

  return {
    data,
    settings: data?.settings || null,
    capabilities: data?.capabilities || {},
    stats: data?.stats || {},
    recent: Array.isArray(data?.recent) ? data.recent : [],
    loading,
    saving,
    accessDenied,
    error,
    setError,
    lastUpdatedAt: autoRefresh.lastUpdatedAt || lastUpdatedAt,
    isRefreshing: autoRefresh.isRefreshing,
    load,
    saveSettings,
  };
}

export default useAdminPreScreen;
