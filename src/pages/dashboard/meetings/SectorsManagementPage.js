import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, Layers3, Users, AlertTriangle, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { normalizeApiError } from '../../../api/errors';
import { meetingsApi } from '../../../api/endpoints';
import { useAuth } from '../../../auth/auth.hooks';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import Input from '../../../components/ui/Input';
import Table, { RowActions } from '../../../components/ui/Table';
import PageHeader from '../../../components/ui/PageHeader';
import { useI18n } from '../../../i18n/i18n';
import { formatDateTime } from '../../../utils/formatters';

const SECTOR_PERMISSIONS = ['SECTORS_VIEW', 'SECTORS_CREATE', 'SECTORS_UPDATE', 'SECTORS_DELETE'];

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{children}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

export default function SectorsManagementPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, hasAnyPermission } = useAuth();

  const canViewSectors = hasPermission('SECTORS_VIEW');
  const canCreateSectors = hasPermission('SECTORS_CREATE');
  const canUpdateSectors = hasPermission('SECTORS_UPDATE');
  const canDeleteSectors = hasPermission('SECTORS_DELETE');
  const canViewMeetings = hasPermission('MEETINGS_VIEW');
  const canManageSectorRows = canViewSectors || canUpdateSectors || canDeleteSectors;
  const canAccessSectorsModule = hasAnyPermission(SECTOR_PERMISSIONS);

  const [search, setSearch] = useState('');

  /* ── queries ── */
  const sectorsQuery = useQuery({
    queryKey: ['meetings', 'sectors', 'management', search],
    enabled: canViewSectors,
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await meetingsApi.sectors.list({
        limit: 200, order: 'asc',
        ...(search.trim() && { search: search.trim() }),
      });
      return Array.isArray(data?.data) ? data.data : [];
    },
  });

  const meetingsQuery = useQuery({
    queryKey: ['meetings', 'sectors', 'meetingCounts'],
    enabled: canViewSectors && canViewMeetings,
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await meetingsApi.meetings.list({ limit: 100, order: 'desc' });
      return Array.isArray(data?.data) ? data.data : [];
    },
  });

  const deleteSectorMutation = useMutation({
    mutationFn: (id) => meetingsApi.sectors.remove(id),
    onSuccess: () => {
      toast.success(t('meetings.messages.sectorDeleted'));
      queryClient.invalidateQueries({ queryKey: ['meetings', 'sectors'] });
      queryClient.invalidateQueries({ queryKey: ['meetings', 'list'] });
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  const sectors = useMemo(() => (Array.isArray(sectorsQuery.data) ? sectorsQuery.data : []), [sectorsQuery.data]);
  const meetings = useMemo(() => (Array.isArray(meetingsQuery.data) ? meetingsQuery.data : []), [meetingsQuery.data]);

  const meetingsCountBySector = useMemo(() =>
    meetings.reduce((acc, m) => {
      const id = m?.sector?.id;
      if (id) acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {}),
    [meetings]);

  const stats = useMemo(() => {
    const totalOfficials = sectors.reduce((s, sec) => s + (sec.officials || []).length, 0);
    const sectorsWithoutOfficials = sectors.filter((sec) => !(sec.officials || []).length).length;
    const linkedMeetings = sectors.reduce((s, sec) => s + (meetingsCountBySector[sec.id] || 0), 0);
    return { totalSectors: sectors.length, totalOfficials, sectorsWithoutOfficials, linkedMeetings };
  }, [sectors, meetingsCountBySector]);

  /* ── columns ── */
  const sectorColumns = useMemo(() => [
    {
      key: 'name',
      label: t('meetings.columns.sector'),
      render: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/dashboard/meetings/sectors/${row.id}`)}
          className="group flex items-center gap-3 text-start"
        >
          {row.avatar?.url ? (
            <img
              src={row.avatar.url}
              alt={row.name}
              className="h-8 w-8 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {String(row.name || '').slice(0, 2).toUpperCase() || '--'}
            </span>
          )}
          <span className="font-medium text-heading transition-colors group-hover:text-primary">
            {row.name}
          </span>
        </button>
      ),
    },
    {
      key: 'officials',
      label: t('meetings.columns.officials'),
      render: (row) => {
        const officials = row.officials || [];
        if (!officials.length) return <span className="text-sm text-muted">{t('common.placeholder.empty')}</span>;
        const top = officials.slice(0, 2).map((o) => o.name).filter(Boolean);
        const suffix = officials.length > 2 ? ` +${officials.length - 2}` : '';
        return <span className="text-sm text-heading">{top.join(', ')}{suffix}</span>;
      },
    },
    {
      key: 'officialsCount',
      label: t('meetings.columns.officialsCount'),
      render: (row) => {
        const count = (row.officials || []).length;
        return (
          <Badge variant={count === 0 ? 'warning' : 'default'}>
            {count}
          </Badge>
        );
      },
    },
    ...(canViewMeetings ? [{
      key: 'meetingsCount',
      label: t('meetings.columns.meetingsCount'),
      render: (row) => {
        const count = meetingsCountBySector[row.id] || 0;
        return <Badge variant={count > 0 ? 'primary' : 'default'}>{count}</Badge>;
      },
    }] : []),
    {
      key: 'updatedAt',
      label: t('meetings.columns.updatedAt'),
      render: (row) => <span className="text-xs text-muted">{formatDateTime(row.updatedAt)}</span>,
    },
    ...(canManageSectorRows ? [{
      key: 'actions',
      label: '',
      cellClassName: 'w-10',
      render: (row) => (
        <RowActions
          actions={[
            { label: t('common.actions.view'), onClick: () => navigate(`/dashboard/meetings/sectors/${row.id}`) },
            ...(canUpdateSectors
              ? [{ label: t('common.actions.edit'), onClick: () => navigate(`/dashboard/meetings/sectors/${row.id}/edit`) }]
              : []),
            ...(canDeleteSectors
              ? [{ divider: true }, {
                label: t('common.actions.delete'),
                danger: true,
                onClick: () => {
                  if (window.confirm(t('meetings.messages.confirmDeleteSector'))) {
                    deleteSectorMutation.mutate(row.id);
                  }
                },
              }]
              : []),
          ]}
        />
      ),
    }] : []),
  ], [canDeleteSectors, canManageSectorRows, canUpdateSectors, canViewMeetings, deleteSectorMutation, meetingsCountBySector, navigate, t]);

  /* ── guard ── */
  if (!canAccessSectorsModule) {
    return (
      <div className="animate-fade-in space-y-6">
        <Breadcrumbs items={[{ label: t('shared.dashboard'), href: '/dashboard' }, { label: t('meetings.sectorsPageTitle') }]} />
        <EmptyState title={t('meetings.empty.noSectorsPermissionTitle')} description={t('meetings.empty.noSectorsPermissionDescription')} />
      </div>
    );
  }

  /* ── kpi config ── */
  const kpiTiles = [
    { label: t('meetings.dashboard.cards.totalSectors'), value: stats.totalSectors, icon: Layers3, variant: 'default' },
    { label: t('meetings.columns.officialsCount'), value: stats.totalOfficials, icon: Users, variant: 'primary' },
    { label: t('meetings.dashboard.cards.sectorsWithoutOfficials'), value: stats.sectorsWithoutOfficials, icon: AlertTriangle, variant: stats.sectorsWithoutOfficials > 0 ? 'warning' : 'success' },
    ...(canViewMeetings
      ? [{ label: t('meetings.columns.meetingsCount'), value: stats.linkedMeetings, icon: BarChart3, variant: 'default' }]
      : []),
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-10">

      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('meetings.sectorsPageTitle') },
        ]}
      />

      {/* ══ HEADER ════════════════════════════════════════════════════════ */}
      <PageHeader
        className="border-b border-border pb-6"
        eyebrow={t('shared.dashboard')}
        title={t('meetings.sectorsPageTitle')}
        subtitle={t('meetings.sectorsPageSubtitle')}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" icon={CalendarRange} onClick={() => navigate('/dashboard/meetings')}>
              {t('meetings.actions.openDashboard')}
            </Button>
            {canCreateSectors && (
              <Button icon={Layers3} onClick={() => navigate('/dashboard/meetings/sectors/new')}>
                {t('meetings.actions.addSector')}
              </Button>
            )}
          </div>
        )}
      />

      {/* ══ KPI TILES ═════════════════════════════════════════════════════ */}
      {canViewSectors && (
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-${kpiTiles.length}`}>
          {kpiTiles.map(({ label, value, icon: Icon, variant }) => (
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
                ${variant === 'warning' ? 'text-warning' :
                  variant === 'success' ? 'text-success' :
                    variant === 'primary' ? 'text-heading' :
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

      {/* ══ SEARCH ════════════════════════════════════════════════════════ */}
      {canViewSectors && (
        <section className="space-y-3">
          <SectionLabel>{t('meetings.filters.search')}</SectionLabel>
          <div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('meetings.filters.searchSectorsPlaceholder')}
              containerClassName="!mb-0"
              className="w-full"
            />
          </div>
        </section>
      )}

      {/* ══ TABLE ═════════════════════════════════════════════════════════ */}
      {canViewSectors ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionLabel>{t('meetings.sections.sectors')}</SectionLabel>
            <span className="text-xs text-muted">{sectors.length}</span>
          </div>

          <div className="overflow-hidden tttable">
            <Table
              columns={sectorColumns}
              data={sectors}
              loading={sectorsQuery.isLoading || (canViewMeetings && meetingsQuery.isLoading)}
              emptyTitle={t('meetings.empty.sectorsTitle')}
              emptyDescription={t('meetings.empty.sectorsDescription')}
            />
          </div>
        </section>
      ) : (
        <EmptyState
          title={t('meetings.empty.noSectorsPermissionTitle')}
          description={t('meetings.empty.noSectorsPermissionDescription')}
        />
      )}

    </div>
  );
}
