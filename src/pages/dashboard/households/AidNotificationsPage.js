import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BellRing, CalendarClock, CalendarDays, Eye, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { notificationsApi } from '../../../api/endpoints';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';
import Pagination from '../../../components/ui/Pagination';
import PageHeader from '../../../components/ui/PageHeader';
import { useI18n } from '../../../i18n/i18n';
import { localizeAidOccurrence } from '../../../utils/aidOccurrenceLocalization';
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

const COPY = {
  en: {
    page: 'Aid Notifications',
    title: 'Recurring Aid Notifications',
    subtitle: 'Track recurring aid that is due now and see the next date it should be repeated.',
    latest: 'Latest Aid Reminders',
    emptyTitle: 'No aid reminders found',
    emptyDescription: 'Recurring aid reminders will appear here once a repeat date becomes due.',
    dueDate: 'Due date',
    nextRepeat: 'Next repeat',
    originalDate: 'Original date',
    reminderTitle: 'Aid reminder',
    reminderSummary: '{category} aid ({occurrence}) is due on {dueDate}. Next repeat: {nextDueDate}.',
    reminderSummaryNoNext: '{category} aid ({occurrence}) is due on {dueDate}.',
  },
  ar: {
    page: 'إشعارات المساعدات',
    title: 'إشعارات المساعدات المتكررة',
    subtitle: 'تابع المساعدات المتكررة المستحقة الآن واعرف التاريخ التالي الذي يجب فيه تكرارها.',
    latest: 'أحدث تذكيرات المساعدات',
    emptyTitle: 'لا توجد تذكيرات مساعدات',
    emptyDescription: 'ستظهر تذكيرات المساعدات المتكررة هنا عند حلول موعد التكرار.',
    dueDate: 'موعد الاستحقاق',
    nextRepeat: 'موعد التكرار التالي',
    originalDate: 'التاريخ الأصلي',
    reminderTitle: 'تذكير مساعدة',
    reminderSummary: 'مساعدة {category} ({occurrence}) مستحقة في {dueDate}. موعد التكرار التالي: {nextDueDate}.',
    reminderSummaryNoNext: 'مساعدة {category} ({occurrence}) مستحقة في {dueDate}.',
  },
};

function formatDateLabel(value, language) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTemplate(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value ?? ''),
    template
  );
}

function AidReminderCard({ notification, onOpen, t, copy, language }) {
  const detailsCount = Array.isArray(notification?.details) ? notification.details.length : 0;
  const sourceData = notification?.sourceData || {};
  const reminderTitle = sourceData.description
    ? `${copy.reminderTitle}: ${sourceData.description}`
    : notification.name;
  const reminderSummary = sourceData.dueDate
    ? formatTemplate(
        sourceData.nextDueDate ? copy.reminderSummary : copy.reminderSummaryNoNext,
        {
          category: sourceData.category || '-',
          occurrence: localizeAidOccurrence(sourceData.occurrence || '-', language),
          dueDate: formatDateLabel(sourceData.dueDate || notification.eventDate, language),
          nextDueDate: formatDateLabel(sourceData.nextDueDate, language),
        }
      )
    : notification.summary;

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card transition-all hover:border-primary/30 hover:shadow-lg">
      <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary/60" />
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
          <h3 className="text-xl font-bold leading-snug text-heading">{reminderTitle}</h3>
          {reminderSummary ? <p className="mt-2 text-sm text-muted">{reminderSummary}</p> : null}
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-2xl bg-surface-alt/70 p-4 text-sm sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{copy.originalDate}</p>
            <div className="flex items-center gap-2 text-heading">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span>{formatDateLabel(sourceData.originalDate, language)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{copy.dueDate}</p>
            <div className="flex items-center gap-2 text-heading">
              <CalendarClock className="h-4 w-4 text-primary" />
              <span>{formatDateLabel(sourceData.dueDate || notification.eventDate, language)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{copy.nextRepeat}</p>
            <div className="flex items-center gap-2 text-heading">
              <RotateCw className="h-4 w-4 text-primary" />
              <span>{formatDateLabel(sourceData.nextDueDate, language)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <span>
            {t('notifications.columns.detailsCount')}: {detailsCount}
          </span>
          <span>{formatDateTime(notification.updatedAt)}</span>
        </div>

        <Button type="button" size="sm" icon={Eye} onClick={onOpen}>
          {t('notifications.actions.readFull')}
        </Button>
      </div>
    </article>
  );
}

const AID_REMINDER_SOURCE = 'aid_recurring';

export default function AidNotificationsPage() {
  const navigate = useNavigate();
  const { language, t } = useI18n();
  const copy = COPY[language === 'ar' ? 'ar' : 'en'];

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
      sourceType: AID_REMINDER_SOURCE,
      ...(cursor && { cursor }),
      ...(filters.q.trim() && { q: filters.q.trim() }),
      ...(filters.typeId && { typeId: filters.typeId }),
    };

    if (filters.isActive === 'active') params.isActive = true;
    if (filters.isActive === 'inactive') params.isActive = false;

    return params;
  }, [cursor, filters, limit]);

  const { data: listRes, isLoading } = useQuery({
    queryKey: ['aid-notifications', listParams],
    queryFn: async () => {
      const { data } = await notificationsApi.list(listParams);
      return data;
    },
    keepPreviousData: true,
    staleTime: 30000,
  });

  const notifications = Array.isArray(listRes?.data) ? listRes.data : [];
  const meta = listRes?.meta || null;
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
          { label: t('dashboardLayout.menu.theLordsBrethren'), href: '/dashboard/lords-brethren' },
          { label: t('dashboardLayout.menu.disbursedAidHistory'), href: '/dashboard/lords-brethren/aid-history' },
          { label: copy.page },
        ]}
      />

      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        titleClassName="mt-2 lg:text-4xl"
        subtitleClassName="mt-2 text-sm text-muted"
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
          <SectionLabel>{copy.latest}</SectionLabel>
          {meta?.count != null ? <span className="text-xs text-muted">{meta.count}</span> : null}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-2xl border border-border bg-surface-alt" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-10 text-center">
            <BellRing className="mx-auto h-8 w-8 text-muted" />
            <h3 className="mt-4 text-lg font-semibold text-heading">{copy.emptyTitle}</h3>
            <p className="mt-2 text-sm text-muted">
              {copy.emptyDescription}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {notifications.map((notification) => (
              <AidReminderCard
                key={notification.id}
                notification={notification}
                t={t}
                copy={copy}
                language={language}
                onOpen={() => {
                  const sourceData = notification?.sourceData || {};
                  const params = new URLSearchParams({
                    date: sourceData.originalDate || '',
                    category: sourceData.category || '',
                    occurrence: sourceData.occurrence || '',
                    description: sourceData.description || '',
                  });

                  if (notification.id) params.set('reminderId', notification.id);
                  if (sourceData.dueDate) params.set('dueDate', sourceData.dueDate);
                  if (sourceData.nextDueDate) params.set('nextDueDate', sourceData.nextDueDate);

                  navigate(`/dashboard/lords-brethren/aid-history/details?${params.toString()}`);
                }}
              />
            ))}
          </div>
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
        <Button
          type="button"
          variant="ghost"
          icon={ArrowRight}
          onClick={() => navigate('/dashboard/lords-brethren/aid-history')}
        >
          {t('common.actions.back')}
        </Button>
      </div>
    </div>
  );
}
