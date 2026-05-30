/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";

import { createAppApi } from "../api";
import type { AccessStatus, AppAuthApi } from "../types";

type AccessStatusContextValue = {
  status: AccessStatus | null;
  refresh: () => Promise<AccessStatus | null>;
};

const AccessStatusContext = createContext<AccessStatusContextValue | null>(null);

type AccessStatusProviderProps = PropsWithChildren<{
  authApi: AppAuthApi;
}>;

export function AccessStatusProvider({ authApi, children }: AccessStatusProviderProps) {
  const [status, setStatus] = useState<AccessStatus | null>(authApi.auth?.access ?? null);
  const authRef = useRef(authApi.auth);

  useEffect(() => {
    authRef.current = authApi.auth;
  }, [authApi.auth]);

  const refresh = useCallback(async () => {
    const auth = authRef.current;
    const token = auth?.tokens.access_token ?? null;
    if (!auth || !token) {
      setStatus(null);
      return null;
    }
    const api = createAppApi({
      getAccessToken: () => token,
      refreshAuth: authApi.refreshAuth,
    });
    const nextStatus = await api.accessStatus();
    setStatus(nextStatus);
    if (!isSameAccessStatus(auth.access, nextStatus)) {
      authApi.setAuth({ ...auth, access: nextStatus });
    }
    return nextStatus;
  }, [authApi]);

  useEffect(() => {
    setStatus(authApi.auth?.access ?? null);
  }, [authApi.auth]);

  useEffect(() => {
    if (!authApi.auth?.tokens.access_token) {
      return;
    }
    void refresh();
  }, [authApi.auth?.tokens.access_token, refresh]);

  const value = useMemo(() => ({ status, refresh }), [refresh, status]);
  return <AccessStatusContext.Provider value={value}>{children}</AccessStatusContext.Provider>;
}

function isSameAccessStatus(left: AccessStatus | null | undefined, right: AccessStatus | null | undefined): boolean {
  return (
    (left?.has_access ?? false) === (right?.has_access ?? false) &&
    (left?.order_id ?? null) === (right?.order_id ?? null) &&
    (left?.plan ?? null) === (right?.plan ?? null) &&
    (left?.access_status ?? null) === (right?.access_status ?? null) &&
    (left?.status_label ?? null) === (right?.status_label ?? null) &&
    (left?.expires_at ?? null) === (right?.expires_at ?? null)
  );
}

export const useAccessStatus = (): AccessStatusContextValue => {
  const context = useContext(AccessStatusContext);
  if (!context) {
    throw new Error("useAccessStatus must be used inside AccessStatusProvider");
  }
  return context;
};
