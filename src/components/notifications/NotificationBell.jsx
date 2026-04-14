import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ExternalLink, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { userNotificationsApi } from '../../api/endpoints';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useI18n } from '../../i18n/i18n';
import usePushNotifications from '../../hooks/notifications/usePushNotifications';
import { getLocalizedUserNotificationContent } from '../../utils/userNotificationContent';
import NotificationListItem from './NotificationListItem';
import {
  getChatNotificationThreadId,
  getNotificationDestination,
  getUnreadBadgeLabel,
  getUserNotificationsListQueryKey,
  isExternalNotificationDestination,
  markAllNotificationsReadInCollection,
  markNotificationReadInCollection,
  markThreadNotificationsReadInCollection,
  normalizeNotificationCollectionResponse,
  NOTIFICATION_PREVIEW_LIMIT,
  NOTIFICATION_UNREAD_COUNT_QUERY_KEY,
  prependNotificationToCollection,
  USER_NOTIFICATIONS_LIST_ROOT_KEY,
} from './notificationCenter.shared';
import { useSocketEvent } from '../../realtime/socket.provider';

const FIRST_PAGE_QUERY_KEY = getUserNotificationsListQueryKey();
const PREVIEW_QUERY_KEY = getUserNotificationsListQueryKey({ limit: NOTIFICATION_PREVIEW_LIMIT });
const VIEWPORT_PINNED_BREAKPOINT = 1024;
const DESKTOP_DROPDOWN_WIDTH = 300;
const PUSH_ENABLE_PROMPT_SESSION_KEY = 'church_push_enable_prompt_seen';

export default function NotificationBell() {
  const { t, isRTL, language } = useI18n();
  const {
    supported: pushSupported,
    subscribed: pushSubscribed,
    permission: pushPermission,
    loading: pushLoading,
    error: pushError,
    enablePush,
  } = usePushNotifications();
  const tf = (key, fallback, values) => {
    const value = t(key, values);
    return value === key ? fallback : value;
  };

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [openingNotificationId, setOpeningNotificationId] = useState('');
  const [viewportPinned, setViewportPinned] = useState(false);
  const [floatingPanelTop, setFloatingPanelTop] = useState(0);
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  const unreadCountQuery = useQuery({
    queryKey: NOTIFICATION_UNREAD_COUNT_QUERY_KEY,
    queryFn: async () => {
      const { data } = await userNotificationsApi.unreadCount();
      return Number(data?.data?.unreadCount || 0);
    },
    staleTime: 30000,
  });

  const previewQuery = useQuery({
    queryKey: PREVIEW_QUERY_KEY,
    queryFn: async () => {
      const { data } = await userNotificationsApi.list({ limit: NOTIFICATION_PREVIEW_LIMIT });
      return normalizeNotificationCollectionResponse(data, NOTIFICATION_PREVIEW_LIMIT);
    },
    staleTime: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId) => userNotificationsApi.markRead(notificationId),
    onSuccess: (response, notificationId) => {
      const unreadCount = Number(response?.data?.data?.unreadCount ?? 0);
      queryClient.setQueryData(NOTIFICATION_UNREAD_COUNT_QUERY_KEY, unreadCount);
      queryClient.setQueryData(PREVIEW_QUERY_KEY, (current) =>
        markNotificationReadInCollection(current, notificationId)
      );
      queryClient.setQueryData(FIRST_PAGE_QUERY_KEY, (current) =>
        markNotificationReadInCollection(current, notificationId)
      );
    },
  });

  const readAllMutation = useMutation({
    mutationFn: () => userNotificationsApi.readAll(),
    onSuccess: () => {
      queryClient.setQueryData(NOTIFICATION_UNREAD_COUNT_QUERY_KEY, 0);
      queryClient.setQueryData(PREVIEW_QUERY_KEY, (current) =>
        markAllNotificationsReadInCollection(current)
      );
      queryClient.setQueryData(FIRST_PAGE_QUERY_KEY, (current) =>
        markAllNotificationsReadInCollection(current)
      );
    },
  });

  const previewItems = useMemo(
    () => (Array.isArray(previewQuery.data?.items) ? previewQuery.data.items : []),
    [previewQuery.data]
  );
  const unreadCount = Number(unreadCountQuery.data || 0);
  const unreadBadge = getUnreadBadgeLabel(unreadCount);
  const activeChatThreadId = useMemo(() => {
    if (location.pathname !== '/dashboard/chats') {
      return '';
    }

    return new URLSearchParams(location.search).get('threadId') || '';
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updatePanelPosition = () => {
      const shouldPinToViewport = window.innerWidth < VIEWPORT_PINNED_BREAKPOINT;
      setViewportPinned(shouldPinToViewport);

      if (!shouldPinToViewport) {
        return;
      }

      const triggerRect = containerRef.current?.getBoundingClientRect();
      setFloatingPanelTop((triggerRect?.bottom || 0) + 8);
    };

    updatePanelPosition();

    if (!open) {
      return undefined;
    }

    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !pushSupported ||
      pushSubscribed ||
      pushPermission !== 'default'
    ) {
      setShowPushPrompt(false);
      return;
    }

    const hasShownPrompt = window.sessionStorage.getItem(PUSH_ENABLE_PROMPT_SESSION_KEY) === '1';
    if (hasShownPrompt) {
      return;
    }

    window.sessionStorage.setItem(PUSH_ENABLE_PROMPT_SESSION_KEY, '1');
    setShowPushPrompt(true);
  }, [pushPermission, pushSubscribed, pushSupported]);

  const applyNewNotification = (notification) => {
    queryClient.setQueryData(NOTIFICATION_UNREAD_COUNT_QUERY_KEY, (current = 0) => Number(current || 0) + 1);
    queryClient.setQueryData(PREVIEW_QUERY_KEY, (current) =>
      prependNotificationToCollection(current, notification, NOTIFICATION_PREVIEW_LIMIT)
    );
    queryClient.setQueryData(FIRST_PAGE_QUERY_KEY, (current) =>
      prependNotificationToCollection(current, notification)
    );
  };

  const applyThreadReadState = (threadId, unreadCountValue) => {
    queryClient.setQueryData(
      NOTIFICATION_UNREAD_COUNT_QUERY_KEY,
      Math.max(0, Number(unreadCountValue || 0))
    );
    queryClient.setQueriesData(
      { queryKey: USER_NOTIFICATIONS_LIST_ROOT_KEY },
      (current) => markThreadNotificationsReadInCollection(current, threadId)
    );
  };

  const showBrowserNotification = async (notification) => {
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      pushPermission !== 'granted' ||
      !notification?.id
    ) {
      return false;
    }

    const destination = getNotificationDestination(notification);
    const content = getLocalizedUserNotificationContent(notification, language);
    const options = {
      body: content.message || '',
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: `user-notification:${notification.id}`,
      renotify: false,
      data: {
        link: destination,
        notificationId: notification.id,
        type: notification.type || null,
      },
    };

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.showNotification) {
        await registration.showNotification(content.title || tf('notificationCenter.title', 'Notification Center'), options);
        return true;
      }
    }

    if (!('Notification' in window)) {
      return false;
    }

    const browserNotification = new window.Notification(
      content.title || tf('notificationCenter.title', 'Notification Center'),
      options
    );

    browserNotification.onclick = () => {
      window.focus();

      if (isExternalNotificationDestination(destination)) {
        window.location.href = destination;
      } else {
        navigate(destination);
      }

      browserNotification.close();
    };

    return true;
  };

  const markThreadReadMutation = useMutation({
    mutationFn: (threadId) => userNotificationsApi.markThreadRead(threadId),
    onSuccess: (response, threadId) => {
      const nextUnreadCount = Number(response?.data?.data?.unreadCount ?? 0);
      applyThreadReadState(threadId, nextUnreadCount);
    },
  });

  const handleEnablePushFromPrompt = async () => {
    try {
      await enablePush();
      setShowPushPrompt(false);
      toast.success(tf('notificationCenter.push.enabled', 'Browser notifications enabled.'));
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          tf('notificationCenter.push.enableFailed', 'Failed to enable browser notifications.')
      );
    }
  };

  useSocketEvent('notification:new', ({ notification }) => {
    if (!notification?.id) return;

    const notificationThreadId = getChatNotificationThreadId(notification);
    const viewingSameChatThread =
      Boolean(notificationThreadId) &&
      location.pathname === '/dashboard/chats' &&
      notificationThreadId === activeChatThreadId;

    if (viewingSameChatThread) {
      markThreadReadMutation.mutate(notificationThreadId);
      return;
    }

    applyNewNotification(notification);

    const shouldShowBrowserNotification =
      typeof document !== 'undefined' &&
      pushPermission === 'granted' &&
      document.visibilityState !== 'visible';

    if (shouldShowBrowserNotification) {
      void showBrowserNotification(notification).catch(() => undefined);
      return;
    }

    if (location.pathname !== '/dashboard/notifications/inbox') {
      const content = getLocalizedUserNotificationContent(notification, language);
      toast.success(`${content.title || notification.title || tf('notificationCenter.defaults.title', 'Notification')}`, {
        duration: 3500,
      });
    }
  });

  useSocketEvent('notification:read', ({ notificationId, unreadCount: nextUnreadCount }) => {
    if (!notificationId) return;

    queryClient.setQueryData(NOTIFICATION_UNREAD_COUNT_QUERY_KEY, Number(nextUnreadCount || 0));
    queryClient.setQueryData(PREVIEW_QUERY_KEY, (current) =>
      markNotificationReadInCollection(current, notificationId)
    );
    queryClient.setQueryData(FIRST_PAGE_QUERY_KEY, (current) =>
      markNotificationReadInCollection(current, notificationId)
    );
  });

  useSocketEvent('notification:read-all', ({ unreadCount: nextUnreadCount }) => {
    queryClient.setQueryData(NOTIFICATION_UNREAD_COUNT_QUERY_KEY, Number(nextUnreadCount || 0));
    queryClient.setQueryData(PREVIEW_QUERY_KEY, (current) =>
      markAllNotificationsReadInCollection(current)
    );
    queryClient.setQueryData(FIRST_PAGE_QUERY_KEY, (current) =>
      markAllNotificationsReadInCollection(current)
    );
  });

  useSocketEvent('notification:thread:read', ({ threadId, unreadCount: nextUnreadCount }) => {
    if (!threadId) return;
    applyThreadReadState(threadId, nextUnreadCount);
  });

  const openNotificationDestination = async (notification) => {
    const destination = getNotificationDestination(notification);
    const notificationThreadId = getChatNotificationThreadId(notification);

    if (notificationThreadId) {
      setOpeningNotificationId(notification.id);
      try {
        await markThreadReadMutation.mutateAsync(notificationThreadId);
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            tf('notificationCenter.markReadFailed', 'Failed to update the notification status.')
        );
      } finally {
        setOpeningNotificationId('');
      }
    } else if (!notification?.isRead) {
      setOpeningNotificationId(notification.id);
      try {
        await markReadMutation.mutateAsync(notification.id);
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            tf('notificationCenter.markReadFailed', 'Failed to update the notification status.')
        );
      } finally {
        setOpeningNotificationId('');
      }
    }

    setOpen(false);

    if (isExternalNotificationDestination(destination)) {
      window.location.href = destination;
      return;
    }

    navigate(destination);
  };

  const dropdownClassName = viewportPinned
    ? 'fixed inset-x-0 z-40 rounded-3xl border border-border bg-surface p-4 shadow-2xl'
    : `absolute z-40 mt-2 rounded-3xl border border-border bg-surface p-4 shadow-2xl ${
        isRTL ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
      }`;

  const dropdownStyle = viewportPinned
    ? {
        top: `${floatingPanelTop}px`,
      }
    : {
        width: `min(${DESKTOP_DROPDOWN_WIDTH}px, calc(100vw - 1rem))`,
      };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 text-muted transition-colors hover:bg-surface-alt hover:text-heading"
        aria-label={tf('notificationCenter.open', 'Open notifications')}
      >
        <Bell className="h-[15px] w-[15px]" />
        {unreadBadge ? (
          <span
            className={`absolute -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ${
              isRTL ? '-left-1' : '-right-1'
            }`}
          >
            {unreadBadge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={dropdownClassName}
          style={dropdownStyle}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-heading">
                {tf('notificationCenter.title', 'Notification Center')}
              </p>
              {/* <p className="mt-1 text-xs text-muted">
                {unreadCount > 0
                  ? tf(
                      'notificationCenter.unreadLabel',
                      `${unreadCount} unread notifications`,
                      { count: unreadCount }
                    )
                  : tf('notificationCenter.allCaughtUp', 'You are all caught up.')}
              </p> */}
            </div>

            <button
              type="button"
              onClick={() => navigate('/dashboard/notifications/inbox')}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <span>{tf('notificationCenter.viewAll', 'View all')}</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {previewQuery.isLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-surface-alt/30 p-6 text-sm text-muted">
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {tf('notificationCenter.loading', 'Loading notifications...')}
              </div>
            ) : previewItems.length > 0 ? (
              previewItems.map((notification) => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                  tf={tf}
                  compact
                  loading={openingNotificationId === notification.id}
                  onOpen={() => openNotificationDestination(notification)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-surface-alt/30 p-6 text-center text-sm text-muted">
                {tf('notificationCenter.empty', 'New notifications will appear here.')}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={readAllMutation.isPending}
              disabled={unreadCount === 0}
              onClick={() => readAllMutation.mutate()}
            >
              {tf('notificationCenter.markAllRead', 'Mark all read')}
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        isOpen={showPushPrompt}
        onClose={() => setShowPushPrompt(false)}
        title={tf('notificationCenter.push.promptTitle', 'Enable browser notifications?')}
        size="sm"
        bodyClassName="text-center"
        footerClassName="justify-center"
        footer={(
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowPushPrompt(false)}
            >
              {tf('notificationCenter.push.promptLater', 'Maybe later')}
            </Button>
            <Button
              type="button"
              loading={pushLoading}
              onClick={handleEnablePushFromPrompt}
            >
              {tf('notificationCenter.push.promptEnable', 'Enable notifications')}
            </Button>
          </>
        )}
      >
        <div className="space-y-3 text-sm text-muted">
          <p>
            {tf(
              'notificationCenter.push.promptBody',
              'Turn on browser notifications to receive chat messages and important alerts even when this page is in the background.'
            )}
          </p>
          <p>
            {tf(
              'notificationCenter.push.promptHint',
              'We will ask your browser for permission, then subscribe this device automatically.'
            )}
          </p>
          {pushError ? (
            <p className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
              {pushError}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
