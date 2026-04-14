export const DEFAULT_NOTIFICATION_PAGE_SIZE = 20;
export const NOTIFICATION_PREVIEW_LIMIT = 5;
export const USER_NOTIFICATIONS_LIST_ROOT_KEY = ['user-notifications', 'list'];
export const NOTIFICATION_UNREAD_COUNT_QUERY_KEY = ['user-notifications', 'unread-count'];

export function getUserNotificationsListQueryKey({
  cursor = null,
  limit = DEFAULT_NOTIFICATION_PAGE_SIZE,
} = {}) {
  return [...USER_NOTIFICATIONS_LIST_ROOT_KEY, { cursor, limit }];
}

export function createEmptyNotificationCollection(limit = DEFAULT_NOTIFICATION_PAGE_SIZE) {
  return {
    items: [],
    meta: {
      limit,
      hasMore: false,
      nextCursor: null,
      count: 0,
    },
  };
}

export function normalizeNotificationCollectionResponse(response, fallbackLimit = DEFAULT_NOTIFICATION_PAGE_SIZE) {
  return {
    items: Array.isArray(response?.data) ? response.data : [],
    meta: response?.meta || createEmptyNotificationCollection(fallbackLimit).meta,
  };
}

export function prependNotificationToCollection(current, notification, fallbackLimit = DEFAULT_NOTIFICATION_PAGE_SIZE) {
  const base =
    current && Array.isArray(current.items)
      ? current
      : createEmptyNotificationCollection(fallbackLimit);

  const limit = Number(base.meta?.limit || fallbackLimit);
  const items = [notification, ...base.items.filter((item) => item.id !== notification.id)].slice(0, limit);

  return {
    items,
    meta: {
      ...base.meta,
      limit,
      count: items.length,
    },
  };
}

export function markNotificationReadInCollection(current, notificationId) {
  if (!current || !Array.isArray(current.items)) {
    return current;
  }

  return {
    ...current,
    items: current.items.map((item) =>
      item.id === notificationId
        ? {
            ...item,
            isRead: true,
          }
        : item
    ),
  };
}

export function markAllNotificationsReadInCollection(current) {
  if (!current || !Array.isArray(current.items)) {
    return current;
  }

  return {
    ...current,
    items: current.items.map((item) => ({
      ...item,
      isRead: true,
    })),
  };
}

export function getChatNotificationThreadId(notification) {
  const threadId = String(notification?.metadata?.threadId || '').trim();

  if (notification?.type !== 'chat_message' || !threadId) {
    return '';
  }

  return threadId;
}

export function markThreadNotificationsReadInCollection(current, threadId) {
  const normalizedThreadId = String(threadId || '').trim();
  if (!current || !Array.isArray(current.items) || !normalizedThreadId) {
    return current;
  }

  return {
    ...current,
    items: current.items.map((item) =>
      getChatNotificationThreadId(item) === normalizedThreadId
        ? {
            ...item,
            isRead: true,
          }
        : item
    ),
  };
}

export function getUnreadBadgeLabel(count) {
  if (count > 99) return '99+';
  if (count > 0) return String(count);
  return null;
}

export function getNotificationDestination(notification) {
  return notification?.link || '/dashboard/notifications/inbox';
}

export function isExternalNotificationDestination(destination) {
  return /^https?:\/\//i.test(String(destination || '').trim());
}
