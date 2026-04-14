import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { confessionsApi } from '../../../api/endpoints';
import { useAuth } from '../../../auth/auth.hooks';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Table from '../../../components/ui/Table';
import Pagination from '../../../components/ui/Pagination';
import Badge from '../../../components/ui/Badge';
import PageHeader from '../../../components/ui/PageHeader';
import { formatDateTime } from '../../../utils/formatters';
import { localizeSessionTypeName } from '../../../utils/sessionTypeLocalization';
import { useI18n } from '../../../i18n/i18n';
import useNavigateToUser from '../../../hooks/useNavigateToUser';

/* ── shared section label ──────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
        {children}
      </span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

export default function ConfessionSessionsPage() {
  const { user, hasPermission } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const navigateToUser = useNavigateToUser();
  const canCreate = hasPermission('CONFESSIONS_CREATE');
  const currentUserId = user?._id || user?.id || null;
  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [cursor, setCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([null]);
  const [limit] = useState(20);
  const [showMineOnly, setShowMineOnly] = useState(false);

  const resetPagination = () => {
    setCursor(null);
    setCursorStack([null]);
  };

  const sessionQueryParams = useMemo(
    () => ({
      limit,
      order: 'desc',
      ...(cursor && { cursor }),
      ...(showMineOnly && currentUserId ? { createdByUserId: currentUserId } : {}),
    }),
    [cursor, currentUserId, limit, showMineOnly]
  );

  const { data: sessionsRes, isLoading: sessionsLoading } = useQuery({
    queryKey: ['confessions', 'sessions', sessionQueryParams],
    queryFn: async () => {
      const { data } = await confessionsApi.listSessions(sessionQueryParams);
      return data;
    },
    keepPreviousData: true,
    staleTime: 30000,
  });

  const sessions = sessionsRes?.data ?? [];
  const sessionsMeta = sessionsRes?.meta ?? null;
  const sectionTitle = showMineOnly
    ? tf('confessions.sessions.mineTitle', 'My Created Sessions')
    : t('confessions.sessions.recentTitle');
  const emptyTitle = showMineOnly
    ? tf('confessions.sessions.emptyMineTitle', 'No created confession sessions yet')
    : t('confessions.sessions.emptyTitle');
  const emptyDescription = showMineOnly
    ? tf(
        'confessions.sessions.emptyMineDescription',
        'Sessions created by your account will appear here.'
      )
    : t('confessions.sessions.emptyDescription');

  const handleNext = () => {
    if (sessionsMeta?.nextCursor) {
      setCursorStack((prev) => [...prev, sessionsMeta.nextCursor]);
      setCursor(sessionsMeta.nextCursor);
    }
  };

  const handlePrev = () => {
    setCursorStack((prev) => {
      const next = prev.slice(0, -1);
      setCursor(next[next.length - 1] || null);
      return next;
    });
  };

  const columns = useMemo(() => [
    {
      key: 'attendee',
      label: t('confessions.sessions.columns.attendee'),
      render: (row) => (
        <button
          type="button"
          onClick={() => navigateToUser(row.attendee?.id)}
          className="group text-start"
        >
          <p className="font-medium text-heading transition-colors group-hover:text-primary">
            {row.attendee?.fullName || t('common.placeholder.empty')}
          </p>
          {row.attendee?.phonePrimary && (
            <p className="text-xs text-muted direction-ltr">{row.attendee.phonePrimary}</p>
          )}
        </button>
      ),
    },
    {
      key: 'createdBy',
      label: t('confessions.sessions.columns.createdBy'),
      render: (row) => (
        <span className="text-sm text-heading">
          {row.createdByUser?.fullName || t('common.placeholder.empty')}
        </span>
      ),
    },
    {
      key: 'sessionType',
      label: t('confessions.sessions.columns.type'),
      render: (row) => (
        <Badge variant="primary">
          {localizeSessionTypeName(row.sessionType?.name, t)}
        </Badge>
      ),
    },
    {
      key: 'scheduledAt',
      label: t('confessions.sessions.columns.scheduledAt'),
      render: (row) => (
        <span className="text-sm text-heading">{formatDateTime(row.scheduledAt)}</span>
      ),
    },
    {
      key: 'nextSessionAt',
      label: t('confessions.sessions.columns.nextSessionAt'),
      render: (row) =>
        row.nextSessionAt ? (
          <span className="text-sm text-heading">{formatDateTime(row.nextSessionAt)}</span>
        ) : (
          <span className="text-sm text-muted">{t('common.placeholder.empty')}</span>
        ),
    },
  ], [navigateToUser, t]);

  return (
    <div className="animate-fade-in space-y-8 pb-10">

      {/* ── Breadcrumbs ── */}
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('confessions.sessions.page') },
        ]}
      />

      {/* ══ PAGE HEADER ═══════════════════════════════════════════════════ */}
      <PageHeader
        className="border-b border-border pb-6"
        title={t('confessions.sessions.recentTitle')}
        subtitle={t('confessions.sessions.recentSubtitle')}
        actions={(
          <div className="flex flex-wrap gap-2">
            {currentUserId ? (
              <Button
                type="button"
                size="sm"
                variant={showMineOnly ? 'primary' : 'outline'}
                onClick={() => {
                  setShowMineOnly((prev) => !prev);
                  resetPagination();
                }}
              >
                {showMineOnly
                  ? tf('confessions.sessions.showAllAction', 'Show all sessions')
                  : tf('confessions.sessions.showMineAction', 'My created sessions')}
              </Button>
            ) : null}
            {canCreate ? (
              <Button
                icon={CalendarPlus}
                onClick={() => navigate('/dashboard/confessions/new')}
              >
                {t('confessions.sessions.createAction')}
              </Button>
            ) : null}
          </div>
        )}
      />

      {/* ══ TABLE SECTION ═════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>{sectionTitle}</SectionLabel>
          {sessionsMeta?.count != null && (
            <span className="text-xs text-muted">{sessionsMeta.count}</span>
          )}
        </div>

        <div className="overflow-hidden tttable">
          <Table
            columns={columns}
            data={sessions}
            loading={sessionsLoading}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />

          <div className="border-t border-border px-4 pb-4 pt-2">
            <Pagination
              meta={sessionsMeta}
              onLoadMore={handleNext}
              onPrev={handlePrev}
              cursors={cursorStack}
              loading={sessionsLoading}
            />
          </div>
        </div>
      </section>

    </div>
  );
}
