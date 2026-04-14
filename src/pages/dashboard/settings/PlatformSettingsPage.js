import { useCallback, useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { meetingsApi, platformSettingsApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import NotificationTemplateEditor from '../../../components/notifications/NotificationTemplateEditor';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card, { CardHeader } from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import PageHeader from '../../../components/ui/PageHeader';
import Switch from '../../../components/ui/Switch';
import Tabs from '../../../components/ui/Tabs';
import { useI18n } from '../../../i18n/i18n';
import { getDayLabel } from '../meetings/meetingsForm.utils';

const DEFAULT_NOTIFICATION_TEMPLATES = Object.freeze({
  confessionNextSession: {
    title: {
      ar: 'موعد جلسة الاعتراف القادمة',
      en: 'موعد جلسة الاعتراف القادمة',
    },
    message: {
      ar: 'تم تحديد موعد جلسة الاعتراف القادمة بتاريخ {nextSessionAt}.',
      en: 'تم تحديد موعد جلسة الاعتراف القادمة بتاريخ {nextSessionAt}.',
    },
  },
  meetingReminder: {
    title: {
      ar: 'تذكير بموعد الاجتماع',
      en: 'تذكير بموعد الاجتماع',
    },
    message: {
      ar: 'سيتبقى {reminderLeadTime} على اجتماع {meetingName} يوم {meetingDay} في {meetingDateTime}.',
      en: 'سيتبقى {reminderLeadTime} على اجتماع {meetingName} يوم {meetingDay} في {meetingDateTime}.',
    },
  },
  dashboardNotificationPublished: {
    title: {
      ar: 'إشعار جديد',
      en: 'إشعار جديد',
    },
    message: {
      ar: 'تم نشر إشعار جديد بعنوان {notificationName}.',
      en: 'تم نشر إشعار جديد بعنوان {notificationName}.',
    },
  },
  divineLiturgyExceptionalCase: {
    title: {
      ar: 'قداس استثنائي جديد',
      en: 'قداس استثنائي جديد',
    },
    message: {
      ar: 'تمت إضافة حالة قداس استثنائية بتاريخ {exceptionDate} في {startTime}.',
      en: 'تمت إضافة حالة قداس استثنائية بتاريخ {exceptionDate} في {startTime}.',
    },
  },
});

const NOTIFICATION_TEMPLATE_CONFIGS = Object.freeze([
  {
    id: 'confessionNextSession',
    tabKey: 'platformSettingsPage.notifications.tabs.confessionNextSession',
    titleKey: 'platformSettingsPage.notifications.confessionNextSession.title',
    subtitleKey: 'platformSettingsPage.notifications.confessionNextSession.subtitle',
  },
  {
    id: 'dashboardNotificationPublished',
    tabKey: 'platformSettingsPage.notifications.tabs.dashboardNotificationPublished',
    titleKey: 'platformSettingsPage.notifications.dashboardNotificationPublished.title',
    subtitleKey: 'platformSettingsPage.notifications.dashboardNotificationPublished.subtitle',
  },
  {
    id: 'divineLiturgyExceptionalCase',
    tabKey: 'platformSettingsPage.notifications.tabs.divineLiturgyExceptionalCase',
    titleKey: 'platformSettingsPage.notifications.divineLiturgyExceptionalCase.title',
    subtitleKey: 'platformSettingsPage.notifications.divineLiturgyExceptionalCase.subtitle',
  },
]);

function createDefaultForm() {
  const notificationTemplates = Object.entries(DEFAULT_NOTIFICATION_TEMPLATES).reduce(
    (accumulator, [templateKey, templateValue]) => ({
      ...accumulator,
      [templateKey]: {
        title: { ...templateValue.title },
        message: { ...templateValue.message },
      },
    }),
    {}
  );

  const availableTokens = Object.keys(DEFAULT_NOTIFICATION_TEMPLATES).reduce(
    (accumulator, templateKey) => ({
      ...accumulator,
      [templateKey]: [],
    }),
    {}
  );

  return {
    notificationTemplates,
    meetingReminderLeadMinutes: 60,
    registrationEnabled: true,
    availableTokens,
    updatedAt: null,
  };
}

function buildHydratedForm(payload = {}) {
  const defaultForm = createDefaultForm();
  const parsedLeadMinutes = Number(payload?.meetingReminderLeadMinutes);
  const notificationTemplates = Object.entries(DEFAULT_NOTIFICATION_TEMPLATES).reduce(
    (accumulator, [templateKey, templateDefaults]) => {
      const sourceTemplate = payload?.notificationTemplates?.[templateKey] || {};
      const titleAr = sourceTemplate?.title?.ar || templateDefaults.title.ar;
      const messageAr = sourceTemplate?.message?.ar || templateDefaults.message.ar;

      return {
        ...accumulator,
        [templateKey]: {
          title: {
            ar: titleAr,
            en: sourceTemplate?.title?.en || titleAr,
          },
          message: {
            ar: messageAr,
            en: sourceTemplate?.message?.en || messageAr,
          },
        },
      };
    },
    {}
  );

  return {
    notificationTemplates,
    meetingReminderLeadMinutes: Number.isFinite(parsedLeadMinutes)
      ? parsedLeadMinutes
      : defaultForm.meetingReminderLeadMinutes,
    registrationEnabled:
      typeof payload?.registrationEnabled === 'boolean'
        ? payload.registrationEnabled
        : defaultForm.registrationEnabled,
    availableTokens: {
      ...defaultForm.availableTokens,
      ...(payload?.availableTokens || {}),
    },
    updatedAt: payload?.updatedAt || null,
  };
}

function buildMeetingReminderSettingsForm(reminderSettings = {}) {
  const titleAr = String(
    reminderSettings?.template?.title?.ar
      || DEFAULT_NOTIFICATION_TEMPLATES.meetingReminder.title.ar
  );
  const messageAr = String(
    reminderSettings?.template?.message?.ar
      || DEFAULT_NOTIFICATION_TEMPLATES.meetingReminder.message.ar
  );
  const parsedLeadMinutes = Number(reminderSettings?.leadMinutes);

  return {
    leadMinutes: Number.isFinite(parsedLeadMinutes) ? parsedLeadMinutes : 60,
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

export default function PlatformSettingsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(createDefaultForm);
  const [meetingReminderForms, setMeetingReminderForms] = useState({});
  const [hydratedOnce, setHydratedOnce] = useState(false);
  const canManageRegistration = user?.role === 'SUPER_ADMIN';
  const tf = useCallback((key, fallback, values) => {
    const value = t(key, values);
    return value === key ? fallback : value;
  }, [t]);

  const manageQuery = useQuery({
    queryKey: ['platform-settings', 'manage'],
    queryFn: async () => {
      const { data } = await platformSettingsApi.getManage();
      return data?.data || null;
    },
  });

  const meetingReminderSettingsQuery = useQuery({
    queryKey: ['meetings', 'reminder-settings'],
    queryFn: async () => {
      const { data } = await meetingsApi.meetings.listReminderSettings();
      return Array.isArray(data?.data) ? data.data : [];
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (!manageQuery.data || hydratedOnce) return;
    setForm(buildHydratedForm(manageQuery.data));
    setHydratedOnce(true);
  }, [hydratedOnce, manageQuery.data]);

  useEffect(() => {
    if (!Array.isArray(meetingReminderSettingsQuery.data)) return;

    setMeetingReminderForms((current) => {
      const next = { ...current };

      meetingReminderSettingsQuery.data.forEach((meeting) => {
        if (next[meeting.id]) return;
        next[meeting.id] = buildMeetingReminderSettingsForm(meeting.reminderSettings);
      });

      return next;
    });
  }, [meetingReminderSettingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        notificationTemplates: form.notificationTemplates,
        meetingReminderLeadMinutes: Number(form.meetingReminderLeadMinutes || 0),
        ...(canManageRegistration
          ? { registrationEnabled: Boolean(form.registrationEnabled) }
          : {}),
      };
      const { data } = await platformSettingsApi.update(payload);
      return data?.data || null;
    },
    onSuccess: (payload) => {
      const nextForm = buildHydratedForm(payload);
      setForm(nextForm);
      queryClient.setQueryData(['platform-settings', 'manage'], payload);
      queryClient.setQueryData(['settings', 'public-site'], (current) => ({
        ...(current || {}),
        registrationEnabled: nextForm.registrationEnabled,
      }));
      toast.success(t('platformSettingsPage.messages.saved'));
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const saveMeetingReminderMutation = useMutation({
    mutationFn: async ({ meetingId, payload }) => {
      const { data } = await meetingsApi.meetings.updateReminderSettings(meetingId, payload);
      return data?.data || null;
    },
    onSuccess: (payload, variables) => {
      setMeetingReminderForms((current) => ({
        ...current,
        [variables.meetingId]: buildMeetingReminderSettingsForm(payload?.reminderSettings),
      }));
      queryClient.setQueryData(['meetings', 'reminder-settings'], (current) =>
        Array.isArray(current)
          ? current.map((meeting) => (
            meeting.id === variables.meetingId
              ? {
                ...meeting,
                reminderSettings: payload?.reminderSettings || meeting.reminderSettings,
                updatedAt: payload?.updatedAt || meeting.updatedAt,
              }
              : meeting
          ))
          : current
      );
      toast.success(tf(
        'platformSettingsPage.meetingReminders.messages.saved',
        'Meeting reminder settings saved successfully.'
      ));
    },
    onError: (error) => {
      toast.error(
        normalizeApiError(error).message
        || tf(
          'platformSettingsPage.meetingReminders.messages.saveFailed',
          'Failed to save meeting reminder settings.'
        )
      );
    },
  });

  const updateTemplateField = useCallback((templateKey, field, language, value) => {
    setForm((current) => {
      const currentTemplate = current.notificationTemplates[templateKey]
        || createDefaultForm().notificationTemplates[templateKey]
        || { title: { ar: '', en: '' }, message: { ar: '', en: '' } };
      const previousArabicValue = String(currentTemplate?.[field]?.ar || '');
      const previousEnglishValue = String(currentTemplate?.[field]?.en || '');
      const nextLocalizedField = {
        ...(currentTemplate?.[field] || { ar: '', en: '' }),
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
        notificationTemplates: {
          ...current.notificationTemplates,
          [templateKey]: {
            ...currentTemplate,
            [field]: nextLocalizedField,
          },
        },
      };
    });
  }, []);

  const updateMeetingReminderLeadMinutes = useCallback((meetingId, value) => {
    setMeetingReminderForms((current) => ({
      ...current,
      [meetingId]: {
        ...(current[meetingId] || buildMeetingReminderSettingsForm()),
        leadMinutes: value,
      },
    }));
  }, []);

  const updateMeetingReminderField = useCallback((meetingId, field, language, value) => {
    setMeetingReminderForms((current) => {
      const currentReminder = current[meetingId] || buildMeetingReminderSettingsForm();
      const previousArabicValue = String(currentReminder?.template?.[field]?.ar || '');
      const previousEnglishValue = String(currentReminder?.template?.[field]?.en || '');
      const nextLocalizedField = {
        ...(currentReminder?.template?.[field] || { ar: '', en: '' }),
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
        [meetingId]: {
          ...currentReminder,
          template: {
            ...(currentReminder?.template || {}),
            [field]: nextLocalizedField,
          },
        },
      };
    });
  }, []);

  const buildTemplateTabs = useCallback((language) => (
    NOTIFICATION_TEMPLATE_CONFIGS.map((templateConfig) => ({
      label: t(templateConfig.tabKey),
      content: (
        <NotificationTemplateEditor
          t={t}
          language={language}
          sectionTitle={t(templateConfig.titleKey)}
          sectionSubtitle={t(templateConfig.subtitleKey)}
          template={form.notificationTemplates[templateConfig.id]}
          tokenList={form.availableTokens?.[templateConfig.id] || []}
          onFieldChange={(field, currentLanguage, value) => (
            updateTemplateField(templateConfig.id, field, currentLanguage, value)
          )}
        />
      ),
    }))
  ), [
    form.availableTokens,
    form.notificationTemplates,
    t,
    updateTemplateField,
  ]);

  const languageTabs = useMemo(
    () => [
      {
        label: t('platformSettingsPage.languages.ar'),
        content: <Tabs variant="inline" tabs={buildTemplateTabs('ar')} />,
      },
      {
        label: t('platformSettingsPage.languages.en'),
        content: <Tabs variant="inline" tabs={buildTemplateTabs('en')} />,
      },
    ],
    [buildTemplateTabs, t]
  );

  const meetingReminderTabContent = useMemo(() => {
    const meetings = Array.isArray(meetingReminderSettingsQuery.data)
      ? meetingReminderSettingsQuery.data
      : [];

    if (meetingReminderSettingsQuery.isLoading) {
      return (
        <Card className="rounded-3xl border border-border/60 bg-surface shadow-card">
          <CardHeader
            title={tf('platformSettingsPage.meetingReminders.title', 'Meeting reminder settings')}
            subtitle={tf('platformSettingsPage.meetingReminders.loading', 'Loading meetings...')}
          />
        </Card>
      );
    }

    if (!meetings.length) {
      return (
        <Card className="rounded-3xl border border-border/60 bg-surface shadow-card">
          <CardHeader
            title={tf('platformSettingsPage.meetingReminders.title', 'Meeting reminder settings')}
            subtitle={tf(
              'platformSettingsPage.meetingReminders.empty',
              'No meetings were found yet. Create meetings first, then their reminder settings will appear here.'
            )}
          />
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <Card className="rounded-3xl border border-border/60 bg-surface shadow-card">
          <CardHeader
            title={tf('platformSettingsPage.meetingReminders.title', 'Meeting reminder settings')}
            subtitle={tf(
              'platformSettingsPage.meetingReminders.subtitle',
              'Each meeting has its own reminder lead time and localized notification text. Save each meeting separately.'
            )}
          />
        </Card>

        {meetings.map((meeting) => {
          const currentReminder = meetingReminderForms[meeting.id] || buildMeetingReminderSettingsForm(meeting.reminderSettings);
          const isSavingCurrentMeeting =
            saveMeetingReminderMutation.isPending
            && saveMeetingReminderMutation.variables?.meetingId === meeting.id;
          const meetingSubtitle = [
            meeting?.sector?.name || null,
            getDayLabel(meeting.day, t),
            meeting?.time || null,
          ]
            .filter(Boolean)
            .join(' - ');
          const meetingLanguageTabs = [
            {
              label: t('platformSettingsPage.languages.ar'),
              content: (
                <NotificationTemplateEditor
                  t={t}
                  language="ar"
                  sectionTitle={meeting.name}
                  sectionSubtitle={meetingSubtitle}
                  template={currentReminder.template}
                  tokenList={form.availableTokens?.meetingReminder || []}
                  onFieldChange={(field, currentLanguage, value) => (
                    updateMeetingReminderField(meeting.id, field, currentLanguage, value)
                  )}
                />
              ),
            },
            {
              label: t('platformSettingsPage.languages.en'),
              content: (
                <NotificationTemplateEditor
                  t={t}
                  language="en"
                  sectionTitle={meeting.name}
                  sectionSubtitle={meetingSubtitle}
                  template={currentReminder.template}
                  tokenList={form.availableTokens?.meetingReminder || []}
                  onFieldChange={(field, currentLanguage, value) => (
                    updateMeetingReminderField(meeting.id, field, currentLanguage, value)
                  )}
                />
              ),
            },
          ];

          return (
            <Card key={meeting.id} className="rounded-3xl border border-border/60 bg-surface shadow-card">
              <CardHeader
                title={meeting.name}
                subtitle={meetingSubtitle}
                action={(
                  <Button
                    type="button"
                    size="sm"
                    loading={isSavingCurrentMeeting}
                    onClick={() => saveMeetingReminderMutation.mutate({
                      meetingId: meeting.id,
                      payload: {
                        leadMinutes: Number(currentReminder?.leadMinutes || 0),
                        template: currentReminder?.template || buildMeetingReminderSettingsForm().template,
                      },
                    })}
                  >
                    {t('common.actions.save')}
                  </Button>
                )}
              />

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
                      value={currentReminder?.leadMinutes ?? 0}
                      onChange={(event) => updateMeetingReminderLeadMinutes(meeting.id, event.target.value)}
                      containerClassName="!mb-0"
                    />

                    <div className="rounded-2xl border border-border/60 bg-surface-alt/40 p-4">
                      <p className="text-sm font-semibold text-heading">
                        {t('platformSettingsPage.notifications.reminderTiming.previewLabel')}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {t('platformSettingsPage.notifications.reminderTiming.previewValue', {
                          count: Number(currentReminder?.leadMinutes || 0),
                        })}
                      </p>
                    </div>
                  </div>
                </Card>

                <Tabs variant="inline" tabs={meetingLanguageTabs} />
              </div>
            </Card>
          );
        })}
      </div>
    );
  }, [
    form.availableTokens,
    meetingReminderForms,
    meetingReminderSettingsQuery.data,
    meetingReminderSettingsQuery.isLoading,
    saveMeetingReminderMutation,
    t,
    tf,
    updateMeetingReminderField,
    updateMeetingReminderLeadMinutes,
  ]);

  const editorTabs = useMemo(
    () => [
      {
        label: t('platformSettingsPage.tabs.notifications'),
        content: <Tabs variant="inline" tabs={languageTabs} />,
      },
      {
        label: tf('platformSettingsPage.tabs.meetingReminders', 'Meeting reminders'),
        content: meetingReminderTabContent,
      },
    ],
    [languageTabs, meetingReminderTabContent, t, tf]
  );

  if (manageQuery.isLoading && !hydratedOnce) {
    return (
      <div className="animate-fade-in space-y-6 pb-10">
        <Breadcrumbs
          items={[
            { label: t('shared.dashboard'), href: '/dashboard' },
            { label: t('platformSettingsPage.title') },
          ]}
        />
        <PageHeader
          title={t('platformSettingsPage.title')}
          subtitle={t('platformSettingsPage.states.loading')}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('platformSettingsPage.title') },
        ]}
      />

      <PageHeader
        className="border-b border-border pb-6"
        eyebrow={t('dashboardLayout.section.settings')}
        title={t('platformSettingsPage.title')}
        subtitle={t('platformSettingsPage.subtitle')}
        actions={(
          <Button
            icon={Save}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {t('platformSettingsPage.actions.save')}
          </Button>
        )}
      />

      <Card className="rounded-3xl border border-border/60 bg-surface shadow-card">
        <CardHeader
          title={tf('platformSettingsPage.registration.title', 'Public registration')}
          subtitle={tf(
            'platformSettingsPage.registration.subtitle',
            'Choose whether guests can submit new account requests from the public registration page.'
          )}
        />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-heading">
                {tf('platformSettingsPage.registration.statusLabel', 'Current status')}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                form.registrationEnabled
                  ? 'bg-success-light text-success'
                  : 'bg-danger-light text-danger'
              }`}>
                {form.registrationEnabled
                  ? tf('platformSettingsPage.registration.enabled', 'Registration enabled')
                  : tf('platformSettingsPage.registration.disabled', 'Registration disabled')}
              </span>
            </div>
            <p className="text-sm text-muted">
              {canManageRegistration
                ? tf(
                  'platformSettingsPage.registration.superAdminHint',
                  'New users will either be allowed to submit pending requests or be asked to sign in or browse only.'
                )
                : tf(
                  'platformSettingsPage.registration.readOnlyHint',
                  'Only the Super Admin can change this setting.'
                )}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-surface-alt/40 px-4 py-3">
            <Switch
              checked={Boolean(form.registrationEnabled)}
              onChange={(checked) => setForm((current) => ({ ...current, registrationEnabled: checked }))}
              disabled={!canManageRegistration}
              label={
                form.registrationEnabled
                  ? tf('platformSettingsPage.registration.toggleOn', 'Allow new registration requests')
                  : tf('platformSettingsPage.registration.toggleOff', 'Stop new registration requests')
              }
            />
          </div>
        </div>
      </Card>

      <Tabs tabs={editorTabs} framedPanel={false} bodyClassName="p-3 sm:p-4" />
    </div>
  );
}
