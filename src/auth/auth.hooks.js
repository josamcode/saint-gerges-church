import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '../api/endpoints';
import {
  setTokens, setUser as storeUser, setPermissions as storePermissions,
  getUser, getPermissions, clearAuth, isAuthenticated,
  computeEffectivePermissions, getRefreshToken, getAccessToken,
} from './auth.store';
import { normalizeApiError } from '../api/errors';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser());
  const [permissions, setPermissions] = useState(() => getPermissions());
  const [loading, setLoading] = useState(true);

  const applyAuthenticatedSession = useCallback((userData, accessToken, refreshToken) => {
    setTokens(accessToken, refreshToken);
    setUser(userData);
    storeUser(userData);
    const perms = computeEffectivePermissions(userData);
    setPermissions(perms);
    storePermissions(perms);
    return perms;
  }, []);

  const clearClientSession = useCallback(() => {
    clearAuth();
    setUser(null);
    setPermissions([]);
  }, []);

  const hydrateUser = useCallback(async () => {
    if (!isAuthenticated()) {
      clearClientSession();
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      const userData = data.data;
      setUser(userData);
      storeUser(userData);
      const perms = computeEffectivePermissions(userData);
      setPermissions(perms);
      storePermissions(perms);
    } catch (err) {
      const normalized = normalizeApiError(err);
      if (normalized.statusCode === 401) {
        clearClientSession();
      }
    } finally {
      setLoading(false);
    }
  }, [clearClientSession]);

  /** Recover the access token when only a persisted refresh token is still available */
  const restoreSessionIfNeeded = useCallback(async () => {
    const refreshToken = getRefreshToken();
    const accessToken = getAccessToken();
    if (refreshToken && !accessToken) {
      try {
        const { data } = await authApi.refresh(refreshToken);
        const { accessToken: newAccess, refreshToken: newRefresh } = data.data;
        setTokens(newAccess, newRefresh);
      } catch {
        clearClientSession();
      }
    }
  }, [clearClientSession]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await restoreSessionIfNeeded();
      if (!cancelled) hydrateUser();
    })();
    return () => { cancelled = true; };
  }, [restoreSessionIfNeeded, hydrateUser]);

  const login = useCallback(async (identifier, password) => {
    const { data } = await authApi.login({ identifier, password });
    const { user: userData, accessToken, refreshToken } = data.data;
    applyAuthenticatedSession(userData, accessToken, refreshToken);
    return userData;
  }, [applyAuthenticatedSession]);

  const register = useCallback(async (formData) => {
    const { data } = await authApi.register(formData);
    const {
      user: userData,
      accessToken,
      refreshToken,
      requiresApproval,
    } = data.data || {};

    if (accessToken && refreshToken && !requiresApproval) {
      applyAuthenticatedSession(userData, accessToken, refreshToken);
    } else {
      clearClientSession();
    }

    return data.data;
  }, [applyAuthenticatedSession, clearClientSession]);

  const logout = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // silent
    }
    clearClientSession();
    toast.success('تم تسجيل الخروج بنجاح');
  }, [clearClientSession]);

  const hasPermission = useCallback(
    (perm) => permissions.includes(perm),
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (perms) => perms.some((p) => permissions.includes(p)),
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (perms) => perms.every((p) => permissions.includes(p)),
    [permissions]
  );

  const value = {
    user,
    permissions,
    loading,
    login,
    register,
    logout,
    hydrateUser,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
