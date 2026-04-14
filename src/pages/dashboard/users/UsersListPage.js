import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Eye, Edit, Lock, Unlock, Trash2,
  Users, UserCheck,
} from 'lucide-react';
import { usersApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import { useI18n } from '../../../i18n/i18n';
import Button from '../../../components/ui/Button';
import Table, { RowActions } from '../../../components/ui/Table';
import SearchInput from '../../../components/ui/SearchInput';
import Select from '../../../components/ui/Select';
import Pagination from '../../../components/ui/Pagination';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Modal from '../../../components/ui/Modal';
import PageHeader from '../../../components/ui/PageHeader';
import toast from 'react-hot-toast';
import { AGE_GROUPS, formatAgeFromBirthDate, getGenderLabel, getRoleLabel } from '../../../utils/formatters';

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

function getInitial(name) {
  if (!name) return 'U';
  return String(name).trim().charAt(0).toUpperCase();
}

/** Thin overline section label — shared pattern across redesigned pages */
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{children}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────────────────── */

export default function UsersListPage() {
  const visibleAccountStatus = 'approved';
  const { hasPermission } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({ fullName: '', ageGroup: '', gender: '', role: '' });
  const [cursor, setCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([null]);
  const [limit] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const queryParams = {
    limit, sort: 'createdAt', order: 'desc',
    accountStatus: visibleAccountStatus,
    ...(cursor && { cursor }),
    ...(filters.fullName && { fullName: filters.fullName }),
    ...(filters.ageGroup && { ageGroup: filters.ageGroup }),
    ...(filters.gender && { gender: filters.gender }),
    ...(filters.role && { role: filters.role }),
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users', queryParams],
    queryFn: async () => {
      const { data } = await usersApi.list(queryParams);
      return data;
    },
    staleTime: 30000,
    keepPreviousData: true,
  });

  const { data: totalUsersCount = 0, refetch: refetchTotalUsers } = useQuery({
    queryKey: ['users', 'totalCount', visibleAccountStatus],
    queryFn: async () => {
      const { data } = await usersApi.list({
        limit: 1,
        sort: 'createdAt',
        order: 'desc',
        accountStatus: visibleAccountStatus,
      });
      return Number(data?.meta?.totalCount || 0);
    },
    staleTime: 120000,
  });

  const users = useMemo(() => data?.data ?? [], [data?.data]);
  const meta = data?.meta || null;

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCursor(null);
    setCursorStack([null]);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ fullName: '', ageGroup: '', gender: '', role: '' });
    setCursor(null);
    setCursorStack([null]);
  }, []);

  const handleNext = useCallback(() => {
    if (meta?.nextCursor && meta.nextCursor !== cursor) {
      setCursorStack((prev) => [...prev, meta.nextCursor]);
      setCursor(meta.nextCursor);
    }
  }, [cursor, meta?.nextCursor]);

  const handlePrev = useCallback(() => {
    setCursorStack((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      setCursor(next[next.length - 1] || null);
      return next;
    });
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await usersApi.remove(deleteTarget._id || deleteTarget.id);
      toast.success(t('usersListPage.messages.deletedSuccess'));
      setDeleteTarget(null);
      refetch();
      refetchTotalUsers();
    } catch (err) {
      toast.error(normalizeApiError(err).message);
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters = useMemo(() => Object.values(filters).some(Boolean), [filters]);
  const lockedCount = useMemo(() => users.filter((r) => r.isLocked).length, [users]);
  const activeCount = users.length - lockedCount;

  const roleOptions = [
    { value: 'SUPER_ADMIN', label: getRoleLabel('SUPER_ADMIN') },
    { value: 'ADMIN', label: getRoleLabel('ADMIN') },
    { value: 'USER', label: getRoleLabel('USER') },
  ];

  const genderOptions = [
    { value: 'male', label: getGenderLabel('male') },
    { value: 'female', label: getGenderLabel('female') },
  ];

  const columns = useMemo(() => [
    {
      key: 'fullName',
      label: t('usersListPage.columns.name'),
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.avatar?.url ? (
            <img
              src={row.avatar.url}
              alt=""
              className="h-8 w-8 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {getInitial(row.fullName)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-heading">
              {row.fullName || t('common.placeholder.empty')}
            </p>
            <p className="truncate text-xs text-muted direction-ltr text-left">
              {row.phonePrimary || t('common.placeholder.empty')}
            </p>
          </div>
        </div>
      ),
      onClick: (row) => navigate(`/dashboard/users/${row._id}`),
      cellClassName: 'cursor-pointer',
    },
    // {
    //   key: 'role',
    //   label: t('usersListPage.columns.role'),
    //   render: (row) => <Badge variant="primary">{getRoleLabel(row.role)}</Badge>,
    // },
    {
      key: 'ageGroup',
      label: t('usersListPage.columns.ageGroup'),
      render: (row) => row.ageGroup || t('common.placeholder.empty'),
    },
    {
      key: 'age',
      label: t('usersListPage.columns.age'),
      render: (row) => formatAgeFromBirthDate(row.birthDate),
    },
    {
      key: 'gender',
      label: t('usersListPage.columns.gender'),
      render: (row) => getGenderLabel(row.gender),
    },
    {
      key: 'familyName',
      label: t('usersListPage.columns.familyName'),
      render: (row) => (row.familyName || "---"),
    },
    {
      key: 'actions',
      label: '',
      cellClassName: 'w-10',
      render: (row) => (
        <RowActions
          actions={[
            { label: t('common.actions.view'), icon: Eye, onClick: () => navigate(`/dashboard/users/${row._id}`) },
            ...(hasPermission('USERS_UPDATE')
              ? [{ label: t('common.actions.edit'), icon: Edit, onClick: () => navigate(`/dashboard/users/${row._id}/edit`) }]
              : []),
            ...(hasPermission('USERS_LOCK') && !row.isLocked
              ? [{ label: t('common.actions.lock'), icon: Lock, onClick: () => navigate(`/dashboard/users/${row._id}/lock`) }]
              : []),
            ...(hasPermission('USERS_UNLOCK') && row.isLocked
              ? [{ label: t('common.actions.unlock'), icon: Unlock, onClick: () => navigate(`/dashboard/users/${row._id}/unlock`) }]
              : []),
            ...(hasPermission('USERS_DELETE')
              ? [{ divider: true }, { label: t('common.actions.delete'), icon: Trash2, danger: true, onClick: () => setDeleteTarget(row) }]
              : []),
          ]}
        />
      ),
    },
  ], [hasPermission, navigate, t]);

  /* ── render ── */
  return (
    <div className="animate-fade-in space-y-8 pb-10">

      {/* ── Breadcrumbs ── */}
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('shared.users') },
        ]}
      />

      {/* ══ PAGE HEADER ═══════════════════════════════════════════════════ */}
      <PageHeader
        className="border-b border-border pb-6"
        title={t('shared.users')}
        subtitle={t('usersListPage.hero.description')}
        actions={
          hasPermission('USERS_CREATE') ? (
            <Link to="/dashboard/users/new">
              <Button icon={Plus}>{t('usersListPage.actions.addUser')}</Button>
            </Link>
          ) : null
        }
      />

      {/* ══ KPI TILES ═════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* total on page */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              {t('usersListPage.stats.usersOnPage')}
            </p>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-alt text-muted">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 text-4xl font-bold tracking-tight text-heading">{users.length}</p>
          <div className="mt-4 h-0.5 w-10 rounded-full bg-border" />
        </div>

        {/* active */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              {t('usersListPage.stats.activeAccounts')}
            </p>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-success-light text-success">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 text-4xl font-bold tracking-tight text-success">{activeCount}</p>
          <div className="mt-4 h-0.5 w-10 rounded-full bg-success/40" />
        </div>

        {/* total users */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              {t('usersListPage.stats.totalUsers')}
            </p>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-4 text-4xl font-bold tracking-tight text-primary">
            {totalUsersCount}
          </p>
          <div className="mt-4 h-0.5 w-10 rounded-full bg-primary/40" />
        </div>
      </div>

      {/* ══ FILTERS ═══════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>{t('usersListPage.filters.title')}</SectionLabel>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('usersListPage.filters.clear')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SearchInput
            value={filters.fullName}
            onChange={(v) => handleFilterChange('fullName', v)}
            placeholder={t('usersListPage.filters.searchByName')}
          />
          <Select
            options={AGE_GROUPS.map((g) => ({ value: g, label: g }))}
            value={filters.ageGroup}
            onChange={(e) => handleFilterChange('ageGroup', e.target.value)}
            placeholder={t('usersListPage.filters.ageGroup')}
            containerClassName="!mb-0"
          />
          <Select
            options={genderOptions}
            value={filters.gender}
            onChange={(e) => handleFilterChange('gender', e.target.value)}
            placeholder={t('usersListPage.filters.gender')}
            containerClassName="!mb-0"
          />
          <Select
            options={roleOptions}
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            placeholder={t('usersListPage.filters.role')}
            containerClassName="!mb-0"
          />
        </div>
      </section>

      {/* ══ TABLE ═════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>{t('usersListPage.table.title')}</SectionLabel>
          <span className="text-xs text-muted">
            {t('usersListPage.table.results', { count: meta?.count ?? users.length })}
          </span>
        </div>

        <div className="overflow-hidden tttable">
          <Table
            columns={columns}
            data={users}
            loading={isLoading}
            emptyTitle={t('usersListPage.empty.title')}
            emptyDescription={
              hasActiveFilters
                ? t('usersListPage.empty.descriptionFiltered')
                : t('usersListPage.empty.descriptionDefault')
            }
            emptyIcon={Users}
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

      {/* ══ DELETE MODAL ══════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('usersListPage.delete.title')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {t('common.actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleting}>
              {t('common.actions.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {t('usersListPage.delete.confirmPrefix')}{' '}
          <strong className="text-heading">{deleteTarget?.fullName}</strong>{' '}
          {t('usersListPage.delete.confirmSuffix')}
        </p>
      </Modal>
    </div>
  );
}
