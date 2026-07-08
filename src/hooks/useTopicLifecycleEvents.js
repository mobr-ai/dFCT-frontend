import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchPublicTopicLifecycleEvents, fetchTopicLifecycleEvents } from "../api/topicLifecycle";
import { getApiErrorMessage, useAuthRequest } from "./useAuthRequest";

function eventsFromPayload(payload) {
  if (Array.isArray(payload?.lifecycleEvents)) return payload.lifecycleEvents;
  if (Array.isArray(payload?.events)) return payload.events;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

export function useTopicLifecycleEvents(user, topicId, {
  limit = 50,
  enabled = true,
} = {}) {
  const { authRequest } = useAuthRequest(user);
  const authRequestRef = useRef(authRequest);

  const [events, setEvents] = useState([]);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAuthenticated = Boolean(user?.access_token);
  const canLoad = Boolean(enabled && topicId && (!isAuthenticated || authRequest));

  useEffect(() => {
    authRequestRef.current = authRequest;
  }, [authRequest]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!canLoad) {
      setEvents([]);
      setPayload(null);
      setError("");
      return null;
    }

    if (!silent) {
      setLoading(true);
      setError("");
    }

    try {
      const nextPayload = isAuthenticated
        ? await fetchTopicLifecycleEvents(
          authRequestRef.current,
          topicId,
          { limit },
        )
        : await fetchPublicTopicLifecycleEvents(
          topicId,
          { limit },
        );
      const nextEvents = eventsFromPayload(nextPayload);
      setPayload(nextPayload);
      setEvents(nextEvents);
      return nextPayload;
    } catch (err) {
      if (!silent) {
        setError(getApiErrorMessage(err, "Unable to load topic lifecycle events."));
      }
      throw err;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [canLoad, isAuthenticated, limit, topicId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useEffect(() => {
    if (!canLoad) return undefined;

    const handleLifecycleUpdated = (event) => {
      const changedTopicId = event?.detail?.topicId;
      if (changedTopicId && String(changedTopicId) !== String(topicId)) return;
      load({ silent: true }).catch(() => {});
    };

    window.addEventListener("dfct:topic-lifecycle-updated", handleLifecycleUpdated);

    return () => {
      window.removeEventListener("dfct:topic-lifecycle-updated", handleLifecycleUpdated);
    };
  }, [canLoad, load, topicId]);

  return useMemo(() => ({
    events,
    payload,
    loading,
    error,
    canLoad,
    anchorReady: payload?.anchorReady ?? true,
    count: payload?.count ?? events.length,
    refresh: load,
  }), [
    events,
    payload,
    loading,
    error,
    canLoad,
    load,
  ]);
}
