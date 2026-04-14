import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Eye, Pencil, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { notificationsApi } from '../../../api/endpoints';
import { useAuth } from '../../../auth/auth.hooks';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import PageHeader from '../../../components/ui/PageHeader';
import { useI18n } from '../../../i18n/i18n';
import { formatDateTime } from '../../../utils/formatters';
import { localizeNotificationTypeName } from '../../../utils/notificationTypeLocalization';

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{children}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

function NewsCard({ notification, onOpen, onEdit, canEdit, t }) {
  const detailsCount = Array.isArray(notification?.details) ? notification.details.length : 0;

  return (
    <article className="overflow-hidden tttable shadow-card transition-all hover:border-primary/30 hover:shadow-lg">
      {notification.coverImageUrl ? (
        <img src={notification.coverImageUrl} alt="" className="h-44 w-full object-cover" />
      ) : (
        <div className="h-44 w-full bg-gradient-to-br from-primary/15 via-accent/10 to-surface-alt" />
      )}

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{localizeNotificationTypeName(notification.type?.name, t)}</Badge>
          <Badge variant={notification.isActive ? 'success' : 'default'}>
            {notification.isActive ? t('notifications.status.active') : t('notifications.status.inactive')}
          </Badge>
          <span className="text-xs text-muted">
            <CalendarDays className="mb-0.5 me-1 inline h-3 w-3" />
            {notification.eventDate ? formatDateTime(notification.eventDate) : formatDateTime(notification.createdAt)}
          </span>
        </div>

        <div>
          <h3 className="text-xl font-bold leading-snug text-heading">{notification.name}</h3>
          {notification.summary ? (
            <p className="mt-2 line-clamp-3 text-sm text-muted">{notification.summary}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <span>
            {t('notifications.columns.detailsCount')}: {detailsCount}
          </span>
          <span>{formatDateTime(notification.updatedAt)}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" icon={Eye} onClick={onOpen}>
            {t('notifications.actions.readFull')}
          </Button>
          {canEdit ? (
            <Button type="button" size="sm" variant="ghost" icon={Pencil} onClick={onEdit}>
              {t('common.actions.edit')}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function FeaturedNewsCard({ notification, onOpen, onEdit, canEdit, t, tf }) {
  const detailsCount = Array.isArray(notification?.details) ? notification.details.length : 0;

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="relative min-h-[260px]">
          {notification.coverImageUrl ? (
            <img src={notification.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/15 to-surface-alt" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/5" />
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
            <Badge variant="primary" className='bg-primary text-white'>{localizeNotificationTypeName(notification.type?.name, t)}</Badge>
            <Badge variant={notification.isActive ? 'success' : 'default'}>
              {notification.isActive ? t('notifications.status.active') : t('notifications.status.inactive')}
            </Badge>
          </div>
        </div>

        <div className="space-y-4 p-6 lg:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            {tf('notifications.news.featured', 'Featured News')}
          </p>
          <h2 className="text-2xl font-bold leading-tight text-heading">{notification.name}</h2>
          {notification.summary ? (
            <p className="line-clamp-4 text-sm text-muted">{notification.summary}</p>
          ) : null}

          <div className="flex flex-wrap gap-4 text-xs text-muted">
            <span>
              <CalendarDays className="mb-0.5 me-1 inline h-3 w-3" />
              {notification.eventDate ? formatDateTime(notification.eventDate) : formatDateTime(notification.createdAt)}
            </span>
            <span>
              {t('notifications.columns.detailsCount')}: {detailsCount}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" icon={Eye} onClick={onOpen}>
              {t('notifications.actions.readFull')}
            </Button>
            {canEdit ? (
              <Button type="button" variant="ghost" icon={Pencil} onClick={onEdit}>
                {t('common.actions.edit')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { hasPermission } = useAuth();

  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const canCreate = hasPermission('NOTIFICATIONS_CREATE');
  const canEdit = hasPermission('NOTIFICATIONS_UPDATE');

  const [filters, setFilters] = useState({ q: '', typeId: '', isActive: 'all' });
  const [cursor, setCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([null]);
  const [limit] = useState(20);

  useEffect(() => {
    setCursor(null);
    setCursorStack([null]);
  }, [filters.q, filters.typeId, filters.isActive]);

  const { data: typesRes } = useQuery({
    queryKey: ['notifications', 'types'],
    queryFn: async () => {
      const { data } = await notificationsApi.listTypes();
      return data;
    },
    staleTime: 60000,
  });

  const typeOptions = useMemo(() => {
    const types = Array.isArray(typesRes?.data) ? typesRes.data : [];
    return types.map((type) => ({
      value: type.id,
      label: localizeNotificationTypeName(type.name, t),
    }));
  }, [typesRes, t]);

  const listParams = useMemo(() => {
    const params = {
      limit,
      order: 'desc',
      excludeSourceType: 'aid_recurring',
      ...(cursor && { cursor }),
      ...(filters.q.trim() && { q: filters.q.trim() }),
      ...(filters.typeId && { typeId: filters.typeId }),
    };

    if (filters.isActive === 'active') params.isActive = true;
    if (filters.isActive === 'inactive') params.isActive = false;

    return params;
  }, [cursor, filters, limit]);

  const { data: listRes, isLoading } = useQuery({
    queryKey: ['notifications', 'list', listParams],
    queryFn: async () => {
      const { data } = await notificationsApi.list(listParams);
      return data;
    },
    keepPreviousData: true,
    staleTime: 30000,
  });

  const notifications = Array.isArray(listRes?.data) ? listRes.data : [];
  const meta = listRes?.meta || null;

  const featuredNotification = notifications[0] || null;
  const regularNotifications = featuredNotification ? notifications.slice(1) : [];

  const hasActiveFilters = Boolean(filters.q || filters.typeId || filters.isActive !== 'all');

  const handleNext = () => {
    if (!meta?.nextCursor) return;
    setCursorStack((prev) => [...prev, meta.nextCursor]);
    setCursor(meta.nextCursor);
  };

  const handlePrev = () => {
    setCursorStack((prev) => {
      const next = prev.slice(0, -1);
      setCursor(next[next.length - 1] || null);
      return next;
    });
  };

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('notifications.page') },
        ]}
      />

      <PageHeader
        title={t('notifications.title')}
        subtitle={tf('notifications.news.subtitle', 'Latest church news, announcements, events, and celebrations.')}
        titleClassName="mt-2 lg:text-4xl"
        subtitleClassName="mt-2 text-sm text-muted"
        actions={(
          <div className="flex flex-wrap gap-2">
            {canCreate ? (
              <Button type="button" icon={Plus} onClick={() => navigate('/dashboard/notifications/new')}>
                {t('notifications.actions.create')}
              </Button>
            ) : null}
          </div>
        )}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>{t('notifications.filters.title')}</SectionLabel>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => setFilters({ q: '', typeId: '', isActive: 'all' })}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('usersListPage.filters.clear')}
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            containerClassName="!mb-0"
            value={filters.q}
            onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            placeholder={t('notifications.filters.searchPlaceholder')}
          />
          <Select
            containerClassName="mb-0"
            value={filters.typeId}
            onChange={(event) => setFilters((prev) => ({ ...prev, typeId: event.target.value }))}
            options={[{ value: '', label: t('notifications.filters.allTypes') }, ...typeOptions]}
          />
          <Select
            containerClassName="mb-0"
            value={filters.isActive}
            onChange={(event) => setFilters((prev) => ({ ...prev, isActive: event.target.value }))}
            options={[
              { value: 'all', label: t('notifications.filters.allStatus') },
              { value: 'active', label: t('notifications.status.active') },
              { value: 'inactive', label: t('notifications.status.inactive') },
            ]}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionLabel>{tf('notifications.news.latest', 'Latest News')}</SectionLabel>
          {meta?.count != null ? <span className="text-xs text-muted">{meta.count}</span> : null}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl border border-border bg-surface-alt" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-10 text-center">
            <h3 className="text-lg font-semibold text-heading">{t('notifications.empty.title')}</h3>
            <p className="mt-2 text-sm text-muted">{t('notifications.empty.description')}</p>
          </div>
        ) : (
          <>
            {featuredNotification ? (
              <FeaturedNewsCard
                notification={featuredNotification}
                t={t}
                tf={tf}
                canEdit={canEdit}
                onOpen={() => navigate(`/dashboard/notifications/${featuredNotification.id}`)}
                onEdit={() => navigate(`/dashboard/notifications/${featuredNotification.id}/edit`)}
              />
            ) : null}

            {regularNotifications.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {regularNotifications.map((notification) => (
                  <NewsCard
                    key={notification.id}
                    notification={notification}
                    t={t}
                    canEdit={canEdit}
                    onOpen={() => navigate(`/dashboard/notifications/${notification.id}`)}
                    onEdit={() => navigate(`/dashboard/notifications/${notification.id}/edit`)}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}

        <div className="rounded-2xl border border-border bg-surface px-4 pb-4 pt-3">
          <Pagination
            meta={meta}
            onLoadMore={handleNext}
            onPrev={handlePrev}
            cursors={cursorStack}
            loading={isLoading}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="button" variant="ghost" icon={ArrowRight} onClick={() => navigate('/dashboard')}>
          {t('common.actions.back')}
        </Button>
      </div>
    </div>
  );
}
