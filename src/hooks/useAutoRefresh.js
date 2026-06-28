import { useEffect, useRef, useState } from "react";

function clampDelay(delayMs, maxDelayMs) {
  return Math.min(delayMs, maxDelayMs);
}

function getBackoffDelayMs(baseIntervalMs, failures, maxIntervalMs) {
  if (!failures) return baseIntervalMs;

  const multiplier = Math.min(2 ** failures, 8);
  return clampDelay(baseIntervalMs * multiplier, maxIntervalMs);
}

function addJitter(delayMs, jitterRatio) {
  if (!jitterRatio) return delayMs;

  const spread = delayMs * jitterRatio;
  const offset = Math.random() * spread;
  return Math.round(delayMs + offset);
}

export function useAutoRefresh({
  enabled = true,
  refresh,
  intervalMs = 45000,
  maxIntervalMs = 300000,
  refreshWhenHidden = false,
  runImmediately = true,
  jitterRatio = 0.12,
  onError,
} = {}) {
  const refreshRef = useRef(refresh);
  const onErrorRef = useRef(onError);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let timerId = null;
    let inFlight = false;
    let failures = 0;

    const clearTimer = () => {
      if (timerId) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    };

    const scheduleNext = () => {
      clearTimer();

      if (cancelled) return;

      const baseDelay = getBackoffDelayMs(
        intervalMs,
        failures,
        maxIntervalMs
      );

      timerId = window.setTimeout(() => {
        void runRefresh();
      }, addJitter(baseDelay, jitterRatio));
    };

    const shouldSkipHiddenRefresh = () => (
      !refreshWhenHidden &&
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    );

    const runRefresh = async () => {
      if (cancelled || inFlight || !refreshRef.current) return;

      if (shouldSkipHiddenRefresh()) {
        scheduleNext();
        return;
      }

      inFlight = true;
      setIsRefreshing(true);

      try {
        await refreshRef.current();

        failures = 0;

        if (!cancelled) {
          setConsecutiveFailures(0);
          setLastUpdatedAt(new Date());
        }
      } catch (err) {
        failures += 1;

        if (!cancelled) {
          setConsecutiveFailures(failures);
        }

        onErrorRef.current?.(err);
      } finally {
        inFlight = false;

        if (!cancelled) {
          setIsRefreshing(false);
          scheduleNext();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (
        !refreshWhenHidden &&
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        void runRefresh();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    if (runImmediately) {
      void runRefresh();
    } else {
      scheduleNext();
    }

    return () => {
      cancelled = true;
      clearTimer();

      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [
    enabled,
    intervalMs,
    maxIntervalMs,
    refreshWhenHidden,
    runImmediately,
    jitterRatio,
  ]);

  return {
    isRefreshing,
    lastUpdatedAt,
    consecutiveFailures,
  };
}
