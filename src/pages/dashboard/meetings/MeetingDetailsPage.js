import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowUpRight, CalendarClock, CalendarDays, ClipboardCheck, Edit, FileText,
  Layers3, ListChecks, Phone, Settings2, UserCircle, Users,
} from 'lucide-react';
import { meetingsApi } from '../../../api/endpoints';
import { useAuth } from '../../../auth/auth.hooks';
import NotificationTemplateEditor from '../../../components/notifications/NotificationTemplateEditor';
import Badge from '../../../components/ui/Badge';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card, { CardHeader } from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import Input from '../../../components/ui/Input';
import PageHeader from '../../../components/ui/PageHeader';
import Tabs from '../../../components/ui/Tabs';
import { useI18n } from '../../../i18n/i18n';
import { formatDateTime } from '../../../utils/formatters';
import { getActivityTypeLabel, getDayLabel } from './meetingsForm.utils';

const EMPTY = '---';
const MEETING_REMINDER_DEFAULTS = Object.freeze({
  leadMinutes: 60,
  template: {
    title: {
      ar: 'تذكير بموعد الاجتماع',
      en: 'تذكير بموعد الاجتماع',
    },
    message: {
      ar: 'سيتبقى {reminderLeadTime} على اجتماع {meetingName} يوم {meetingDay} في {meetingDateTime}.',
      en: 'سيتبقى {reminderLeadTime} على اجتماع {meetingName} يوم {meetingDay} في {meetingDateTime}.',
    },
  },
});
const MEETING_REMINDER_TOKENS = Object.freeze([
  {
    key: 'meetingName',
    token: '{meetingName}',
    label: { ar: 'اسم الاجتماع', en: 'Meeting name' },
    sampleValue: { ar: 'اجتماع الشباب', en: 'Youth Meeting' },
  },
  {
    key: 'meetingDay',
    token: '{meetingDay}',
    label: { ar: 'يوم الاجتماع', en: 'Meeting day' },
    sampleValue: { ar: 'الأحد', en: 'Sunday' },
  },
  {
    key: 'meetingTime',
    token: '{meetingTime}',
    label: { ar: 'وقت الاجتماع', en: 'Meeting time' },
    sampleValue: { ar: '6:30 م', en: '6:30 PM' },
  },
  {
    key: 'meetingDateTime',
    token: '{meetingDateTime}',
    label: { ar: 'تاريخ ووقت الاجتماع', en: 'Meeting date/time' },
    sampleValue: { ar: '10 أبريل 2026، 6:30 م', en: 'Apr 10, 2026, 6:30 PM' },
  },
  {
    key: 'sectorName',
    token: '{sectorName}',
    label: { ar: 'اسم القطاع', en: 'Sector name' },
    sampleValue: { ar: 'قطاع الشباب', en: 'Youth Sector' },
  },
  {
    key: 'reminderLeadTime',
    token: '{reminderLeadTime}',
    label: { ar: 'المدة قبل الاجتماع', en: 'Reminder lead time' },
    sampleValue: { ar: 'ساعة واحدة', en: '1 hour' },
  },
]);

function buildMeetingReminderForm(reminderSettings = {}) {
  const titleAr = String(
    reminderSettings?.template?.title?.ar
      || MEETING_REMINDER_DEFAULTS.template.title.ar
  );
  const messageAr = String(
    reminderSettings?.template?.message?.ar
      || MEETING_REMINDER_DEFAULTS.template.message.ar
  );
  const parsedLeadMinutes = Number(reminderSettings?.leadMinutes);

  return {
    leadMinutes: Number.isFinite(parsedLeadMinutes)
      ? parsedLeadMinutes
      : MEETING_REMINDER_DEFAULTS.leadMinutes,
    template: {
      title: {
        ar: titleAr,
        en: String(reminderSettings?.template?.title?.en || titleAr),
      },
      message: {
        ar: messageAr,
        en: String(reminderSettings?.template?.message?.en || messageAr),
      },
    },
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Primitives
───────────────────────────────────────────────────────────────────────────── */

function SectionLabel({ children, count }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
        {children}
      </span>
      <div className="h-px flex-1 bg-border/60" />
      {count != null && (
        <span className="text-[11px] font-semibold tabular-nums text-muted">{count}</span>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-heading">{value || EMPTY}</p>
    </div>
  );
}

/** Person card used in leadership/assistants */
function PersonChip({ person, roleLabel }) {
  if (!person) return null;
  const initial = String(person.name || person.user?.fullName || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {initial}
        </div>
        <div className="min-w-0">
          {roleLabel && (
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
              {roleLabel}
            </p>
          )}
          <p className="truncate font-semibold text-heading">
            {person.name || person.user?.fullName || EMPTY}
          </p>
          {person.user?.fullName && person.name && person.user.fullName !== person.name && (
            <p className="truncate text-xs text-muted">{person.user.fullName}</p>
          )}
          {person.user?.phonePrimary && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted direction-ltr">
              <Phone className="h-3 w-3" />
              {person.user.phonePrimary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Clickable user card for group served users.
 * Clicking navigates to /dashboard/users/:userId
 */
function UserCard({ user, onOpenMember, showPhone = true }) {
  const userId = user?.id || user?._id;
  const name = user?.fullName || EMPTY;
  const initial = String(name).trim().charAt(0).toUpperCase();
  const phone = user?.phonePrimary;

  return (
    <button
      type="button"
      onClick={() => userId && onOpenMember(userId)}
      disabled={!userId || !onOpenMember}
      className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-start transition-all duration-150 hover:border-primary/30 hover:shadow-sm disabled:pointer-events-none disabled:opacity-60"
    >
      {/* avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        {initial}
      </div>

      {/* text */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-heading transition-colors group-hover:text-primary">
          {name}
        </p>
        {showPhone && phone && (
          <p className="truncate text-xs text-muted direction-ltr">{phone}</p>
        )}
      </div>

      {/* arrow */}
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-border transition-all group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────────────────── */

export default function MeetingDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { hasPermission } = useAuth();
  const [reminderForm, setReminderForm] = useState(buildMeetingReminderForm);
  const [showReminderSettings, setShowReminderSettings] = useState(false);

  const tf = useCallback((key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);

  const canUpdateMeeting =
    hasPermission('MEETINGS_UPDATE') ||
    hasPermission('MEETINGS_SERVANTS_MANAGE') ||
    hasPermission('MEETINGS_COMMITTEES_MANAGE') ||
    hasPermission('MEETINGS_ACTIVITIES_MANAGE');
  const canManageAttendance =
    hasPermission('MEETINGS_ATTENDANCE_MANAGE') ||
    hasPermission('MEETINGS_UPDATE') ||
    hasPermission('MEETINGS_SERVANTS_MANAGE');
  const canManageDocumentation =
    hasPermission('MEETINGS_DOCUMENTATION_MANAGE') ||
    hasPermission('MEETINGS_UPDATE') ||
    hasPermission('MEETINGS_SERVANTS_MANAGE');
  const canViewSector = hasPermission('SECTORS_VIEW');
  const canViewUsers = hasPermission('USERS_VIEW');

  const meetingQuery = useQuery({
    queryKey: ['meetings', 'details', id],
    enabled: !!id,
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await meetingsApi.meetings.getById(id);
      return data?.data || null;
    },
  });

  const reminderMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await meetingsApi.meetings.updateReminderSettings(id, payload);
      return data?.data || null;
    },
    onSuccess: (payload) => {
      queryClient.setQueryData(['meetings', 'details', id], payload);
      setReminderForm(buildMeetingReminderForm(payload?.reminderSettings));
      toast.success(
        tf('meetings.meetingDetails.reminderSettings.saved', 'Meeting reminder settings saved successfully.')
      );
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message
        || error?.message
        || tf('meetings.meetingDetails.reminderSettings.saveFailed', 'Failed to save meeting reminder settings.')
      );
    },
  });

  const meeting = meetingQuery.data || null;
  const canManageReminderSettings = Boolean(meeting?.viewerContext?.canManageReminderSettings);
  const canManageDocumentationSettings = Boolean(meeting?.viewerContext?.canManageDocumentationSettings);
  const canViewAllDetails = Boolean(meeting?.viewerContext?.canViewAllDetails);
  const canViewAllServedUsers = Boolean(meeting?.viewerContext?.canViewAllServedUsers);
  const canViewLeadership = Boolean(meeting?.viewerContext?.canViewLeadership ?? canViewAllDetails);
  const canViewServants = Boolean(meeting?.viewerContext?.canViewServants ?? canViewAllDetails);
  const canViewCommittees = Boolean(meeting?.viewerContext?.canViewCommittees ?? canViewAllDetails);
  const canViewActivities = Boolean(meeting?.viewerContext?.canViewActivities ?? canViewAllDetails);
  const canOpenMemberFromGroups = meeting?.viewerContext?.accessLevel !== 'member';
  const canViewMemberPhoneInGroups = meeting?.viewerContext?.accessLevel !== 'member';

  useEffect(() => {
    if (!meeting?.reminderSettings) return;
    setReminderForm(buildMeetingReminderForm(meeting.reminderSettings));
  }, [meeting?.id, meeting?.reminderSettings]);

  useEffect(() => {
    setShowReminderSettings(false);
  }, [meeting?.id]);

  const updateReminderField = useCallback((field, language, value) => {
    setReminderForm((current) => {
      const previousArabicValue = String(current?.template?.[field]?.ar || '');
      const previousEnglishValue = String(current?.template?.[field]?.en || '');
      const nextLocalizedField = {
        ...(current?.template?.[field] || { ar: '', en: '' }),
        [language]: value,
      };

      if (language === 'ar') {
        const shouldMirrorEnglish = !previousEnglishValue.trim() || previousEnglishValue === previousArabicValue;
        if (shouldMirrorEnglish) {
          nextLocalizedField.en = value;
        }
      }

      return {
        ...current,
        template: {
          ...(current?.template || {}),
          [field]: nextLocalizedField,
        },
      };
    });
  }, []);

  const reminderLanguageTabs = useMemo(
    () => [
      {
        label: t('platformSettingsPage.languages.ar'),
        content: (
          <NotificationTemplateEditor
            t={t}
            language="ar"
            sectionTitle={tf('meetings.meetingDetails.reminderSettings.title', 'Meeting Reminder Notification')}
            sectionSubtitle={tf(
              'meetings.meetingDetails.reminderSettings.subtitle',
              'Customize the reminder title and message that will be sent before this meeting starts.'
            )}
            template={reminderForm?.template}
            tokenList={MEETING_REMINDER_TOKENS}
            onFieldChange={updateReminderField}
          />
        ),
      },
      {
        label: t('platformSettingsPage.languages.en'),
        content: (
          <NotificationTemplateEditor
            t={t}
            language="en"
            sectionTitle={tf('meetings.meetingDetails.reminderSettings.title', 'Meeting Reminder Notification')}
            sectionSubtitle={tf(
              'meetings.meetingDetails.reminderSettings.subtitle',
              'Customize the reminder title and message that will be sent before this meeting starts.'
            )}
            template={reminderForm?.template}
            tokenList={MEETING_REMINDER_TOKENS}
            onFieldChange={updateReminderField}
          />
        ),
      },
    ],
    [reminderForm?.template, t, tf, updateReminderField]
  );
  const leadershipCards = useMemo(() => {
    const assistants = meeting?.assistantSecretaries || [];
    const leaders = [];
    if (meeting?.serviceSecretary) leaders.push({ person: meeting.serviceSecretary, role: 'service' });
    assistants.forEach((assistant) => leaders.push({ person: assistant, role: 'assistant' }));
    return leaders;
  }, [meeting]);

  const stats = useMemo(() => ({
    assistantsCount: (meeting?.assistantSecretaries || []).length,
    servedUsersCount: (meeting?.servedUsers || []).length,
    groupsCount: (meeting?.groups || []).length,
    groupMembersCount: (meeting?.groupAssignments || []).reduce(
      (count, assignment) => count + (assignment?.servedUsers || []).length,
      0
    ),
    servantsCount: (meeting?.servants || []).length,
    committeesCount: (meeting?.committees || []).length,
    activitiesCount: (meeting?.activities || []).length,
  }), [meeting]);

  const openMeetingMember = (memberId) => {
    if (!id || !memberId) return;
    if (canViewAllDetails && canViewUsers) {
      navigate(`/dashboard/users/${memberId}`);
      return;
    }
    navigate(`/dashboard/meetings/list/${id}/members/${memberId}`);
  };

  const handleSaveReminderSettings = useCallback(() => {
    reminderMutation.mutate({
      leadMinutes: Number(reminderForm?.leadMinutes || 0),
      template: reminderForm?.template || MEETING_REMINDER_DEFAULTS.template,
    });
  }, [reminderForm, reminderMutation]);

  const breadcrumbs = [
    { label: t('shared.dashboard'), href: '/dashboard' },
    { label: t('meetings.meetingsPageTitle'), href: '/dashboard/meetings/list' },
    { label: meeting?.name || tf('meetings.meetingDetails.pageTitle', 'Meeting Details') },
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
          description={tf('meetings.meetingDetails.notFoundDescription', 'This meeting could not be loaded or may have been removed.')}
        />
      </div>
    );
  }

  const kpiTiles = canViewAllDetails
    ? [
      { label: t('meetings.fields.assistants'), value: stats.assistantsCount, icon: Users },
      ...(canViewAllServedUsers
        ? [{ label: t('meetings.fields.servedUsers'), value: stats.servedUsersCount, icon: UserCircle }]
        : []),
      { label: t('meetings.columns.groupsCount'), value: stats.groupsCount, icon: ListChecks },
      { label: t('meetings.columns.servantsCount'), value: stats.servantsCount, icon: Users },
      { label: t('meetings.columns.committeesCount'), value: stats.committeesCount, icon: FileText },
      { label: t('meetings.columns.activitiesCount'), value: stats.activitiesCount, icon: CalendarClock },
    ]
    : [
      { label: t('meetings.columns.groupsCount'), value: stats.groupsCount, icon: ListChecks },
      {
        label: tf('meetings.memberDetails.groupsTitle', 'Groups'),
        value: stats.groupMembersCount,
        icon: UserCircle,
      },
    ];

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs items={breadcrumbs} />

      {/* ══ HEADER ════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          {meeting.avatar?.url ? (
            <img src={meeting.avatar.url} alt={meeting.name || ''} className="h-16 w-16 rounded-2xl border border-border object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <CalendarDays className="h-7 w-7 text-primary" />
            </div>
          )}
          <PageHeader
            contentOnly
            eyebrow={t('meetings.meetingsPageTitle')}
            title={meeting.name || EMPTY}
            titleClassName="mt-1 text-3xl font-bold tracking-tight text-heading"
            childrenClassName="mt-2 flex flex-wrap items-center gap-2"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
              <CalendarDays className="h-3 w-3" />
              {getDayLabel(meeting.day, t)} · {meeting.time || EMPTY}
            </span>
            {meeting.sector?.name && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-medium text-muted">
                <Layers3 className="h-3 w-3" />
                {meeting.sector.name}
              </span>
            )}
          </PageHeader>
        </div>

        <div className="flex flex-wrap gap-2">
          {canViewSector && meeting.sector?.id && (
            <Link to={`/dashboard/meetings/sectors/${meeting.sector.id}`}>
              <Button variant="ghost" icon={Layers3}>{t('meetings.columns.sector')}</Button>
            </Link>
          )}
          {canManageReminderSettings && (
            <Button
              type="button"
              variant={showReminderSettings ? 'outline' : 'ghost'}
              icon={CalendarClock}
              onClick={() => setShowReminderSettings((current) => !current)}
            >
              {showReminderSettings
                ? tf('meetings.meetingDetails.reminderSettings.hideAction', 'Hide reminder settings')
                : tf('meetings.meetingDetails.reminderSettings.showAction', 'Reminder settings')}
            </Button>
          )}
          {canUpdateMeeting && (
            <Link to={`/dashboard/meetings/${meeting.id}/edit`}>
              <Button variant="outline" icon={Edit}>{t('common.actions.edit')}</Button>
            </Link>
          )}
        </div>
      </div>

      {/* ══ KPI TILES ═════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {kpiTiles.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted leading-tight">{label}</p>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-muted">
                <Icon className="h-3 w-3" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-heading">{value ?? 0}</p>
            <div className="mt-3 h-0.5 w-6 rounded-full bg-border" />
          </div>
        ))}
      </div>

      {/* ══ METADATA ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 rounded-2xl border border-border bg-surface px-6 py-5 sm:grid-cols-4">
        <Field label={t('meetings.columns.updatedAt')} value={formatDateTime(meeting.updatedAt)} />
        <Field label={tf('meetings.meetingDetails.createdAt', 'Created')} value={formatDateTime(meeting.createdAt)} />
        <Field label={t('meetings.columns.sector')} value={meeting.sector?.name} />
        <Field label={t('meetings.fields.serviceSecretary')} value={meeting.serviceSecretary?.name} />
      </div>

      {/* notes */}
      {meeting.notes && (
        <div className="rounded-2xl border border-border bg-surface px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{t('meetings.fields.notes')}</p>
          <p className="mt-2 text-sm text-heading">{meeting.notes}</p>
        </div>
      )}

      {canManageReminderSettings && showReminderSettings && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionLabel>
              {tf('meetings.meetingDetails.reminderSettings.section', 'Meeting reminder settings')}
            </SectionLabel>
            <Button
              type="button"
              loading={reminderMutation.isPending}
              onClick={handleSaveReminderSettings}
            >
              {t('common.actions.save')}
            </Button>
          </div>

          <div className="space-y-6">
            <Card className="rounded-3xl border border-border/60 bg-surface shadow-card">
              <CardHeader
                title={t('platformSettingsPage.notifications.reminderTiming.title')}
                subtitle={t('platformSettingsPage.notifications.reminderTiming.subtitle')}
              />

              <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_1fr]">
                <Input
                  type="number"
                  min="0"
                  max="10080"
                  step="1"
                  label={t('platformSettingsPage.notifications.reminderTiming.fieldLabel')}
                  hint={t('platformSettingsPage.notifications.reminderTiming.hint')}
                  value={reminderForm?.leadMinutes ?? 0}
                  onChange={(event) => setReminderForm((current) => ({
                    ...current,
                    leadMinutes: event.target.value,
                  }))}
                  containerClassName="!mb-0"
                />

                <div className="rounded-2xl border border-border/60 bg-surface-alt/40 p-4">
                  <p className="text-sm font-semibold text-heading">
                    {t('platformSettingsPage.notifications.reminderTiming.previewLabel')}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {t('platformSettingsPage.notifications.reminderTiming.previewValue', {
                      count: Number(reminderForm?.leadMinutes || 0),
                    })}
                  </p>
                </div>
              </div>
            </Card>

            <Tabs variant="inline" tabs={reminderLanguageTabs} />
          </div>
        </section>
      )}

      {/* ══ LEADERSHIP ════════════════════════════════════════════════════ */}
      {canViewLeadership && (
        <section className="space-y-4">
          <SectionLabel count={leadershipCards.length}>
            {t('meetings.sections.leadership')}
          </SectionLabel>
          {leadershipCards.length === 0 ? (
            <EmptyState icon={Users} title={tf('meetings.meetingDetails.noLeadershipTitle', 'No leadership assigned')} description={tf('meetings.meetingDetails.noLeadershipDescription', 'No service secretary or assistant secretaries are assigned to this meeting.')} />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {leadershipCards.map(({ person, role }, i) => (
                <PersonChip
                  key={`${role}_${person?.user?.id || person?.id || person?.name || 'p'}_${i}`}
                  person={person}
                  roleLabel={role === 'service' ? t('meetings.fields.serviceSecretary') : t('meetings.fields.assistants')}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ══ GROUPS ════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionLabel count={(meeting.groupAssignments || []).length}>
            {t('meetings.fields.groups')}
          </SectionLabel>
          <div className="flex flex-wrap items-center gap-2">
            {canManageDocumentation && canOpenMemberFromGroups && (
              <Link to={`/dashboard/meetings/list/${id}/documentation`}>
                <Button variant="outline" size="sm" icon={FileText}>
                  {tf('meetings.actions.openDailyDocumentation', 'Daily Documentation')}
                </Button>
              </Link>
            )}
            {canManageDocumentationSettings && (
              <Link to={`/dashboard/meetings/list/${id}/settings`}>
                <Button variant="outline" size="sm" icon={Settings2}>
                  {tf('meetings.actions.openDocumentationSettings', 'Documentation Settings')}
                </Button>
              </Link>
            )}
            {canManageAttendance && canOpenMemberFromGroups && stats.groupMembersCount > 0 && (
              <Link to={`/dashboard/meetings/list/${id}/attendance`}>
                <Button variant="outline" size="sm" icon={ClipboardCheck}>
                  {tf('meetings.actions.openAttendanceCheckIn', 'Attendance Check-in')}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {(meeting.groups || []).length === 0 ? (
          <EmptyState icon={ListChecks} title={tf('meetings.meetingDetails.noGroupsTitle', 'No groups yet')} description={tf('meetings.meetingDetails.noGroupsDescription', 'No groups are defined for this meeting yet.')} />
        ) : (
          <div className="space-y-4">
            {(meeting.groupAssignments || []).map((assignment, i) => {
              const users = assignment.servedUsers || [];
              return (
                <div key={`${assignment.group}_${i}`} className="rounded-2xl border border-border bg-surface">
                  {/* group header */}
                  <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                        <ListChecks className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <p className="font-semibold text-heading">{assignment.group}</p>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                      {users.length} {tf('meetings.meetingDetails.members', 'members')}
                    </span>
                  </div>

                  {/* user cards grid */}
                  <div className="p-4">
                    {users.length === 0 ? (
                      <p className="text-xs text-muted">{t('common.placeholder.empty')}</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                        {users.map((user) => (
                          <UserCard
                            key={user.id || user._id || user.fullName}
                            user={user}
                            onOpenMember={canOpenMemberFromGroups ? openMeetingMember : null}
                            showPhone={canViewMemberPhoneInGroups}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ══ SERVANTS ══════════════════════════════════════════════════════ */}
      {canViewServants && (
        <section className="space-y-4">
          <SectionLabel count={(meeting.servants || []).length}>
            {t('meetings.sections.servants')}
          </SectionLabel>

          {(meeting.servants || []).length === 0 ? (
            <EmptyState icon={Users} title={t('meetings.empty.noServantsYet')} description={tf('meetings.meetingDetails.noServantsDescription', 'No servants are assigned to this meeting.')} />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(meeting.servants || []).map((servant) => (
                <div key={servant.id} className="rounded-2xl border border-border bg-surface p-4">
                  {/* avatar row */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {String(servant.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-heading">{servant.name || EMPTY}</p>
                      <p className="truncate text-xs text-muted">
                        {servant.responsibility || t('common.placeholder.empty')}
                      </p>
                    </div>
                  </div>

                  {/* groups managed */}
                  {(servant.groupsManaged || []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(servant.groupsManaged || []).map((groupName) => (
                        <span key={`${servant.id}_${groupName}`} className="rounded-full border border-primary/30 bg-primary/8 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {groupName}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* footer */}
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                    <span className="text-xs text-muted">
                      {t('meetings.fields.servedUsers')}:{' '}
                      <strong className="text-heading">{(servant.servedUsers || []).length}</strong>
                    </span>
                  </div>

                  {servant.notes && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted">{servant.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ══ COMMITTEES + ACTIVITIES ════════════════════════════════════════ */}
      {(canViewCommittees || canViewActivities) && <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* committees */}
        {canViewCommittees && (
          <section className="space-y-4">
            <SectionLabel count={(meeting.committees || []).length}>
              {t('meetings.sections.committees')}
            </SectionLabel>

            {(meeting.committees || []).length === 0 ? (
              <EmptyState icon={FileText} title={t('meetings.empty.noCommitteesYet')} description={tf('meetings.meetingDetails.noCommitteesDescription', 'No committees are defined for this meeting.')} />
            ) : (
              <div className="overflow-hidden tttable">
                {(meeting.committees || []).map((committee, i) => (
                  <div key={committee.id} className={`px-5 py-4 ${i !== (meeting.committees || []).length - 1 ? 'border-b border-border/60' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-heading">{committee.name || EMPTY}</p>
                        {committee.notes && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted">{committee.notes}</p>
                        )}
                      </div>
                      <Badge variant="default">
                        {(committee.members || []).length} {tf('meetings.meetingDetails.members', 'members')}
                      </Badge>
                    </div>
                    {(committee.memberNames || []).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(committee.memberNames || []).map((name, idx) => (
                          <span key={`${committee.id}_${idx}`} className="rounded-full border border-border bg-surface-alt px-2.5 py-0.5 text-xs font-medium text-heading">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* activities */}
        {canViewActivities && (
          <section className="space-y-4">
            <SectionLabel count={(meeting.activities || []).length}>
              {t('meetings.sections.activities')}
            </SectionLabel>

            {(meeting.activities || []).length === 0 ? (
              <EmptyState icon={CalendarClock} title={t('meetings.empty.noActivitiesYet')} description={tf('meetings.meetingDetails.noActivitiesDescription', 'No activities are planned for this meeting.')} />
            ) : (
              <div className="overflow-hidden tttable">
                {(meeting.activities || []).map((activity, i) => (
                  <div key={activity.id} className={`px-5 py-4 ${i !== (meeting.activities || []).length - 1 ? 'border-b border-border/60' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-heading">{activity.name || EMPTY}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {activity.scheduledAt ? formatDateTime(activity.scheduledAt) : t('common.placeholder.empty')}
                        </p>
                        {activity.notes && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted">{activity.notes}</p>
                        )}
                      </div>
                      {activity.type && <Badge variant="secondary">{getActivityTypeLabel(activity.type, t)}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>}

    </div>
  );
}
