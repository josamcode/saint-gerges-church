import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, CalendarPlus, Users, Layers3, ListChecks, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { normalizeApiError } from '../../../api/errors';
import { meetingsApi } from '../../../api/endpoints';
import { useAuth } from '../../../auth/auth.hooks';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Table, { RowActions } from '../../../components/ui/Table';
import PageHeader from '../../../components/ui/PageHeader';
import { useI18n } from '../../../i18n/i18n';
import { formatDateTime } from '../../../utils/formatters';
import { getDayLabel, getDayOptions } from './meetingsForm.utils';

const MEETING_PERMISSIONS = [
  'MEETINGS_VIEW_OWN',
  'MEETINGS_VIEW', 'MEETINGS_CREATE', 'MEETINGS_UPDATE', 'MEETINGS_DELETE',
  'MEETINGS_SERVANTS_MANAGE', 'MEETINGS_COMMITTEES_MANAGE', 'MEETINGS_ACTIVITIES_MANAGE',
];

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{children}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

export default function MeetingsManagementPage() {
  const { t } = useI18n();
  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasAnyPermission, hasPermission } = useAuth();

  const canViewMeetings = hasPermission('MEETINGS_VIEW');
  const canViewOwnMeetings = hasPermission('MEETINGS_VIEW_OWN');
  const canCreateMeetings = hasPermission('MEETINGS_CREATE');
  const canUpdateMeetings = hasPermission('MEETINGS_UPDATE');
  const canUpdateMeetingsSections =
    hasPermission('MEETINGS_SERVANTS_MANAGE') ||
    hasPermission('MEETINGS_COMMITTEES_MANAGE') ||
    hasPermission('MEETINGS_ACTIVITIES_MANAGE');
  const canDeleteMeetings = hasPermission('MEETINGS_DELETE');
  const canViewMeetingsList =
    canViewMeetings ||
    canViewOwnMeetings ||
    canUpdateMeetings ||
    canUpdateMeetingsSections ||
    canDeleteMeetings;
  const meetingsListTitle = (canViewMeetings || canUpdateMeetings || canUpdateMeetingsSections || canDeleteMeetings)
    ? t('meetings.meetingsPageTitle')
    : tf('meetings.myMeetingsPageTitle', 'My Meetings');
  const canManageMeetingRows =
    canViewMeetingsList || canUpdateMeetings || canUpdateMeetingsSections || canDeleteMeetings;
  const canAccessMeetingsModule = hasAnyPermission(MEETING_PERMISSIONS);
  const canViewSectors = hasPermission('SECTORS_VIEW');

  const [filters, setFilters] = useState({ sectorId: '', day: '', search: '' });

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const hasActiveFilters = Object.values(filters).some(Boolean);

  /* ── queries ── */
  const sectorsQuery = useQuery({
    queryKey: ['meetings', 'list', 'sectors'],
    enabled: canViewMeetings || canCreateMeetings || canUpdateMeetings || canViewSectors,
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await meetingsApi.sectors.list({ limit: 200, order: 'asc' });
      return Array.isArray(data?.data) ? data.data : [];
    },
  });

  const meetingsQuery = useQuery({
    queryKey: ['meetings', 'list', filters],
    enabled: canViewMeetingsList,
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await meetingsApi.meetings.list({
        limit: 100,
        order: 'desc',
        ...(filters.sectorId && { sectorId: filters.sectorId }),
        ...(filters.day && { day: filters.day }),
        ...(filters.search.trim() && { search: filters.search.trim() }),
      });
      return Array.isArray(data?.data) ? data.data : [];
    },
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: (id) => meetingsApi.meetings.remove(id),
    onSuccess: () => {
      toast.success(t('meetings.messages.meetingDeleted'));
      queryClient.invalidateQueries({ queryKey: ['meetings', 'list'] });
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  const sectors = useMemo(() => (Array.isArray(sectorsQuery.data) ? sectorsQuery.data : []), [sectorsQuery.data]);
  const meetings = useMemo(() => (Array.isArray(meetingsQuery.data) ? meetingsQuery.data : []), [meetingsQuery.data]);

  const sectorOptions = sectors.map((s) => ({ value: s.id, label: s.name }));
  const dayOptions = getDayOptions(t);

  /* ── stats ── */
  const stats = useMemo(() => {
    const r = { totalMeetings: meetings.length, totalServants: 0, totalCommittees: 0, totalActivities: 0, totalGroups: 0, meetingsWithoutServants: 0 };
    meetings.forEach((m) => {
      const sc = (m.servants || []).length;
      const cc = (m.committees || []).length;
      const ac = (m.activities || []).length;
      const gc = (m.groups || []).length;
      r.totalServants += sc;
      r.totalCommittees += cc;
      r.totalActivities += ac;
      r.totalGroups += gc;
      if (!sc) r.meetingsWithoutServants += 1;
    });
    return r;
  }, [meetings]);

  /* ── columns ── */
  const meetingColumns = useMemo(() => [
    {
      key: 'name',
      label: t('meetings.columns.meeting'),
      render: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/dashboard/meetings/list/${row.id}`)}
          className="group text-start"
        >
          <p className="font-medium text-heading transition-colors group-hover:text-primary">
            {row.name}
          </p>
        </button>
      ),
    },
    {
      key: 'sector',
      label: t('meetings.columns.sector'),
      render: (row) => row.sector?.name
        ? <Badge variant="default">{row.sector.name}</Badge>
        : <span className="text-muted text-sm">{t('common.placeholder.empty')}</span>,
    },
    {
      key: 'schedule',
      label: t('meetings.columns.schedule'),
      render: (row) => (
        <span className="text-sm text-heading">
          {getDayLabel(row.day, t)} · {row.time}
        </span>
      ),
    },
    {
      key: 'groupsCount',
      label: t('meetings.columns.groupsCount'),
      render: (row) => <span className="text-sm text-heading">{(row.groups || []).length}</span>,
    },
    {
      key: 'servantsCount',
      label: t('meetings.columns.servantsCount'),
      render: (row) => {
        const count = (row.servants || []).length;
        return <span className={`text-sm font-medium ${count === 0 ? 'text-warning' : 'text-heading'}`}>{count}</span>;
      },
    },
    {
      key: 'committeesCount',
      label: t('meetings.columns.committeesCount'),
      render: (row) => <span className="text-sm text-heading">{(row.committees || []).length}</span>,
    },
    {
      key: 'updatedAt',
      label: t('meetings.columns.updatedAt'),
      render: (row) => <span className="text-xs text-muted">{formatDateTime(row.updatedAt)}</span>,
    },
    ...(canManageMeetingRows ? [{
      key: 'actions',
      label: '',
      cellClassName: 'w-10',
      render: (row) => (
        <RowActions
          actions={[
            ...(canViewMeetingsList
              ? [{ label: t('common.actions.view'), onClick: () => navigate(`/dashboard/meetings/list/${row.id}`) }]
              : []),
            ...((canUpdateMeetings || canUpdateMeetingsSections)
              ? [{ label: t('common.actions.edit'), onClick: () => navigate(`/dashboard/meetings/${row.id}/edit`) }]
              : []),
            ...(canDeleteMeetings
              ? [{ divider: true }, {
                label: t('common.actions.delete'),
                danger: true,
                onClick: () => {
                  if (window.confirm(t('meetings.messages.confirmDeleteMeeting'))) {
                    deleteMeetingMutation.mutate(row.id);
                  }
                },
              }]
              : []),
          ]}
        />
      ),
    }] : []),
  ], [canDeleteMeetings, canManageMeetingRows, canUpdateMeetings, canUpdateMeetingsSections, canViewMeetingsList, deleteMeetingMutation, navigate, t]);

  /* ── guard ── */
  if (!canAccessMeetingsModule) {
    return (
      <div className="animate-fade-in space-y-6">
        <Breadcrumbs items={[{ label: t('shared.dashboard'), href: '/dashboard' }, { label: meetingsListTitle }]} />
        <EmptyState title={t('meetings.empty.noMeetingsPermissionTitle')} description={t('meetings.empty.noMeetingsPermissionDescription')} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-10">

      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: meetingsListTitle },
        ]}
      />

      {/* ══ HEADER ════════════════════════════════════════════════════════ */}
      <PageHeader
        className="border-b border-border pb-6"
        eyebrow={t('shared.dashboard')}
        title={meetingsListTitle}
        subtitle={t('meetings.meetingsPageSubtitle')}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" icon={BarChart3} onClick={() => navigate('/dashboard/meetings')}>
              {t('meetings.actions.openDashboard')}
            </Button>
            {canCreateMeetings && (
              <Button icon={CalendarPlus} onClick={() => navigate('/dashboard/meetings/new')}>
                {t('meetings.actions.addMeeting')}
              </Button>
            )}
          </div>
        )}
      />

      {/* ══ KPI TILES ═════════════════════════════════════════════════════ */}
      {canViewMeetingsList && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

          {[
            { label: t('meetings.dashboard.cards.totalMeetings'), value: stats.totalMeetings, icon: ListChecks, variant: 'default' },
            { label: t('meetings.dashboard.cards.totalServants'), value: stats.totalServants, icon: Users, variant: 'primary' },
            { label: t('meetings.columns.groupsCount'), value: stats.totalGroups, icon: Layers3, variant: 'default' },
            { label: t('meetings.columns.committeesCount'), value: stats.totalCommittees, icon: Layers3, variant: 'default' },
            { label: t('meetings.dashboard.cards.meetingsWithoutServants'), value: stats.meetingsWithoutServants, icon: AlertTriangle, variant: stats.meetingsWithoutServants > 0 ? 'warning' : 'success' },
          ].map(({ label, value, icon: Icon, variant }) => (
            <div key={label} className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</p>
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl
                  ${variant === 'primary' ? 'bg-primary/10 text-primary' :
                    variant === 'warning' ? 'bg-warning-light text-warning' :
                      variant === 'success' ? 'bg-success-light text-success' :
                        'bg-surface-alt text-muted'}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className={`mt-4 text-4xl font-bold tracking-tight
                ${variant === 'primary' ? 'text-heading' :
                  variant === 'warning' ? 'text-warning' :
                    variant === 'success' ? 'text-success' :
                      'text-heading'}`}>
                {value}
              </p>
              <div className={`mt-4 h-0.5 w-10 rounded-full
                ${variant === 'primary' ? 'bg-primary' :
                  variant === 'warning' ? 'bg-warning' :
                    variant === 'success' ? 'bg-success' :
                      'bg-border'}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* ══ FILTERS ═══════════════════════════════════════════════════════ */}
      {canViewMeetingsList && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel>{t('meetings.filters.sector')}</SectionLabel>
            {hasActiveFilters && (
              <button
                onClick={() => setFilters({ sectorId: '', day: '', search: '' })}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t('usersListPage.filters.clear')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select
              value={filters.sectorId}
              onChange={(e) => setFilter('sectorId', e.target.value)}
              options={[{ value: '', label: t('meetings.filters.allSectors') }, ...sectorOptions]}
              placeholder={t('meetings.filters.allSectors')}
              containerClassName="!mb-0"
            />
            <Select
              value={filters.day}
              onChange={(e) => setFilter('day', e.target.value)}
              options={[{ value: '', label: t('meetings.filters.allDays') }, ...dayOptions]}
              placeholder={t('meetings.filters.allDays')}
              containerClassName="!mb-0"
            />
            <Input
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder={t('meetings.filters.searchPlaceholder')}
              containerClassName="!mb-0"
            />
          </div>
        </section>
      )}

      {/* ══ TABLE ═════════════════════════════════════════════════════════ */}
      {canViewMeetingsList ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel>{t('meetings.sections.meetings')}</SectionLabel>
            <span className="text-xs text-muted">{meetings.length}</span>
          </div>

          <div className="overflow-hidden tttable">
            <Table
              columns={meetingColumns}
              data={meetings}
              loading={meetingsQuery.isLoading}
              emptyTitle={t('meetings.empty.meetingsTitle')}
              emptyDescription={t('meetings.empty.meetingsDescription')}
            />
          </div>
        </section>
      ) : (
        <EmptyState
          title={t('meetings.empty.noMeetingsPermissionTitle')}
          description={t('meetings.empty.noMeetingsPermissionDescription')}
        />
      )}

    </div>
  );
}
