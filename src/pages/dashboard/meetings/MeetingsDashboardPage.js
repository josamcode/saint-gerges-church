import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CalendarPlus,
  Layers3,
  ListChecks,
  Users,
  TrendingUp,
  Shield,
  Activity,
} from 'lucide-react';
import { meetingsApi } from '../../../api/endpoints';
import { useAuth } from '../../../auth/auth.hooks';
import Badge from '../../../components/ui/Badge';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import PageHeader from '../../../components/ui/PageHeader';
import { useI18n } from '../../../i18n/i18n';
import { formatDateTime } from '../../../utils/formatters';
import { DAY_VALUES, getDayLabel } from './meetingsForm.utils';

const SECTOR_ACTION_PERMISSIONS = ['SECTORS_CREATE', 'SECTORS_UPDATE', 'SECTORS_DELETE'];
const MEETING_ACTION_PERMISSIONS = [
  'MEETINGS_CREATE',
  'MEETINGS_UPDATE',
  'MEETINGS_DELETE',
  'MEETINGS_SERVANTS_MANAGE',
  'MEETINGS_COMMITTEES_MANAGE',
  'MEETINGS_ACTIVITIES_MANAGE',
  'MEETINGS_DOCUMENTATION_MANAGE',
  'MEETINGS_SETTINGS_MANAGE',
];

function KpiCard({ label, value, variant = 'default', icon: Icon }) {
  const accentMap = {
    default: 'bg-surface-alt text-muted',
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning-light text-warning',
    danger: 'bg-danger-light text-danger',
    success: 'bg-success-light text-success',
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-widest text-muted">{label}</span>
        {Icon ? (
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${accentMap[variant]}`}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-4xl font-bold tracking-tight text-heading">{value}</p>

      <div
        className={`mt-4 h-0.5 w-10 rounded-full transition-all group-hover:w-16 ${variant === 'primary'
          ? 'bg-primary'
          : variant === 'warning'
            ? 'bg-warning'
            : variant === 'danger'
              ? 'bg-danger'
              : variant === 'success'
                ? 'bg-success'
                : 'bg-border'
          }`}
      />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{children}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

export default function MeetingsDashboardPage() {
  const { t, isRTL } = useI18n();
  const navigate = useNavigate();
  const { hasPermission, hasAnyPermission, isAuthenticated } = useAuth();

  const canViewSectors = hasPermission('SECTORS_VIEW');
  const canViewMeetings = hasPermission('MEETINGS_VIEW');
  const canViewResponsibilities = hasPermission('MEETINGS_RESPONSIBILITIES_VIEW');
  const canCreateSectors = hasPermission('SECTORS_CREATE');
  const canCreateMeetings = hasPermission('MEETINGS_CREATE');
  const canManageSectors = hasAnyPermission(SECTOR_ACTION_PERMISSIONS);
  const canManageMeetings = hasAnyPermission(MEETING_ACTION_PERMISSIONS);
  const canTakeActions = canManageSectors || canManageMeetings;

  const sectorsQuery = useQuery({
    queryKey: ['meetings', 'dashboard', 'sectors'],
    enabled: canViewSectors,
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await meetingsApi.sectors.list({ limit: 200, order: 'asc' });
      return Array.isArray(data?.data) ? data.data : [];
    },
  });

  const meetingsQuery = useQuery({
    queryKey: ['meetings', 'dashboard', 'meetings'],
    enabled: isAuthenticated,
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await meetingsApi.meetings.list({ limit: 100, order: 'desc' });
      return Array.isArray(data?.data) ? data.data : [];
    },
  });

  const responsibilitiesQuery = useQuery({
    queryKey: ['meetings', 'dashboard', 'responsibilities'],
    enabled: canViewResponsibilities,
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await meetingsApi.responsibilities.list({ limit: 8 });
      return Array.isArray(data?.data) ? data.data : [];
    },
  });

  const sectors = useMemo(
    () => (Array.isArray(sectorsQuery.data) ? sectorsQuery.data : []),
    [sectorsQuery.data]
  );
  const meetings = useMemo(
    () => (Array.isArray(meetingsQuery.data) ? meetingsQuery.data : []),
    [meetingsQuery.data]
  );
  const responsibilities = useMemo(
    () => (Array.isArray(responsibilitiesQuery.data) ? responsibilitiesQuery.data : []),
    [responsibilitiesQuery.data]
  );

  const summary = useMemo(() => {
    const result = {
      totalSectors: sectors.length,
      totalMeetings: meetings.length,
      totalServants: 0,
      totalCommittees: 0,
      totalActivities: 0,
      uniqueServedUsers: 0,
      sectorsWithoutOfficials: 0,
      meetingsWithoutServants: 0,
      meetingsWithoutActivities: 0,
      meetingsWithoutCommittees: 0,
    };

    const servedUsers = new Set();

    sectors.forEach((sector) => {
      if (!(sector.officials || []).length) result.sectorsWithoutOfficials += 1;
    });

    meetings.forEach((meeting) => {
      const servantsCount = (meeting.servants || []).length;
      const committeesCount = (meeting.committees || []).length;
      const activitiesCount = (meeting.activities || []).length;

      result.totalServants += servantsCount;
      result.totalCommittees += committeesCount;
      result.totalActivities += activitiesCount;

      if (!servantsCount) result.meetingsWithoutServants += 1;
      if (!committeesCount) result.meetingsWithoutCommittees += 1;
      if (!activitiesCount) result.meetingsWithoutActivities += 1;

      (meeting.servedUsers || []).forEach((user) => {
        const id = user?.id || user?._id;
        if (id) servedUsers.add(String(id));
      });
    });

    result.uniqueServedUsers = servedUsers.size;
    return result;
  }, [meetings, sectors]);

  const sectorHealth = useMemo(() => {
    const bySector = new Map();
    const getKey = (sector) => String(sector?.id || sector?._id || sector?.name || 'unknown');
    const getName = (sector) => sector?.name || t('common.placeholder.empty');

    sectors.forEach((sector) => {
      bySector.set(getKey(sector), {
        id: sector.id || sector._id || getKey(sector),
        name: sector.name,
        officialsCount: (sector.officials || []).length,
        meetingsCount: 0,
        servantsCount: 0,
        activitiesCount: 0,
      });
    });

    meetings.forEach((meeting) => {
      const key = getKey(meeting.sector || {});
      const current = bySector.get(key) || {
        id: meeting.sector?.id || key,
        name: getName(meeting.sector),
        officialsCount: 0,
        meetingsCount: 0,
        servantsCount: 0,
        activitiesCount: 0,
      };

      current.meetingsCount += 1;
      current.servantsCount += (meeting.servants || []).length;
      current.activitiesCount += (meeting.activities || []).length;
      bySector.set(key, current);
    });

    return [...bySector.values()].sort((a, b) =>
      b.meetingsCount !== a.meetingsCount
        ? b.meetingsCount - a.meetingsCount
        : b.servantsCount - a.servantsCount
    );
  }, [meetings, sectors, t]);

  const weeklyLoad = useMemo(() => {
    const counts = meetings.reduce((acc, meeting) => {
      if (meeting?.day) acc[meeting.day] = (acc[meeting.day] || 0) + 1;
      return acc;
    }, {});

    return DAY_VALUES.map((day) => ({
      day,
      label: getDayLabel(day, t),
      count: counts[day] || 0,
    }));
  }, [meetings, t]);

  const maxDailyLoad = Math.max(...weeklyLoad.map((entry) => entry.count), 1);
  const dayOrder = useMemo(() => new Map(DAY_VALUES.map((day, index) => [day, index])), []);

  const meetingsSchedule = useMemo(
    () =>
      [...meetings].sort((a, b) => {
        const dayA = dayOrder.get(a?.day) ?? Number.MAX_SAFE_INTEGER;
        const dayB = dayOrder.get(b?.day) ?? Number.MAX_SAFE_INTEGER;
        if (dayA !== dayB) return dayA - dayB;
        return String(a?.time || '').localeCompare(String(b?.time || ''));
      }),
    [dayOrder, meetings]
  );

  const kpiCards = [
    canViewSectors
      ? {
        key: 'sectors',
        label: t('meetings.dashboard.cards.totalSectors'),
        value: summary.totalSectors,
        variant: 'default',
        icon: Layers3,
      }
      : null,
    canViewMeetings
      ? {
        key: 'meetings',
        label: t('meetings.dashboard.cards.totalMeetings'),
        value: summary.totalMeetings,
        variant: 'default',
        icon: CalendarPlus,
      }
      : null,
    canViewMeetings
      ? {
        key: 'servants',
        label: t('meetings.dashboard.cards.totalServants'),
        value: summary.totalServants,
        variant: 'primary',
        icon: Users,
      }
      : null,
    canViewMeetings
      ? {
        key: 'servedUsers',
        label: t('meetings.dashboard.cards.servedUsers'),
        value: summary.uniqueServedUsers,
        variant: 'primary',
        icon: TrendingUp,
      }
      : null,
    canViewSectors
      ? {
        key: 'noOfficials',
        label: t('meetings.dashboard.cards.sectorsWithoutOfficials'),
        value: summary.sectorsWithoutOfficials,
        variant: summary.sectorsWithoutOfficials > 0 ? 'warning' : 'success',
        icon: Shield,
      }
      : null,
    canViewMeetings
      ? {
        key: 'noServants',
        label: t('meetings.dashboard.cards.meetingsWithoutServants'),
        value: summary.meetingsWithoutServants,
        variant: summary.meetingsWithoutServants > 0 ? 'danger' : 'success',
        icon: Activity,
      }
      : null,
  ].filter(Boolean);

  const actionItems = [
    canTakeActions && canViewSectors
      ? {
        key: 'noOfficials',
        title: t('meetings.dashboard.actionItems.sectorsWithoutOfficialsTitle'),
        description: t('meetings.dashboard.actionItems.sectorsWithoutOfficialsDesc', {
          count: summary.sectorsWithoutOfficials,
        }),
        count: summary.sectorsWithoutOfficials,
        href: '/dashboard/meetings/sectors',
        variant: summary.sectorsWithoutOfficials > 0 ? 'warning' : 'success',
      }
      : null,
    canTakeActions && canViewMeetings
      ? {
        key: 'noServants',
        title: t('meetings.dashboard.actionItems.meetingsWithoutServantsTitle'),
        description: t('meetings.dashboard.actionItems.meetingsWithoutServantsDesc', {
          count: summary.meetingsWithoutServants,
        }),
        count: summary.meetingsWithoutServants,
        href: '/dashboard/meetings/list',
        variant: summary.meetingsWithoutServants > 0 ? 'danger' : 'success',
      }
      : null,
    canTakeActions && canViewMeetings
      ? {
        key: 'noActivities',
        title: t('meetings.dashboard.actionItems.meetingsWithoutActivitiesTitle'),
        description: t('meetings.dashboard.actionItems.meetingsWithoutActivitiesDesc', {
          count: summary.meetingsWithoutActivities,
        }),
        count: summary.meetingsWithoutActivities,
        href: '/dashboard/meetings/list',
        variant: summary.meetingsWithoutActivities > 0 ? 'warning' : 'success',
      }
      : null,
    canTakeActions && canViewMeetings
      ? {
        key: 'noCommittees',
        title: t('meetings.dashboard.actionItems.meetingsWithoutCommitteesTitle'),
        description: t('meetings.dashboard.actionItems.meetingsWithoutCommitteesDesc', {
          count: summary.meetingsWithoutCommittees,
        }),
        count: summary.meetingsWithoutCommittees,
        href: '/dashboard/meetings/list',
        variant: summary.meetingsWithoutCommittees > 0 ? 'warning' : 'success',
      }
      : null,
  ].filter(Boolean);

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('meetings.dashboardTitle') },
        ]}
      />

      <PageHeader
        className="border-b border-border pb-6"
        title={t('meetings.dashboardTitle')}
        subtitle={t('meetings.dashboardSubtitle')}
        titleClassName="mt-1 text-3xl font-bold tracking-tight text-heading"
        subtitleClassName="mt-1.5 max-w-md text-sm text-muted"
        actions={
          canTakeActions ? (
            <div className="flex flex-wrap items-center gap-2">
              {canManageSectors ? (
                <Button variant="ghost" icon={Layers3} onClick={() => navigate('/dashboard/meetings/sectors')}>
                  {t('meetings.actions.manageSectors')}
                </Button>
              ) : null}
              {canManageMeetings ? (
                <Button variant="outline" icon={ListChecks} onClick={() => navigate('/dashboard/meetings/list')}>
                  {t('meetings.actions.manageMeetings')}
                </Button>
              ) : null}
              {canCreateSectors ? (
                <Button variant="ghost" icon={Layers3} onClick={() => navigate('/dashboard/meetings/sectors/new')}>
                  {t('meetings.actions.addSector')}
                </Button>
              ) : null}
              {canCreateMeetings ? (
                <Button icon={CalendarPlus} onClick={() => navigate('/dashboard/meetings/new')}>
                  {t('meetings.actions.addMeeting')}
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      {!canTakeActions ? (
        <div className="rounded-2xl border border-border bg-surface-alt/40 px-4 py-3">
          <p className="text-sm font-semibold text-heading">{t('meetings.dashboard.status.readOnlyTitle')}</p>
          <p className="mt-1 text-xs text-muted">{t('meetings.dashboard.status.readOnlyDescription')}</p>
        </div>
      ) : null}

      {kpiCards.length > 0 ? (
        <section className="space-y-4">
          <SectionLabel>Overview</SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {kpiCards.map((item) => (
              <KpiCard
                key={item.key}
                label={item.label}
                value={item.value}
                variant={item.variant}
                icon={item.icon}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionLabel>{t('meetings.dashboard.sections.meetingSchedule')}</SectionLabel>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold text-heading">{t('meetings.dashboard.sections.meetingSchedule')}</p>
              <p className="mt-0.5 text-xs text-muted">{t('meetings.dashboard.sections.meetingScheduleSubtitle')}</p>
            </div>

            {meetingsQuery.isLoading ? (
              <p className="text-sm text-muted">{t('common.loading')}</p>
            ) : meetingsSchedule.length === 0 ? (
              <EmptyState
                title={t('meetings.empty.noDashboardDataTitle')}
                description={t('meetings.empty.noDashboardDataDescription')}
              />
            ) : (
              <div className="divide-y divide-border/60">
                {meetingsSchedule.slice(0, 8).map((meeting) => (
                  <div key={meeting.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-heading">{meeting.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {getDayLabel(meeting.day, t)}
                        {meeting.time ? ` - ${meeting.time}` : ''}
                      </p>
                    </div>
                    <div className="ms-3 flex shrink-0 items-center gap-2">
                      {meeting.sector?.name ? (
                        <Badge variant="default">{meeting.sector.name}</Badge>
                      ) : null}
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CalendarDays className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold text-heading">{t('meetings.dashboard.sections.weeklyLoad')}</p>
              <p className="mt-0.5 text-xs text-muted">{t('meetings.dashboard.sections.weeklyLoadSubtitle')}</p>
            </div>

            {meetingsQuery.isLoading ? (
              <p className="text-sm text-muted">{t('common.loading')}</p>
            ) : weeklyLoad.every((entry) => entry.count === 0) ? (
              <EmptyState
                title={t('meetings.empty.noDashboardDataTitle')}
                description={t('meetings.empty.noDashboardDataDescription')}
              />
            ) : (
              <div className="space-y-3.5">
                {weeklyLoad.map((entry) => {
                  const pct = Math.max((entry.count / maxDailyLoad) * 100, entry.count ? 6 : 0);
                  return (
                    <div key={entry.day} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-right text-xs font-medium text-muted">{entry.label}</span>
                      <div className="relative h-1.5 flex-1 rounded-full bg-surface-alt">
                        <div
                          className="absolute inset-y-0 start-0 rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-5 shrink-0 text-xs font-semibold text-heading">{entry.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {sectorHealth.length > 0 ? (
        <section className="space-y-4">
          <SectionLabel>{t('meetings.dashboard.sections.sectorHealth')}</SectionLabel>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold text-heading">{t('meetings.dashboard.sections.sectorHealth')}</p>
              <p className="mt-0.5 text-xs text-muted">{t('meetings.dashboard.sections.sectorHealthSubtitle')}</p>
            </div>

            {sectorsQuery.isLoading || meetingsQuery.isLoading ? (
              <p className="text-sm text-muted">{t('common.loading')}</p>
            ) : (
              <div className="divide-y divide-border/60">
                {sectorHealth.slice(0, 8).map((sector) => (
                  <div key={sector.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-heading">{sector.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {sector.officialsCount} {t('meetings.dashboard.labels.officials')}
                        {' - '}
                        {sector.servantsCount} {t('meetings.dashboard.labels.servants')}
                        {' - '}
                        {sector.activitiesCount} {t('meetings.dashboard.labels.activities')}
                      </p>
                    </div>
                    <Badge variant={sector.meetingsCount > 0 ? 'primary' : 'default'}>
                      {sector.meetingsCount} {t('meetings.dashboard.labels.meetings')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* {!canTakeActions && (
        <section className="space-y-4">
          <SectionLabel>{t('meetings.dashboard.sections.actionCenter')}</SectionLabel>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-5">
                <p className="text-sm font-semibold text-heading">{t('meetings.dashboard.sections.actionCenter')}</p>
                <p className="mt-0.5 text-xs text-muted">{t('meetings.dashboard.sections.actionCenterSubtitle')}</p>
              </div>

              {!canTakeActions ? (
                <EmptyState
                  title={t('meetings.dashboard.status.readOnlyTitle')}
                  description={t('meetings.dashboard.status.readOnlyDescription')}
                />
              ) : actionItems.length === 0 ? (
                <EmptyState
                  title={t('meetings.dashboard.status.noData')}
                  description={t('meetings.dashboard.status.noData')}
                />
              ) : (
                <div className="space-y-2">
                  {actionItems.map((item) => (
                    <Link
                      key={item.key}
                      to={item.href}
                      className="group flex items-center justify-between rounded-xl border border-border/80 bg-surface-alt/30 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-surface-alt"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-heading">{item.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">{item.description}</p>
                      </div>
                      <div className="ms-3 flex shrink-0 items-center gap-2">
                        <Badge variant={item.variant}>{item.count}</Badge>
                        <ArrowUpRight
                          className={`h-3.5 w-3.5 text-muted transition-transform ${isRTL ? 'group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'
                            }`}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-5">
                <p className="text-sm font-semibold text-heading">{t('meetings.dashboard.sections.responsibilities')}</p>
                <p className="mt-0.5 text-xs text-muted">{t('meetings.dashboard.sections.responsibilitiesSubtitle')}</p>
              </div>

              {!canViewResponsibilities ? (
                <EmptyState
                  title={t('meetings.dashboard.status.noData')}
                  description={t('meetings.dashboard.status.noData')}
                />
              ) : responsibilitiesQuery.isLoading ? (
                <p className="text-sm text-muted">{t('common.loading')}</p>
              ) : responsibilities.length === 0 ? (
                <EmptyState
                  title={t('meetings.dashboard.status.noResponsibilities')}
                  description={t('meetings.dashboard.status.noResponsibilities')}
                />
              ) : (
                <div className="divide-y divide-border/60">
                  {responsibilities.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-heading">{item.label}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {item.lastUsedAt ? formatDateTime(item.lastUsedAt) : t('common.placeholder.empty')}
                        </p>
                      </div>
                      <Badge variant="primary">
                        {t('meetings.dashboard.labels.usageCount', { count: item.usageCount || 0 })}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {canTakeActions ? (
        <section className="rounded-2xl border border-border/60 bg-surface-alt/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-heading">{t('meetings.dashboard.sections.quickActions')}</p>
              <p className="mt-0.5 text-xs text-muted">{t('meetings.dashboardSubtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManageSectors ? (
                <Button size="sm" variant="outline" icon={Layers3} onClick={() => navigate('/dashboard/meetings/sectors')}>
                  {t('meetings.actions.manageSectors')}
                </Button>
              ) : null}
              {canManageMeetings ? (
                <Button size="sm" variant="outline" icon={BarChart3} onClick={() => navigate('/dashboard/meetings/list')}>
                  {t('meetings.actions.manageMeetings')}
                </Button>
              ) : null}
              {canCreateMeetings ? (
                <Button size="sm" icon={Users} onClick={() => navigate('/dashboard/meetings/new')}>
                  {t('meetings.actions.addMeeting')}
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null} */}
    </div>
  );
}
