import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckSquare, ClipboardCheck, Save, Square, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { meetingsApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import PageHeader from '../../../components/ui/PageHeader';
import Select from '../../../components/ui/Select';
import { useI18n } from '../../../i18n/i18n';
import { formatDateTime } from '../../../utils/formatters';
import { getDayLabel } from './meetingsForm.utils';
import { buildPastMeetingDateOptions } from './meetingDateOptions.utils';

const EMPTY = '---';

function toComparableId(value) {
  if (!value) return null;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return String(value.id || value._id || value);
}

function buildAttendanceGroups(meeting, t) {
  const groupedMemberIds = new Set();
  const groups = (meeting?.groupAssignments || [])
    .map((assignment, index) => {
      const members = [...new Map(
        (assignment?.servedUsers || [])
          .map((user) => {
            const memberId = toComparableId(user);
            return memberId ? [memberId, { ...user, id: memberId }] : null;
          })
          .filter(Boolean)
      ).values()]
        .sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || '')));

      members.forEach((member) => groupedMemberIds.add(member.id));

      return {
        key: assignment?.group || `group-${index}`,
        name: assignment?.group || t('meetings.fields.groups'),
        members,
      };
    })
    .filter((group) => group.members.length > 0);

  const ungroupedMembers = [...new Map(
    (meeting?.servedUsers || [])
      .map((user) => {
        const memberId = toComparableId(user);
        if (!memberId || groupedMemberIds.has(memberId)) return null;
        return [memberId, { ...user, id: memberId }];
      })
      .filter(Boolean)
  ).values()]
    .sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || '')));

  if (ungroupedMembers.length > 0) {
    groups.push({
      key: 'ungrouped',
      name: t('meetings.attendance.ungroupedLabel'),
      members: ungroupedMembers,
    });
  }

  return groups;
}

function buildUniqueMemberIds(groups = []) {
  return [...new Set(
    groups.flatMap((group) => (group?.members || []).map((member) => member.id).filter(Boolean))
  )];
}

function MemberToggleCard({ member, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(member.id)}
      className={[
        'flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-start transition-all duration-150',
        checked
          ? 'border-primary bg-primary/8 text-primary'
          : 'border-border bg-surface hover:border-primary/30 hover:shadow-sm',
      ].join(' ')}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {String(member?.fullName || '?').trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-heading">{member?.fullName || EMPTY}</p>
          <p className="truncate text-xs text-muted direction-ltr text-left">{member?.phonePrimary || EMPTY}</p>
        </div>
      </div>
      <span className="shrink-0 text-primary">
        {checked ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-muted" />}
      </span>
    </button>
  );
}

export default function MeetingAttendanceCheckInPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const meetingQuery = useQuery({
    queryKey: ['meetings', 'details', id],
    enabled: Boolean(id),
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await meetingsApi.meetings.getById(id);
      return data?.data || null;
    },
  });

  const meeting = meetingQuery.data || null;
  const attendanceDateOptions = useMemo(() => buildPastMeetingDateOptions(meeting), [meeting]);
  const attendanceGroups = useMemo(() => buildAttendanceGroups(meeting, t), [meeting, t]);
  const allVisibleMemberIds = useMemo(
    () => buildUniqueMemberIds(attendanceGroups),
    [attendanceGroups]
  );

  useEffect(() => {
    if (!selectedDate && attendanceDateOptions.length > 0) {
      setSelectedDate(attendanceDateOptions[0].value);
    }
  }, [attendanceDateOptions, selectedDate]);

  useEffect(() => {
    setSelectedMemberIds([]);
  }, [selectedDate]);

  const attendanceQuery = useQuery({
    queryKey: ['meetings', 'attendance', id, selectedDate],
    enabled: Boolean(id && selectedDate),
    staleTime: 0,
    queryFn: async () => {
      const { data } = await meetingsApi.meetings.getAttendance(id, selectedDate);
      return data?.data || null;
    },
  });

  useEffect(() => {
    if (!attendanceQuery.data) return;
    setSelectedMemberIds(Array.isArray(attendanceQuery.data.attendedMemberUserIds)
      ? attendanceQuery.data.attendedMemberUserIds
      : []);
  }, [attendanceQuery.data]);

  const saveAttendanceMutation = useMutation({
    mutationFn: () => meetingsApi.meetings.updateAttendance(id, selectedDate, selectedMemberIds),
    onSuccess: ({ data }) => {
      const payload = data?.data || null;
      if (payload) {
        setSelectedMemberIds(Array.isArray(payload.attendedMemberUserIds) ? payload.attendedMemberUserIds : []);
      }
      toast.success(tf('meetings.attendance.messages.saved', 'Attendance saved successfully.'));
      queryClient.invalidateQueries({ queryKey: ['meetings', 'attendance', id, selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['meetings', 'details', id] });
      queryClient.invalidateQueries({ queryKey: ['meetings', 'list'] });
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const selectedMemberIdSet = useMemo(() => new Set(selectedMemberIds), [selectedMemberIds]);
  const selectedCount = selectedMemberIds.length;
  const totalVisibleMembers = allVisibleMemberIds.length;

  const toggleMember = (memberId) => {
    setSelectedMemberIds((current) => (
      current.includes(memberId)
        ? current.filter((idValue) => idValue !== memberId)
        : [...current, memberId]
    ));
  };

  const breadcrumbs = [
    { label: t('shared.dashboard'), href: '/dashboard' },
    { label: t('meetings.meetingsPageTitle'), href: '/dashboard/meetings/list' },
    meeting?.name
      ? { label: meeting.name, href: `/dashboard/meetings/list/${id}` }
      : { label: tf('meetings.memberDetails.meetingFallback', 'Meeting'), href: `/dashboard/meetings/list/${id}` },
    { label: tf('meetings.attendance.pageTitle', 'Attendance Check-in') },
  ];

  if (meetingQuery.isLoading) {
    return (
      <div className="animate-fade-in space-y-6">
        <Breadcrumbs items={breadcrumbs} />
        <p className="text-sm text-muted">{t('common.loading')}</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="animate-fade-in space-y-6">
        <Breadcrumbs items={breadcrumbs} />
        <EmptyState
          icon={CalendarDays}
          title={tf('meetings.meetingDetails.notFoundTitle', 'Meeting not found')}
          description={tf(
            'meetings.meetingDetails.notFoundDescription',
            'This meeting could not be loaded or may have been removed.'
          )}
        />
      </div>
    );
  }

  if (attendanceDateOptions.length === 0) {
    return (
      <div className="animate-fade-in space-y-8 pb-10">
        <Breadcrumbs items={breadcrumbs} />
        <PageHeader
          title={tf('meetings.attendance.pageTitle', 'Attendance Check-in')}
          subtitle={tf(
            'meetings.attendance.pageSubtitle',
            'Choose a past meeting date and mark the members who attended.'
          )}
        />
        <EmptyState
          icon={CalendarDays}
          title={tf('meetings.attendance.noDatesTitle', 'No eligible dates yet')}
          description={tf(
            'meetings.attendance.noDatesDescription',
            'There are no past dates available for this meeting day yet.'
          )}
        />
      </div>
    );
  }

  if (attendanceGroups.length === 0 || totalVisibleMembers === 0) {
    return (
      <div className="animate-fade-in space-y-8 pb-10">
        <Breadcrumbs items={breadcrumbs} />
        <PageHeader
          title={tf('meetings.attendance.pageTitle', 'Attendance Check-in')}
          subtitle={tf(
            'meetings.attendance.pageSubtitle',
            'Choose a past meeting date and mark the members who attended.'
          )}
        />
        <EmptyState
          icon={Users}
          title={tf('meetings.attendance.noMembersTitle', 'No members available')}
          description={tf(
            'meetings.attendance.noMembersDescription',
            'No accessible meeting members are available for attendance check-in.'
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
          eyebrow={meeting?.name || t('meetings.meetingsPageTitle')}
          title={tf('meetings.attendance.pageTitle', 'Attendance Check-in')}
          subtitle={tf(
            'meetings.attendance.pageSubtitle',
            'Choose a past meeting date and mark the members who attended.'
          )}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            {getDayLabel(meeting?.day, t)} · {meeting?.time || EMPTY}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1">
            <Users className="h-3.5 w-3.5" />
            {selectedCount} / {totalVisibleMembers} {tf('meetings.attendance.attendeesSelected', 'selected')}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
          <Select
            label={tf('meetings.attendance.dateLabel', 'Meeting Date')}
            options={attendanceDateOptions}
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            placeholder={tf('meetings.attendance.datePlaceholder', 'Select a meeting date')}
            containerClassName="!mb-0"
          />

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={CheckSquare}
              onClick={() => setSelectedMemberIds(allVisibleMemberIds)}
              disabled={attendanceQuery.isLoading || totalVisibleMembers === 0}
            >
              {tf('meetings.attendance.selectAll', 'Select all')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={Square}
              onClick={() => setSelectedMemberIds([])}
              disabled={attendanceQuery.isLoading || selectedCount === 0}
            >
              {tf('meetings.attendance.clearAll', 'Clear all')}
            </Button>
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

        {attendanceQuery.error && (
          <p className="mt-3 text-sm text-danger">{normalizeApiError(attendanceQuery.error).message}</p>
        )}

        {attendanceQuery.data?.viewerUpdatedAt && (
          <p className="mt-3 text-xs text-muted">
            {tf('meetings.attendance.lastUpdated', 'Last updated')}: {formatDateTime(attendanceQuery.data.viewerUpdatedAt)} ·{' '}
            {attendanceQuery.data.viewerUpdatedBy?.fullName || EMPTY}
          </p>
        )}
      </div>

      {attendanceQuery.isLoading ? (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">{t('common.loading')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {attendanceGroups.map((group) => (
            <section key={group.key} className="rounded-2xl border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-heading">{group.name || EMPTY}</p>
                    <p className="text-xs text-muted">
                      {(group.members || []).filter((member) => selectedMemberIdSet.has(member.id)).length} /{' '}
                      {group.members.length} {tf('meetings.attendance.groupCountLabel', 'selected')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.members.map((member) => (
                  <MemberToggleCard
                    key={member.id}
                    member={member}
                    checked={selectedMemberIdSet.has(member.id)}
                    onToggle={toggleMember}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
