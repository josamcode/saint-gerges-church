import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Home, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { usersApi, visitationsApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import PageHeader from '../../../components/ui/PageHeader';
import TextArea from '../../../components/ui/TextArea';
import { useI18n } from '../../../i18n/i18n';

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

/* ── primitives ──────────────────────────────────────────────────────────── */

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

function StepBadge({ n }) {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
      {n}
    </div>
  );
}

/* ── house name combobox ─────────────────────────────────────────────────── */

function HouseNameCombobox({ value, onChange, options, error, label, placeholder }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const filtered = options
    .filter((name) => !value || name.toLowerCase().includes(value.toLowerCase().trim()))
    .slice(0, 20);

  return (
    <div className="relative">
      {/* label */}
      <label className="mb-1.5 block text-sm font-medium text-base">
        {label}
        <span className="text-danger ms-1">*</span>
      </label>

      {/* input */}
      <div className={`relative flex items-center overflow-hidden rounded-xl border bg-surface transition-colors
        ${error
          ? 'border-danger focus-within:ring-2 focus-within:ring-danger/15'
          : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10'
        }`}
      >
        <Home className="ms-3 h-4 w-4 shrink-0 text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none"
        />
      </div>

      {/* error */}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-danger">
          <span className="inline-block h-1 w-1 rounded-full bg-danger" />
          {error}
        </p>
      )}

      {/* dropdown */}
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          {filtered.map((name) => (
            <li
              key={name}
              role="option"
              aria-selected={value === name}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(name);
                setOpen(false);
              }}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors
                ${value === name
                  ? 'bg-primary/8 font-semibold text-primary'
                  : 'text-heading hover:bg-primary/8 hover:text-primary'
                }`}
            >
              <Home className="h-3.5 w-3.5 shrink-0 text-muted" />
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default function PastoralVisitationCreatePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    houseName: '',
    durationMinutes: '10',
    visitedAt: toDateTimeInputValue(),
    notes: '',
  });
  const [errors, setErrors] = useState({});

  /* ── house names query ── */
  const { data: houseNamesRes } = useQuery({
    queryKey: ['users', 'house-names'],
    queryFn: async () => {
      const res = await usersApi.getHouseNames();
      const data = res.data?.data ?? res.data;
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60000,
  });
  const houseNames = Array.isArray(houseNamesRes) ? houseNamesRes : [];

  /* ── mutation ── */
  const createMutation = useMutation({
    mutationFn: (payload) => visitationsApi.create(payload),
    onSuccess: (res) => {
      const created = res?.data?.data;
      toast.success(t('visitations.create.successCreated'));
      queryClient.invalidateQueries({ queryKey: ['visitations', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['visitations', 'analytics'] });
      navigate(created?.id ? `/dashboard/visitations/${created.id}` : '/dashboard/visitations');
    },
    onError: (err) => toast.error(normalizeApiError(err).message),
  });

  /* ── helpers ── */
  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const e = {};
    if (!form.houseName.trim())
      e.houseName = t('visitations.create.errors.houseNameRequired');
    if (!form.visitedAt)
      e.visitedAt = t('visitations.create.errors.visitedAtRequired');
    const dur = parseInt(form.durationMinutes, 10);
    if (!Number.isFinite(dur) || dur < 1)
      e.durationMinutes = t('visitations.create.errors.durationInvalid');
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    createMutation.mutate({
      houseName: form.houseName.trim(),
      durationMinutes: parseInt(form.durationMinutes, 10),
      visitedAt: toIsoDateTime(form.visitedAt),
      ...(form.notes.trim() && { notes: form.notes.trim() }),
    });
  };

  /* ── render ── */
  return (
    <div className="animate-fade-in space-y-8 pb-10">

      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('visitations.list.page'), href: '/dashboard/visitations' },
          { label: t('visitations.create.page') },
        ]}
      />

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <PageHeader
        className="border-b border-border pb-6"
        eyebrow={t('visitations.list.page')}
        title={t('visitations.create.title')}
        subtitle={t('visitations.create.subtitle')}
      />

      {/* ══ FORM ════════════════════════════════════════════════════════ */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="mx-auto max-w-7xl space-y-8">

          {/* ── STEP 1 · House ────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <StepBadge n={1} />
              <SectionLabel>{t('visitations.create.houseName')}</SectionLabel>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5">
              <HouseNameCombobox
                label={t('visitations.create.houseName')}
                value={form.houseName}
                onChange={(val) => updateField('houseName', val)}
                options={houseNames}
                error={errors.houseName}
                placeholder={t('visitations.create.houseNamePlaceholder')}
              />
            </div>
          </section>

          {/* ── STEP 2 · Schedule ─────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <StepBadge n={2} />
              <SectionLabel>{t('visitations.create.visitedAt')}</SectionLabel>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label={t('visitations.create.visitedAt')}
                  required
                  type="datetime-local"
                  dir="ltr"
                  className="text-left"
                  value={form.visitedAt}
                  onChange={(e) => updateField('visitedAt', e.target.value)}
                  error={errors.visitedAt}
                  containerClassName="!mb-0"
                />
                <Input
                  label={t('visitations.create.durationMinutes')}
                  type="number"
                  min="1"
                  required
                  value={form.durationMinutes}
                  onChange={(e) => updateField('durationMinutes', e.target.value)}
                  error={errors.durationMinutes}
                  containerClassName="!mb-0"
                />
              </div>
            </div>
          </section>

          {/* ── STEP 3 · Notes ────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <StepBadge n={3} />
              <SectionLabel>{t('visitations.create.notes')}</SectionLabel>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5">
              <TextArea
                label={t('visitations.create.notes')}
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder={t('visitations.create.notesPlaceholder')}
                containerClassName="!mb-0"
              />
            </div>
          </section>

          {/* ── ACTIONS ───────────────────────────────────────────────── */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/dashboard/visitations')}
            >
              {t('common.actions.cancel')}
            </Button>
            <Button
              type="submit"
              icon={Save}
              loading={createMutation.isPending}
            >
              {t('visitations.create.createAction')}
            </Button>
          </div>

        </div>
      </form>
    </div>
  );
}
