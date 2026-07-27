import { useCallback, useMemo, useRef, useState } from "react";

import { fetchAdminAiRuntime, fetchAdminQuickCheckRuntime } from "../api/adminAi";
import { fetchAdminAnchorJobs } from "../api/adminAnchorJobs";
import { fetchAdminRewardSummary } from "../api/adminRewards";
import { fetchAdminWorkflowSummary } from "../api/adminWorkflow";
import { fetchAdminBillingUsers, fetchAdminPaymentIntents } from "../api/billingCredits";
import { useAuthRequest } from "./useAuthRequest";
import { useAutoRefresh } from "./useAutoRefresh";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function arrayFrom(payload, key) {
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function statusCounts(rows) {
  return rows.reduce((acc, row) => {
    const key = String(row?.status || "unknown").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function useAdminOverview(user) {
  const { authRequest } = useAuthRequest(user);
  const authRequestRef = useRef(authRequest);
  authRequestRef.current = authRequest;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const canLoad = Boolean(user?.access_token);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!canLoad) return null;
    if (!silent) setLoading(true);
    setError("");

    const requests = {
      workflow: fetchAdminWorkflowSummary(authRequestRef.current, { limit: 20 }),
      rewards: fetchAdminRewardSummary(authRequestRef.current, { limit: 20 }),
      anchors: fetchAdminAnchorJobs(authRequestRef.current, { limit: 100 }),
      ai: fetchAdminAiRuntime(authRequestRef.current, { windowDays: 30 }),
      quickCheck: fetchAdminQuickCheckRuntime(authRequestRef.current, { windowDays: 30 }),
      billingUsers: fetchAdminBillingUsers(authRequestRef.current, { limit: 250 }),
      paymentIntents: fetchAdminPaymentIntents(authRequestRef.current, { limit: 100, offset: 0 }),
    };

    try {
      const entries = Object.entries(requests);
      const settled = await Promise.allSettled(entries.map(([, promise]) => promise));
      const next = {};
      const failures = [];

      settled.forEach((result, index) => {
        const key = entries[index][0];
        if (result.status === "fulfilled") next[key] = result.value;
        else failures.push(key);
      });

      setData((current) => ({ ...(current || {}), ...next }));
      setLastUpdatedAt(new Date());
      if (failures.length) setError(failures.join(","));
      return next;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canLoad]);

  const autoRefresh = useAutoRefresh({
    enabled: canLoad,
    refresh: () => load({ silent: true }),
    intervalMs: 60000,
    maxIntervalMs: 300000,
    refreshWhenHidden: false,
    runImmediately: true,
  });

  const summary = useMemo(() => {
    const workflowHealth = data?.workflow?.health || {};
    const rewardsHealth = data?.rewards?.health || {};
    const anchors = arrayFrom(data?.anchors, "items");
    const anchorCounts = statusCounts(anchors);
    const users = arrayFrom(data?.billingUsers, "users");
    const intents = arrayFrom(data?.paymentIntents, "payment_intents");
    const intentCounts = data?.paymentIntents?.status_counts || data?.paymentIntents?.aggregates?.status_counts || statusCounts(intents);
    const providers = asArray(data?.ai?.providers);
    const roles = asArray(data?.ai?.roles);
    const readyProviders = providers.filter((provider) => provider?.enabled && provider?.ready).length;
    const readyRoles = roles.filter((role) => role?.enabled && role?.ready).length;

    return {
      workflow: {
        awaitingReview: Number(workflowHealth.awaitingReview || 0),
        noReviewerAvailable: Number(workflowHealth.noReviewerAvailable || 0),
        inProgress: Number(workflowHealth.inProgress || 0),
        atRiskOrExpired: Number(workflowHealth.atRiskOrExpired || 0),
      },
      billing: {
        users: Number(data?.billingUsers?.total ?? data?.billingUsers?.count ?? users.length),
        pendingIntents: Number(intentCounts.pending || intentCounts.submitted || 0),
        totalIntents: Number(data?.paymentIntents?.total ?? data?.paymentIntents?.count ?? intents.length),
      },
      ai: {
        readyProviders,
        enabledProviders: providers.filter((provider) => provider?.enabled).length,
        readyRoles,
        enabledRoles: roles.filter((role) => role?.enabled).length,
        publicReady: Boolean(data?.quickCheck?.capabilities?.publicReady),
        forensicReady: Boolean(data?.quickCheck?.capabilities?.forensicReady),
      },
      rewards: {
        availableAmount: Number(rewardsHealth.availableAmount || 0),
        pendingEventCount: Number(rewardsHealth.pendingEventCount || 0),
        readyToDistributeCount: Number(rewardsHealth.readyToDistributeCount || 0),
        needsAttentionCount: Number(rewardsHealth.needsAttentionCount || 0),
      },
      anchoring: {
        total: anchors.length,
        pending: Number(anchorCounts.pending || 0),
        submitted: Number(anchorCounts.submitted || 0),
        confirmed: Number(anchorCounts.confirmed || 0),
        failed: Number(anchorCounts.failed || 0),
      },
    };
  }, [data]);

  return {
    data,
    summary,
    loading,
    error,
    lastUpdatedAt: autoRefresh.lastUpdatedAt || lastUpdatedAt,
    isRefreshing: autoRefresh.isRefreshing,
    load,
  };
}

export default useAdminOverview;
