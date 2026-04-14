import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Save, Settings2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { meetingsApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card, { CardHeader } from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import Input from '../../../components/ui/Input';
import PageHeader from '../../../components/ui/PageHeader';
import Select from '../../../components/ui/Select';
import Switch from '../../../components/ui/Switch';
import TextArea from '../../../components/ui/TextArea';
import { useI18n } from '../../../i18n/i18n';
import { formatDateTime } from '../../../utils/formatters';

function createFieldDraft() {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    helpText: '',
    isActive: true,
  };
}

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
];

export default function MeetingSettingsPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [fields, setFields] = useState([]);

  const meetingQuery = useQuery({
    queryKey: ['meetings', 'details', id],
    enabled: Boolean(id),
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await meetingsApi.meetings.getById(id);
      return data?.data || null;
    },
  });

  const settingsQuery = useQuery({
    queryKey: ['meetings', 'documentation-settings', id, 'all'],
    enabled: Boolean(id),
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await meetingsApi.documentationSettings.get(id, { includeInactive: true });
      return data?.data || null;
    },
  });

  useEffect(() => {
    if (!settingsQuery.data) return;

    setFields(
      (settingsQuery.data.fields || []).map((field) => ({
        localId: field.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        id: field.id || '',
        label: field.label || '',
        type: field.type || 'text',
        required: Boolean(field.required),
        placeholder: field.placeholder || '',
        helpText: field.helpText || '',
        isActive: field.isActive !== false,
      }))
    );
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => meetingsApi.documentationSettings.update(id, payload),
    onSuccess: () => {
      toast.success(tf('meetings.settings.messages.saved', 'Meeting settings saved successfully.'));
      queryClient.invalidateQueries({ queryKey: ['meetings', 'documentation-settings', id] });
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const validationErrors = (() => {
    const nextErrors = {};
    fields.forEach((field) => {
      if (!String(field.label || '').trim()) {
        nextErrors[field.localId] = tf('meetings.settings.validation.labelRequired', 'Field label is required.');
      }
    });
    return nextErrors;
  })();

  const handleSave = () => {
    if (Object.keys(validationErrors).length > 0) {
      toast.error(tf('meetings.settings.validation.fixErrors', 'Please complete the required field labels.'));
      return;
    }

    saveMutation.mutate(
      fields.map((field) => ({
        ...(field.id ? { id: field.id } : {}),
        label: String(field.label || '').trim(),
        type: field.type,
        required: Boolean(field.required),
        placeholder: String(field.placeholder || '').trim(),
        helpText: String(field.helpText || '').trim(),
        isActive: field.isActive !== false,
      }))
    );
  };

  const meeting = meetingQuery.data || null;
  const breadcrumbs = [
    { label: t('shared.dashboard'), href: '/dashboard' },
    { label: t('meetings.meetingsPageTitle'), href: '/dashboard/meetings/list' },
    meeting?.name
      ? { label: meeting.name, href: `/dashboard/meetings/list/${id}` }
      : { label: tf('meetings.memberDetails.meetingFallback', 'Meeting'), href: `/dashboard/meetings/list/${id}` },
    { label: tf('meetings.settings.pageTitle', 'Meeting Documentation Settings') },
  ];

  if (meetingQuery.isLoading || settingsQuery.isLoading) {
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
          icon={Settings2}
          title={tf('meetings.meetingDetails.notFoundTitle', 'Meeting not found')}
          description={tf(
            'meetings.meetingDetails.notFoundDescription',
            'This meeting could not be loaded or may have been removed.'
          )}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs items={breadcrumbs} />

      <PageHeader
        className="border-b border-border pb-6"
        eyebrow={meeting.name || t('meetings.meetingsPageTitle')}
        title={tf('meetings.settings.pageTitle', 'Meeting Documentation Settings')}
        subtitle={tf(
          'meetings.settings.pageSubtitle',
          'Create and manage the dynamic documentation fields for this meeting only.'
        )}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link to={`/dashboard/meetings/list/${id}`}>
              <Button type="button" variant="ghost" size="sm">
                {t('common.actions.back')}
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={PlusCircle}
              onClick={() => setFields((current) => [...current, createFieldDraft()])}
            >
              {tf('meetings.settings.addField', 'Add field')}
            </Button>
            <Button
              type="button"
              size="sm"
              icon={Save}
              loading={saveMutation.isPending}
              onClick={handleSave}
            >
              {t('common.actions.save')}
            </Button>
          </div>
        )}
      />

      <Card className="rounded-2xl">
        <CardHeader
          title={tf('meetings.settings.fieldsTitle', 'Documentation Fields')}
          subtitle={tf(
            'meetings.settings.fieldsSubtitle',
            'These fields appear on the daily documentation page for this meeting in the same order shown here.'
          )}
        />

        {settingsQuery.error ? (
          <p className="text-sm text-danger">{normalizeApiError(settingsQuery.error).message}</p>
        ) : null}

        {settingsQuery.data?.updatedAt ? (
          <p className="mb-4 text-xs text-muted">
            {tf('meetings.settings.lastUpdated', 'Last updated')}: {formatDateTime(settingsQuery.data.updatedAt)} |{' '}
            {settingsQuery.data.updatedBy?.fullName || '---'}
          </p>
        ) : null}

        {fields.length === 0 ? (
          <EmptyState
            icon={Settings2}
            title={tf('meetings.settings.emptyTitle', 'No documentation fields yet')}
            description={tf(
              'meetings.settings.emptyDescription',
              'Add your first field to start collecting structured daily documentation for this meeting.'
            )}
          />
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.localId}
                className="rounded-xl border border-border bg-surface-alt/40 p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-heading">
                      {tf('meetings.settings.fieldLabel', 'Field')} #{index + 1}
                    </p>
                    <p className="text-xs text-muted">
                      {tf(
                        'meetings.settings.fieldHint',
                        'Configure the prompt, type, and whether servants must complete it.'
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFields((current) =>
                        current.filter((entry) => entry.localId !== field.localId)
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-danger/30 hover:bg-danger-light hover:text-danger"
                    aria-label={tf('meetings.settings.deleteField', 'Delete field')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label={tf('meetings.settings.questionLabel', 'Question / field label')}
                    value={field.label}
                    onChange={(event) =>
                      setFields((current) =>
                        current.map((entry) =>
                          entry.localId === field.localId
                            ? { ...entry, label: event.target.value }
                            : entry
                        )
                      )
                    }
                    error={validationErrors[field.localId]}
                    required
                    containerClassName="!mb-0"
                  />

                  <Select
                    label={tf('meetings.settings.typeLabel', 'Field type')}
                    value={field.type}
                    onChange={(event) =>
                      setFields((current) =>
                        current.map((entry) =>
                          entry.localId === field.localId
                            ? { ...entry, type: event.target.value }
                            : entry
                        )
                      )
                    }
                    options={FIELD_TYPE_OPTIONS.map((option) => ({
                      ...option,
                      label: tf(`meetings.settings.types.${option.value}`, option.label),
                    }))}
                    containerClassName="!mb-0"
                  />

                  <Input
                    label={tf('meetings.settings.placeholderLabel', 'Placeholder')}
                    value={field.placeholder}
                    onChange={(event) =>
                      setFields((current) =>
                        current.map((entry) =>
                          entry.localId === field.localId
                            ? { ...entry, placeholder: event.target.value }
                            : entry
                        )
                      )
                    }
                    containerClassName="!mb-0"
                  />

                  <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-surface px-4 py-3">
                    <Switch
                      checked={Boolean(field.required)}
                      onChange={(checked) =>
                        setFields((current) =>
                          current.map((entry) =>
                            entry.localId === field.localId
                              ? { ...entry, required: checked }
                              : entry
                          )
                        )
                      }
                      label={tf('meetings.settings.requiredToggle', 'Required')}
                    />
                    <Switch
                      checked={field.isActive !== false}
                      onChange={(checked) =>
                        setFields((current) =>
                          current.map((entry) =>
                            entry.localId === field.localId
                              ? { ...entry, isActive: checked }
                              : entry
                          )
                        )
                      }
                      label={tf('meetings.settings.activeToggle', 'Active')}
                    />
                  </div>
                </div>

                <TextArea
                  label={tf('meetings.settings.helpTextLabel', 'Helper text')}
                  value={field.helpText}
                  onChange={(event) =>
                    setFields((current) =>
                      current.map((entry) =>
                        entry.localId === field.localId
                          ? { ...entry, helpText: event.target.value }
                          : entry
                      )
                    )
                  }
                  className="min-h-[90px]"
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
