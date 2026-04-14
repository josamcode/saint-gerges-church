import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Save, Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';

import { divineLiturgiesApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card, { CardHeader } from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import Input from '../../../components/ui/Input';
import PageHeader from '../../../components/ui/PageHeader';
import Select from '../../../components/ui/Select';
import { useI18n } from '../../../i18n/i18n';
import { formatDate, formatDateTime } from '../../../utils/formatters';
import { getDayLabel } from '../meetings/meetingsForm.utils';
import { buildDivineLiturgyAttendanceDateOptions } from './divineLiturgyAttendanceDateOptions.utils';

const EMPTY = '---';

function sortUsersByName(users = []) {
  return [...users].sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || ''), undefined, {
    sensitivity: 'base',
  }));
}

function getUserInitial(user) {
  const normalizedName = String(user?.fullName || '').trim();
  return normalizedName ? normalizedName.charAt(0).toUpperCase() : '#';
}

function groupUsersByInitial(users = []) {
  return users.reduce((groups, user) => {
    const initial = getUserInitial(user);
    const currentGroup = groups[groups.length - 1];

    if (currentGroup?.initial === initial) {
      currentGroup.users.push(user);
      return groups;
    }

    groups.push({ initial, users: [user] });
    return groups;
  }, []);
}

function UserAttendanceCard({ user, selected = false, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(user.id)}
      className={[
        'rounded-2xl border px-4 py-3 text-start transition-all duration-150',
        selected
          ? 'border-primary bg-primary/8 text-primary'
          : 'border-border bg-surface hover:border-primary/30 hover:shadow-sm',
      ].join(' ')}
    >
      <p className="text-sm font-semibold text-heading">{user.fullName || EMPTY}</p>
    </button>
  );
}

function UserAttendanceGroups({ groups = [], selected = false, onToggle }) {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.initial} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 text-sm font-bold text-primary">
              {group.initial}
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.users.map((user) => (
              <UserAttendanceCard
                key={user.id}
                user={user}
                selected={selected}
                onToggle={onToggle}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function DivineLiturgyAttendanceCheckInPage() {
  const { entryType, id } = useParams();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const contextQuery = useQuery({
    queryKey: ['divine-liturgies', 'attendance-context', entryType, id],
    enabled: Boolean(entryType && id),
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await divineLiturgiesApi.getAttendanceContext(entryType, id);
      return data?.data || null;
    },
  });

  const service = contextQuery.data?.service || null;
  const users = useMemo(
    () => sortUsersByName(Array.isArray(contextQuery.data?.users) ? contextQuery.data.users : []),
    [contextQuery.data]
  );
  const dateOptions = useMemo(
    () => buildDivineLiturgyAttendanceDateOptions(service),
    [service]
  );

  useEffect(() => {
    if (!selectedDate && dateOptions.length > 0) {
      setSelectedDate(dateOptions[0].value);
    }
  }, [dateOptions, selectedDate]);

  useEffect(() => {
    setSelectedUserIds([]);
  }, [selectedDate]);

  const attendanceQuery = useQuery({
    queryKey: ['divine-liturgies', 'attendance', entryType, id, selectedDate],
    enabled: Boolean(entryType && id && selectedDate),
    staleTime: 0,
    queryFn: async () => {
      const { data } = await divineLiturgiesApi.getAttendance(entryType, id, selectedDate);
      return data?.data || null;
    },
  });

  useEffect(() => {
    if (!attendanceQuery.data) return;
    setSelectedUserIds(
      Array.isArray(attendanceQuery.data.attendedUserIds)
        ? attendanceQuery.data.attendedUserIds
        : []
    );
  }, [attendanceQuery.data]);

  const saveAttendanceMutation = useMutation({
    mutationFn: () => divineLiturgiesApi.updateAttendance(entryType, id, selectedDate, selectedUserIds),
    onSuccess: ({ data }) => {
      const payload = data?.data || null;
      if (payload) {
        setSelectedUserIds(Array.isArray(payload.attendedUserIds) ? payload.attendedUserIds : []);
      }
      toast.success(tf('divineLiturgies.attendance.messages.saved', 'Attendance saved successfully.'));
      queryClient.invalidateQueries({ queryKey: ['divine-liturgies', 'attendance', entryType, id, selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['divine-liturgies', 'attendance-context', entryType, id] });
      queryClient.invalidateQueries({ queryKey: ['divine-liturgies', 'overview'] });
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const selectedUserIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);
  const normalizedSearchTerm = String(searchTerm || '').trim().toLowerCase();

  const availableUsers = useMemo(
    () =>
      users.filter((user) => (
        !selectedUserIdSet.has(user.id) &&
        (
          !normalizedSearchTerm ||
          String(user.fullName || '').toLowerCase().includes(normalizedSearchTerm)
        )
      )),
    [users, selectedUserIdSet, normalizedSearchTerm]
  );
  const availableUserGroups = useMemo(
    () => groupUsersByInitial(availableUsers),
    [availableUsers]
  );
  const selectedUsers = useMemo(
    () =>
      users.filter((user) => (
        selectedUserIdSet.has(user.id) &&
        (
          !normalizedSearchTerm ||
          String(user.fullName || '').toLowerCase().includes(normalizedSearchTerm)
        )
      )),
    [users, selectedUserIdSet, normalizedSearchTerm]
  );
  const selectedUserGroups = useMemo(
    () => groupUsersByInitial(selectedUsers),
    [selectedUsers]
  );

  const toggleUser = (userId) => {
    setSelectedUserIds((current) => (
      current.includes(userId)
        ? current.filter((value) => value !== userId)
        : [...current, userId]
    ));
  };

  const serviceScheduleLabel = service?.entryType === 'exception'
    ? formatDate(service?.date)
    : getDayLabel(service?.dayOfWeek, t);

  const filterOptions = [
    { value: 'all', label: tf('divineLiturgies.attendance.filters.all', 'All users') },
    { value: 'available', label: tf('divineLiturgies.attendance.filters.available', 'Available only') },
    { value: 'selected', label: tf('divineLiturgies.attendance.filters.selected', 'Checked in only') },
  ];

  const breadcrumbs = [
    { label: t('shared.dashboard'), href: '/dashboard' },
    { label: t('divineLiturgies.page'), href: '/dashboard/divine-liturgies' },
    {
      label: service?.displayName || tf('divineLiturgies.page', 'Divine Liturgy & Vespers'),
      href: '/dashboard/divine-liturgies',
    },
    { label: tf('divineLiturgies.attendance.pageTitle', 'Users Attendance Check-in') },
  ];

  if (contextQuery.isLoading) {
    return (
      <div className="animate-fade-in space-y-6">
        <Breadcrumbs items={breadcrumbs} />
        <p className="text-sm text-muted">{t('common.loading')}</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="animate-fade-in space-y-6">
        <Breadcrumbs items={breadcrumbs} />
        <EmptyState
          icon={CalendarDays}
          title={tf('divineLiturgies.attendance.notFoundTitle', 'Service not found')}
          description={
            contextQuery.error
              ? normalizeApiError(contextQuery.error).message
              : tf(
                'divineLiturgies.attendance.notFoundDescription',
                'This divine liturgy record could not be loaded or may have been removed.'
              )
          }
        />
      </div>
    );
  }

  if (dateOptions.length === 0) {
    return (
      <div className="animate-fade-in space-y-8 pb-10">
        <Breadcrumbs items={breadcrumbs} />
        <PageHeader
          title={tf('divineLiturgies.attendance.pageTitle', 'Users Attendance Check-in')}
          subtitle={tf(
            'divineLiturgies.attendance.pageSubtitle',
            'Choose a valid past service date, then check in the users who attended.'
          )}
        />
        <EmptyState
          icon={CalendarDays}
          title={tf('divineLiturgies.attendance.noDatesTitle', 'No eligible dates yet')}
          description={tf(
            'divineLiturgies.attendance.noDatesDescription',
            'There are no valid past dates available for this service yet.'
          )}
        />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="animate-fade-in space-y-8 pb-10">
        <Breadcrumbs items={breadcrumbs} />
        <PageHeader
          title={tf('divineLiturgies.attendance.pageTitle', 'Users Attendance Check-in')}
          subtitle={tf(
            'divineLiturgies.attendance.pageSubtitle',
            'Choose a valid past service date, then check in the users who attended.'
          )}
        />
        <EmptyState
          icon={Users}
          title={tf('divineLiturgies.attendance.noUsersTitle', 'No users available')}
          description={tf(
            'divineLiturgies.attendance.noUsersDescription',
            'No users are available for divine liturgy attendance check-in.'
          )}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs items={breadcrumbs} />

      <div className="rounded-2xl border border-border bg-surface p-6">
        <PageHeader
          contentOnly
          eyebrow={service.displayName || t('divineLiturgies.page')}
          title={tf('divineLiturgies.attendance.pageTitle', 'Users Attendance Check-in')}
          subtitle={tf(
            'divineLiturgies.attendance.pageSubtitle',
            'Choose a valid past service date, then check in the users who attended.'
          )}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            {serviceScheduleLabel || EMPTY}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1">
            <Users className="h-3.5 w-3.5" />
            {selectedUserIds.length} {tf('divineLiturgies.attendance.selectedCount', 'checked in')}
          </span>
        </div>
      </div>

      <Card className="rounded-2xl">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,240px)_1fr_auto] lg:items-start">
          <Select
            label={tf('divineLiturgies.attendance.dateLabel', 'Service Date')}
            options={dateOptions}
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            placeholder={tf('divineLiturgies.attendance.datePlaceholder', 'Select a service date')}
            containerClassName="!mb-0"
          />
          <Select
            label={tf('divineLiturgies.attendance.filters.label', 'Filter')}
            options={filterOptions}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            containerClassName="!mb-0"
          />
          <Input
            label={tf('divineLiturgies.attendance.searchLabel', 'Search')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={tf('divineLiturgies.attendance.searchPlaceholder', 'Search by user name')}
            icon={Search}
            containerClassName="!mb-0"
          />
          <div className="flex items-end">
            <Button
              type="button"
              icon={Save}
              onClick={() => saveAttendanceMutation.mutate()}
              loading={saveAttendanceMutation.isPending}
              disabled={!selectedDate}
            >
              {t('common.actions.save')}
            </Button>
          </div>
        </div>

        {attendanceQuery.error ? (
          <p className="mt-3 text-sm text-danger">{normalizeApiError(attendanceQuery.error).message}</p>
        ) : null}

        {attendanceQuery.data?.viewerUpdatedAt ? (
          <p className="mt-3 text-xs text-muted">
            {tf('divineLiturgies.attendance.lastUpdated', 'Last updated')}: {formatDateTime(attendanceQuery.data.viewerUpdatedAt)} ·{' '}
            {attendanceQuery.data.viewerUpdatedBy?.fullName || EMPTY}
          </p>
        ) : null}
      </Card>

      {attendanceQuery.isLoading ? (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">{t('common.loading')}</p>
        </div>
      ) : (
        <>
          {statusFilter !== 'selected' && (
            <Card className="rounded-2xl">
              <CardHeader
                title={tf('divineLiturgies.attendance.availableTitle', 'Available Users')}
                subtitle={tf(
                  'divineLiturgies.attendance.availableSubtitle',
                  'Users are arranged alphabetically. Click any name to move it to the checked-in list.'
                )}
              />

              {availableUsers.length === 0 ? (
                <p className="text-sm text-muted">
                  {tf('divineLiturgies.attendance.noAvailableUsers', 'No users match the current search or filter.')}
                </p>
              ) : (
                <UserAttendanceGroups groups={availableUserGroups} onToggle={toggleUser} />
              )}
            </Card>
          )}

          {statusFilter !== 'available' && (
            <Card className="rounded-2xl border-primary/20">
              <CardHeader
                title={tf('divineLiturgies.attendance.selectedTitle', 'Checked-in Users')}
                subtitle={tf(
                  'divineLiturgies.attendance.selectedSubtitle',
                  'Click any checked-in name to remove it from attendance and return it to the available list.'
                )}
              />

              {selectedUsers.length === 0 ? (
                <p className="text-sm text-muted">
                  {tf('divineLiturgies.attendance.noSelectedUsers', 'No users are checked in for this date yet.')}
                </p>
              ) : (
                <UserAttendanceGroups groups={selectedUserGroups} selected onToggle={toggleUser} />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
