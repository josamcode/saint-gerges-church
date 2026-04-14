import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { mapFieldErrors, normalizeApiError } from '../../../api/errors';
import { meetingsApi } from '../../../api/endpoints';
import { useAuth } from '../../../auth/auth.hooks';
import UserSearchSelect from '../../../components/UserSearchSelect';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import MultiSelectChips from '../../../components/ui/MultiSelectChips';
import PageHeader from '../../../components/ui/PageHeader';
import Select from '../../../components/ui/Select';
import TagInput from '../../../components/ui/TagInput';
import TextArea from '../../../components/ui/TextArea';
import { useI18n } from '../../../i18n/i18n';
import {
  buildMeetingPayload,
  getActivityOptions,
  getDayLabel,
  getDayOptions,
  mapMeetingToForm,
} from './meetingsForm.utils';

const EMPTY_FORM = {
  sectorId: '',
  name: '',
  day: 'Sunday',
  time: '18:00',
  avatar: null,
  avatarRemoved: false,
  serviceSecretaryUser: null,
  serviceSecretaryName: '',
  assistantSecretaries: [],
  servedUsers: [],
  groups: [],
  groupServedUsersByGroup: {},
  pendingGroupServedUserByGroup: {},
  servants: [],
  committees: [],
  activities: [],
  notes: '',
};

function UserPill({ user, onRemove, disabled = false }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-alt px-2.5 py-1 text-xs">
      <span className="font-medium text-heading">{user.fullName}</span>
      <button type="button" className="text-danger disabled:opacity-50" onClick={onRemove} disabled={disabled}>
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function FormSection({ title, subtitle, action, children }) {
  return (
    <Card padding={false} className="overflow-hidden">
      <div className="border-b border-border bg-surface-alt/40 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-heading">{title}</h3>
            {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
      <div className="px-5 py-5">{children}</div>
    </Card>
  );
}

export default function MeetingFormPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const fileInputRef = useRef(null);

  const canUpdateBasics = hasPermission('MEETINGS_UPDATE');
  const canManageServants = hasPermission('MEETINGS_SERVANTS_MANAGE');
  const canManageCommittees = hasPermission('MEETINGS_COMMITTEES_MANAGE');
  const canManageActivities = hasPermission('MEETINGS_ACTIVITIES_MANAGE');

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [pendingServedUser, setPendingServedUser] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const sectorsQuery = useQuery({
    queryKey: ['meetings', 'sectors', 'list'],
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await meetingsApi.sectors.list({ limit: 200, order: 'asc' });
      return data?.data || [];
    },
  });

  const meetingQuery = useQuery({
    queryKey: ['meetings', 'details', id],
    enabled: isEdit,
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await meetingsApi.meetings.getById(id);
      return data?.data || null;
    },
  });

  useEffect(() => {
    if (meetingQuery.data) {
      setForm(mapMeetingToForm(meetingQuery.data));
    }
  }, [meetingQuery.data]);

  const sectors = Array.isArray(sectorsQuery.data) ? sectorsQuery.data : [];
  const sectorOptions = sectors.map((sector) => ({ value: sector.id, label: sector.name }));
  const selectedSectorName =
    sectors.find((sector) => String(sector.id || sector._id) === String(form.sectorId))?.name ||
    t('meetings.fields.selectSector');
  const dayOptions = getDayOptions(t);
  const activityOptions = getActivityOptions(t);
  const meetingGroupOptions = (form.groups || []).map((groupName) => ({ value: groupName, label: groupName }));
  const hasValidationErrors = Object.values(errors || {}).some(Boolean);
  const summaryItems = [
    { label: t('meetings.fields.groups'), value: form.groups.length },
    { label: t('meetings.fields.assistants'), value: form.assistantSecretaries.length },
    { label: t('meetings.fields.servedUsers'), value: form.servedUsers.length },
    canManageServants ? { label: t('meetings.sections.servants'), value: form.servants.length } : null,
    canManageCommittees ? { label: t('meetings.sections.committees'), value: form.committees.length } : null,
    canManageActivities ? { label: t('meetings.sections.activities'), value: form.activities.length } : null,
  ].filter(Boolean);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (!isEdit) {
        return meetingsApi.meetings.create(payload);
      }

      const { servants, committees, activities, ...basicPayload } = payload;

      if (canUpdateBasics) {
        await meetingsApi.meetings.updateBasic(id, basicPayload);
      }
      if (canManageServants) {
        await meetingsApi.meetings.updateServants(id, servants || []);
      }
      if (canManageCommittees) {
        await meetingsApi.meetings.updateCommittees(id, committees || []);
      }
      if (canManageActivities) {
        await meetingsApi.meetings.updateActivities(id, activities || []);
      }

      return meetingsApi.meetings.getById(id);
    },
    onSuccess: () => {
      toast.success(isEdit ? t('meetings.messages.meetingUpdated') : t('meetings.messages.meetingCreated'));
      queryClient.invalidateQueries({ queryKey: ['meetings', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['meetings', 'responsibilities'] });
      navigate('/dashboard/meetings/list');
    },
    onError: (error) => {
      const normalized = normalizeApiError(error);
      setErrors(mapFieldErrors(normalized.details));
      toast.error(normalized.message);
    },
  });

  const validateForm = () => {
    const nextErrors = {};

    if (!form.sectorId) nextErrors.sectorId = t('meetings.errors.sectorRequired');
    if (!form.name.trim()) nextErrors.name = t('meetings.errors.nameRequired');
    if (!form.time) nextErrors.time = t('meetings.errors.timeRequired');

    if (canManageServants) {
      form.servants.forEach((servant, index) => {
        if (!servant.user?._id && !servant.name.trim()) {
          nextErrors[`servant_${index}`] = t('meetings.errors.servantNameOrUserRequired');
        }
      });
    }

    return nextErrors;
  };

  const patchListItem = (key, index, patch) => {
    setForm((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry
      ),
    }));
  };

  const removeListItem = (key, index) => {
    setForm((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, entryIndex) => entryIndex !== index),
    }));
  };

  const addCommitteeMember = (committeeIndex, user) => {
    if (!user?._id) return;
    setForm((prev) => ({
      ...prev,
      committees: (prev.committees || []).map((committee, entryIndex) => {
        if (entryIndex !== committeeIndex) return committee;
        if ((committee.members || []).some((member) => member._id === user._id)) return committee;

        const nextMembers = [...(committee.members || []), user];
        return {
          ...committee,
          members: nextMembers,
          memberUserIdsCsv: nextMembers.map((member) => member?._id).filter(Boolean).join(', '),
          memberNamesCsv: nextMembers.map((member) => member?.fullName).filter(Boolean).join(', '),
        };
      }),
    }));
  };

  const removeCommitteeMember = (committeeIndex, memberId) => {
    setForm((prev) => ({
      ...prev,
      committees: (prev.committees || []).map((committee, entryIndex) => {
        if (entryIndex !== committeeIndex) return committee;
        const nextMembers = (committee.members || []).filter((member) => member._id !== memberId);

        return {
          ...committee,
          members: nextMembers,
          memberUserIdsCsv: nextMembers.map((member) => member?._id).filter(Boolean).join(', '),
          memberNamesCsv: nextMembers.map((member) => member?.fullName).filter(Boolean).join(', '),
        };
      }),
    }));
  };

  const handleMeetingGroupsChange = (nextGroups) => {
    setForm((prev) => ({
      ...prev,
      groups: nextGroups,
      groupServedUsersByGroup: Object.fromEntries(
        Object.entries(prev.groupServedUsersByGroup || {}).filter(([groupName]) => nextGroups.includes(groupName))
      ),
      pendingGroupServedUserByGroup: Object.fromEntries(
        Object.entries(prev.pendingGroupServedUserByGroup || {}).filter(([groupName]) =>
          nextGroups.includes(groupName)
        )
      ),
      servants: (prev.servants || []).map((servant) => {
        const nextGroupsManaged = (servant.groupsManaged || []).filter((groupName) =>
          nextGroups.includes(groupName)
        );

        return {
          ...servant,
          groupsManaged: nextGroupsManaged,
        };
      }),
    }));
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('meetings.errors.avatarMustBeImage'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setAvatarUploading(true);
    try {
      const { data } = await meetingsApi.meetings.uploadAvatarImage(file);
      const avatar = data?.data;
      if (!avatar?.url) {
        toast.error(t('meetings.errors.avatarUploadFailed'));
      } else {
        setForm((prev) => ({ ...prev, avatar, avatarRemoved: false }));
        toast.success(t('meetings.messages.avatarUploaded'));
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setForm((prev) => ({ ...prev, avatar: null, avatarRemoved: true }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error(t('meetings.messages.fixValidationErrors'));
      return;
    }

    const payload = buildMeetingPayload(form, {
      includeServants: canManageServants,
      includeCommittees: canManageCommittees,
      includeActivities: canManageActivities,
    });

    saveMutation.mutate(payload);
  };

  const readonlyBasics = isEdit && !canUpdateBasics;

  if (isEdit && meetingQuery.isLoading) {
    return (
      <Card>
        <p className="text-sm text-muted">{t('common.loading')}</p>
      </Card>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('meetings.meetingsPageTitle'), href: '/dashboard/meetings/list' },
          { label: isEdit ? t('meetings.actions.editMeetingPage') : t('meetings.actions.createMeetingPage') },
        ]}
      />

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-gradient-to-br from-surface to-surface-alt/60 px-6 py-5">
          <PageHeader
            contentOnly
            title={isEdit ? t('meetings.actions.editMeetingPage') : t('meetings.actions.createMeetingPage')}
            subtitle={t('meetings.sections.meetingsSubtitle')}
            titleClassName="mt-0 text-xl font-bold text-heading"
          />

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-surface px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted">{t('meetings.fields.sector')}</p>
              <p className="truncate text-sm font-semibold text-heading">{selectedSectorName}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted">{t('meetings.columns.schedule')}</p>
              <p className="text-sm font-semibold text-heading">
                {getDayLabel(form.day, t)}
                {form.time ? ` - ${form.time}` : ''}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted">{t('meetings.fields.groups')}</p>
              <p className="text-sm font-semibold text-heading">{form.groups.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted">{t('meetings.fields.servedUsers')}</p>
              <p className="text-sm font-semibold text-heading">{form.servedUsers.length}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <FormSection title={t('meetings.sections.basicInfo')}>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-surface-alt/40 p-4">
                <h4 className="text-sm font-semibold text-heading mb-2">{t('meetings.fields.avatar')}</h4>
                <p className="text-xs text-muted mb-4">{t('meetings.fields.avatarHint')}</p>

                <div className="flex items-center gap-4 flex-wrap">
                  {form.avatar?.url ? (
                    <div className="relative inline-block">
                      <img
                        src={form.avatar.url}
                        alt={form.name || t('meetings.fields.avatar')}
                        className="h-24 w-24 rounded-full border border-border object-cover"
                      />
                      {!readonlyBasics && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="absolute -top-1 -left-1 rounded-full bg-danger p-1 text-white"
                          aria-label={t('meetings.actions.removeAvatar')}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-full border-2 border-dashed border-border bg-surface flex items-center justify-center text-xs text-muted text-center px-2">
                      {t('meetings.empty.noAvatar')}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleAvatarChange}
                      disabled={avatarUploading || readonlyBasics}
                      className="hidden"
                      id="meeting-avatar-upload"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={Upload}
                      loading={avatarUploading}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={readonlyBasics}
                    >
                      {form.avatar?.url ? t('meetings.actions.changeAvatar') : t('meetings.actions.uploadAvatar')}
                    </Button>

                    {form.avatar?.url && !readonlyBasics && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-danger"
                        onClick={handleRemoveAvatar}
                      >
                        {t('meetings.actions.removeAvatar')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="xl:col-span-2 rounded-xl border border-border bg-surface p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label={t('meetings.fields.sector')}
                    required
                    value={form.sectorId}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, sectorId: event.target.value }));
                      setErrors((prev) => ({ ...prev, sectorId: undefined }));
                    }}
                    options={sectorOptions}
                    placeholder={t('meetings.fields.selectSector')}
                    error={errors.sectorId}
                    disabled={readonlyBasics}
                  />

                  <Input
                    label={t('meetings.fields.name')}
                    required
                    value={form.name}
                    placeholder={t('meetings.fields.meetingNamePlaceholder')}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, name: event.target.value }));
                      setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    error={errors.name}
                    disabled={readonlyBasics}
                  />

                  <Select
                    label={t('meetings.fields.day')}
                    required
                    value={form.day}
                    onChange={(event) => setForm((prev) => ({ ...prev, day: event.target.value }))}
                    options={dayOptions}
                    disabled={readonlyBasics}
                  />

                  <Input
                    label={t('meetings.fields.time')}
                    required
                    type="time"
                    value={form.time}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, time: event.target.value }));
                      setErrors((prev) => ({ ...prev, time: undefined }));
                    }}
                    error={errors.time}
                    disabled={readonlyBasics}
                  />
                </div>

                <TextArea
                  label={t('meetings.fields.notes')}
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder={t('meetings.fields.meetingNotesPlaceholder')}
                  disabled={readonlyBasics}
                />
              </div>
            </div>

            {readonlyBasics && (
              <div className="mt-3 rounded-md border border-warning/30 bg-warning-light px-3 py-2 text-sm text-muted">
                {t('meetings.messages.basicReadOnly')}
              </div>
            )}
          </FormSection>

          <FormSection title={t('meetings.sections.leadership')}>
            <UserSearchSelect
              label={t('meetings.fields.serviceSecretary')}
              value={form.serviceSecretaryUser}
              disabled={readonlyBasics}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  serviceSecretaryUser: value,
                  serviceSecretaryName: value?.fullName || prev.serviceSecretaryName,
                }))
              }
              className="mb-2"
            />
            <Input
              label={t('meetings.fields.nameFallback')}
              value={form.serviceSecretaryName}
              placeholder={t('meetings.fields.serviceSecretaryNamePlaceholder')}
              onChange={(event) => setForm((prev) => ({ ...prev, serviceSecretaryName: event.target.value }))}
              disabled={readonlyBasics}
            />
            <div className="rounded-lg border border-border p-3 mt-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-heading">{t('meetings.fields.assistants')}</h4>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={Plus}
                  disabled={readonlyBasics}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      assistantSecretaries: [...prev.assistantSecretaries, { user: null, name: '' }],
                    }))
                  }
                >
                  {t('meetings.actions.addAssistant')}
                </Button>
              </div>

              <div className="space-y-3">
                {form.assistantSecretaries.length === 0 && (
                  <p className="text-sm text-muted">{t('meetings.empty.noAssistantsYet')}</p>
                )}

                {form.assistantSecretaries.map((assistant, index) => (
                  <div key={index} className="rounded-md border border-border p-3">
                    <UserSearchSelect
                      label={t('meetings.fields.userLink')}
                      value={assistant.user}
                      disabled={readonlyBasics}
                      onChange={(value) =>
                        patchListItem('assistantSecretaries', index, {
                          user: value,
                          name: value?.fullName || assistant.name,
                        })
                      }
                      className="mb-2"
                    />
                    <Input
                      label={t('meetings.fields.nameFallback')}
                      value={assistant.name}
                      placeholder={t('meetings.fields.assistantNamePlaceholder')}
                      onChange={(event) =>
                        patchListItem('assistantSecretaries', index, { name: event.target.value })
                      }
                      disabled={readonlyBasics}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      icon={Trash2}
                      disabled={readonlyBasics}
                      onClick={() => removeListItem('assistantSecretaries', index)}
                    >
                      {t('meetings.actions.remove')}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </FormSection>

          <FormSection title={t('meetings.fields.groups')}>
            <div className="rounded-lg border border-border bg-surface-alt/20 p-4">
              <TagInput
                label={t('meetings.fields.groups')}
                values={form.groups}
                onChange={handleMeetingGroupsChange}
                placeholder={t('meetings.fields.groupsPlaceholder')}
                disabled={readonlyBasics}
              />

              {(form.groups || []).length > 0 && (
                <div className="space-y-3 mb-1">
                  {(form.groups || []).map((groupName) => (
                    <div key={`meeting_group_${groupName}`} className="rounded-md border border-border bg-surface p-3">
                      <p className="text-sm font-semibold text-heading mb-2">{groupName}</p>
                      <UserSearchSelect
                        label={t('meetings.actions.addServedUser')}
                        value={form?.pendingGroupServedUserByGroup?.[groupName] || null}
                        disabled={readonlyBasics}
                        onChange={(value) => {
                          setForm((prev) => ({
                            ...prev,
                            servedUsers:
                              value?._id && !(prev.servedUsers || []).some((entry) => entry._id === value._id)
                                ? [...(prev.servedUsers || []), value]
                                : prev.servedUsers || [],
                            groupServedUsersByGroup: {
                              ...(prev.groupServedUsersByGroup || {}),
                              [groupName]:
                                value?._id &&
                                  !(prev?.groupServedUsersByGroup?.[groupName] || []).some(
                                    (entry) => entry._id === value._id
                                  )
                                  ? [...(prev?.groupServedUsersByGroup?.[groupName] || []), value]
                                  : prev?.groupServedUsersByGroup?.[groupName] || [],
                            },
                            pendingGroupServedUserByGroup: {
                              ...(prev.pendingGroupServedUserByGroup || {}),
                              [groupName]: null,
                            },
                          }));
                        }}
                        className="mb-2"
                      />
                      <div className="flex flex-wrap gap-2">
                        {(form?.groupServedUsersByGroup?.[groupName] || []).length === 0 && (
                          <p className="text-sm text-muted">{t('meetings.empty.noServedUsersYet')}</p>
                        )}
                        {(form?.groupServedUsersByGroup?.[groupName] || []).map((user) => (
                          <UserPill
                            key={`${groupName}_${user._id}`}
                            user={user}
                            disabled={readonlyBasics}
                            onRemove={() =>
                              setForm((prev) => ({
                                ...prev,
                                groupServedUsersByGroup: {
                                  ...(prev.groupServedUsersByGroup || {}),
                                  [groupName]: (prev?.groupServedUsersByGroup?.[groupName] || []).filter(
                                    (entry) => entry._id !== user._id
                                  ),
                                },
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FormSection>

          <FormSection title={t('meetings.fields.servedUsers')}>
            <div className="rounded-lg border border-border bg-surface-alt/20 p-4">
              <UserSearchSelect
                label={t('meetings.actions.addServedUser')}
                value={pendingServedUser}
                disabled={readonlyBasics}
                onChange={(value) => {
                  setPendingServedUser(null);
                  if (!value?._id || readonlyBasics) return;
                  setForm((prev) => {
                    if (prev.servedUsers.some((entry) => entry._id === value._id)) return prev;
                    return { ...prev, servedUsers: [...prev.servedUsers, value] };
                  });
                }}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {form.servedUsers.length === 0 && (
                  <p className="text-sm text-muted">{t('meetings.empty.noServedUsersYet')}</p>
                )}
                {form.servedUsers.map((user) => (
                  <UserPill
                    key={user._id}
                    user={user}
                    disabled={readonlyBasics}
                    onRemove={() =>
                      setForm((prev) => ({
                        ...prev,
                        servedUsers: prev.servedUsers.filter((entry) => entry._id !== user._id),
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          </FormSection>

          {canManageServants && (
            <FormSection
              title={t('meetings.sections.servants')}
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={Plus}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      servants: [
                        ...prev.servants,
                        {
                          name: '',
                          user: null,
                          responsibility: '',
                          groupsManaged: [],
                          servedUsers: [],
                          notes: '',
                        },
                      ],
                    }))
                  }
                >
                  {t('meetings.actions.addServant')}
                </Button>
              }
            >

              <div className="space-y-4">
                {form.servants.length === 0 && (
                  <p className="text-sm text-muted">{t('meetings.empty.noServantsYet')}</p>
                )}

                {form.servants.map((servant, index) => (
                  <div key={index} className="rounded-lg border border-border bg-surface-alt/30 p-4">
                    <UserSearchSelect
                      label={t('meetings.fields.userLink')}
                      value={servant.user}
                      onChange={(value) => {
                        patchListItem('servants', index, {
                          user: value,
                          name: value?.fullName || servant.name,
                        });
                        setErrors((prev) => ({ ...prev, [`servant_${index}`]: undefined }));
                      }}
                      className="mb-2"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label={t('meetings.fields.nameFallback')}
                        value={servant.name}
                        placeholder={t('meetings.fields.servantNamePlaceholder')}
                        onChange={(event) => {
                          patchListItem('servants', index, { name: event.target.value });
                          setErrors((prev) => ({ ...prev, [`servant_${index}`]: undefined }));
                        }}
                        error={errors[`servant_${index}`]}
                      />
                      <Input
                        label={t('meetings.fields.responsibility')}
                        value={servant.responsibility}
                        placeholder={t('meetings.fields.servantResponsibilityPlaceholder')}
                        onChange={(event) =>
                          patchListItem('servants', index, { responsibility: event.target.value })
                        }
                      />
                      <MultiSelectChips
                        label={t('meetings.fields.groupsManaged')}
                        values={servant.groupsManaged || []}
                        options={meetingGroupOptions}
                        onChange={(nextGroupsManaged) => patchListItem('servants', index, { groupsManaged: nextGroupsManaged })}
                        placeholder="Select one or more meeting groups"
                      />
                    </div>

                    <TextArea
                      label={t('meetings.fields.notes')}
                      value={servant.notes}
                      placeholder={t('meetings.fields.servantNotesPlaceholder')}
                      onChange={(event) => patchListItem('servants', index, { notes: event.target.value })}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      icon={Trash2}
                      onClick={() => removeListItem('servants', index)}
                    >
                      {t('meetings.actions.remove')}
                    </Button>
                  </div>
                ))}
              </div>
            </FormSection>
          )}

          {canManageCommittees && (
            <FormSection
              title={t('meetings.sections.committees')}
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={Plus}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      committees: [
                        ...prev.committees,
                        { name: '', members: [], memberNamesCsv: '', memberUserIdsCsv: '', detailsText: '', notes: '' },
                      ],
                    }))
                  }
                >
                  {t('meetings.actions.addCommittee')}
                </Button>
              }
            >

              <div className="space-y-4">
                {form.committees.length === 0 && <p className="text-sm text-muted">{t('meetings.empty.noCommitteesYet')}</p>}
                {form.committees.map((committee, index) => (
                  <div key={index} className="rounded-lg border border-border bg-surface-alt/30 p-4">
                    <Input
                      label={t('meetings.fields.name')}
                      value={committee.name}
                      placeholder={t('meetings.fields.committeeNamePlaceholder')}
                      onChange={(event) => patchListItem('committees', index, { name: event.target.value })}
                    />
                    <div className="rounded-lg border border-border bg-surface p-3">
                      <UserSearchSelect
                        label={t('meetings.actions.addMember')}
                        value={null}
                        onChange={(value) => addCommitteeMember(index, value)}
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(committee.members || []).length === 0 && (
                          <p className="text-sm text-muted">{t('meetings.empty.noServedUsersYet')}</p>
                        )}
                        {(committee.members || []).map((user) => (
                          <UserPill
                            key={`${index}_${user._id}`}
                            user={user}
                            onRemove={() => removeCommitteeMember(index, user._id)}
                          />
                        ))}
                      </div>
                    </div>
                    <TextArea
                      label={t('meetings.fields.committeeDetails')}
                      value={committee.detailsText}
                      placeholder={t('meetings.fields.committeeDetailsPlaceholder')}
                      onChange={(event) => patchListItem('committees', index, { detailsText: event.target.value })}
                    />
                    <TextArea
                      label={t('meetings.fields.notes')}
                      value={committee.notes}
                      placeholder={t('meetings.fields.committeeNotesPlaceholder')}
                      onChange={(event) => patchListItem('committees', index, { notes: event.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      icon={Trash2}
                      onClick={() => removeListItem('committees', index)}
                    >
                      {t('meetings.actions.remove')}
                    </Button>
                  </div>
                ))}
              </div>
            </FormSection>
          )}
          {canManageActivities && (
            <FormSection
              title={t('meetings.sections.activities')}
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={Plus}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      activities: [...prev.activities, { name: '', type: 'activity', scheduledAt: '', notes: '' }],
                    }))
                  }
                >
                  {t('meetings.actions.addActivity')}
                </Button>
              }
            >

              <div className="space-y-4">
                {form.activities.length === 0 && <p className="text-sm text-muted">{t('meetings.empty.noActivitiesYet')}</p>}
                {form.activities.map((activity, index) => (
                  <div key={index} className="rounded-lg border border-border bg-surface-alt/30 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label={t('meetings.fields.name')}
                        value={activity.name}
                        placeholder={t('meetings.fields.activityNamePlaceholder')}
                        onChange={(event) => patchListItem('activities', index, { name: event.target.value })}
                      />
                      <Select
                        label={t('meetings.fields.activityType')}
                        value={activity.type}
                        onChange={(event) => patchListItem('activities', index, { type: event.target.value })}
                        options={activityOptions}
                      />
                      <Input
                        label={t('meetings.fields.scheduledAt')}
                        type="datetime-local"
                        value={activity.scheduledAt}
                        onChange={(event) => patchListItem('activities', index, { scheduledAt: event.target.value })}
                      />
                    </div>
                    <TextArea
                      label={t('meetings.fields.notes')}
                      value={activity.notes}
                      placeholder={t('meetings.fields.activityNotesPlaceholder')}
                      onChange={(event) => patchListItem('activities', index, { notes: event.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      icon={Trash2}
                      onClick={() => removeListItem('activities', index)}
                    >
                      {t('meetings.actions.remove')}
                    </Button>
                  </div>
                ))}
              </div>
            </FormSection>
          )}

          <div className="rounded-xl border border-border bg-surface-alt/30 p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {summaryItems.map((item) => (
                <div key={item.label} className="rounded-md border border-border bg-surface px-3 py-2">
                  <p className="text-[11px] text-muted">{item.label}</p>
                  <p className="text-sm font-semibold text-heading">{item.value}</p>
                </div>
              ))}
            </div>

            {hasValidationErrors && (
              <p className="mt-3 rounded-md border border-danger/30 bg-danger-light px-3 py-2 text-xs text-danger">
                {t('meetings.messages.fixValidationErrors')}
              </p>
            )}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => navigate('/dashboard/meetings/list')}>
                {t('common.actions.cancel')}
              </Button>
              <Button type="submit" icon={Save} loading={saveMutation.isPending}>
                {t('common.actions.save')}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
