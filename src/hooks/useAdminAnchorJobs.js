import { useCallback, useMemo, useState } from "react";

import {
  fetchAdminAnchorJob,
  fetchAdminAnchorJobs,
  verifyAdminAnchorJobTx,
} from "../api/adminAnchorJobs";
import { getApiErrorMessage, useAuthRequest } from "./useAuthRequest";
import { useAutoRefresh } from "./useAutoRefresh";

function arrayFrom(payload, key) {
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function getHttpStatus(err) {
  return Number(err?.status || err?.statusCode || err?.response?.status);
}

function isForbiddenError(err) {
  return getHttpStatus(err) === 403;
}

function normalizeFilters(filters = {}) {
  const clean = {
    limit: Number(filters.limit || 25),
  };

  if (filters.status && filters.status !== "all") clean.status = filters.status;
  if (filters.chain && filters.chain !== "all") clean.chain = filters.chain;
  if (filters.provider && filters.provider !== "all") clean.provider = filters.provider;
  if (filters.topicId) clean.topicId = filters.topicId;

  return clean;
}

export function useAdminAnchorJobs(user, showToast, t) {
  const { authRequest } = useAuthRequest(user);

  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({
    status: "all",
    chain: "all",
    provider: "all",
    topicId: "",
    limit: 25,
  });
  const [selectedJob, setSelectedJob] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const canLoad = Boolean(user?.access_token);

  const loadJobs = useCallback(
    async ({ silent = false } = {}) => {
      if (!canLoad) return null;

      if (!silent) setLoading(true);
      setAccessDenied(false);
      setError("");

      try {
        const payload = await fetchAdminAnchorJobs(authRequest, normalizeFilters(filters));
        const nextItems = arrayFrom(payload, "items");

        setItems(nextItems);
        setLastUpdatedAt(new Date());

        return payload;
      } catch (err) {
        if (isForbiddenError(err)) {
          setAccessDenied(true);
          setError("");
          return null;
        }

        setError(getApiErrorMessage(err, t?.("adminAnchorJobs.loadError") || "Unable to load anchor jobs."));
        return null;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [authRequest, canLoad, filters, t],
  );

  const loadJob = useCallback(
    async (anchorJobId) => {
      if (!canLoad || !anchorJobId) return null;

      setDetailLoading(true);
      setError("");

      try {
        const payload = await fetchAdminAnchorJob(authRequest, anchorJobId, {
          includeProviderPreview: true,
        });
        const job = payload?.anchorJob || payload;

        setSelectedJob(job);
        setVerificationResult(null);

        return job;
      } catch (err) {
        if (isForbiddenError(err)) {
          setAccessDenied(true);
          return null;
        }

        setError(getApiErrorMessage(err, t?.("adminAnchorJobs.detailError") || "Unable to load anchor job."));
        return null;
      } finally {
        setDetailLoading(false);
      }
    },
    [authRequest, canLoad, t],
  );

  const verifyTx = useCallback(
    async (anchorJobId, txHash, { confirm = false } = {}) => {
      if (!canLoad || !anchorJobId) return null;

      const cleanTxHash = String(txHash || "").trim();
      if (!cleanTxHash) {
        setError(t?.("adminAnchorJobs.txHashRequired") || "Transaction hash is required.");
        return null;
      }

      setActionLoading(confirm ? "confirmTx" : "verifyTx");
      setError("");

      try {
        const payload = await verifyAdminAnchorJobTx(authRequest, anchorJobId, {
          txHash: cleanTxHash,
          confirm,
        });

        setVerificationResult(payload);

        if (confirm && payload?.confirmedPersisted) {
          showToast?.(t?.("adminAnchorJobs.confirmSuccess") || "Anchor job confirmed.", "success");
          await loadJobs({ silent: true });
          await loadJob(anchorJobId);
        } else if (payload?.verification?.ok) {
          showToast?.(t?.("adminAnchorJobs.verifySuccess") || "Transaction hash verified.", "success");
        }

        return payload;
      } catch (err) {
        const message = getApiErrorMessage(
          err,
          confirm
            ? t?.("adminAnchorJobs.confirmError") || "Unable to confirm anchor job."
            : t?.("adminAnchorJobs.verifyError") || "Unable to verify transaction hash.",
        );
        setError(message);
        showToast?.(message, "danger");
        return null;
      } finally {
        setActionLoading("");
      }
    },
    [authRequest, canLoad, loadJob, loadJobs, showToast, t],
  );

  const autoRefresh = useAutoRefresh({
    enabled: canLoad,
    refresh: () => loadJobs({ silent: true }),
    intervalMs: 45000,
    maxIntervalMs: 300000,
    refreshWhenHidden: false,
    runImmediately: true,
    onError: (err) => {
      setError(getApiErrorMessage(err, t?.("adminAnchorJobs.loadError") || "Unable to load anchor jobs."));
    },
  });

  const stats = useMemo(() => {
    const byStatus = items.reduce((acc, item) => {
      const status = String(item.status || "unknown").toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      total: items.length,
      pending: byStatus.pending || 0,
      prepared: byStatus.prepared || 0,
      confirmed: byStatus.confirmed || 0,
      failed: byStatus.failed || 0,
      byStatus,
    };
  }, [items]);

  return {
    items,
    filters,
    setFilters,
    selectedJob,
    verificationResult,
    loading,
    detailLoading,
    actionLoading,
    accessDenied,
    error,
    lastUpdatedAt: autoRefresh.lastUpdatedAt || lastUpdatedAt,
    isAutoRefreshing: autoRefresh.isRefreshing,
    autoRefreshFailures: autoRefresh.consecutiveFailures,
    stats,
    canLoad,
    loadJobs,
    loadJob,
    verifyTx,
  };
}

export default useAdminAnchorJobs;
