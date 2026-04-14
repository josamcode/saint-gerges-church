import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Clock3, FileText, Home, UserCircle, Users } from 'lucide-react';
import { usersApi, visitationsApi } from '../../../api/endpoints';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import EmptyState from '../../../components/ui/EmptyState';
import Button from '../../../components/ui/Button';
import PageHeader from '../../../components/ui/PageHeader';
import { formatDateTime } from '../../../utils/formatters';
import { useI18n } from '../../../i18n/i18n';
import useNavigateToUser from '../../../hooks/useNavigateToUser';

const EMPTY = '---';

/* ── primitives ──────────────────────────────────────────────────────────── */

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

/** Thin field: overline label + value */
function Field({ label, value, icon: Icon }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted" />}
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</p>
      </div>
      <p className="mt-1 text-sm font-medium text-heading">{value || EMPTY}</p>
    </div>
  );
}

/** Clickable member card */
function MemberCard({ member, navigateToUser }) {
  const userId = member._id || member.id;
  const name = member.fullName || EMPTY;
  const initial = String(name).trim().charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => userId && navigateToUser(userId)}
      disabled={!userId}
      className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-start transition-all duration-150 hover:border-primary/30 hover:shadow-sm disabled:pointer-events-none disabled:opacity-60"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        {initial}
      </div>
      <p className="truncate text-sm font-semibold text-heading transition-colors group-hover:text-primary">
        {name}
      </p>
    </button>
  );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default function PastoralVisitationDetailsPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const navigateToUser = useNavigateToUser();

  /* ── queries ── */
  const { data: visitation, isLoading } = useQuery({
    queryKey: ['visitations', 'details', id],
    queryFn: async () => {
      const { data } = await visitationsApi.getById(id);
      return data?.data || null;
    },
    staleTime: 60000,
  });

  const { data: houseMembersRes, isLoading: houseMembersLoading } = useQuery({
    queryKey: ['visitations', 'house-members', visitation?.houseName],
    queryFn: async () => {
      const { data } = await usersApi.list({ houseName: visitation.houseName, limit: 100, sort: 'fullName', order: 'asc' });
      return data?.data || [];
    },
    enabled: !!visitation?.houseName,
    staleTime: 30000,
  });

  const houseMembers = useMemo(() => {
    const members = Array.isArray(houseMembersRes) ? houseMembersRes : [];
    const normalizedHouse = String(visitation?.houseName || '').trim().toLowerCase();
    return members.filter((m) => String(m.houseName || '').trim().toLowerCase() === normalizedHouse);
  }, [houseMembersRes, visitation?.houseName]);

  const breadcrumbItems = useMemo(() => [
    { label: t('shared.dashboard'), href: '/dashboard' },
    { label: t('visitations.list.page'), href: '/dashboard/visitations' },
    { label: visitation?.houseName || t('visitations.details.page') },
  ], [t, visitation?.houseName]);

  /* ── states ── */
  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-6">
        <Breadcrumbs items={breadcrumbItems} />
        <p className="text-sm text-muted">{t('visitations.details.loading')}</p>
      </div>
    );
  }

  if (!visitation) {
    return (
      <div className="animate-fade-in space-y-6">
        <Breadcrumbs items={breadcrumbItems} />
        <EmptyState
          icon={Home}
          title={t('visitations.details.notFoundTitle')}
          description={t('visitations.details.notFoundDescription')}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs items={breadcrumbItems} />

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Home className="h-6 w-6 text-primary" />
          </div>
          <PageHeader
            contentOnly
            eyebrow={t('visitations.list.page')}
            title={visitation.houseName || EMPTY}
            titleClassName="mt-1 text-3xl font-bold tracking-tight text-heading"
            childrenClassName="mt-2 flex flex-wrap items-center gap-2"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
              <CalendarClock className="h-3 w-3" />
              {formatDateTime(visitation.visitedAt)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-medium text-muted">
              <Clock3 className="h-3 w-3" />
              {visitation.durationMinutes || 10} {t('visitations.shared.minutes')}
            </span>
          </PageHeader>
        </div>
      </div>

      {/* ══ METADATA ════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-border bg-surface px-6 py-5">
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
          <Field
            label={t('visitations.details.visitedAt')}
            value={formatDateTime(visitation.visitedAt)}
            icon={CalendarClock}
          />
          <Field
            label={t('visitations.details.durationMinutes')}
            value={`${visitation.durationMinutes || 10} ${t('visitations.shared.minutes')}`}
            icon={Clock3}
          />
          <Field
            label={t('visitations.details.recordedAt')}
            value={formatDateTime(visitation.recordedAt || visitation.createdAt)}
            icon={CalendarClock}
          />
          <Field
            label={t('visitations.details.houseName')}
            value={visitation.houseName}
            icon={Home}
          />
        </div>

        {/* recorder — spans full width, has a navigate button */}
        <div className="mt-5 border-t border-border/60 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5">
                <UserCircle className="h-3 w-3 text-muted" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                  {t('visitations.details.recordedBy')}
                </p>
              </div>
              <p className="mt-1 font-semibold text-heading">
                {visitation.recordedBy?.fullName || EMPTY}
              </p>
            </div>
            {visitation.recordedBy?.id && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={UserCircle}
                onClick={() => navigateToUser(visitation.recordedBy.id)}
              >
                {t('visitations.details.viewRecorder')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* notes */}
      {visitation.notes && (
        <div className="rounded-2xl border border-border bg-surface px-5 py-4">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3 w-3 text-muted" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              {t('visitations.details.notes')}
            </p>
          </div>
          <p className="mt-2 text-sm text-heading">{visitation.notes}</p>
        </div>
      )}

      {/* ══ HOUSE MEMBERS ═══════════════════════════════════════════════ */}
      <section className="space-y-4">
        <SectionLabel count={houseMembers.length}>
          {t('visitations.details.houseMembersTitle')}
        </SectionLabel>

        {houseMembersLoading ? (
          <p className="text-sm text-muted">{t('visitations.details.houseMembersLoading')}</p>
        ) : houseMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('visitations.details.houseMembersEmpty')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {houseMembers.map((member) => (
              <MemberCard
                key={member._id || member.id}
                member={member}
                navigateToUser={navigateToUser}
              />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
