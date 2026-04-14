import { computeEffectivePermissionsForRole } from '../constants/permissions';

const ACCESS_TOKEN_KEY = 'church_access_token';
const REFRESH_TOKEN_KEY = 'church_refresh_token';
const USER_KEY = 'church_user';
const PERMISSIONS_KEY = 'church_permissions';
export const AUTH_TOKENS_CHANGED_EVENT = 'church:auth-tokens-changed';

let memoryAccessToken = null;

function emitTokensChanged() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_TOKENS_CHANGED_EVENT, {
      detail: {
        accessToken: getAccessToken(),
        refreshToken: getRefreshToken(),
      },
    })
  );
}

function readStoredValue(key) {
  const persistentValue = localStorage.getItem(key);
  if (persistentValue != null) {
    return persistentValue;
  }

  const legacySessionValue = sessionStorage.getItem(key);
  if (legacySessionValue != null) {
    localStorage.setItem(key, legacySessionValue);
    sessionStorage.removeItem(key);
  }

  return legacySessionValue;
}

function writeStoredValue(key, value) {
  if (value == null || value === '') {
    removeStoredValue(key);
    return;
  }

  localStorage.setItem(key, value);
  sessionStorage.removeItem(key);
}

function removeStoredValue(key) {
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
}

export function getAccessToken() {
  return memoryAccessToken || readStoredValue(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return readStoredValue(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken, refreshToken) {
  memoryAccessToken = accessToken || null;
  writeStoredValue(ACCESS_TOKEN_KEY, accessToken || null);
  writeStoredValue(REFRESH_TOKEN_KEY, refreshToken || null);
  emitTokensChanged();
}

export function setUser(user) {
  if (user) {
    writeStoredValue(USER_KEY, JSON.stringify(user));
  } else {
    removeStoredValue(USER_KEY);
  }
}

export function getUser() {
  try {
    const raw = readStoredValue(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    removeStoredValue(USER_KEY);
    return null;
  }
}

export function setPermissions(permissions) {
  if (permissions) {
    writeStoredValue(PERMISSIONS_KEY, JSON.stringify(permissions));
  } else {
    removeStoredValue(PERMISSIONS_KEY);
  }
}

export function getPermissions() {
  try {
    const raw = readStoredValue(PERMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    removeStoredValue(PERMISSIONS_KEY);
    return [];
  }
}

export function clearAuth() {
  memoryAccessToken = null;
  removeStoredValue(ACCESS_TOKEN_KEY);
  removeStoredValue(REFRESH_TOKEN_KEY);
  removeStoredValue(USER_KEY);
  removeStoredValue(PERMISSIONS_KEY);
  emitTokensChanged();
}

export function isAuthenticated() {
  return !!(getAccessToken() && getRefreshToken());
}

export function computeEffectivePermissions(user) {
  if (!user) return [];
  return computeEffectivePermissionsForRole(
    user.role,
    user.extraPermissions || [],
    user.deniedPermissions || []
  );
}
