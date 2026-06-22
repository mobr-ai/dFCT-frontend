import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthRequest } from "./useAuthRequest";
import {
  getCreditPackages,
  getMyAccessSummary,
  getMyCreditBalance,
  getMyPaymentIntents,
} from "../api/billingCredits";

export function useBillingCredits(user, { autoLoad = true } = {}) {
  const { authRequest } = useAuthRequest(user);
  const authRequestRef = useRef(authRequest);

  const [balance, setBalance] = useState(null);
  const [accessSummary, setAccessSummary] = useState(null);
  const [packages, setPackages] = useState([]);
  const [paymentIntents, setPaymentIntents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canLoad = Boolean(user?.access_token);

  useEffect(() => {
    authRequestRef.current = authRequest;
  }, [authRequest]);

  const refresh = useCallback(async () => {
    if (!canLoad) return null;

    setLoading(true);
    setError("");

    try {
      const [nextBalance, nextAccess, nextPackages, nextPaymentIntents] =
        await Promise.all([
          getMyCreditBalance(authRequestRef.current),
          getMyAccessSummary(authRequestRef.current),
          getCreditPackages(authRequestRef.current),
          getMyPaymentIntents(authRequestRef.current),
        ]);

      setBalance(nextBalance);
      setAccessSummary(nextAccess);
      setPackages(nextPackages);
      setPaymentIntents(nextPaymentIntents);

      return {
        balance: nextBalance,
        accessSummary: nextAccess,
        packages: nextPackages,
        paymentIntents: nextPaymentIntents,
      };
    } catch (err) {
      setError(err?.message || "Failed to load billing and credits data.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [canLoad]);

  useEffect(() => {
    if (!autoLoad || !canLoad) return;
    refresh().catch(() => {});
  }, [autoLoad, canLoad, refresh]);

  return useMemo(() => ({
    balance,
    accessSummary,
    packages,
    paymentIntents,
    loading,
    error,
    refresh,
  }), [balance, accessSummary, packages, paymentIntents, loading, error, refresh]);
}
