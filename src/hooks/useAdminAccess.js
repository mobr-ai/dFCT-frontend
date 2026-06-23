import { useEffect, useMemo, useState } from "react";

import { getUserAdminIdentity, hasExplicitAdminClaim } from "../utils/adminAccess";
import { useAuthRequest } from "./useAuthRequest";

function getHttpStatus(err) {
  return Number(err?.status || err?.statusCode || err?.response?.status);
}

export function useAdminAccess(userData) {
  const { authRequest } = useAuthRequest(userData);

  const identity = getUserAdminIdentity(userData);
  const hasToken = Boolean(userData?.access_token);
  const explicitAdmin = hasExplicitAdminClaim(userData);

  const [state, setState] = useState({
    isAdmin: false,
    checked: false,
  });

  useEffect(() => {
    let cancelled = false;

    setState({ isAdmin: false, checked: false });

    if (!hasToken || !identity) {
      setState({ isAdmin: false, checked: true });
      return () => {
        cancelled = true;
      };
    }

    if (explicitAdmin) {
      setState({ isAdmin: true, checked: true });
      return () => {
        cancelled = true;
      };
    }

    authRequest
      .get("/api/admin/billing/users?limit=1")
      .then(() => {
        if (!cancelled) {
          setState({ isAdmin: true, checked: true });
        }
      })
      .catch((err) => {
        const status = getHttpStatus(err);

        if (!cancelled) {
          setState({
            isAdmin: false,
            checked: status === 401 || status === 403 || status === 404,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [explicitAdmin, hasToken, identity]);

  return useMemo(
    () => ({
      isAdmin: state.isAdmin,
      checked: state.checked,
    }),
    [state.checked, state.isAdmin],
  );
}
