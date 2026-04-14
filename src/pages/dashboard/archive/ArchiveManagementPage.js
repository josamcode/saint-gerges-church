import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  FolderOpen,
  ImagePlus,
  Pencil,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { archiveApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Card, { CardHeader } from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import Input from '../../../components/ui/Input';
import PageHeader from '../../../components/ui/PageHeader';
import Select from '../../../components/ui/Select';
import TextArea from '../../../components/ui/TextArea';
import { useI18n } from '../../../i18n/i18n';

const DEFAULT_ARCHIVE_DATA = {
  collections: [],
  stories: [],
  honorees: [],
  counts: {
    collections: 0,
    stories: 0,
    honorees: 0,
    publishedCollections: 0,
    publishedStories: 0,
    publishedHonorees: 0,
  },
};

function createEmptyCollectionForm() {
  return {
    id: null,
    title: '',
    slug: '',
    description: '',
    narrative: '',
    status: 'draft',
    photos: [],
  };
}

function createEmptyStoryForm() {
  return {
    id: null,
    title: '',
    slug: '',
    summary: '',
    narrative: '',
    collectionId: '',
    eventDate: '',
    status: 'draft',
    photos: [],
  };
}

function createEmptyHonoreeForm() {
  return {
    id: null,
    fullName: '',
    honorTitle: '',
    summary: '',
    narrative: '',
    collectionId: '',
    honorDate: '',
    status: 'draft',
    photos: [],
  };
}

function getStatusBadgeVariant(status) {
  return status === 'published' ? 'success' : 'warning';
}

function getStatusLabel(status, t) {
  const statusKey = `archivePage.status.${status}`;
  const translatedStatus = t(statusKey);
  return translatedStatus === statusKey ? status : translatedStatus;
}

function formatDateValue(value, locale, emptyLabel) {
  if (!value) return emptyLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale);
}

function PhotoGalleryEditor({
  label,
  photos,
  onChange,
  onUpload,
  uploading,
  canUpload,
  readOnly,
}) {
  const { t } = useI18n();
  const inputRef = useRef(null);

  const updateCaption = (index, caption) => {
    const next = [...photos];
    next[index] = {
      ...next[index],
      caption,
    };
    onChange(next);
  };

  const removePhoto = (index) => {
    onChange(photos.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    const validFiles = files.filter((file) => file.type.startsWith('image/'));

    if (!validFiles.length) {
      toast.error(t('archivePage.gallery.invalidImage'));
      return;
    }

    if (validFiles.length !== files.length) {
      toast.error(t('archivePage.gallery.invalidImage'));
    }

    const uploadedPhotos = [];

    for (const file of validFiles) {
      try {
        const uploaded = await onUpload(file);
        if (uploaded?.url) {
          uploadedPhotos.push(uploaded);
        }
      } catch (_error) {
        // Upload errors are already handled by the mutation.
      }
    }

    if (uploadedPhotos.length) {
      onChange([...(photos || []), ...uploadedPhotos]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-heading">{label}</p>
        {!readOnly && canUpload ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={ImagePlus}
              loading={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {t('archivePage.gallery.uploadImage')}
            </Button>
          </>
        ) : null}
      </div>

      {!canUpload && !readOnly ? (
        <p className="text-xs text-muted">
          {t('archivePage.gallery.uploadPermissionHint')}
        </p>
      ) : null}

      {!photos?.length ? (
        <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
          {t('archivePage.gallery.noPhotos')}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {photos.map((photo, index) => (
            <div key={`${photo.publicId || photo.url}-${index}`} className="rounded-2xl border border-border p-3">
              <img
                src={photo.url}
                alt={photo.caption || ''}
                className="mb-3 h-40 w-full rounded-xl object-cover"
              />
              {readOnly ? (
                <p className="text-xs text-muted">{photo.caption || '---'}</p>
              ) : (
                <div className="space-y-3">
                  <Input
                    label={t('archivePage.gallery.caption')}
                    value={photo.caption || ''}
                    onChange={(event) => updateCaption(index, event.target.value)}
                    containerClassName="!mb-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    className="text-danger"
                    onClick={() => removePhoto(index)}
                  >
                    {t('archivePage.gallery.removePhoto')}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ArchiveListItem({
  icon: Icon,
  title,
  subtitle,
  description,
  status,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  photosCount,
  active = false,
}) {
  const { t } = useI18n();
  const statusLabel = getStatusLabel(status, t);
  const showActions = Boolean((canEdit && onEdit) || (canDelete && onDelete));

  return (
    <div
      className={[
        'rounded-2xl border p-4 transition-colors duration-200',
        active ? 'border-primary/40 bg-primary/5' : 'border-border',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-heading">{title}</p>
            {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
          </div>
        </div>
        <Badge variant={getStatusBadgeVariant(status)}>{statusLabel}</Badge>
      </div>
      <p className="mt-3 text-sm text-muted">{description || t('archivePage.list.noSummary')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="default">{t('archivePage.list.photosCount', { count: photosCount })}</Badge>
      </div>
      {showActions ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {canEdit && onEdit ? (
            <Button type="button" variant="outline" size="sm" icon={Pencil} onClick={onEdit}>
              {t('common.actions.edit')}
            </Button>
          ) : null}
          {canDelete && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={Trash2}
              className="text-danger"
              onClick={onDelete}
            >
              {t('common.actions.delete')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CollectionDirectoryCard({
  collection,
  storyCount,
  honoreeCount,
  onOpen,
  active = false,
}) {
  const { t } = useI18n();
  const coverPhoto = collection.photos?.[0] || null;
  const statusLabel = getStatusLabel(collection.status, t);

  return (
    <button
      type="button"
      onClick={() => onOpen(collection)}
      aria-pressed={active}
      className="w-full text-left"
    >
      <div
        className={[
          'group h-full overflow-hidden rounded-[28px] border bg-surface transition-all duration-200',
          active
            ? 'border-primary/40 ring-2 ring-primary/10 shadow-card'
            : 'border-border shadow-sm hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-card',
        ].join(' ')}
      >
        <div className="relative h-56 overflow-hidden bg-surface-alt">
          {coverPhoto ? (
            <>
              <img
                src={coverPhoto.url}
                alt={coverPhoto.caption || collection.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-surface to-surface-alt text-primary">
              <FolderOpen className="h-12 w-12" />
            </div>
          )}

          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
            <Badge variant={getStatusBadgeVariant(collection.status)}>{statusLabel}</Badge>
            <Badge variant="default">
              {t('archivePage.list.photosCount', { count: collection.photos.length })}
            </Badge>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className={`text-lg font-semibold ${coverPhoto ? 'text-white' : 'text-heading'}`}>
              {collection.title}
            </p>
            <p className={`mt-2 line-clamp-2 text-sm ${coverPhoto ? 'text-white/85' : 'text-muted'}`}>
              {collection.description || t('archivePage.list.noSummary')}
            </p>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">
              {t('archivePage.collections.browser.storyCount', { count: storyCount })}
            </Badge>
            <Badge variant="default">
              {t('archivePage.collections.browser.honoreeCount', { count: honoreeCount })}
            </Badge>
          </div>

          <div className="flex items-end justify-between gap-4">
            <p className="line-clamp-3 text-sm leading-6 text-muted">
              {collection.narrative || collection.description || t('archivePage.collections.browser.noNarrative')}
            </p>
            <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {t('archivePage.collections.directory.openCollection')}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function ViewerCollectionCard({ collection, onOpen, active = false }) {
  const { t } = useI18n();
  const coverPhoto = collection.photos?.[0] || null;

  return (
    <button
      type="button"
      onClick={() => onOpen(collection)}
      aria-pressed={active}
      className="w-full text-left"
    >
      <div
        className={[
          'group relative min-h-[280px] overflow-hidden rounded-[32px] border transition-all duration-300',
          active
            ? 'border-white/60 shadow-2xl ring-2 ring-white/20'
            : 'border-white/10 shadow-xl hover:-translate-y-1 hover:shadow-2xl',
        ].join(' ')}
      >
        {coverPhoto ? (
          <img
            src={coverPhoto.url}
            alt={coverPhoto.caption || collection.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-surface-alt via-surface to-primary/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />

        <div className="absolute inset-x-0 top-0 flex justify-end p-5">
          <Badge variant="default">{t('archivePage.list.photosCount', { count: collection.photos.length })}</Badge>
        </div>

        {!coverPhoto ? (
          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center text-white/70">
            <FolderOpen className="h-12 w-12" />
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-xl font-semibold text-white">{collection.title}</p>
        </div>
      </div>
    </button>
  );
}

function CollectionPhotoGallery({ collection, onOpenImage }) {
  const { t } = useI18n();
  const photos = collection?.photos || [];

  if (!photos.length) {
    return (
      <div className="rounded-[28px] border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
        {t('archivePage.collections.browser.noMedia')}
      </div>
    );
  }

  return (
    <div className="grid auto-rows-[180px] gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {photos.map((photo, index) => (
        <button
          key={`${photo.publicId || photo.url}-${index}`}
          type="button"
          onClick={() => onOpenImage(index)}
          className={[
            'group relative overflow-hidden rounded-[24px] bg-surface-alt text-left',
            index === 0 ? 'sm:col-span-2 xl:col-span-2 xl:row-span-2 min-h-[280px]' : 'min-h-[180px]',
          ].join(' ')}
        >
          <img
            src={photo.url}
            alt={photo.caption || collection?.title || ''}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent opacity-90" />
          {photo.caption ? (
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="line-clamp-2 text-xs text-white/85">{photo.caption}</p>
            </div>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function CollectionContentList({
  icon: Icon,
  title,
  items,
  emptyLabel,
  renderTitle,
  renderMeta,
  renderDescription,
}) {
  return (
    <div className="rounded-[24px] border border-border bg-page/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-heading">{title}</p>
        </div>
        <Badge variant="default">{items.length}</Badge>
      </div>

      {!items.length ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
          {emptyLabel}
        </div>
      ) : (
        <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-heading">{renderTitle(item)}</p>
              <p className="mt-1 text-xs text-muted">{renderMeta(item)}</p>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                {renderDescription(item)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageLightbox({
  collection,
  photoIndex,
  onClose,
  onPrev,
  onNext,
  onSelectPhoto,
}) {
  const { t } = useI18n();
  const photos = collection?.photos || [];
  const activePhoto = photos[photoIndex] || null;

  useEffect(() => {
    if (!activePhoto) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onPrev();
      if (event.key === 'ArrowRight') onNext();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePhoto, onClose, onNext, onPrev]);

  if (!activePhoto) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-xl"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={collection?.title || t('archivePage.title')}
    >
      <div className="flex h-full flex-col px-4 py-4 md:px-8 md:py-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-white">{collection?.title}</p>
            <p className="mt-1 text-sm text-white/70">
              {photoIndex + 1} / {photos.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label={t('common.actions.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mt-4 flex min-h-0 flex-1 items-center justify-center">
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={onPrev}
                className="absolute left-0 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:left-4"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={onNext}
                className="absolute right-0 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:right-4"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}

          <img
            src={activePhoto.url}
            alt={activePhoto.caption || collection?.title || ''}
            className="max-h-full max-w-full rounded-[32px] object-contain shadow-2xl"
          />
        </div>

        <div className="mt-4">
          <p className="text-center text-sm text-white/75">
            {activePhoto.caption || collection?.title || '---'}
          </p>
          {photos.length > 1 ? (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {photos.map((photo, index) => (
                <button
                  key={`${photo.publicId || photo.url}-${index}`}
                  type="button"
                  onClick={() => onSelectPhoto(index)}
                  className={[
                    'h-20 w-24 shrink-0 overflow-hidden rounded-2xl border transition-all duration-200',
                    index === photoIndex
                      ? 'border-white shadow-lg ring-2 ring-white/30'
                      : 'border-white/10 opacity-70 hover:opacity-100',
                  ].join(' ')}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || collection?.title || ''}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CollectionBrowserPanel({
  collection,
  onOpenImage,
  storyCount,
  honoreeCount,
  relatedStories,
  relatedHonorees,
  formatArchiveDate,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) {
  const { t } = useI18n();

  if (!collection) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-page/50 p-5 text-sm text-muted">
        {t('archivePage.collections.browser.empty')}
      </div>
    );
  }

  const hasRelatedStories = relatedStories.length > 0;
  const hasRelatedHonorees = relatedHonorees.length > 0;
  const hasRelatedContent = hasRelatedStories || hasRelatedHonorees;

  return (
    <div className="space-y-6 rounded-[28px] border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="text-2xl font-bold text-heading">{collection.title}</h4>
          {collection.description ? (
            <p className="mt-2 text-sm leading-7 text-muted">{collection.description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={getStatusBadgeVariant(collection.status)}>
            {getStatusLabel(collection.status, t)}
          </Badge>
          {collection.photos.length ? (
            <Badge variant="default">
              {t('archivePage.collections.browser.mediaCount', { count: collection.photos.length })}
            </Badge>
          ) : null}
          {storyCount ? (
            <Badge variant="default">
              {t('archivePage.collections.browser.storyCount', { count: storyCount })}
            </Badge>
          ) : null}
          {honoreeCount ? (
            <Badge variant="default">
              {t('archivePage.collections.browser.honoreeCount', { count: honoreeCount })}
            </Badge>
          ) : null}
        </div>
      </div>

      <CollectionPhotoGallery collection={collection} onOpenImage={onOpenImage} />

      {collection.narrative ? (
        <div className="rounded-[24px] border border-border bg-page/60 p-5">
          <p className="text-sm leading-7 text-muted">{collection.narrative}</p>
        </div>
      ) : null}

        {(canEdit && onEdit) || (canDelete && onDelete) ? (
          <div className="flex flex-wrap gap-2">
            {canEdit && onEdit ? (
              <Button type="button" variant="outline" size="sm" icon={Pencil} onClick={onEdit}>
                {t('common.actions.edit')}
              </Button>
            ) : null}
            {canDelete && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={Trash2}
                className="text-danger"
                onClick={onDelete}
              >
                {t('common.actions.delete')}
              </Button>
            ) : null}
          </div>
        ) : null}

      {hasRelatedContent ? (
        <div className={`grid gap-4 ${hasRelatedStories && hasRelatedHonorees ? 'xl:grid-cols-2' : ''}`}>
          {hasRelatedStories ? (
            <CollectionContentList
              icon={FileText}
              title={t('archivePage.stories.title')}
              items={relatedStories}
              emptyLabel=""
              renderTitle={(story) => story.title}
              renderMeta={(story) => formatArchiveDate(story.eventDate)}
              renderDescription={(story) =>
                story.summary || story.narrative || t('archivePage.list.noSummary')
              }
            />
          ) : null}
          {hasRelatedHonorees ? (
            <CollectionContentList
              icon={Award}
              title={t('archivePage.honorees.title')}
              items={relatedHonorees}
              emptyLabel=""
              renderTitle={(honoree) => honoree.fullName}
              renderMeta={(honoree) =>
                [honoree.honorTitle || t('archivePage.placeholders.noTitle'), formatArchiveDate(honoree.honorDate)]
                  .join(' | ')
              }
              renderDescription={(honoree) =>
                honoree.summary || honoree.narrative || t('archivePage.list.noSummary')
              }
            />
          ) : null}
        </div>
      ) : null}

      {collection.photos.length ? (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" icon={ExternalLink} onClick={() => onOpenImage(0)}>
            {t('archivePage.collections.browser.openImage')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function ArchiveManagementPage() {
  const { t, language } = useI18n();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [collectionForm, setCollectionForm] = useState(createEmptyCollectionForm);
  const [storyForm, setStoryForm] = useState(createEmptyStoryForm);
  const [honoreeForm, setHonoreeForm] = useState(createEmptyHonoreeForm);
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [lightboxCollectionId, setLightboxCollectionId] = useState(null);
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState(0);

  const tx = useCallback((key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);
  const ta = useCallback((key, values) => t(`archivePage.${key}`, values), [t]);
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const formatArchiveDate = (value) => formatDateValue(value, locale, ta('placeholders.noDate'));

  const canViewArchive = hasPermission('ARCHIVE_VIEW');
  const canUpload = hasPermission('ARCHIVE_UPLOAD');
  const canManageCollections = hasPermission('ARCHIVE_COLLECTIONS_MANAGE');
  const canManageStories = hasPermission('ARCHIVE_STORIES_MANAGE');
  const canManageHonorees = hasPermission('ARCHIVE_HONOREES_MANAGE');
  const canPublish = hasPermission('ARCHIVE_PUBLISH');
  const canAccessArchiveWorkspace =
    canViewArchive ||
    canManageCollections ||
    canManageStories ||
    canManageHonorees ||
    canPublish;
  const isGalleryOnlyView =
    canViewArchive &&
    !canManageCollections &&
    !canManageStories &&
    !canManageHonorees &&
    !canPublish;

  const archiveQuery = useQuery({
    queryKey: ['archive', 'manage'],
    enabled: canAccessArchiveWorkspace,
    queryFn: async () => {
      const { data } = await archiveApi.getManage();
      return data?.data || DEFAULT_ARCHIVE_DATA;
    },
  });

  const archiveData = archiveQuery.data || DEFAULT_ARCHIVE_DATA;

  const statusOptions = useMemo(() => {
    const base = [{ value: 'draft', label: ta('status.draft') }];
    if (canPublish) {
      base.push({ value: 'published', label: ta('status.published') });
    }
    return base;
  }, [canPublish, ta]);

  const collectionDirectory = useMemo(
    () =>
      archiveData.collections.map((collection) => {
        const relatedStories = archiveData.stories.filter((story) => story.collectionId === collection.id);
        const relatedHonorees = archiveData.honorees.filter(
          (honoree) => honoree.collectionId === collection.id
        );

        return {
          ...collection,
          photos: collection.photos || [],
          relatedStories,
          relatedHonorees,
          storyCount: collection.storyCount ?? relatedStories.length,
          honoreeCount: collection.honoreeCount ?? relatedHonorees.length,
        };
      }),
    [archiveData.collections, archiveData.honorees, archiveData.stories]
  );

  const collectionOptions = useMemo(
    () => [
      { value: '', label: ta('placeholders.noCollection') },
      ...collectionDirectory.map((collection) => ({
        value: collection.id,
        label: collection.title,
      })),
    ],
    [collectionDirectory, ta]
  );

  const archiveStatCards = useMemo(
    () => [
      {
        label: ta('stats.collections'),
        value: archiveData.counts.collections,
        published: archiveData.counts.publishedCollections,
        icon: FolderOpen,
      },
      {
        label: ta('stats.stories'),
        value: archiveData.counts.stories,
        published: archiveData.counts.publishedStories,
        icon: FileText,
      },
      {
        label: ta('stats.honorees'),
        value: archiveData.counts.honorees,
        published: archiveData.counts.publishedHonorees,
        icon: Award,
      },
    ],
    [archiveData.counts, ta]
  );

  const activeCollection = useMemo(
    () =>
      collectionDirectory.find((collection) => collection.id === activeCollectionId) ||
      collectionDirectory[0] ||
      null,
    [activeCollectionId, collectionDirectory]
  );
  const activeCollectionStoryCount = activeCollection?.storyCount || 0;
  const activeCollectionHonoreeCount = activeCollection?.honoreeCount || 0;
  const activeCollectionStories = activeCollection?.relatedStories || [];
  const activeCollectionHonorees = activeCollection?.relatedHonorees || [];
  const lightboxCollection = useMemo(
    () =>
      collectionDirectory.find((collection) => collection.id === lightboxCollectionId) || null,
    [collectionDirectory, lightboxCollectionId]
  );
  const normalizedLightboxPhotoIndex = lightboxCollection?.photos?.[lightboxPhotoIndex]
    ? lightboxPhotoIndex
    : 0;

  const syncPayload = (payload) => {
    queryClient.setQueryData(['archive', 'manage'], payload);
  };

  const resetCollectionForm = () => setCollectionForm(createEmptyCollectionForm());
  const resetStoryForm = () => setStoryForm(createEmptyStoryForm());
  const resetHonoreeForm = () => setHonoreeForm(createEmptyHonoreeForm());

  const uploadImageMutation = useMutation({
    mutationFn: async (file) => {
      const { data } = await archiveApi.uploadImage(file);
      return data?.data || null;
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const saveCollectionMutation = useMutation({
    mutationFn: async (payload) => {
      if (payload.id) {
        const { data } = await archiveApi.updateCollection(payload.id, payload);
        return data?.data || null;
      }
      const { data } = await archiveApi.createCollection(payload);
      return data?.data || null;
    },
    onSuccess: (payload) => {
      syncPayload(payload);
      resetCollectionForm();
      toast.success(ta('messages.collectionSaved'));
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await archiveApi.removeCollection(id);
      return data?.data || null;
    },
    onSuccess: (payload) => {
      syncPayload(payload);
      if (collectionForm.id && !payload.collections.some((entry) => entry.id === collectionForm.id)) {
        resetCollectionForm();
      }
      toast.success(ta('messages.collectionDeleted'));
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const saveStoryMutation = useMutation({
    mutationFn: async (payload) => {
      if (payload.id) {
        const { data } = await archiveApi.updateStory(payload.id, payload);
        return data?.data || null;
      }
      const { data } = await archiveApi.createStory(payload);
      return data?.data || null;
    },
    onSuccess: (payload) => {
      syncPayload(payload);
      resetStoryForm();
      toast.success(ta('messages.storySaved'));
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const deleteStoryMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await archiveApi.removeStory(id);
      return data?.data || null;
    },
    onSuccess: (payload) => {
      syncPayload(payload);
      if (storyForm.id && !payload.stories.some((entry) => entry.id === storyForm.id)) {
        resetStoryForm();
      }
      toast.success(ta('messages.storyDeleted'));
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const saveHonoreeMutation = useMutation({
    mutationFn: async (payload) => {
      if (payload.id) {
        const { data } = await archiveApi.updateHonoree(payload.id, payload);
        return data?.data || null;
      }
      const { data } = await archiveApi.createHonoree(payload);
      return data?.data || null;
    },
    onSuccess: (payload) => {
      syncPayload(payload);
      resetHonoreeForm();
      toast.success(ta('messages.honoreeSaved'));
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const deleteHonoreeMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await archiveApi.removeHonoree(id);
      return data?.data || null;
    },
    onSuccess: (payload) => {
      syncPayload(payload);
      if (honoreeForm.id && !payload.honorees.some((entry) => entry.id === honoreeForm.id)) {
        resetHonoreeForm();
      }
      toast.success(ta('messages.honoreeDeleted'));
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const uploadArchivePhoto = async (file) => uploadImageMutation.mutateAsync(file);
  const openCollectionBrowser = (collection) => {
    setActiveCollectionId(collection.id);
  };
  const openImageLightbox = useCallback((collection, photoIndex = 0) => {
    if (!collection?.photos?.length) return;
    setLightboxCollectionId(collection.id);
    setLightboxPhotoIndex(photoIndex);
  }, []);
  const closeImageLightbox = useCallback(() => {
    setLightboxCollectionId(null);
    setLightboxPhotoIndex(0);
  }, []);
  const goToPreviousLightboxPhoto = useCallback(() => {
    const totalPhotos = lightboxCollection?.photos?.length || 0;
    if (!totalPhotos) return;
    setLightboxPhotoIndex((current) => (current - 1 + totalPhotos) % totalPhotos);
  }, [lightboxCollection?.photos?.length]);
  const goToNextLightboxPhoto = useCallback(() => {
    const totalPhotos = lightboxCollection?.photos?.length || 0;
    if (!totalPhotos) return;
    setLightboxPhotoIndex((current) => (current + 1) % totalPhotos);
  }, [lightboxCollection?.photos?.length]);
  const selectLightboxPhoto = useCallback((index) => {
    setLightboxPhotoIndex(index);
  }, []);

  const showCollectionsSection = canManageCollections || collectionDirectory.length > 0;
  const showStoriesSection = canManageStories;
  const showHonoreesSection = canManageHonorees;
  const shouldShowAdminStats =
    !isGalleryOnlyView && (canManageCollections || canManageStories || canManageHonorees || canPublish);

  const renderAccessMessage = () => (
    <EmptyState
      icon={FolderOpen}
      title={tx('archivePage.accessDeniedTitle', 'Archive access is not available')}
      description={tx(
        'archivePage.accessDeniedDescription',
        'You do not have permission to view archive content.'
      )}
    />
  );

  const renderGalleryView = () => {
    if (!collectionDirectory.length) {
      return (
        <EmptyState
          icon={FolderOpen}
          title={ta('collections.empty.title')}
          description={ta('collections.empty.description')}
        />
      );
    }

    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {collectionDirectory.map((collection) => (
            <ViewerCollectionCard
              key={collection.id}
              collection={collection}
              onOpen={openCollectionBrowser}
              active={activeCollection?.id === collection.id}
            />
          ))}
        </div>

        {activeCollection ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-heading">{activeCollection.title}</h2>
              {activeCollection.photos.length ? (
                <Badge variant="default">
                  {t('archivePage.list.photosCount', { count: activeCollection.photos.length })}
                </Badge>
              ) : null}
            </div>
            <CollectionPhotoGallery
              collection={activeCollection}
              onOpenImage={(photoIndex) => openImageLightbox(activeCollection, photoIndex)}
            />
          </section>
        ) : null}
      </div>
    );
  };

  const selectCollectionForEdit = (collection) => {
    if (collection.status === 'published' && !canPublish) {
      toast.error(ta('messages.collectionEditDenied'));
      return;
    }

    openCollectionBrowser(collection);
    setCollectionForm({
      id: collection.id,
      title: collection.title || '',
      slug: collection.slug || '',
      description: collection.description || '',
      narrative: collection.narrative || '',
      status: collection.status || 'draft',
      photos: collection.photos || [],
    });
  };

  const selectStoryForEdit = (story) => {
    if (story.status === 'published' && !canPublish) {
      toast.error(ta('messages.storyEditDenied'));
      return;
    }

    setStoryForm({
      id: story.id,
      title: story.title || '',
      slug: story.slug || '',
      summary: story.summary || '',
      narrative: story.narrative || '',
      collectionId: story.collectionId || '',
      eventDate: story.eventDate || '',
      status: story.status || 'draft',
      photos: story.photos || [],
    });
  };

  const selectHonoreeForEdit = (honoree) => {
    if (honoree.status === 'published' && !canPublish) {
      toast.error(ta('messages.honoreeEditDenied'));
      return;
    }

    setHonoreeForm({
      id: honoree.id,
      fullName: honoree.fullName || '',
      honorTitle: honoree.honorTitle || '',
      summary: honoree.summary || '',
      narrative: honoree.narrative || '',
      collectionId: honoree.collectionId || '',
      honorDate: honoree.honorDate || '',
      status: honoree.status || 'draft',
      photos: honoree.photos || [],
    });
  };

  const confirmDeleteCollection = (collection) => {
    if (collection.status === 'published' && !canPublish) {
      toast.error(ta('messages.collectionDeleteDenied'));
      return;
    }
    if (window.confirm(ta('confirmations.deleteCollection', { title: collection.title }))) {
      deleteCollectionMutation.mutate(collection.id);
    }
  };

  const confirmDeleteStory = (story) => {
    if (story.status === 'published' && !canPublish) {
      toast.error(ta('messages.storyDeleteDenied'));
      return;
    }
    if (window.confirm(ta('confirmations.deleteStory', { title: story.title }))) {
      deleteStoryMutation.mutate(story.id);
    }
  };

  const confirmDeleteHonoree = (honoree) => {
    if (honoree.status === 'published' && !canPublish) {
      toast.error(ta('messages.honoreeDeleteDenied'));
      return;
    }
    if (window.confirm(ta('confirmations.deleteHonoree', { name: honoree.fullName }))) {
      deleteHonoreeMutation.mutate(honoree.id);
    }
  };

  const handleCollectionSubmit = () => {
    saveCollectionMutation.mutate({
      id: collectionForm.id,
      title: collectionForm.title,
      slug: collectionForm.slug,
      description: collectionForm.description,
      narrative: collectionForm.narrative,
      status: collectionForm.status,
      photos: collectionForm.photos,
    });
  };

  const handleStorySubmit = () => {
    saveStoryMutation.mutate({
      id: storyForm.id,
      title: storyForm.title,
      slug: storyForm.slug,
      summary: storyForm.summary,
      narrative: storyForm.narrative,
      collectionId: storyForm.collectionId || null,
      eventDate: storyForm.eventDate || null,
      status: storyForm.status,
      photos: storyForm.photos,
    });
  };

  const handleHonoreeSubmit = () => {
    saveHonoreeMutation.mutate({
      id: honoreeForm.id,
      fullName: honoreeForm.fullName,
      honorTitle: honoreeForm.honorTitle,
      summary: honoreeForm.summary,
      narrative: honoreeForm.narrative,
      collectionId: honoreeForm.collectionId || null,
      honorDate: honoreeForm.honorDate || null,
      status: honoreeForm.status,
      photos: honoreeForm.photos,
    });
  };

  if (!canAccessArchiveWorkspace) {
    return (
      <div className="animate-fade-in space-y-6 pb-10">
        <Breadcrumbs
          items={[
            { label: tx('shared.dashboard', 'Dashboard'), href: '/dashboard' },
            { label: ta('title') },
          ]}
        />
        <PageHeader title={ta('title')} />
        {renderAccessMessage()}
      </div>
    );
  }

  if (archiveQuery.isLoading) {
    return (
      <div className="animate-fade-in space-y-6 pb-10">
        <Breadcrumbs
          items={[
            { label: tx('shared.dashboard', 'Dashboard'), href: '/dashboard' },
            { label: ta('title') },
          ]}
        />
        <PageHeader
          title={ta('title')}
          subtitle={ta('loadingSubtitle')}
        />
      </div>
    );
  }

  if (archiveQuery.isError) {
    return (
      <div className="animate-fade-in space-y-6 pb-10">
        <Breadcrumbs
          items={[
            { label: tx('shared.dashboard', 'Dashboard'), href: '/dashboard' },
            { label: ta('title') },
          ]}
        />
        <PageHeader
          title={ta('title')}
          subtitle={ta('loadErrorSubtitle')}
        />
        <Card>
          <p className="text-sm text-danger">{normalizeApiError(archiveQuery.error).message}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: tx('shared.dashboard', 'Dashboard'), href: '/dashboard' },
          { label: ta('title') },
        ]}
      />

      <PageHeader
        className={isGalleryOnlyView ? '' : 'border-b border-border pb-6'}
        eyebrow={isGalleryOnlyView ? '' : ta('eyebrow')}
        title={ta('title')}
        subtitle={isGalleryOnlyView ? '' : ta('subtitle')}
        actions={(
          !isGalleryOnlyView ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => archiveQuery.refetch()}>
                {ta('actions.refresh')}
              </Button>
            </div>
          ) : null
        )}
      />

      {isGalleryOnlyView ? (
        renderGalleryView()
      ) : (
        <>
          {shouldShowAdminStats ? (
            <div className="grid gap-4 md:grid-cols-3">
              {archiveStatCards.map(({ label, value, published, icon: Icon }) => (
                <Card
                  key={label}
                  className="overflow-hidden border-border/70 bg-gradient-to-br from-surface to-surface-alt/80"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted">{label}</p>
                      <p className="mt-3 text-3xl font-bold text-heading">{value}</p>
                      <p className="mt-2 text-xs text-muted">
                        {ta('stats.published', { count: published })}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : null}

          {showCollectionsSection ? (
            <Card>
              <CardHeader
                title={ta('collections.title')}
                action={collectionDirectory.length ? (
                  <Badge variant="primary">
                    {archiveData.counts.collections} {ta('stats.collections')}
                  </Badge>
                ) : null}
              />
              <div
                className={`grid gap-6 ${
                  canManageCollections && collectionDirectory.length
                    ? 'xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]'
                    : ''
                }`}
              >
                <div className="space-y-4">
                  {!collectionDirectory.length ? (
                    canManageCollections ? (
                      <EmptyState
                        icon={FolderOpen}
                        title={ta('collections.empty.title')}
                        description={ta('collections.empty.description')}
                      />
                    ) : null
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {collectionDirectory.map((collection) => (
                        <CollectionDirectoryCard
                          key={collection.id}
                          collection={collection}
                          storyCount={collection.storyCount}
                          honoreeCount={collection.honoreeCount}
                          onOpen={openCollectionBrowser}
                          active={activeCollection?.id === collection.id}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {collectionDirectory.length || canManageCollections ? (
                  <div className="space-y-6">
                    {collectionDirectory.length ? (
                      <CollectionBrowserPanel
                        collection={activeCollection}
                        onOpenImage={(photoIndex) => openImageLightbox(activeCollection, photoIndex)}
                        storyCount={activeCollectionStoryCount}
                        honoreeCount={activeCollectionHonoreeCount}
                        relatedStories={activeCollectionStories}
                        relatedHonorees={activeCollectionHonorees}
                        formatArchiveDate={formatArchiveDate}
                        canEdit={canManageCollections && (canPublish || activeCollection?.status !== 'published')}
                        canDelete={canManageCollections && (canPublish || activeCollection?.status !== 'published')}
                        onEdit={activeCollection ? () => selectCollectionForEdit(activeCollection) : undefined}
                        onDelete={activeCollection ? () => confirmDeleteCollection(activeCollection) : undefined}
                      />
                    ) : null}

                    {canManageCollections ? (
                      <div className="space-y-4 rounded-[28px] border border-border bg-page/50 p-5 xl:sticky xl:top-24">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-heading">
                            {collectionForm.id ? ta('collections.form.editTitle') : ta('collections.form.newTitle')}
                          </p>
                          {collectionForm.id ? (
                            <Button type="button" variant="ghost" size="sm" onClick={resetCollectionForm}>
                              {t('common.actions.cancel')}
                            </Button>
                          ) : null}
                        </div>
                        <Input
                          label={ta('collections.form.title')}
                          value={collectionForm.title}
                          onChange={(event) =>
                            setCollectionForm((current) => ({ ...current, title: event.target.value }))
                          }
                          containerClassName="!mb-0"
                        />
                        <Input
                          label={ta('collections.form.slug')}
                          value={collectionForm.slug}
                          onChange={(event) =>
                            setCollectionForm((current) => ({ ...current, slug: event.target.value }))
                          }
                          hint={ta('collections.form.slugHint')}
                          containerClassName="!mb-0"
                        />
                        <TextArea
                          label={ta('collections.form.description')}
                          value={collectionForm.description}
                          onChange={(event) =>
                            setCollectionForm((current) => ({ ...current, description: event.target.value }))
                          }
                          rows={3}
                          containerClassName="!mb-0"
                        />
                        <TextArea
                          label={ta('collections.form.narrative')}
                          value={collectionForm.narrative}
                          onChange={(event) =>
                            setCollectionForm((current) => ({ ...current, narrative: event.target.value }))
                          }
                          rows={6}
                          containerClassName="!mb-0"
                        />
                        <Select
                          label={ta('collections.form.status')}
                          value={collectionForm.status}
                          options={statusOptions}
                          onChange={(event) =>
                            setCollectionForm((current) => ({ ...current, status: event.target.value }))
                          }
                        />
                        <PhotoGalleryEditor
                          label={ta('collections.form.photos')}
                          photos={collectionForm.photos}
                          onChange={(photos) => setCollectionForm((current) => ({ ...current, photos }))}
                          onUpload={uploadArchivePhoto}
                          uploading={uploadImageMutation.isPending}
                          canUpload={canUpload}
                          readOnly={false}
                        />
                        <Button
                          type="button"
                          icon={Save}
                          loading={saveCollectionMutation.isPending}
                          onClick={handleCollectionSubmit}
                        >
                          {collectionForm.id ? ta('actions.updateCollection') : ta('actions.createCollection')}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          {!showCollectionsSection && !showStoriesSection && !showHonoreesSection ? renderAccessMessage() : null}
        </>
      )}

      <ImageLightbox
        collection={lightboxCollection}
        photoIndex={normalizedLightboxPhotoIndex}
        onClose={closeImageLightbox}
        onPrev={goToPreviousLightboxPhoto}
        onNext={goToNextLightboxPhoto}
        onSelectPhoto={selectLightboxPhoto}
      />
    </div>
  );
}
