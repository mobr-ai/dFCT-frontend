import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthRequest } from "./useAuthRequest";
import {
  createAdminCreditGrant,
  getAdminAccessTiers,
  getAdminCreditGrants,
  getAdminCreditPackages,
  getAdminCreditUsers,
  getAdminGatewayStatus,
  getAdminPaymentIntents,
} from "../api/billingCredits";

export function useAdminBillingCredits(user, { autoLoad = true } = {}) {
  const { authRequest } = useAuthRequest(user);
  const authRequestRef = useRef(authRequest);

  const [users, setUsers] = useState([]);
  const [grants, setGrants] = useState([]);
  const [paymentIntents, setPaymentIntents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [accessTiers, setAccessTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const canLoad = Boolean(user?.access_token && user?.is_admin);

  useEffect(() => {
    authRequestRef.current = authRequest;
  }, [authRequest]);

  const refresh = useCallback(async () => {
    if (!canLoad) return null;

    setLoading(true);
    setError("");

    try {
      const [
        nextUsers,
        nextGrants,
        nextPaymentIntents,
        nextPackages,
        nextGateways,
        nextAccessTiers,
      ] = await Promise.all([
        getAdminCreditUsers(authRequestRef.current, { limit: 50 }),
        getAdminCreditGrants(authRequestRef.current, { limit: 25 }),
        getAdminPaymentIntents(authRequestRef.current, { limit: 25 }),
        getAdminCreditPackages(authRequestRef.current),
        getAdminGatewayStatus(authRequestRef.current),
        getAdminAccessTiers(authRequestRef.current),
      ]);

      setUsers(nextUsers);
      setGrants(nextGrants);
      setPaymentIntents(nextPaymentIntents);
      setPackages(nextPackages);
      setGateways(nextGateways);
      setAccessTiers(nextAccessTiers);
    } catch (err) {
      setError(err?.message || "Failed to load admin billing data.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [canLoad]);

  const grantCredits = useCallback(async (payload) => {
    setActionLoading(true);
    setError("");

    try {
      const result = await createAdminCreditGrant(authRequestRef.current, payload);
      await refresh();
      return result;
    } finally {
      setActionLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (!autoLoad || !canLoad) return;
    refresh().catch(() => {});
  }, [autoLoad, canLoad, refresh]);

  return useMemo(() => ({
    users,
    grants,
    paymentIntents,
    packages,
    gateways,
    accessTiers,
    loading,
    actionLoading,
    error,
    refresh,
    grantCredits,
  }), [
    users,
    grants,
    paymentIntents,
    packages,
    gateways,
    accessTiers,
    loading,
    actionLoading,
    error,
    refresh,
    grantCredits,
  ]);
}
