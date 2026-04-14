import { getAccessToken } from '../auth/auth.store';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const VISITOR_STORAGE_KEY = 'church_site_analytics_visitor_id';
const SESSION_STORAGE_KEY = 'church_site_analytics_session_id';
const LAST_ROUTE_STORAGE_KEY = 'church_site_analytics_last_route';
const HEARTBEAT_INTERVAL_MS = 30000;
const REFRESH_GRACE_MS = 10000;
const EXCLUDED_PATH_PREFIXES = ['/dashboard/system-analytics'];

function normalizePath(path) {
  const value = String(path || '/').trim();
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value}`;
}

function isExcludedPath(path) {
  const normalizedPath = normalizePath(path);
  return EXCLUDED_PATH_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

function createTrackingId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID().replace(/-/g, '_');
  }

  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function getStoredValue(storage, key) {
  try {
    return storage?.getItem(key) || '';
  } catch {
    return '';
  }
}

function setStoredValue(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Ignore storage write failures.
  }
}

async function postTracking(payload, { keepalive = false } = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  const accessToken = getAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return fetch(`${API_URL}/system-analytics/sessions/sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    keepalive,
  });
}

class SiteAnalyticsTracker {
  constructor() {
    this.initialized = false;
    this.sessionBootstrapped = false;
    this.needsIdentitySync = false;
    this.user = null;
    this.sessionId = '';
    this.visitorId = '';
    this.currentPath = '';
    this.currentTitle = '';
    this.trackable = false;
    this.activeSince = null;
    this.pendingPageStats = {};
    this.syncInFlight = false;
    this.syncQueued = false;
    this.finalSyncTriggered = false;
    this.heartbeatTimer = null;
  }

  start() {
    if (this.initialized || typeof window === 'undefined') return;

    this.initialized = true;

    document.addEventListener('visibilitychange', this.handleVisibilityChange, {
      passive: true,
    });
    window.addEventListener('pagehide', this.handlePageExit, { passive: true });
    window.addEventListener('beforeunload', this.handlePageExit, { passive: true });
    window.addEventListener('online', this.handleOnline, { passive: true });

    this.heartbeatTimer = window.setInterval(() => {
      if (!this.sessionBootstrapped && !this.trackable) return;

      this.captureActiveTime();
      this.queueSync();
    }, HEARTBEAT_INTERVAL_MS);
  }

  setUser(user) {
    const nextUser = user?.id
      ? {
          id: user.id,
          role: user.role || '',
        }
      : null;

    const changed =
      this.user?.id !== nextUser?.id || this.user?.role !== nextUser?.role;

    this.user = nextUser;

    if (!changed) return;

    if (nextUser) {
      this.needsIdentitySync = true;
    }

    if ((this.trackable || this.hasPendingStats()) && this.sessionId) {
      this.queueSync({ force: true });
    }
  }

  updateRoute({ path, title }) {
    this.start();

    const nextPath = normalizePath(path);
    const nextTitle = String(title || document.title || nextPath).trim();
    const nextTrackable = !isExcludedPath(nextPath);

    this.captureActiveTime();

    const changedPath = this.currentPath !== nextPath;
    const becameTrackable = nextTrackable && !this.trackable;

    this.currentPath = nextPath;
    this.currentTitle = nextTitle;
    this.trackable = nextTrackable;
    this.finalSyncTriggered = false;

    if (nextTrackable) {
      this.ensureTrackingIds();

      if ((changedPath || becameTrackable) && this.shouldRecordView(nextPath)) {
        this.addPageDelta(nextPath, nextTitle, { views: 1, activeSeconds: 0 });
      }

      this.resumeActivityTimer();
      this.queueSync({ force: changedPath || becameTrackable || !this.sessionBootstrapped });
      return;
    }

    this.activeSince = null;

    if (this.hasPendingStats()) {
      this.queueSync({ force: true });
    }
  }

  ensureTrackingIds() {
    if (!this.visitorId) {
      const storedVisitorId = getStoredValue(window.localStorage, VISITOR_STORAGE_KEY);
      this.visitorId = storedVisitorId || createTrackingId();
      setStoredValue(window.localStorage, VISITOR_STORAGE_KEY, this.visitorId);
    }

    if (!this.sessionId) {
      const storedSessionId = getStoredValue(window.sessionStorage, SESSION_STORAGE_KEY);
      this.sessionId = storedSessionId || createTrackingId();
      setStoredValue(window.sessionStorage, SESSION_STORAGE_KEY, this.sessionId);
      this.sessionBootstrapped = false;
    }
  }

  shouldRecordView(path) {
    const now = Date.now();

    try {
      const raw = window.sessionStorage.getItem(LAST_ROUTE_STORAGE_KEY);
      if (raw) {
        const previous = JSON.parse(raw);
        if (
          previous?.path === path &&
          Number.isFinite(previous?.recordedAt) &&
          now - previous.recordedAt < REFRESH_GRACE_MS
        ) {
          window.sessionStorage.setItem(
            LAST_ROUTE_STORAGE_KEY,
            JSON.stringify({ path, recordedAt: now })
          );
          return false;
        }
      }

      window.sessionStorage.setItem(
        LAST_ROUTE_STORAGE_KEY,
        JSON.stringify({ path, recordedAt: now })
      );
    } catch {
      return true;
    }

    return true;
  }

  addPageDelta(path, title, { views = 0, activeSeconds = 0 }) {
    const normalizedPath = normalizePath(path);
    const current = this.pendingPageStats[normalizedPath] || {
      path: normalizedPath,
      title: '',
      views: 0,
      activeSeconds: 0,
    };

    if (title) {
      current.title = title;
    }

    current.views += Math.max(0, Math.trunc(views));
    current.activeSeconds += Math.max(0, Math.trunc(activeSeconds));

    this.pendingPageStats[normalizedPath] = current;
  }

  hasPendingStats() {
    return Object.keys(this.pendingPageStats).length > 0;
  }

  captureActiveTime() {
    if (!this.trackable || !this.currentPath || !this.activeSince) return;

    const now = Date.now();
    const elapsedSeconds = Math.floor((now - this.activeSince) / 1000);

    if (elapsedSeconds <= 0) return;

    this.addPageDelta(this.currentPath, this.currentTitle, {
      activeSeconds: elapsedSeconds,
    });

    this.activeSince += elapsedSeconds * 1000;
  }

  resumeActivityTimer() {
    if (!this.trackable || document.hidden) {
      this.activeSince = null;
      return;
    }

    if (!this.activeSince) {
      this.activeSince = Date.now();
    }
  }

  createSnapshot({ force = false, final = false } = {}) {
    if (!this.sessionId || !this.visitorId) return null;

    const pageDeltas = Object.values(this.pendingPageStats)
      .filter((entry) => entry.views > 0 || entry.activeSeconds > 0)
      .map((entry) => ({
        path: entry.path,
        title: entry.title || '',
        views: entry.views || 0,
        activeSeconds: entry.activeSeconds || 0,
      }));

    const includeMetadata = force || this.needsIdentitySync || !this.sessionBootstrapped;

    if (!pageDeltas.length && !includeMetadata && !final) {
      return null;
    }

    return {
      pageDeltas,
      includeAuth: includeMetadata && !final,
      payload: {
        sessionId: this.sessionId,
        visitorId: this.visitorId,
        occurredAt: new Date().toISOString(),
        currentPath: this.currentPath || '/',
        currentTitle: this.currentTitle || document.title || '/',
        referrer: document.referrer || '',
        language: navigator.language || '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        screenWidth: window.innerWidth || 0,
        screenHeight: window.innerHeight || 0,
        isFinal: final,
        pageDeltas,
      },
    };
  }

  consumeSnapshot(snapshot) {
    snapshot.pageDeltas.forEach((entry) => {
      const current = this.pendingPageStats[entry.path];
      if (!current) return;

      current.views = Math.max(0, (current.views || 0) - (entry.views || 0));
      current.activeSeconds = Math.max(
        0,
        (current.activeSeconds || 0) - (entry.activeSeconds || 0)
      );

      if (current.views === 0 && current.activeSeconds === 0) {
        delete this.pendingPageStats[entry.path];
      } else {
        this.pendingPageStats[entry.path] = current;
      }
    });

    if (snapshot.includeAuth) {
      this.needsIdentitySync = false;
    }

    this.sessionBootstrapped = true;
  }

  async flush({ force = false, final = false } = {}) {
    if (!navigator.onLine || this.syncInFlight) {
      return;
    }

    const snapshot = this.createSnapshot({ force, final });
    if (!snapshot) return;

    if (final) {
      try {
        await postTracking(snapshot.payload, { keepalive: true });
      } catch {
        // Best effort only on final flush.
      }
      return;
    }

    this.syncInFlight = true;

    try {
      const response = await postTracking(snapshot.payload);

      if (!response.ok) {
        throw new Error(`Analytics sync failed with status ${response.status}`);
      }

      this.consumeSnapshot(snapshot);
    } catch {
      // Keep pending deltas for a future retry.
    } finally {
      this.syncInFlight = false;

      if (this.syncQueued) {
        this.syncQueued = false;
        void this.flush({ force: true });
      }
    }
  }

  queueSync({ force = false } = {}) {
    if (!this.sessionId || !this.visitorId) return;

    if (this.syncInFlight) {
      this.syncQueued = this.syncQueued || force || this.hasPendingStats();
      return;
    }

    void this.flush({ force });
  }

  handleVisibilityChange = () => {
    if (document.hidden) {
      this.captureActiveTime();
      this.queueSync();
      return;
    }

    this.finalSyncTriggered = false;
    this.resumeActivityTimer();
  };

  handleOnline = () => {
    if (!this.sessionId) return;
    this.queueSync({ force: true });
  };

  handlePageExit = () => {
    if (this.finalSyncTriggered || !this.sessionId) return;

    this.finalSyncTriggered = true;
    this.captureActiveTime();
    void this.flush({ force: true, final: true });
  };
}

const siteAnalyticsTracker = new SiteAnalyticsTracker();

export default siteAnalyticsTracker;
