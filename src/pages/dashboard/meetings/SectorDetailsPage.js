import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock, CalendarDays, Edit, FileText,
  Layers3, Phone, UserCircle, Users,
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
import { getDayLabel } from './meetingsForm.utils';

const EMPTY = '---';

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{children}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

export default function SectorDetailsPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const { hasPermission } = useAuth();

  const tf = (key, fallback) => { const v = t(key); return v === key ? fallback : v; };

  const canUpdateSector = hasPermission('SECTORS_UPDATE');
  const canCreateMeeting = hasPermission('MEETINGS_CREATE');
  const canViewMeetings = hasPermission('MEETINGS_VIEW');
  const canManageMeeting =
    hasPermission('MEETINGS_UPDATE') ||
    hasPermission('MEETINGS_SERVANTS_MANAGE') ||
    hasPermission('MEETINGS_COMMITTEES_MANAGE') ||
    hasPermission('MEETINGS_ACTIVITIES_MANAGE');

  /* ── queries ── */
  const sectorQuery = useQuery({
    queryKey: ['meetings', 'sectors', 'details', id],
    enabled: !!id,
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await meetingsApi.sectors.getById(id);
      return data?.data || null;
    },
  });

  const relatedMeetingsQuery = useQuery({
    queryKey: ['meetings', 'sectors', 'details', id, 'related-meetings'],
    enabled: !!id && canViewMeetings,
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await meetingsApi.meetings.list({ limit: 100, order: 'desc', sectorId: id });
      return Array.isArray(data?.data) ? data.data : [];
    },
  });

  const sector = sectorQuery.data || null;
  const meetings = useMemo(
    () => (Array.isArray(relatedMeetingsQuery.data) ? relatedMeetingsQuery.data : []),
    [relatedMeetingsQuery.data]
  );

  const stats = useMemo(() => ({
    officialsCount: (sector?.officials || []).length,
    meetingsCount: meetings.length,
    totalServants: meetings.reduce((s, m) => s + (m.servants || []).length, 0),
    totalActivities: meetings.reduce((s, m) => s + (m.activities || []).length, 0),
    totalCommittees: meetings.reduce((s, m) => s + (m.committees || []).length, 0),
  }), [sector?.officials, meetings]);

  const breadcrumbs = [
    { label: t('shared.dashboard'), href: '/dashboard' },
    { label: t('meetings.sectorsPageTitle'), href: '/dashboard/meetings/sectors' },
    { label: sector?.name || tf('meetings.sectorDetails.pageTitle', 'Sector Details') },
  ];

  /* ── loading / not found ── */
  if (sectorQuery.isLoading) {
    return (
      <div className="animate-fade-in space-y-6">
        <Breadcrumbs items={breadcrumbs} />
        <p className="text-sm text-muted">{t('common.loading')}</p>
      </div>
    );
  }

  if (!sector) {
    return (
      <div className="animate-fade-in space-y-6">
        <Breadcrumbs items={breadcrumbs} />
        <EmptyState
          icon={Layers3}
          title={tf('meetings.sectorDetails.notFoundTitle', 'Sector not found')}
          description={tf('meetings.sectorDetails.notFoundDescription', 'This sector could not be loaded or may have been removed.')}
        />
      </div>
    );
  }

  const kpiTiles = [
    { label: t('meetings.columns.officialsCount'), value: stats.officialsCount, icon: Users },
    { label: t('meetings.columns.meetingsCount'), value: stats.meetingsCount, icon: CalendarDays },
    { label: t('meetings.columns.servantsCount'), value: stats.totalServants, icon: UserCircle },
    { label: t('meetings.columns.activitiesCount'), value: stats.totalActivities, icon: CalendarClock },
    { label: t('meetings.columns.committeesCount'), value: stats.totalCommittees, icon: FileText },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-10">

      <Breadcrumbs items={breadcrumbs} />

      {/* ══ HEADER ════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
        {/* avatar + title */}
        <div className="flex items-center gap-4">
          {sector.avatar?.url ? (
            <img
              src={sector.avatar.url}
              alt={sector.name || ''}
              className="h-16 w-16 rounded-2xl border border-border object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Layers3 className="h-7 w-7 text-primary" />
            </div>
          )}

          <PageHeader
            contentOnly
            eyebrow={t('meetings.sectorsPageTitle')}
            title={sector.name || EMPTY}
            subtitle={tf('meetings.sectorDetails.subtitle', 'Full profile including officials and linked meetings.')}
            titleClassName="mt-1 text-3xl font-bold tracking-tight text-heading"
          />
        </div>

        {/* actions */}
        <div className="flex flex-wrap gap-2">
          {canUpdateSector && (
            <Link to={`/dashboard/meetings/sectors/${sector.id}/edit`}>
              <Button variant="outline" icon={Edit}>{t('common.actions.edit')}</Button>
            </Link>
          )}
          {canCreateMeeting && (
            <Link to="/dashboard/meetings/new">
              <Button icon={CalendarDays}>{t('meetings.actions.addMeeting')}</Button>
            </Link>
          )}
        </div>
      </div>

      {/* ══ KPI TILES ═════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {kpiTiles.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-alt text-muted">
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-heading">{value ?? 0}</p>
            <div className="mt-3 h-0.5 w-8 rounded-full bg-border" />
          </div>
        ))}
      </div>

      {/* ══ NOTES ═════════════════════════════════════════════════════════ */}
      {(sector.notes || null) && (
        <div className="rounded-2xl border border-border bg-surface px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            {t('meetings.fields.notes')}
          </p>
          <p className="mt-2 text-sm text-heading">{sector.notes}</p>
        </div>
      )}

      {/* ══ OFFICIALS ═════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <SectionLabel>{t('meetings.fields.officials')}</SectionLabel>

        {(sector.officials || []).length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('meetings.empty.noOfficialsYet')}
            description={tf('meetings.sectorDetails.noOfficialsDescription', 'Add officials to define ownership and accountability.')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(sector.officials || []).map((official) => (
              <div
                key={official.id || official.name}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                {/* name + title */}
                {official.user?.fullName && (
                  <p className="font-semibold text-heading">
                    {official.user.fullName}
                  </p>
                )}
                {official.user.phonePrimary && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted direction-ltr">
                    <Phone className="h-3 w-3" />
                    {official.user.phonePrimary}
                  </p>
                )}
                {/* notes */}
                {official.notes && (
                  <p className="mt-3 line-clamp-2 text-xs text-muted">{official.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ══ LINKED MEETINGS ═══════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionLabel>{t('meetings.sections.meetings')}</SectionLabel>
          {meetings.length > 0 && (
            <span className="text-xs text-muted">{meetings.length}</span>
          )}
        </div>

        {!canViewMeetings ? (
          <EmptyState
            icon={CalendarDays}
            title={t('meetings.empty.noMeetingsPermissionTitle')}
            description={t('meetings.empty.noMeetingsPermissionDescription')}
          />
        ) : relatedMeetingsQuery.isLoading ? (
          <p className="text-sm text-muted">{t('common.loading')}</p>
        ) : meetings.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={t('meetings.empty.meetingsTitle')}
            description={tf('meetings.sectorDetails.noLinkedMeetingsDescription', 'No meetings are currently assigned to this sector.')}
          />
        ) : (
          <div className="overflow-hidden tttable">
            {meetings.map((meeting, i) => (
              <div
                key={meeting.id}
                className={`px-5 py-4 ${i !== meetings.length - 1 ? 'border-b border-border/60' : ''}`}
              >
                {/* top row */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-heading">{meeting.name || EMPTY}</p>
                  <Badge variant="primary">
                    {getDayLabel(meeting.day, t)} · {meeting.time}
                  </Badge>
                </div>

                {/* stats row */}
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                  <span>{t('meetings.columns.servantsCount')}: <strong className="text-heading">{(meeting.servants || []).length}</strong></span>
                  <span>{t('meetings.columns.committeesCount')}: <strong className="text-heading">{(meeting.committees || []).length}</strong></span>
                  <span>{t('meetings.columns.activitiesCount')}: <strong className="text-heading">{(meeting.activities || []).length}</strong></span>
                  <span className="ms-auto">{formatDateTime(meeting.updatedAt)}</span>
                </div>

                {/* actions */}
                <div className="mt-3 flex gap-2">
                  <Link to={`/dashboard/meetings/list/${meeting.id}`}>
                    <Button size="sm" variant="outline">{t('common.actions.view')}</Button>
                  </Link>
                  {canManageMeeting && (
                    <Link to={`/dashboard/meetings/${meeting.id}/edit`}>
                      <Button size="sm" variant="ghost">{t('common.actions.edit')}</Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
