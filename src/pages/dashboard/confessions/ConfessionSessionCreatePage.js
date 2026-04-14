import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Check, ChevronDown, ListChecks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { confessionsApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import Input from '../../../components/ui/Input';
import TextArea from '../../../components/ui/TextArea';
import Button from '../../../components/ui/Button';
import UserSearchSelect from '../../../components/UserSearchSelect';
import PageHeader from '../../../components/ui/PageHeader';
import toast from 'react-hot-toast';
import { useI18n } from '../../../i18n/i18n';
import { localizeSessionTypeName } from '../../../utils/sessionTypeLocalization';

/* ── helpers ─────────────────────────────────────────────────────────────── */

function toDateTimeInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/* ── sub-components ──────────────────────────────────────────────────────── */

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
        {children}
      </span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

/** Thin step number badge */
function StepBadge({ n }) {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
      {n}
    </div>
  );
}

function SessionTypeCombobox({
  label,
  value,
  onChange,
  options,
  error,
  placeholder,
  required,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef(null);
  const listboxId = useId();

  const filteredOptions = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q
      ? options.filter((opt) => opt.label.toLowerCase().includes(q))
      : options;
    return list.slice(0, 20);
  }, [options, value]);

  const pick = (optionLabel) => {
    onChange(optionLabel);
    setOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!open && ['ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
      setFocusedIndex(filteredOptions.length > 0 ? 0 : -1);
      return;
    }

    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (e.key === 'Enter') {
      if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
        e.preventDefault();
        pick(filteredOptions[focusedIndex].label);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setFocusedIndex(-1);
    }
  };

  return (
    <div className="relative">
      <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="text-danger">·</span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>

      <div
        className={[
          'flex items-center rounded-sm border bg-surface py-2.5 ps-3 pe-2 transition-all',
          error
            ? 'border-danger focus-within:border-danger focus-within:ring-2 focus-within:ring-danger/15'
            : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15',
          disabled ? 'opacity-50' : '',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-invalid={!!error}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setFocusedIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => { setOpen(false); setFocusedIndex(-1); }, 120)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-heading placeholder:text-muted focus:outline-none"
        />
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </div>

      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger">
          <span aria-hidden="true" className="inline-block h-1 w-1 rounded-full bg-danger" />
          {error}
        </p>
      )}

      {open && filteredOptions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-56 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {filteredOptions.map((option, index) => {
            const isSelected = value.trim().toLowerCase() === option.label.trim().toLowerCase();
            const isFocused = index === focusedIndex;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(option.label);
                }}
                onMouseEnter={() => setFocusedIndex(index)}
                className={[
                  'flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-sm transition-colors',
                  isSelected || isFocused
                    ? 'bg-primary/8 text-primary'
                    : 'text-heading hover:bg-surface-alt',
                ].join(' ')}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ── page ─────────────────────────────────────────────────────────────────── */

export default function ConfessionSessionCreatePage() {
  const { user, hasPermission } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canAssign = hasPermission('CONFESSIONS_ASSIGN_USER');
  const canManageTypes = hasPermission('CONFESSIONS_SESSION_TYPES_MANAGE');
  const canViewSessions = hasPermission('CONFESSIONS_VIEW');

  const [selectedAttendee, setSelectedAttendee] = useState(null);
  const [form, setForm] = useState({
    sessionTypeId: '',
    scheduledAt: toDateTimeInputValue(),
    nextSessionAt: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [sessionTypeInput, setSessionTypeInput] = useState('');

  /* ── queries ── */
  const { data: sessionTypesRes, isLoading: sessionTypesLoading } = useQuery({
    queryKey: ['confessions', 'session-types'],
    queryFn: async () => {
      const { data } = await confessionsApi.getSessionTypes();
      return data?.data || [];
    },
    staleTime: 60000,
  });

  const sessionTypes = useMemo(
    () => (Array.isArray(sessionTypesRes) ? sessionTypesRes : []),
    [sessionTypesRes]
  );
  const sessionTypeOptions = useMemo(
    () => sessionTypes.map((type) => ({ value: type.id, label: localizeSessionTypeName(type.name, t) })),
    [sessionTypes, t]
  );
  const sessionTypeLookup = useMemo(() => {
    const normalize = (value = '') => value.trim().toLowerCase();
    const lookup = new Map();

    sessionTypes.forEach((type) => {
      const canonical = normalize(type.name);
      const localized = normalize(localizeSessionTypeName(type.name, t));
      if (canonical) lookup.set(canonical, type);
      if (localized) lookup.set(localized, type);
    });

    return lookup;
  }, [sessionTypes, t]);
  const findSessionTypeByInput = (value = '') => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    return sessionTypeLookup.get(normalized) || null;
  };

  /* ── effects ── */
  useEffect(() => {
    if (!canAssign && user && !selectedAttendee) {
      setSelectedAttendee({ _id: user._id || user.id, fullName: user.fullName, phonePrimary: user.phonePrimary });
    }
  }, [canAssign, user, selectedAttendee]);

  /* ── mutations ── */
  const createSessionMutation = useMutation({
    mutationFn: (payload) => confessionsApi.createSession(payload),
    onSuccess: () => {
      const attendeeId =
        selectedAttendee?._id || selectedAttendee?.id || user?._id || user?.id || null;
      toast.success(t('confessions.sessions.successCreated'));
      setForm((prev) => ({ ...prev, scheduledAt: toDateTimeInputValue(), nextSessionAt: '', notes: '' }));
      if (canAssign) setSelectedAttendee(null);
      queryClient.invalidateQueries({ queryKey: ['confessions', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['confessions', 'alerts'] });
      queryClient.invalidateQueries({ queryKey: ['confessions', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (attendeeId) {
        queryClient.invalidateQueries({ queryKey: ['users', attendeeId] });
      }
    },
    onError: (err) => toast.error(normalizeApiError(err).message),
  });

  const createTypeMutation = useMutation({
    mutationFn: (name) => confessionsApi.createSessionType(name),
  });

  /* ── handlers ── */
  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSessionTypeChange = (value) => {
    setSessionTypeInput(value);
    const matched = findSessionTypeByInput(value);
    updateField('sessionTypeId', matched?.id || '');
  };

  const validateForm = () => {
    const e = {};
    const typedType = sessionTypeInput.trim();
    const matchedType = findSessionTypeByInput(typedType);
    if (!typedType) e.sessionTypeId = t('confessions.sessions.errors.typeRequired');
    if (typedType && !matchedType && !canManageTypes)
      e.sessionTypeId = t('confessions.sessions.errors.typeRequired');
    if (!form.scheduledAt) e.scheduledAt = t('confessions.sessions.errors.scheduledRequired');
    if (canAssign && !(selectedAttendee?._id || selectedAttendee?.id))
      e.attendee = t('confessions.sessions.attendeeRequired');
    if (form.nextSessionAt && form.scheduledAt) {
      if (new Date(form.nextSessionAt) <= new Date(form.scheduledAt))
        e.nextSessionAt = t('confessions.sessions.errors.nextAfterCurrent');
    }
    return e;
  };

  const resolveSessionTypeIdForSubmit = async () => {
    const typedType = sessionTypeInput.trim();
    if (!typedType) return null;

    const matchedType = findSessionTypeByInput(typedType);
    if (matchedType) {
      setSessionTypeInput(localizeSessionTypeName(matchedType.name, t));
      if (form.sessionTypeId !== matchedType.id) {
        setForm((prev) => ({ ...prev, sessionTypeId: matchedType.id }));
      }
      return matchedType.id;
    }

    if (!canManageTypes) return null;

    const createdResponse = await createTypeMutation.mutateAsync(typedType);
    const createdType = createdResponse?.data?.data;
    if (!createdType?.id) return null;

    setForm((prev) => ({ ...prev, sessionTypeId: createdType.id }));
    setSessionTypeInput(localizeSessionTypeName(createdType.name || typedType, t));
    queryClient.invalidateQueries({ queryKey: ['confessions', 'session-types'] });

    return createdType.id;
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    let resolvedSessionTypeId;
    try {
      resolvedSessionTypeId = await resolveSessionTypeIdForSubmit();
    } catch (err) {
      toast.error(normalizeApiError(err).message);
      return;
    }
    if (!resolvedSessionTypeId) {
      setErrors((prev) => ({
        ...prev,
        sessionTypeId: t('confessions.sessions.errors.typeRequired'),
      }));
      return;
    }

    const payload = {
      sessionTypeId: resolvedSessionTypeId,
      scheduledAt: toIsoDateTime(form.scheduledAt),
      ...(form.nextSessionAt && { nextSessionAt: toIsoDateTime(form.nextSessionAt) }),
      ...(form.notes?.trim() && { notes: form.notes.trim() }),
    };
    if (canAssign && (selectedAttendee?._id || selectedAttendee?.id))
      payload.attendeeUserId = selectedAttendee._id || selectedAttendee.id;

    createSessionMutation.mutate(payload);
  };

  /* ── render ── */
  return (
    <div className="animate-fade-in space-y-8 pb-10">

      {/* breadcrumbs */}
      {/* <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('confessions.sessions.page'), ...(canViewSessions && { href: '/dashboard/confessions' }) },
          { label: t('confessions.sessions.createTitle') },
        ]}
      /> */}

      {/* ══ PAGE HEADER ═════════════════════════════════════════════════ */}
      <PageHeader
        className="border-b border-border pb-6"
        title={t('confessions.sessions.createTitle')}
        subtitle={t('confessions.sessions.createSubtitle')}
        actions={
          canViewSessions ? (
            <Button variant="ghost" icon={ListChecks} onClick={() => navigate('/dashboard/confessions')}>
              {t('confessions.sessions.recentTitle')}
            </Button>
          ) : null
        }
      />

      {/* ══ FORM — max width, centred on large screens ═══════════════════ */}
      <form onSubmit={handleCreateSession} noValidate>
        <div className="mx-auto max-w-7xl space-y-8">

          {/* ── STEP 1 · Attendee ─────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <StepBadge n={1} />
              <SectionLabel>{t('confessions.sessions.attendee')}</SectionLabel>
            </div>

            {canAssign ? (
              <div className="rounded-2xl border border-border bg-surface p-5">
                <UserSearchSelect
                  label={t('confessions.sessions.attendee')}
                  value={selectedAttendee}
                  onChange={setSelectedAttendee}
                  searchApi={confessionsApi.searchUsers}
                  queryKeyPrefix="confessions-users"
                  className="mb-0"
                // autoFoucs
                />
                {errors.attendee && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger">
                    <span className="inline-block h-1 w-1 rounded-full bg-danger" />
                    {errors.attendee}
                  </p>
                )}
              </div>
            ) : (
              /* self-attendee read-only card */
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {String(user?.fullName || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                    {t('confessions.sessions.attendeeFallback')}
                  </p>
                  <p className="mt-0.5 font-semibold text-heading">{user?.fullName}</p>
                  {user?.phonePrimary && (
                    <p className="text-xs text-muted direction-ltr">{user.phonePrimary}</p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── STEP 2 · Session details ──────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <StepBadge n={2} />
              <SectionLabel>{t('confessions.sessions.sessionType')}</SectionLabel>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5">
              <SessionTypeCombobox
                label={t('confessions.sessions.sessionType')}
                required
                value={sessionTypeInput}
                onChange={handleSessionTypeChange}
                options={sessionTypeOptions}
                disabled={createSessionMutation.isPending || createTypeMutation.isPending}
                error={errors.sessionTypeId}
                placeholder={
                  sessionTypesLoading
                    ? t('confessions.sessions.loadingTypes')
                    : canManageTypes
                      ? `${t('confessions.sessions.selectType')} / ${t('confessions.sessions.typeNamePlaceholder')}`
                      : t('confessions.sessions.selectType')
                }
              />
            </div>
          </section>

          {/* ── STEP 3 · Schedule ─────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <StepBadge n={3} />
              <SectionLabel>{t('confessions.sessions.sessionDate')}</SectionLabel>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
              <Input
                label={t('confessions.sessions.sessionDate')}
                type="datetime-local"
                required
                dir="ltr"
                className="text-left"
                value={form.scheduledAt}
                onChange={(e) => updateField('scheduledAt', e.target.value)}
                error={errors.scheduledAt}
                containerClassName="!mb-0"
              />
              <Input
                label={t('confessions.sessions.nextSessionDate')}
                type="datetime-local"
                dir="ltr"
                className="text-left"
                value={form.nextSessionAt}
                onChange={(e) => updateField('nextSessionAt', e.target.value)}
                error={errors.nextSessionAt}
                containerClassName="!mb-0"
              />
            </div>
          </section>

          {/* ── STEP 4 · Notes ────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <StepBadge n={4} />
              <SectionLabel>{t('confessions.sessions.notes')}</SectionLabel>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5">
              <TextArea
                label={t('confessions.sessions.notes')}
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder={t('confessions.sessions.notesPlaceholder')}
                containerClassName="!mb-0"
              />
            </div>
          </section>

          {/* ── SUBMIT ────────────────────────────────────────────────── */}
          <Button
            type="submit"
            icon={CalendarPlus}
            loading={createSessionMutation.isPending || createTypeMutation.isPending}
            className="w-full"
          >
            {t('confessions.sessions.createAction')}
          </Button>

        </div>
      </form>
    </div>
  );
}
