import { usersApi } from '../../../api/endpoints';

export const EMPTY = '---';
export const PAGE_LIMIT = 100;
export const MAX_PAGE_REQUESTS = 200;
export const QUICK_USERS_LIMIT = 14;
export const RANK_LIMIT = 8;

export const FAMILY_HOUSE_ANALYTICS_PATH = '/dashboard/users/family-house/analytics';
export const FAMILY_HOUSE_DETAILS_PATH = '/dashboard/users/family-house/details';

export function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function buildLookupQuery(lookupType, lookupName) {
  return new URLSearchParams({
    lookupType: String(lookupType || '').trim(),
    lookupName: String(lookupName || '').trim(),
  }).toString();
}

export function buildNamedCountList(users, field) {
  const map = new Map();

  users.forEach((user) => {
    const rawValue = String(user?.[field] || '').trim();
    if (!rawValue) return;

    const normalizedValue = normalizeText(rawValue);
    const current = map.get(normalizedValue);

    if (current) {
      current.count += 1;
      return;
    }

    map.set(normalizedValue, {
      name: rawValue,
      count: 1,
    });
  });

  return [...map.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

export function buildCountList(values) {
  const map = new Map();

  values.forEach((value) => {
    const key = String(value || '').trim();
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });

  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function fetchUsersWithPagination(filters = {}) {
  const users = [];
  const seenIds = new Set();
  let cursor = null;
  let attempts = 0;

  while (attempts < MAX_PAGE_REQUESTS) {
    const { data } = await usersApi.list({
      limit: PAGE_LIMIT,
      sort: 'createdAt',
      order: 'asc',
      ...(cursor ? { cursor } : {}),
      ...filters,
    });

    const batch = Array.isArray(data?.data) ? data.data : [];
    batch.forEach((user) => {
      const userId = user?._id || user?.id;
      if (userId && seenIds.has(userId)) return;
      if (userId) seenIds.add(userId);
      users.push(user);
    });

    const hasMore = Boolean(data?.meta?.hasMore);
    const nextCursor = data?.meta?.nextCursor;

    if (!hasMore || !nextCursor || nextCursor === cursor) break;
    cursor = nextCursor;
    attempts += 1;
  }

  return users;
}
