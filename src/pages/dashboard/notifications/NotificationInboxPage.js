import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Bell, BellOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { userNotificationsApi } from '../../../api/endpoints';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Pagination from '../../../components/ui/Pagination';
import PageHeader from '../../../components/ui/PageHeader';
import NotificationListItem from '../../../components/notifications/NotificationListItem';
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
  NOTIFICATION_UNREAD_COUNT_QUERY_KEY,
  USER_NOTIFICATIONS_LIST_ROOT_KEY,
} from '../../../components/notifications/notificationCenter.shared';
import usePushNotifications from '../../../hooks/notifications/usePushNotifications';
import { useI18n } from '../../../i18n/i18n';

const PAGE_SIZE = 20;

export default function NotificationInboxPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const tf = (key, fallback, values) => {
    const value = t(key, values);
    return value === key ? fallback : value;
  };

  const [cursor, setCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([null]);
  const [openingNotificationId, setOpeningNotificationId] = useState('');

  const {
    supported: pushSupported,
    subscribed: pushSubscribed,
    permission: pushPermission,
    loading: pushLoading,
    error: pushError,
    enablePush,
    disablePush,
  } = usePushNotifications();

  const listQueryKey = getUserNotificationsListQueryKey({ cursor, limit: PAGE_SIZE });

  const notificationsQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: async () => {
      const { data } = await userNotificationsApi.list({
        limit: PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
      });
      return normalizeNotificationCollectionResponse(data, PAGE_SIZE);
    },
    staleTime: 30000,
  });

  const unreadCountQuery = useQuery({
    queryKey: NOTIFICATION_UNREAD_COUNT_QUERY_KEY,
    queryFn: async () => {
      const { data } = await userNotificationsApi.unreadCount();
      return Number(data?.data?.unreadCount || 0);
    },
    staleTime: 30000,
  });

  const notifications = useMemo(
    () => (Array.isArray(notificationsQuery.data?.items) ? notificationsQuery.data.items : []),
    [notificationsQuery.data]
  );
  const meta = notificationsQuery.data?.meta || null;
  const unreadCount = Number(unreadCountQuery.data || 0);
  const unreadBadge = getUnreadBadgeLabel(unreadCount);

  const markReadMutation = useMutation({
    mutationFn: (notificationId) => userNotificationsApi.markRead(notificationId),
    onSuccess: (response, notificationId) => {
      const nextUnreadCount = Number(response?.data?.data?.unreadCount ?? 0);
      queryClient.setQueryData(NOTIFICATION_UNREAD_COUNT_QUERY_KEY, nextUnreadCount);
      queryClient.setQueryData(listQueryKey, (current) =>
        markNotificationReadInCollection(current, notificationId)
      );
    },
  });

  const markThreadReadMutation = useMutation({
    mutationFn: (threadId) => userNotificationsApi.markThreadRead(threadId),
    onSuccess: (response, threadId) => {
      const nextUnreadCount = Number(response?.data?.data?.unreadCount ?? 0);
      queryClient.setQueryData(NOTIFICATION_UNREAD_COUNT_QUERY_KEY, nextUnreadCount);
      queryClient.setQueriesData(
        { queryKey: USER_NOTIFICATIONS_LIST_ROOT_KEY },
        (current) => markThreadNotificationsReadInCollection(current, threadId)
      );
    },
  });

  const readAllMutation = useMutation({
    mutationFn: () => userNotificationsApi.readAll(),
    onSuccess: () => {
      queryClient.setQueryData(NOTIFICATION_UNREAD_COUNT_QUERY_KEY, 0);
      queryClient.setQueryData(listQueryKey, (current) =>
        markAllNotificationsReadInCollection(current)
      );
    },
  });

  useEffect(() => {
    setCursor(null);
    setCursorStack([null]);
  }, []);

  const handleNext = () => {
    if (!meta?.nextCursor) return;
    setCursorStack((current) => [...current, meta.nextCursor]);
    setCursor(meta.nextCursor);
  };

  const handlePrev = () => {
    setCursorStack((current) => {
      const next = current.slice(0, -1);
      setCursor(next[next.length - 1] || null);
      return next;
    });
  };

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

    if (isExternalNotificationDestination(destination)) {
      window.location.href = destination;
      return;
    }

    navigate(destination);
  };

  const handleEnablePush = async () => {
    try {
      await enablePush();
      toast.success(tf('notificationCenter.push.enabled', 'Push notifications enabled.'));
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || tf('notificationCenter.push.enableFailed', 'Failed to enable push notifications.'));
    }
  };

  const handleDisablePush = async () => {
    try {
      await disablePush();
      toast.success(tf('notificationCenter.push.disabled', 'Push notifications disabled.'));
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || tf('notificationCenter.push.disableFailed', 'Failed to disable push notifications.'));
    }
  };

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: tf('notificationCenter.page', 'Notification Center') },
        ]}
      />

      <PageHeader
        eyebrow={t('shared.dashboard')}
        title={tf('notificationCenter.pageTitle', 'Your Notifications')}
        subtitle={tf(
          'notificationCenter.pageSubtitle',
          'In-app alerts, live updates, and browser push delivery all come through this inbox.'
        )}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              icon={ArrowRight}
              onClick={() => navigate('/dashboard')}
            >
              {t('common.actions.back')}
            </Button>
            {pushSupported ? (
              pushSubscribed ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  loading={pushLoading}
                  onClick={handleDisablePush}
                >
                  {tf('notificationCenter.push.turnOffNotifications', 'Turn off')}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={pushLoading}
                  onClick={handleEnablePush}
                >
                  {tf('notificationCenter.push.turnOnNotifications', 'Turn on')}
                </Button>
              )
            ) : (
              <BellOff className="h-4 w-4 text-muted" />
            )}
            <Button
              type="button"
              variant="outline"
              loading={readAllMutation.isPending}
              disabled={unreadCount === 0}
              onClick={() => readAllMutation.mutate()}
            >
              {tf('notificationCenter.markAllRead', 'Mark all read')}
            </Button>
          </div>
        )}
      />

      <section className="grid">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-heading">
                {tf('notificationCenter.listTitle', 'Inbox')}
              </p>
              <p className="mt-1 text-sm text-muted">
                {unreadBadge
                  ? tf('notificationCenter.unreadSummary', `${unreadBadge} unread`, {
                    count: unreadBadge,
                  })
                  : tf('notificationCenter.allCaughtUp', 'You are all caught up.')}
              </p>
            </div>
          </div>

          <div className="space-y-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {notificationsQuery.isLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-surface-alt/30 p-8 text-sm text-muted">
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {tf('notificationCenter.loading', 'Loading notifications...')}
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                  tf={tf}
                  loading={openingNotificationId === notification.id}
                  onOpen={() => openNotificationDestination(notification)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-surface-alt/30 p-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted" />
                <h3 className="mt-4 text-lg font-semibold text-heading">
                  {tf('notificationCenter.emptyTitle', 'No notifications yet')}
                </h3>
                <p className="mt-2 text-sm text-muted">
                  {tf(
                    'notificationCenter.emptyDescription',
                    'New chat messages, system events, and admin alerts will appear here.'
                  )}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-surface px-4 pb-4 pt-3">
            <Pagination
              meta={meta}
              onLoadMore={handleNext}
              onPrev={handlePrev}
              cursors={cursorStack}
              loading={notificationsQuery.isLoading}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
