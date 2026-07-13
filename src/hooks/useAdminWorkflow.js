import { useCallback, useRef, useState } from "react";

import {
  fetchAdminWorkflowReviewers,
  fetchAdminWorkflowSummary,
  fetchAdminWorkflowTasks,
  grantAdminWorkflowReviewerRole,
  offerAdminWorkflowTask,
  revokeAdminWorkflowReviewerRole,
} from "../api/adminWorkflow";
import { getApiErrorMessage, useAuthRequest } from "./useAuthRequest";
import { useAutoRefresh } from "./useAutoRefresh";

function getHttpStatus(err) {
  return Number(err?.status || err?.statusCode || err?.response?.status);
}

function normalizeTaskFilters(filters = {}) {
  const clean = {
    limit: Number(filters.limit || 50),
  };

  if (filters.status && filters.status !== "all") clean.status = filters.status;
  if (filters.taskType && filters.taskType !== "all") {
    clean.taskType = filters.taskType;
  }
  if (filters.topicId) clean.topicId = filters.topicId;
  if (String(filters.query || "").trim()) clean.q = String(filters.query).trim();

  return clean;
}

function reviewerRoleId(role) {
  return role?.userRoleId ?? role?.user_role_id ?? role?.id ?? null;
}

export function useAdminWorkflow(user, showToast, t) {
  const { authRequest } = useAuthRequest(user);
  const authRequestRef = useRef(authRequest);
  authRequestRef.current = authRequest;

  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [reviewerQuery, setReviewerQuery] = useState("");
  const [taskFilters, setTaskFilters] = useState({
    status: "all",
    taskType: "all",
    topicId: "",
    query: "",
    limit: 50,
  });

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [reviewersLoading, setReviewersLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
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

  const loadSummary = useCallback(
    async ({ silent = false } = {}) => {
      if (!canLoad) return null;

      if (!silent) setSummaryLoading(true);
      setAccessDenied(false);
      setError("");

      try {
        const payload = await fetchAdminWorkflowSummary(authRequestRef.current, {
          limit: 20,
        });
        setSummary(payload);
        setLastUpdatedAt(new Date());
        return payload;
      } catch (err) {
        handleError(
          err,
          t?.("adminWorkflow.errors.summary") ||
            "Unable to load workflow health.",
        );
        return null;
      } finally {
        if (!silent) setSummaryLoading(false);
      }
    },
    [canLoad, handleError, t],
  );

  const loadTasks = useCallback(
    async ({ silent = false, filters = taskFilters } = {}) => {
      if (!canLoad) return null;

      if (!silent) setTasksLoading(true);
      setAccessDenied(false);
      setError("");

      try {
        const payload = await fetchAdminWorkflowTasks(
          authRequestRef.current,
          normalizeTaskFilters(filters),
        );
        setTasks(Array.isArray(payload?.tasks) ? payload.tasks : []);
        setLastUpdatedAt(new Date());
        return payload;
      } catch (err) {
        handleError(
          err,
          t?.("adminWorkflow.errors.tasks") ||
            "Unable to load workflow tasks.",
        );
        return null;
      } finally {
        if (!silent) setTasksLoading(false);
      }
    },
    [canLoad, handleError, t, taskFilters],
  );

  const loadReviewers = useCallback(
    async ({ silent = false, query = reviewerQuery } = {}) => {
      if (!canLoad) return null;

      if (!silent) setReviewersLoading(true);
      setAccessDenied(false);
      setError("");

      try {
        const payload = await fetchAdminWorkflowReviewers(
          authRequestRef.current,
          {
            q: String(query || "").trim(),
            limit: 100,
          },
        );
        setReviewers(
          Array.isArray(payload?.reviewers) ? payload.reviewers : [],
        );
        setLastUpdatedAt(new Date());
        return payload;
      } catch (err) {
        handleError(
          err,
          t?.("adminWorkflow.errors.reviewers") ||
            "Unable to load reviewer accounts.",
        );
        return null;
      } finally {
        if (!silent) setReviewersLoading(false);
      }
    },
    [canLoad, handleError, reviewerQuery, t],
  );

  const refreshOverview = useCallback(
    async ({ silent = false } = {}) => {
      await Promise.all([
        loadSummary({ silent }),
        loadTasks({ silent }),
      ]);
    },
    [loadSummary, loadTasks],
  );

  const offerTask = useCallback(
    async (taskId, reason = "") => {
      if (!canLoad || !taskId) return null;

      setActionLoading(`offer:${taskId}`);
      setError("");

      try {
        const payload = await offerAdminWorkflowTask(
          authRequestRef.current,
          taskId,
          { reason: String(reason || "").trim() || null },
        );

        const created = Number(payload?.offer?.createdNotifications || 0);
        const existing = Number(payload?.offer?.existingNotifications || 0);
        const supported = payload?.offer?.supported !== false;

        showToast?.(
          supported
            ? t?.("adminWorkflow.toasts.offerSuccess", {
                created,
                existing,
              }) || `Task offered: ${created} new, ${existing} existing.`
            : t?.("adminWorkflow.toasts.offerPendingTemplate") ||
                "This task type does not yet have a notification template.",
          supported ? "success" : "secondary",
        );

        await Promise.all([
          loadSummary({ silent: true }),
          loadTasks({ silent: true }),
        ]);

        return payload;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminWorkflow.errors.offer") ||
            "Unable to offer this task.",
        );
        if (message) showToast?.(message, "danger");
        return null;
      } finally {
        setActionLoading("");
      }
    },
    [canLoad, handleError, loadSummary, loadTasks, showToast, t],
  );

  const grantReviewerRole = useCallback(
    async (payload) => {
      if (!canLoad) return null;

      setActionLoading("grantRole");
      setError("");

      try {
        const result = await grantAdminWorkflowReviewerRole(
          authRequestRef.current,
          payload,
        );

        showToast?.(
          result?.created
            ? t?.("adminWorkflow.toasts.roleGranted") ||
                "Reviewer role granted."
            : t?.("adminWorkflow.toasts.roleAlreadyActive") ||
                "This reviewer role is already active.",
          result?.created ? "success" : "secondary",
        );

        await Promise.all([
          loadReviewers({ silent: true }),
          loadSummary({ silent: true }),
          loadTasks({ silent: true }),
        ]);

        return result;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminWorkflow.errors.grantRole") ||
            "Unable to grant reviewer role.",
        );
        if (message) showToast?.(message, "danger");
        return null;
      } finally {
        setActionLoading("");
      }
    },
    [
      canLoad,
      handleError,
      loadReviewers,
      loadSummary,
      loadTasks,
      showToast,
      t,
    ],
  );

  const autoRefresh = useAutoRefresh({
    enabled: canLoad,
    refresh: async () => {
      await Promise.all([
        loadSummary({ silent: true }),
        loadTasks({ silent: true }),
        loadReviewers({ silent: true }),
      ]);
    },
    intervalMs: 45000,
    maxIntervalMs: 300000,
    refreshWhenHidden: false,
    runImmediately: true,
  });

  const revokeReviewerRole = useCallback(
    async (role, reason = "") => {
      const userRoleId = reviewerRoleId(role);
      if (!canLoad || !userRoleId) return null;

      setActionLoading(`revoke:${userRoleId}`);
      setError("");

      try {
        const result = await revokeAdminWorkflowReviewerRole(
          authRequestRef.current,
          userRoleId,
          { reason: String(reason || "").trim() || null },
        );

        showToast?.(
          result?.revoked
            ? t?.("adminWorkflow.toasts.roleRevoked") ||
                "Reviewer role revoked."
            : t?.("adminWorkflow.toasts.roleAlreadyRevoked") ||
                "This reviewer role was already revoked.",
          result?.revoked ? "success" : "secondary",
        );

        await Promise.all([
          loadReviewers({ silent: true }),
          loadSummary({ silent: true }),
          loadTasks({ silent: true }),
        ]);

        return result;
      } catch (err) {
        const message = handleError(
          err,
          t?.("adminWorkflow.errors.revokeRole") ||
            "Unable to revoke reviewer role.",
        );
        if (message) showToast?.(message, "danger");
        return null;
      } finally {
        setActionLoading("");
      }
    },
    [
      canLoad,
      handleError,
      loadReviewers,
      loadSummary,
      loadTasks,
      showToast,
      t,
    ],
  );

  return {
    summary,
    tasks,
    reviewers,
    reviewerQuery,
    setReviewerQuery,
    taskFilters,
    setTaskFilters,
    summaryLoading,
    tasksLoading,
    reviewersLoading,
    actionLoading,
    accessDenied,
    error,
    setError,
    lastUpdatedAt: autoRefresh.lastUpdatedAt || lastUpdatedAt,
    isRefreshing: autoRefresh.isRefreshing,
    consecutiveFailures: autoRefresh.consecutiveFailures,
    loadSummary,
    loadTasks,
    loadReviewers,
    refreshOverview,
    offerTask,
    grantReviewerRole,
    revokeReviewerRole,
  };
}

export default useAdminWorkflow;
