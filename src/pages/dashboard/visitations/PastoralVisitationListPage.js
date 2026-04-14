import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Eye, Plus } from 'lucide-react';
import { visitationsApi } from '../../../api/endpoints';
import { useAuth } from '../../../auth/auth.hooks';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Pagination from '../../../components/ui/Pagination';
import PageHeader from '../../../components/ui/PageHeader';
import Table from '../../../components/ui/Table';
import { useI18n } from '../../../i18n/i18n';
import useNavigateToUser from '../../../hooks/useNavigateToUser';
import { formatDateTime } from '../../../utils/formatters';

/* ── primitives ──────────────────────────────────────────────────────────── */

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

/* ── page ────────────────────────────────────────────────────────────────── */

export default function PastoralVisitationListPage() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();
  const navigateToUser = useNavigateToUser();
  const canCreate = hasPermission('PASTORAL_VISITATIONS_CREATE');

  const [filters, setFilters] = useState({ houseName: '', dateFrom: '', dateTo: '' });
  const [cursor, setCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([null]);
  const [limit] = useState(20);

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const hasActiveFilters = Object.values(filters).some(Boolean);

  /* reset pagination when filters change */
  useEffect(() => {
    setCursor(null);
    setCursorStack([null]);
  }, [filters.houseName, filters.dateFrom, filters.dateTo]);

  const listParams = useMemo(() => ({
    limit,
    order: 'desc',
    ...(cursor && { cursor }),
    ...(filters.houseName.trim() && { houseName: filters.houseName.trim() }),
    ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
    ...(filters.dateTo && { dateTo: filters.dateTo }),
  }), [cursor, filters, limit]);

  const { data: listRes, isLoading } = useQuery({
    queryKey: ['visitations', 'list', listParams],
    queryFn: async () => {
      const { data } = await visitationsApi.list(listParams);
      return data;
    },
    keepPreviousData: true,
    staleTime: 30000,
  });

  const visitations = Array.isArray(listRes?.data) ? listRes.data : [];
  const meta = listRes?.meta || null;

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

  /* ── columns ── */
  const columns = useMemo(() => [
    {
      key: 'houseName',
      label: t('visitations.list.columns.houseName'),
      render: (row) => {
        const houseName = String(row.houseName || '').trim();
        if (!houseName) return <span className="text-muted text-sm">{t('common.placeholder.empty')}</span>;

        const query = new URLSearchParams({ lookupType: 'houseName', lookupName: houseName }).toString();
        return (
          <Link
            to={`/dashboard/users/family-house/details?${query}`}
            className="group inline-flex items-center gap-1 font-medium text-heading transition-colors hover:text-primary"
          >
            {houseName}
            <ArrowUpRight className="h-3 w-3 text-border transition-colors group-hover:text-primary" />
          </Link>
        );
      },
    },
    {
      key: 'visitedAt',
      label: t('visitations.list.columns.visitedAt'),
      render: (row) => <span className="text-sm text-heading">{formatDateTime(row.visitedAt)}</span>,
    },
    {
      key: 'durationMinutes',
      label: t('visitations.list.columns.durationMinutes'),
      render: (row) => (
        <span className="text-sm text-heading">
          {row.durationMinutes || 10}{' '}
          <span className="text-muted">{t('visitations.shared.minutes')}</span>
        </span>
      ),
    },
    {
      key: 'recordedBy',
      label: t('visitations.list.columns.recordedBy'),
      render: (row) =>
        row.recordedBy?.id ? (
          <button
            type="button"
            onClick={() => navigateToUser(row.recordedBy.id)}
            className="group text-start"
          >
            <p className="font-medium text-heading transition-colors group-hover:text-primary">
              {row.recordedBy.fullName || t('common.placeholder.empty')}
            </p>
          </button>
        ) : (
          <span className="text-sm text-muted">{t('common.placeholder.empty')}</span>
        ),
    },
    {
      key: 'recordedAt',
      label: t('visitations.list.columns.recordedAt'),
      render: (row) => <span className="text-xs text-muted">{formatDateTime(row.recordedAt || row.createdAt)}</span>,
    },
    {
      key: 'details',
      label: '',
      cellClassName: 'w-10',
      render: (row) => (
        <Link to={`/dashboard/visitations/${row.id}`}>
          <Button type="button" variant="ghost" size="sm" icon={Eye}>
            {t('visitations.list.viewDetails')}
          </Button>
        </Link>
      ),
    },
  ], [navigateToUser, t]);

  /* ── render ── */
  return (
    <div className="animate-fade-in space-y-8 pb-10">

      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('visitations.list.page') },
        ]}
      />

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <PageHeader
        className="border-b border-border pb-6"
        eyebrow={t('shared.dashboard')}
        title={t('visitations.list.title')}
        subtitle={t('visitations.list.subtitle')}
        actions={
          canCreate ? (
            <Link to="/dashboard/visitations/new">
              <Button icon={Plus}>{t('visitations.list.createAction')}</Button>
            </Link>
          ) : null
        }
      />

      {/* ══ FILTERS ═════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>{t('visitations.list.filtersTitle')}</SectionLabel>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setFilters({ houseName: '', dateFrom: '', dateTo: '' })}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('usersListPage.filters.clear')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            value={filters.houseName}
            onChange={(e) => setFilter('houseName', e.target.value)}
            placeholder={t('visitations.list.houseNameFilterPlaceholder')}
            containerClassName="!mb-0"
          />
          <Input
            type="date"
            dir="ltr"
            value={filters.dateFrom}
            onChange={(e) => setFilter('dateFrom', e.target.value)}
            containerClassName="!mb-0"
          />
          <Input
            type="date"
            dir="ltr"
            value={filters.dateTo}
            onChange={(e) => setFilter('dateTo', e.target.value)}
            containerClassName="!mb-0"
          />
        </div>
      </section>

      {/* ══ TABLE ═══════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>{t('visitations.list.page')}</SectionLabel>
          {meta?.count != null && (
            <span className="text-xs text-muted">{meta.count}</span>
          )}
        </div>

        <div className="overflow-hidden tttable">
          <Table
            columns={columns}
            data={visitations}
            loading={isLoading}
            emptyTitle={t('visitations.list.emptyTitle')}
            emptyDescription={t('visitations.list.emptyDescription')}
          />
          <div className="border-t border-border px-4 pb-4 pt-2">
            <Pagination
              meta={meta}
              onLoadMore={handleNext}
              onPrev={handlePrev}
              cursors={cursorStack}
              loading={isLoading}
            />
          </div>
        </div>
      </section>

    </div>
  );
}
