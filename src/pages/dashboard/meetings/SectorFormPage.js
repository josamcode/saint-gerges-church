import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { mapFieldErrors, normalizeApiError } from '../../../api/errors';
import { meetingsApi } from '../../../api/endpoints';
import UserSearchSelect from '../../../components/UserSearchSelect';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card, { CardHeader } from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import TextArea from '../../../components/ui/TextArea';
import { useI18n } from '../../../i18n/i18n';
import { buildSectorPayload, mapSectorToForm } from './meetingsForm.utils';

const EMPTY_FORM = {
  name: '',
  avatar: null,
  avatarRemoved: false,
  notes: '',
  officials: [],
};

export default function SectorFormPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [avatarUploading, setAvatarUploading] = useState(false);

  const sectorQuery = useQuery({
    queryKey: ['meetings', 'sectors', 'details', id],
    enabled: isEdit,
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await meetingsApi.sectors.getById(id);
      return data?.data || null;
    },
  });

  useEffect(() => {
    if (sectorQuery.data) {
      setForm(mapSectorToForm(sectorQuery.data));
    }
  }, [sectorQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      isEdit ? meetingsApi.sectors.update(id, payload) : meetingsApi.sectors.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? t('meetings.messages.sectorUpdated') : t('meetings.messages.sectorCreated'));
      queryClient.invalidateQueries({ queryKey: ['meetings', 'sectors'] });
      navigate('/dashboard/meetings/sectors');
    },
    onError: (error) => {
      const normalized = normalizeApiError(error);
      setErrors(mapFieldErrors(normalized.details));
      toast.error(normalized.message);
    },
  });

  const validateForm = () => {
    const nextErrors = {};
    if (!form.name.trim()) {
      nextErrors.name = t('meetings.errors.nameRequired');
    }

    form.officials.forEach((official, index) => {
      if (!official.user?._id && !official.name.trim()) {
        nextErrors[`officials_${index}`] = t('meetings.errors.officialNameOrUserRequired');
      }
    });

    return nextErrors;
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
      const { data } = await meetingsApi.sectors.uploadAvatarImage(file);
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

    saveMutation.mutate(buildSectorPayload(form));
  };

  const updateOfficial = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      officials: prev.officials.map((official, officialIndex) =>
        officialIndex === index ? { ...official, ...patch } : official
      ),
    }));
    setErrors((prev) => ({ ...prev, [`officials_${index}`]: undefined }));
  };

  if (isEdit && sectorQuery.isLoading) {
    return <Card><p className="text-sm text-muted">{t('common.loading')}</p></Card>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('meetings.sectorsPageTitle'), href: '/dashboard/meetings/sectors' },
          { label: isEdit ? t('meetings.actions.editSectorPage') : t('meetings.actions.createSectorPage') },
        ]}
      />

      <Card>
        <CardHeader
          title={isEdit ? t('meetings.actions.editSectorPage') : t('meetings.actions.createSectorPage')}
          subtitle={t('meetings.sections.sectorsSubtitle')}
        />

        <form onSubmit={handleSubmit} className="space-y-5">
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
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="absolute -top-1 -left-1 rounded-full bg-danger p-1 text-white"
                      aria-label={t('meetings.actions.removeAvatar')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
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
                    disabled={avatarUploading}
                    className="hidden"
                    id="sector-avatar-upload"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Upload}
                    loading={avatarUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {form.avatar?.url ? t('meetings.actions.changeAvatar') : t('meetings.actions.uploadAvatar')}
                  </Button>

                  {form.avatar?.url && (
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
              <h4 className="text-sm font-semibold text-heading mb-3">{t('meetings.sections.basicInfo')}</h4>
              <Input
                label={t('meetings.fields.name')}
                required
                value={form.name}
                placeholder={t('meetings.fields.namePlaceholder')}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }));
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                error={errors.name}
              />

              <TextArea
                label={t('meetings.fields.notes')}
                value={form.notes}
                placeholder={t('meetings.fields.sectorNotesPlaceholder')}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h4 className="text-sm font-semibold text-heading">{t('meetings.fields.officials')}</h4>
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={Plus}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    officials: [...prev.officials, { user: null, name: '', title: '', notes: '' }],
                  }))
                }
              >
                {t('meetings.actions.addOfficial')}
              </Button>
            </div>

            <div className="space-y-4">
              {form.officials.length === 0 && (
                <p className="text-sm text-muted">{t('meetings.empty.noOfficialsYet')}</p>
              )}

              {form.officials.map((official, index) => (
                <div key={index} className="rounded-lg border border-border bg-surface-alt/30 p-4">
                  <UserSearchSelect
                    label={t('meetings.fields.userLink')}
                    value={official.user}
                    onChange={(value) =>
                      updateOfficial(index, {
                        user: value,
                        name: value?.fullName || official.name,
                      })
                    }
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <Input
                      label={t('meetings.fields.nameFallback')}
                      value={official.name}
                      placeholder={t('meetings.fields.officialNamePlaceholder')}
                      onChange={(event) => updateOfficial(index, { name: event.target.value })}
                      error={errors[`officials_${index}`]}
                    />
                    <Input
                      label={t('meetings.fields.title')}
                      value={official.title}
                      placeholder={t('meetings.fields.officialTitlePlaceholder')}
                      onChange={(event) => updateOfficial(index, { title: event.target.value })}
                    />
                  </div>

                  <TextArea
                    label={t('meetings.fields.notes')}
                    value={official.notes}
                    placeholder={t('meetings.fields.officialNotesPlaceholder')}
                    onChange={(event) => updateOfficial(index, { notes: event.target.value })}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-danger"
                    icon={Trash2}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        officials: prev.officials.filter((_, officialIndex) => officialIndex !== index),
                      }))
                    }
                  >
                    {t('meetings.actions.remove')}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => navigate('/dashboard/meetings/sectors')}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" icon={Save} loading={saveMutation.isPending}>
              {t('common.actions.save')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
