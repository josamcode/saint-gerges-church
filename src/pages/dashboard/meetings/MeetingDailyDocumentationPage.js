import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  FileImage,
  FileText,
  Film,
  Paperclip,
  Save,
  Upload,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';

import { meetingsApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card, { CardHeader } from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import Input from '../../../components/ui/Input';
import PageHeader from '../../../components/ui/PageHeader';
import Select from '../../../components/ui/Select';
import TextArea from '../../../components/ui/TextArea';
import { useI18n } from '../../../i18n/i18n';
import { formatDateTime } from '../../../utils/formatters';
import { getDayLabel } from './meetingsForm.utils';
import { buildPastMeetingDateOptions } from './meetingDateOptions.utils';

const EMPTY = '---';
const GENERAL_UPLOAD_ACCEPT =
  'image/*,video/mp4,video/quicktime,video/webm,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

const FIELD_TYPE_META = {
  text: { icon: FileText, accept: '' },
  number: { icon: FileText, accept: '' },
  image: { icon: FileImage, accept: 'image/*' },
  video: { icon: Film, accept: 'video/mp4,video/quicktime,video/webm' },
  document: {
    icon: Paperclip,
    accept:
      'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain',
  },
};

function createEmptyFieldDraft() {
  return {
    textValue: '',
    numberValue: '',
    assets: [],
  };
}

function buildFieldDrafts(fields = [], responses = []) {
  const drafts = Object.fromEntries(fields.map((field) => [field.id, createEmptyFieldDraft()]));

  (responses || []).forEach((response) => {
    if (!response?.fieldId) return;
    drafts[response.fieldId] = {
      textValue: response.textValue || '',
      numberValue:
        response.numberValue == null || Number.isNaN(Number(response.numberValue))
          ? ''
          : String(response.numberValue),
      assets: Array.isArray(response.assets) ? response.assets : [],
    };
  });

  return drafts;
}

function hasFieldValue(field, draft) {
  if (!field || !draft) return false;
  if (field.type === 'text') return Boolean(String(draft.textValue || '').trim());
  if (field.type === 'number') return String(draft.numberValue || '').trim() !== '';
  return Array.isArray(draft.assets) && draft.assets.length > 0;
}

function AssetPreviewCard({ asset, onRemove }) {
  const kind = asset?.kind || 'document';
  const Icon = kind === 'image' ? FileImage : kind === 'video' ? Film : Paperclip;

  return (
    <div className="rounded-xl border border-border bg-surface-alt/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <a
              href={asset?.url}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-sm font-semibold text-primary hover:underline"
            >
              {asset?.originalName || asset?.url || EMPTY}
            </a>
            <p className="mt-0.5 text-xs text-muted">
              {asset?.mimeType || EMPTY}
              {asset?.bytes ? ` | ${(asset.bytes / 1024 / 1024).toFixed(2)} MB` : ''}
            </p>
          </div>
        </div>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-danger/30 hover:bg-danger-light hover:text-danger"
            aria-label="Remove asset"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {kind === 'image' && asset?.url ? (
        <img
          src={asset.url}
          alt={asset.originalName || ''}
          className="mt-3 max-h-48 w-full rounded-lg border border-border object-cover"
        />
      ) : null}

      {kind === 'video' && asset?.url ? (
        <video
          src={asset.url}
          controls
          className="mt-3 max-h-56 w-full rounded-lg border border-border bg-black object-contain"
        />
      ) : null}
    </div>
  );
}

export default function MeetingDailyDocumentationPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const generalUploadInputRef = useRef(null);
  const fieldUploadInputRefs = useRef({});

  const [selectedDate, setSelectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [fieldDrafts, setFieldDrafts] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalUploading, setGeneralUploading] = useState(false);
  const [fieldUploading, setFieldUploading] = useState({});

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
    queryKey: ['meetings', 'documentation-settings', id, 'active'],
    enabled: Boolean(id),
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await meetingsApi.documentationSettings.get(id);
      return data?.data || null;
    },
  });

  const meeting = meetingQuery.data || null;
  const activeFields = useMemo(
    () => (settingsQuery.data?.fields || []).filter((field) => field?.isActive !== false),
    [settingsQuery.data]
  );
  const availableDateOptions = useMemo(() => buildPastMeetingDateOptions(meeting), [meeting]);

  useEffect(() => {
    if (!selectedDate && availableDateOptions.length > 0) {
      setSelectedDate(availableDateOptions[0].value);
    }
  }, [availableDateOptions, selectedDate]);

  useEffect(() => {
    setNotes('');
    setAttachments([]);
    setFieldDrafts(buildFieldDrafts(activeFields, []));
    setFieldErrors({});
  }, [selectedDate, activeFields]);

  const documentationQuery = useQuery({
    queryKey: ['meetings', 'documentation', id, selectedDate],
    enabled: Boolean(id && selectedDate),
    staleTime: 0,
    queryFn: async () => {
      const { data } = await meetingsApi.meetings.getDocumentation(id, selectedDate);
      return data?.data || null;
    },
  });

  useEffect(() => {
    if (!documentationQuery.data) return;

    setNotes(documentationQuery.data.notes || '');
    setAttachments(Array.isArray(documentationQuery.data.attachments) ? documentationQuery.data.attachments : []);
    setFieldDrafts(buildFieldDrafts(activeFields, documentationQuery.data.fieldResponses || []));
    setFieldErrors({});
  }, [documentationQuery.data, activeFields]);

  const uploadSingleAsset = async (file) => {
    if (!id || !selectedDate) {
      throw new Error(tf('meetings.documentation.validation.dateRequired', 'Please choose a meeting date first.'));
    }

    const response = await meetingsApi.documentationSettings.uploadAsset(file, {
      meetingId: id,
      documentationDate: selectedDate,
    });
    const payload = response?.data?.data || null;
    if (!payload?.url) {
      throw new Error('Invalid upload response');
    }
    return payload;
  };

  const uploadManyAssets = async (files = []) => {
    const uploaded = [];
    for (const file of files) {
      uploaded.push(await uploadSingleAsset(file));
    }
    return uploaded;
  };

  const saveDocumentationMutation = useMutation({
    mutationFn: (payload) => meetingsApi.meetings.updateDocumentation(id, payload),
    onSuccess: () => {
      toast.success(tf('meetings.documentation.messages.saved', 'Daily documentation saved successfully.'));
      queryClient.invalidateQueries({ queryKey: ['meetings', 'documentation', id, selectedDate] });
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const validateForm = () => {
    const nextErrors = {};

    activeFields.forEach((field) => {
      const draft = fieldDrafts[field.id] || createEmptyFieldDraft();
      if (field.required && !hasFieldValue(field, draft)) {
        nextErrors[field.id] = tf('meetings.documentation.validation.fieldRequired', 'This field is required.');
      }

      if (
        field.type === 'number' &&
        String(draft.numberValue || '').trim() !== '' &&
        Number.isNaN(Number(draft.numberValue))
      ) {
        nextErrors[field.id] = tf(
          'meetings.documentation.validation.numberInvalid',
          'Please enter a valid number.'
        );
      }
    });

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildSavePayload = () => ({
    documentationDate: selectedDate,
    notes: notes.trim(),
    attachments,
    fieldResponses: activeFields
      .map((field) => {
        const draft = fieldDrafts[field.id] || createEmptyFieldDraft();

        if (field.type === 'text') {
          const textValue = String(draft.textValue || '').trim();
          return textValue ? { fieldId: field.id, textValue } : null;
        }

        if (field.type === 'number') {
          const rawValue = String(draft.numberValue || '').trim();
          return rawValue !== '' ? { fieldId: field.id, numberValue: Number(rawValue) } : null;
        }

        return Array.isArray(draft.assets) && draft.assets.length > 0
          ? { fieldId: field.id, assets: draft.assets }
          : null;
      })
      .filter(Boolean),
  });

  const handleSave = () => {
    if (!validateForm()) return;
    saveDocumentationMutation.mutate(buildSavePayload());
  };

  const updateFieldDraft = (fieldId, nextDraft) => {
    setFieldDrafts((current) => ({
      ...current,
      [fieldId]: {
        ...createEmptyFieldDraft(),
        ...(current[fieldId] || {}),
        ...nextDraft,
      },
    }));
    setFieldErrors((current) => ({ ...current, [fieldId]: undefined }));
  };

  const handleGeneralUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    setGeneralUploading(true);
    try {
      const uploaded = await uploadManyAssets(files);
      setAttachments((current) => [...current, ...uploaded]);
      toast.success(tf('meetings.documentation.messages.assetsUploaded', 'Files uploaded successfully.'));
    } catch (error) {
      toast.error(normalizeApiError(error).message || error.message);
    } finally {
      setGeneralUploading(false);
    }
  };

  const handleFieldUpload = async (fieldId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setFieldUploading((current) => ({ ...current, [fieldId]: true }));
    try {
      const uploaded = await uploadSingleAsset(file);
      updateFieldDraft(fieldId, { assets: [uploaded] });
      toast.success(tf('meetings.documentation.messages.assetUploaded', 'Field file uploaded successfully.'));
    } catch (error) {
      toast.error(normalizeApiError(error).message || error.message);
    } finally {
      setFieldUploading((current) => ({ ...current, [fieldId]: false }));
    }
  };

  const breadcrumbs = [
    { label: t('shared.dashboard'), href: '/dashboard' },
    { label: t('meetings.meetingsPageTitle'), href: '/dashboard/meetings/list' },
    meeting?.name
      ? { label: meeting.name, href: `/dashboard/meetings/list/${id}` }
      : { label: tf('meetings.memberDetails.meetingFallback', 'Meeting'), href: `/dashboard/meetings/list/${id}` },
    { label: tf('meetings.documentation.pageTitle', 'Daily Meeting Documentation') },
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

  if (availableDateOptions.length === 0) {
    return (
      <div className="animate-fade-in space-y-8 pb-10">
        <Breadcrumbs items={breadcrumbs} />
        <PageHeader
          title={tf('meetings.documentation.pageTitle', 'Daily Meeting Documentation')}
          subtitle={tf(
            'meetings.documentation.pageSubtitle',
            'Choose a valid past meeting date, then upload files and complete the meeting documentation.'
          )}
        />
        <EmptyState
          icon={CalendarDays}
          title={tf('meetings.documentation.noDatesTitle', 'No eligible dates yet')}
          description={tf(
            'meetings.documentation.noDatesDescription',
            'There are no past dates available for this meeting day yet.'
          )}
        />
      </div>
    );
  }

  const isUploadingAny = generalUploading || Object.values(fieldUploading).some(Boolean);

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs items={breadcrumbs} />

      <div className="rounded-2xl border border-border bg-surface p-6">
        <PageHeader
          contentOnly
          eyebrow={meeting?.name || t('meetings.meetingsPageTitle')}
          title={tf('meetings.documentation.pageTitle', 'Daily Meeting Documentation')}
          subtitle={tf(
            'meetings.documentation.pageSubtitle',
            'Choose a valid past meeting date, then upload files and complete the meeting documentation.'
          )}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            {getDayLabel(meeting?.day, t)} | {meeting?.time || EMPTY}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1">
            <Paperclip className="h-3.5 w-3.5" />
            {attachments.length} {tf('meetings.documentation.attachmentsCount', 'attachments')}
          </span>
        </div>
      </div>

      <Card className="rounded-2xl">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
          <Select
            label={tf('meetings.documentation.dateLabel', 'Meeting Date')}
            options={availableDateOptions}
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            placeholder={tf('meetings.documentation.datePlaceholder', 'Select a meeting date')}
            containerClassName="!mb-0"
          />

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              type="button"
              icon={Save}
              onClick={handleSave}
              loading={saveDocumentationMutation.isPending}
              disabled={!selectedDate || isUploadingAny}
            >
              {t('common.actions.save')}
            </Button>
          </div>
        </div>

        {documentationQuery.error ? (
          <p className="mt-3 text-sm text-danger">{normalizeApiError(documentationQuery.error).message}</p>
        ) : null}

        {documentationQuery.data?.updatedAt ? (
          <p className="mt-3 text-xs text-muted">
            {tf('meetings.documentation.lastUpdated', 'Last updated')}: {formatDateTime(documentationQuery.data.updatedAt)} |{' '}
            {documentationQuery.data.updatedBy?.fullName || EMPTY}
          </p>
        ) : null}
      </Card>

      {documentationQuery.isLoading ? (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">{t('common.loading')}</p>
        </div>
      ) : (
        <>
          <Card className="rounded-2xl">
            <CardHeader
              title={tf('meetings.documentation.attachmentsTitle', 'Meeting Files')}
              subtitle={tf(
                'meetings.documentation.attachmentsSubtitle',
                'Upload photos, videos, or documents related to this meeting day.'
              )}
              action={(
                <>
                  <input
                    ref={generalUploadInputRef}
                    type="file"
                    multiple
                    accept={GENERAL_UPLOAD_ACCEPT}
                    className="hidden"
                    onChange={handleGeneralUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Upload}
                    loading={generalUploading}
                    disabled={!selectedDate}
                    onClick={() => generalUploadInputRef.current?.click()}
                  >
                    {tf('meetings.documentation.uploadFiles', 'Upload files')}
                  </Button>
                </>
              )}
            />

            {attachments.length === 0 ? (
              <p className="text-sm text-muted">
                {tf('meetings.documentation.noAttachments', 'No files uploaded for this date yet.')}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {attachments.map((asset, index) => (
                  <AssetPreviewCard
                    key={`${asset.publicId || asset.url || 'asset'}-${index}`}
                    asset={asset}
                    onRemove={() =>
                      setAttachments((current) => current.filter((_, assetIndex) => assetIndex !== index))
                    }
                  />
                ))}
              </div>
            )}
          </Card>

          <Card className="rounded-2xl">
            <CardHeader
              title={tf('meetings.documentation.notesTitle', 'Observations')}
              subtitle={tf(
                'meetings.documentation.notesSubtitle',
                'Add any notes or observations from this meeting day.'
              )}
            />
            <TextArea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={tf(
                'meetings.documentation.notesPlaceholder',
                'Write any observations, follow-ups, or highlights from the meeting.'
              )}
              className="min-h-[140px]"
            />
          </Card>

          {activeFields.length > 0 && (
            <Card className="rounded-2xl">
              <CardHeader
                title={tf('meetings.documentation.questionsTitle', 'Configured Fields')}
                subtitle={tf(
                  'meetings.documentation.questionsSubtitle',
                  'These fields are managed specifically for this meeting by its leadership.'
                )}
              />

              {settingsQuery.error ? (
                <p className="text-sm text-danger">{normalizeApiError(settingsQuery.error).message}</p>
              ) : null}

              <div className="space-y-5">
                {activeFields.map((field) => {
                  const meta = FIELD_TYPE_META[field.type] || FIELD_TYPE_META.text;
                  const Icon = meta.icon;
                  const draft = fieldDrafts[field.id] || createEmptyFieldDraft();

                  return (
                    <div key={field.id} className="rounded-xl border border-border bg-surface-alt/30 p-4">
                      <div className="mb-3 flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-heading">
                            {field.label}
                            {field.required ? <span className="ms-1 text-danger">*</span> : null}
                          </p>
                          {field.helpText ? <p className="mt-0.5 text-xs text-muted">{field.helpText}</p> : null}
                        </div>
                      </div>

                      {field.type === 'text' ? (
                        <Input
                          value={draft.textValue}
                          onChange={(event) => updateFieldDraft(field.id, { textValue: event.target.value })}
                          placeholder={field.placeholder || ''}
                          error={fieldErrors[field.id]}
                          containerClassName="!mb-0"
                        />
                      ) : null}

                      {field.type === 'number' ? (
                        <Input
                          type="number"
                          value={draft.numberValue}
                          onChange={(event) => updateFieldDraft(field.id, { numberValue: event.target.value })}
                          placeholder={field.placeholder || ''}
                          error={fieldErrors[field.id]}
                          containerClassName="!mb-0"
                        />
                      ) : null}

                      {['image', 'video', 'document'].includes(field.type) ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <input
                              ref={(node) => {
                                if (node) {
                                  fieldUploadInputRefs.current[field.id] = node;
                                } else {
                                  delete fieldUploadInputRefs.current[field.id];
                                }
                              }}
                              type="file"
                              accept={meta.accept}
                              className="hidden"
                              onChange={(event) => handleFieldUpload(field.id, event)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              icon={Upload}
                              loading={Boolean(fieldUploading[field.id])}
                              disabled={!selectedDate}
                              onClick={() => fieldUploadInputRefs.current[field.id]?.click()}
                            >
                              {tf('meetings.documentation.uploadFieldFile', 'Upload file')}
                            </Button>
                          </div>

                          {draft.assets.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                              {draft.assets.map((asset, index) => (
                                <AssetPreviewCard
                                  key={`${asset.publicId || asset.url || 'field-asset'}-${index}`}
                                  asset={asset}
                                  onRemove={() =>
                                    updateFieldDraft(field.id, {
                                      assets: draft.assets.filter((_, assetIndex) => assetIndex !== index),
                                    })
                                  }
                                />
                              ))}
                            </div>
                          ) : null}

                          {fieldErrors[field.id] ? <p className="text-xs text-danger">{fieldErrors[field.id]}</p> : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
