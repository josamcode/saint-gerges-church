import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Layers3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { normalizeApiError } from '../../../api/errors';
import { meetingsApi } from '../../../api/endpoints';
import { useAuth } from '../../../auth/auth.hooks';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card, { CardHeader } from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import Input from '../../../components/ui/Input';
import PageHeader from '../../../components/ui/PageHeader';
import Select from '../../../components/ui/Select';
import Table, { RowActions } from '../../../components/ui/Table';
import { useI18n } from '../../../i18n/i18n';
import { getDayLabel, getDayOptions } from './meetingsForm.utils';

export default function MeetingsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const canViewSectors = hasPermission('SECTORS_VIEW');
  const canCreateSectors = hasPermission('SECTORS_CREATE');
  const canUpdateSectors = hasPermission('SECTORS_UPDATE');
  const canDeleteSectors = hasPermission('SECTORS_DELETE');

  const canViewMeetings = hasPermission('MEETINGS_VIEW');
  const canCreateMeetings = hasPermission('MEETINGS_CREATE');
  const canUpdateMeetings = hasPermission('MEETINGS_UPDATE');
  const canUpdateMeetingsSections =
    hasPermission('MEETINGS_SERVANTS_MANAGE') ||
    hasPermission('MEETINGS_COMMITTEES_MANAGE') ||
    hasPermission('MEETINGS_ACTIVITIES_MANAGE');
  const canDeleteMeetings = hasPermission('MEETINGS_DELETE');

  const [filters, setFilters] = useState({
    sectorId: '',
    day: '',
    search: '',
  });

  const sectorsQuery = useQuery({
    queryKey: ['meetings', 'sectors', 'list'],
    enabled: canViewSectors || canViewMeetings || canCreateMeetings || canUpdateMeetings,
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await meetingsApi.sectors.list({ limit: 100, order: 'asc' });
      return data?.data || [];
    },
  });

  const meetingsQuery = useQuery({
    queryKey: ['meetings', 'list', filters],
    enabled: canViewMeetings,
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await meetingsApi.meetings.list({
        limit: 100,
        order: 'desc',
        ...(filters.sectorId && { sectorId: filters.sectorId }),
        ...(filters.day && { day: filters.day }),
        ...(filters.search.trim() && { search: filters.search.trim() }),
      });
      return data?.data || [];
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

  const deleteMeetingMutation = useMutation({
    mutationFn: (id) => meetingsApi.meetings.remove(id),
    onSuccess: () => {
      toast.success(t('meetings.messages.meetingDeleted'));
      queryClient.invalidateQueries({ queryKey: ['meetings', 'list'] });
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  const sectors = Array.isArray(sectorsQuery.data) ? sectorsQuery.data : [];
  const meetings = Array.isArray(meetingsQuery.data) ? meetingsQuery.data : [];

  const sectorOptions = sectors.map((sector) => ({ value: sector.id, label: sector.name }));
  const dayOptions = getDayOptions(t);

  const sectorColumns = [
    {
      key: 'name',
      label: t('meetings.columns.sector'),
      render: (row) => <span className="font-medium text-heading">{row.name}</span>,
    },
    {
      key: 'officials',
      label: t('meetings.columns.officials'),
      render: (row) => {
        const officials = row.officials || [];
        if (!officials.length) return t('common.placeholder.empty');
        return officials
          .slice(0, 3)
          .map((official) => (official.title ? `${official.name} (${official.title})` : official.name))
          .join(', ');
      },
    },
    {
      key: 'actions',
      label: t('common.table.actions'),
      render: (row) => (
        <RowActions
          actions={[
            ...(canUpdateSectors
              ? [{ label: t('common.actions.edit'), onClick: () => navigate(`/dashboard/meetings/sectors/${row.id}/edit`) }]
              : []),
            ...(canDeleteSectors
              ? [{ label: t('common.actions.delete'), danger: true, onClick: () => {
                if (window.confirm(t('meetings.messages.confirmDeleteSector'))) {
                  deleteSectorMutation.mutate(row.id);
                }
              } }]
              : []),
          ]}
        />
      ),
    },
  ];

  const meetingColumns = [
    {
      key: 'name',
      label: t('meetings.columns.meeting'),
      render: (row) => <span className="font-medium text-heading">{row.name}</span>,
    },
    {
      key: 'sector',
      label: t('meetings.columns.sector'),
      render: (row) => row.sector?.name || t('common.placeholder.empty'),
    },
    {
      key: 'schedule',
      label: t('meetings.columns.schedule'),
      render: (row) => `${getDayLabel(row.day, t)} - ${row.time}`,
    },
    {
      key: 'servantsCount',
      label: t('meetings.columns.servantsCount'),
      render: (row) => row.servants?.length || 0,
    },
    {
      key: 'actions',
      label: t('common.table.actions'),
      render: (row) => (
        <RowActions
          actions={[
            ...((canUpdateMeetings || canUpdateMeetingsSections)
              ? [{ label: t('common.actions.edit'), onClick: () => navigate(`/dashboard/meetings/${row.id}/edit`) }]
              : []),
            ...(canDeleteMeetings
              ? [{ label: t('common.actions.delete'), danger: true, onClick: () => {
                if (window.confirm(t('meetings.messages.confirmDeleteMeeting'))) {
                  deleteMeetingMutation.mutate(row.id);
                }
              } }]
              : []),
          ]}
        />
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('meetings.pageTitle') },
        ]}
      />

      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <PageHeader
            contentOnly
            title={t('meetings.pageTitle')}
            subtitle={t('meetings.pageSubtitle')}
            titleClassName="mt-0 text-xl font-bold text-heading"
            subtitleClassName="mt-0 text-sm text-muted"
          />
          <div className="flex gap-2 flex-wrap">
            {canCreateSectors && (
              <Button icon={Layers3} variant="outline" onClick={() => navigate('/dashboard/meetings/sectors/new')}>
                {t('meetings.actions.addSector')}
              </Button>
            )}
            {canCreateMeetings && (
              <Button icon={CalendarPlus} onClick={() => navigate('/dashboard/meetings/new')}>
                {t('meetings.actions.addMeeting')}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {canViewSectors && (
        <Card>
          <CardHeader
            title={t('meetings.sections.sectors')}
            subtitle={t('meetings.sections.sectorsSubtitle')}
          />
          <Table
            columns={sectorColumns}
            data={sectors}
            loading={sectorsQuery.isLoading}
            emptyTitle={t('meetings.empty.sectorsTitle')}
            emptyDescription={t('meetings.empty.sectorsDescription')}
          />
        </Card>
      )}

      {canViewMeetings ? (
        <Card>
          <CardHeader
            title={t('meetings.sections.meetings')}
            subtitle={t('meetings.sections.meetingsSubtitle')}
          />
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label={t('meetings.filters.sector')}
              value={filters.sectorId}
              onChange={(event) => setFilters((prev) => ({ ...prev, sectorId: event.target.value }))}
              options={[{ value: '', label: t('meetings.filters.allSectors') }, ...sectorOptions]}
              containerClassName="!mb-0"
            />
            <Select
              label={t('meetings.filters.day')}
              value={filters.day}
              onChange={(event) => setFilters((prev) => ({ ...prev, day: event.target.value }))}
              options={[{ value: '', label: t('meetings.filters.allDays') }, ...dayOptions]}
              containerClassName="!mb-0"
            />
            <Input
              label={t('meetings.filters.search')}
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder={t('meetings.filters.searchPlaceholder')}
              containerClassName="!mb-0"
            />
          </div>

          <div className="mt-4">
            <Table
              columns={meetingColumns}
              data={meetings}
              loading={meetingsQuery.isLoading}
              emptyTitle={t('meetings.empty.meetingsTitle')}
              emptyDescription={t('meetings.empty.meetingsDescription')}
            />
          </div>
        </Card>
      ) : (
        <EmptyState
          title={t('meetings.empty.noMeetingsPermissionTitle')}
          description={t('meetings.empty.noMeetingsPermissionDescription')}
        />
      )}
    </div>
  );
}
