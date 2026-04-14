import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ImagePlus, PlusCircle, Save, Trash2, Tag } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { notificationsApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card, { CardHeader } from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import MultiSelectChips from '../../../components/ui/MultiSelectChips';
import Select from '../../../components/ui/Select';
import TextArea from '../../../components/ui/TextArea';
import Badge from '../../../components/ui/Badge';
import PageHeader from '../../../components/ui/PageHeader';
import { PERMISSION_LABELS } from '../../../constants/permissions';
import { useI18n } from '../../../i18n/i18n';
import { localizeNotificationTypeName } from '../../../utils/notificationTypeLocalization';

const DEFAULT_AUDIENCE_PERMISSIONS = [
  'NOTIFICATIONS_VIEW',
];

function createDetail(kind = 'text') {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    title: '',
    content: '',
    url: '',
  };
}

function toDateInputValue(isoValue) {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '';
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function NotificationTypeCombobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  hint,
  emptyMessage,
}) {
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = normalizeText(value);
    if (!query) return options.slice(0, 20);

    return options
      .filter((option) => {
        const display = normalizeText(option.display);
        const name = normalizeText(option.name);
        return display.includes(query) || name.includes(query);
      })
      .slice(0, 20);
  }, [options, value]);

  return (
    <div className="relative mb-4">
      {label ? <label className="mb-1.5 block text-sm font-medium text-base">{label}</label> : null}

      <div
        className={[
          'relative flex items-center overflow-hidden rounded-xl border bg-surface transition-colors',
          error
            ? 'border-danger focus-within:ring-2 focus-within:ring-danger/15'
            : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10',
        ].join(' ')}
      >
        <Tag className="ms-3 h-4 w-4 shrink-0 text-muted" />
        <input
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value, null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none"
        />
      </div>

      {hint && !error ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs font-medium text-danger">{error}</p> : null}

      {open ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-surface py-1 shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">{emptyMessage}</li>
          ) : (
            filtered.map((option) => (
              <li
                key={option.id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(option.display, option.id);
                  setOpen(false);
                }}
                className="cursor-pointer px-3 py-2 text-sm text-heading transition-colors hover:bg-primary/8 hover:text-primary"
              >
                {option.display}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

export default function NotificationFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { t } = useI18n();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canManageTypes = hasPermission('NOTIFICATIONS_TYPES_MANAGE');

  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [typeInput, setTypeInput] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [coverUploading, setCoverUploading] = useState(false);
  const [detailUploading, setDetailUploading] = useState({});
  const coverInputRef = useRef(null);
  const detailInputRefs = useRef({});

  const [form, setForm] = useState({
    typeId: '',
    name: '',
    summary: '',
    eventDate: '',
    coverImageUrl: '',
    isActive: true,
    audienceType: 'permissions',
    audiencePermissions: DEFAULT_AUDIENCE_PERMISSIONS,
    details: [],
  });

  const { data: typesRes } = useQuery({
    queryKey: ['notifications', 'types'],
    queryFn: async () => {
      const { data } = await notificationsApi.listTypes();
      return data;
    },
    staleTime: 60000,
  });

  const typeChoices = useMemo(() => {
    const types = Array.isArray(typesRes?.data) ? typesRes.data : [];
    return types.map((type) => ({
      id: type.id,
      name: type.name,
      display: localizeNotificationTypeName(type.name, t),
    }));
  }, [typesRes, t]);

  const audiencePermissionOptions = useMemo(
    () =>
      Object.entries(PERMISSION_LABELS)
        .map(([value, label]) => ({ value, label }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    []
  );

  const findTypeByInput = (inputValue) => {
    const needle = normalizeText(inputValue);
    if (!needle) return null;

    return (
      typeChoices.find((type) => normalizeText(type.name) === needle)
      || typeChoices.find((type) => normalizeText(type.display) === needle)
      || null
    );
  };

  const { data: notificationRes, isLoading: loadingNotification } = useQuery({
    queryKey: ['notifications', 'details', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data } = await notificationsApi.getById(id);
      return data;
    },
  });

  useEffect(() => {
    if (isEdit || !typeChoices.length || form.typeId) return;

    const first = typeChoices[0];
    setForm((prev) => ({ ...prev, typeId: first.id }));
    setTypeInput(first.display);
  }, [isEdit, typeChoices, form.typeId]);

  useEffect(() => {
    if (!isEdit) return;
    const notification = notificationRes?.data;
    if (!notification) return;

    setForm({
      typeId: notification.type?.id || '',
      name: notification.name || '',
      summary: notification.summary || '',
      eventDate: toDateInputValue(notification.eventDate),
      coverImageUrl: notification.coverImageUrl || '',
      isActive: notification.isActive !== false,
      audienceType: notification.audienceType === 'all' ? 'all' : 'permissions',
      audiencePermissions:
        Array.isArray(notification.audiencePermissions) && notification.audiencePermissions.length > 0
          ? notification.audiencePermissions
          : DEFAULT_AUDIENCE_PERMISSIONS,
      details:
        Array.isArray(notification.details) && notification.details.length > 0
          ? notification.details.map((detail) => ({
            localId: detail.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            kind: detail.kind || 'text',
            title: detail.title || '',
            content: detail.content || '',
            url: detail.url || '',
          }))
          : [],
    });

    setTypeInput(localizeNotificationTypeName(notification.type?.name || '', t));
  }, [isEdit, notificationRes, t]);

  const createMutation = useMutation({
    mutationFn: (payload) => notificationsApi.create(payload),
    onSuccess: () => {
      toast.success(tf('notifications.messages.created', 'Notification created successfully.'));
      navigate('/dashboard/notifications');
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ notificationId, payload }) => notificationsApi.update(notificationId, payload),
    onSuccess: () => {
      toast.success(tf('notifications.messages.updated', 'Notification updated successfully.'));
      navigate('/dashboard/notifications');
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const createTypeMutation = useMutation({
    mutationFn: (typeName) => notificationsApi.createType(typeName),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending || createTypeMutation.isPending;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const updateAudienceType = (value) => {
    setForm((prev) => ({
      ...prev,
      audienceType: value,
      audiencePermissions:
        value === 'permissions' && (!Array.isArray(prev.audiencePermissions) || prev.audiencePermissions.length === 0)
          ? DEFAULT_AUDIENCE_PERMISSIONS
          : prev.audiencePermissions,
    }));
    setFormErrors((prev) => ({ ...prev, audienceType: undefined, audiencePermissions: undefined }));
  };

  const updateAudiencePermissions = (values) => {
    setForm((prev) => ({
      ...prev,
      audiencePermissions: values,
    }));
    setFormErrors((prev) => ({ ...prev, audiencePermissions: undefined }));
  };

  const updateTypeInput = (value, selectedTypeId) => {
    setTypeInput(value);

    const matched = selectedTypeId
      ? typeChoices.find((type) => type.id === selectedTypeId)
      : findTypeByInput(value);

    setForm((prev) => ({
      ...prev,
      typeId: matched?.id || '',
    }));

    setFormErrors((prev) => ({ ...prev, typeId: undefined }));
  };

  const updateDetail = (localId, field, value) => {
    setForm((prev) => ({
      ...prev,
      details: prev.details.map((detail) =>
        detail.localId === localId ? { ...detail, [field]: value } : detail
      ),
    }));
  };

  const addDetail = () => {
    setForm((prev) => ({
      ...prev,
      details: [...prev.details, createDetail('text')],
    }));
    setFormErrors((prev) => ({ ...prev, details: undefined }));
  };

  const removeDetail = (localId) => {
    setForm((prev) => {
      return {
        ...prev,
        details: prev.details.filter((detail) => detail.localId !== localId),
      };
    });
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const response = await notificationsApi.uploadImage(file);
    const payload = response?.data?.data ?? response?.data ?? null;
    if (!payload?.url) {
      throw new Error('Invalid upload response');
    }
    return payload.url;
  };

  const getUploadErrorMessage = (error) => {
    if (error?.response) {
      return normalizeApiError(error).message;
    }
    return error?.message || tf('notifications.messages.imageUploadFailed', 'Image upload failed.');
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setCoverUploading(true);
    try {
      const imageUrl = await uploadImage(file);
      updateField('coverImageUrl', imageUrl);
      toast.success(tf('notifications.messages.imageUploaded', 'Image uploaded successfully.'));
    } catch (error) {
      toast.error(getUploadErrorMessage(error));
    } finally {
      setCoverUploading(false);
    }
  };

  const handleDetailImageUpload = async (localId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setDetailUploading((prev) => ({ ...prev, [localId]: true }));
    try {
      const imageUrl = await uploadImage(file);
      updateDetail(localId, 'url', imageUrl);
      toast.success(tf('notifications.messages.imageUploaded', 'Image uploaded successfully.'));
    } catch (error) {
      toast.error(getUploadErrorMessage(error));
    } finally {
      setDetailUploading((prev) => ({ ...prev, [localId]: false }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!typeInput.trim()) {
      nextErrors.typeId = tf('notifications.validation.typeRequired', 'Notification type is required.');
    }

    if (!form.name.trim()) {
      nextErrors.name = tf('notifications.validation.nameRequired', 'Notification name is required.');
    }

    if (form.audienceType === 'permissions' && (!form.audiencePermissions || form.audiencePermissions.length === 0)) {
      nextErrors.audiencePermissions = tf(
        'notifications.validation.audiencePermissionsRequired',
        'Choose at least one permission for a restricted audience.'
      );
    }

    if (Array.isArray(form.details) && form.details.length > 0) {
      for (const detail of form.details) {
        if (detail.kind === 'text' && !detail.content.trim()) {
          nextErrors.details = tf('notifications.validation.textDetailContentRequired', 'Text detail content is required.');
          break;
        }

        if (detail.kind === 'link' && !detail.url.trim()) {
          nextErrors.details = tf('notifications.validation.detailUrlRequired', 'Detail URL is required.');
          break;
        }

        if (detail.kind === 'image' && !detail.url.trim()) {
          nextErrors.details = tf('notifications.validation.imageUploadRequired', 'Please upload an image.');
          break;
        }
      }
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resolveTypeId = async () => {
    if (form.typeId) {
      return form.typeId;
    }

    const matched = findTypeByInput(typeInput);
    if (matched) {
      return matched.id;
    }

    const newTypeName = typeInput.trim();
    if (!newTypeName) {
      throw new Error(tf('notifications.validation.typeRequired', 'Notification type is required.'));
    }

    if (!canManageTypes) {
      throw new Error(
        tf(
          'notifications.validation.typeMustExist',
          'Please select an existing notification type. You do not have permission to create new types.'
        )
      );
    }

    const response = await createTypeMutation.mutateAsync(newTypeName);
    const createdType = response?.data?.data ?? response?.data;
    if (!createdType?.id) {
      throw new Error(tf('notifications.messages.typeCreateFailed', 'Failed to create notification type.'));
    }

    queryClient.invalidateQueries({ queryKey: ['notifications', 'types'] });
    toast.success(tf('notifications.messages.typeCreated', 'Notification type created successfully.'));

    setForm((prev) => ({ ...prev, typeId: createdType.id }));
    setTypeInput(localizeNotificationTypeName(createdType.name || newTypeName, t));

    return createdType.id;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    let resolvedTypeId = null;
    try {
      resolvedTypeId = await resolveTypeId();
    } catch (error) {
      setFormErrors((prev) => ({ ...prev, typeId: error.message }));
      return;
    }

    const payload = {
      typeId: resolvedTypeId,
      name: form.name.trim(),
      summary: form.summary.trim() || null,
      details: form.details.map((detail) => ({
        kind: detail.kind,
        title: detail.title.trim() || null,
        content: detail.content.trim() || null,
        url: detail.url.trim() || null,
      })),
      eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : null,
      coverImageUrl: form.coverImageUrl.trim() || null,
      isActive: !!form.isActive,
      audienceType: form.audienceType,
      audiencePermissions:
        form.audienceType === 'permissions'
          ? form.audiencePermissions
          : [],
    };

    if (isEdit) {
      updateMutation.mutate({ notificationId: id, payload });
      return;
    }

    createMutation.mutate(payload);
  };

  if (isEdit && loadingNotification) {
    return <div className="py-10 text-sm text-muted">{t('common.loading')}</div>;
  }

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('notifications.page'), href: '/dashboard/notifications' },
          { label: isEdit ? t('notifications.actions.edit') : t('notifications.actions.create') },
        ]}
      />

      <PageHeader
        className="border-b border-border pb-6"
        eyebrow={t('shared.dashboard')}
        title={isEdit ? t('notifications.form.editTitle') : t('notifications.form.createTitle')}
        subtitle={isEdit ? t('notifications.form.editSubtitle') : t('notifications.form.createSubtitle')}
        actions={(
          <Button type="button" variant="ghost" size="sm" icon={ArrowRight} onClick={() => navigate('/dashboard/notifications')}>
            {t('common.actions.back')}
          </Button>
        )}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader
            title={t('notifications.form.sectionBasics')}
            subtitle={t('notifications.form.sectionBasicsSubtitle')}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
            <NotificationTypeCombobox
              label={t('notifications.form.type')}
              value={typeInput}
              onChange={updateTypeInput}
              options={typeChoices}
              placeholder={t('notifications.form.typePlaceholder')}
              error={formErrors.typeId}
              // hint={
              //   canManageTypes
              //     ? tf('notifications.form.typeSmartHint', 'Select an existing type or type a new one to create automatically.')
              //     : tf('notifications.form.typeSelectHint', 'Select an existing notification type.')
              // }
              emptyMessage={tf('notifications.form.typeNoMatches', 'No matching type. Keep typing to create new if allowed.')}
            />
            <Input
              label={t('notifications.form.name')}
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              error={formErrors.name}
              required
              containerClassName="!mb-0"
            />
            <Input
              label={t('notifications.form.eventDate')}
              type="datetime-local"
              value={form.eventDate}
              onChange={(event) => updateField('eventDate', event.target.value)}
              containerClassName="!mb-0"
            />
            <div className="flex items-end">
              <Button
                type="button"
                variant={form.isActive ? 'success' : 'outline'}
                onClick={() => updateField('isActive', !form.isActive)}
              >
                {form.isActive ? t('notifications.actions.setInactive') : t('notifications.actions.setActive')}
              </Button>
            </div>
          </div>

          <TextArea
            label={t('notifications.form.summary')}
            value={form.summary}
            onChange={(event) => updateField('summary', event.target.value)}
            className="min-h-[90px]"
          />

          <div className="rounded-xl border border-border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-heading">{t('notifications.form.coverImage')}</p>
                <p className="text-xs text-muted">{t('notifications.form.coverImageHint')}</p>
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleCoverUpload}
              />
              <Button
                type="button"
                variant="outline"
                icon={ImagePlus}
                loading={coverUploading}
                onClick={() => coverInputRef.current?.click()}
              >
                {t('notifications.form.uploadImage')}
              </Button>
            </div>

            {form.coverImageUrl ? (
              <img src={form.coverImageUrl} alt="" className="max-h-64 w-full rounded-lg border border-border object-cover" />
            ) : (
              <p className="text-xs text-muted">{t('notifications.form.noImage')}</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t('notifications.form.details')}
            subtitle={t('notifications.form.detailsSubtitle')}
            action={(
              <Button type="button" variant="outline" size="sm" icon={PlusCircle} onClick={addDetail}>
                {t('notifications.actions.addDetail')}
              </Button>
            )}
          />

          {formErrors.details ? <p className="mb-3 text-xs text-danger">{formErrors.details}</p> : null}

          <div className="space-y-4">
            {form.details.map((detail, index) => (
              <div key={detail.localId} className="rounded-xl border border-border bg-surface-alt/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{t('notifications.form.detailItem')} #{index + 1}</Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDetail(detail.localId)}
                    className="rounded-lg p-1 text-muted transition-colors hover:bg-danger-light hover:text-danger"
                    aria-label={t('common.actions.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Select
                    label={t('notifications.form.detailKind')}
                    value={detail.kind}
                    onChange={(event) => updateDetail(detail.localId, 'kind', event.target.value)}
                    options={[
                      { value: 'text', label: t('notifications.detailKinds.text') },
                      { value: 'link', label: t('notifications.detailKinds.link') },
                      { value: 'image', label: t('notifications.detailKinds.image') },
                    ]}
                  />
                  <Input
                    label={t('notifications.form.detailTitle')}
                    value={detail.title}
                    onChange={(event) => updateDetail(detail.localId, 'title', event.target.value)}
                    containerClassName="!mb-0"
                  />
                </div>

                {detail.kind === 'text' ? (
                  <TextArea
                    label={t('notifications.form.detailContent')}
                    value={detail.content}
                    onChange={(event) => updateDetail(detail.localId, 'content', event.target.value)}
                    className="min-h-[90px]"
                  />
                ) : null}

                {detail.kind === 'link' ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Input
                      label={t('notifications.form.detailUrl')}
                      value={detail.url}
                      onChange={(event) => updateDetail(detail.localId, 'url', event.target.value)}
                      placeholder="https://"
                      containerClassName="!mb-0"
                    />
                    <Input
                      label={t('notifications.form.detailContent')}
                      value={detail.content}
                      onChange={(event) => updateDetail(detail.localId, 'content', event.target.value)}
                      containerClassName="!mb-0"
                    />
                  </div>
                ) : null}

                {detail.kind === 'image' ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={(node) => {
                          if (node) {
                            detailInputRefs.current[detail.localId] = node;
                          } else {
                            delete detailInputRefs.current[detail.localId];
                          }
                        }}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={(event) => handleDetailImageUpload(detail.localId, event)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={ImagePlus}
                        loading={Boolean(detailUploading[detail.localId])}
                        onClick={() => detailInputRefs.current[detail.localId]?.click()}
                      >
                        {t('notifications.form.uploadImage')}
                      </Button>

                      {detail.url ? (
                        <a href={detail.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                          {t('notifications.form.openUploadedImage')}
                        </a>
                      ) : (
                        <span className="text-xs text-muted">{t('notifications.form.noImage')}</span>
                      )}
                    </div>

                    {detail.url ? (
                      <img src={detail.url} alt={detail.title || ''} className="max-h-64 rounded-lg border border-border object-contain" />
                    ) : null}

                    <Input
                      label={t('notifications.form.detailContent')}
                      value={detail.content}
                      onChange={(event) => updateDetail(detail.localId, 'content', event.target.value)}
                      containerClassName="!mb-0"
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/dashboard/notifications')}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" icon={Save} loading={isSaving || coverUploading}>
            {t('common.actions.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
