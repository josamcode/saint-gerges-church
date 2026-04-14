import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Star, UserCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { divineLiturgiesApi, usersApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import MultiSelectChips from '../../../components/ui/MultiSelectChips';
import PageHeader from '../../../components/ui/PageHeader';
import { useI18n } from '../../../i18n/i18n';

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{children}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

function PriestCard({ entry, t }) {
  const user = entry?.user || {};
  const avatarUrl = user?.avatar?.url || '';
  const displayName = user?.fullName || user?.phonePrimary || t('common.placeholder.empty');

  return (
    <div className="group relative h-full">
      <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-primary/15 via-transparent to-secondary/15 opacity-0 blur-sm transition-opacity duration-700 group-hover:opacity-100" />

      <div className="relative h-full overflow-hidden rounded-[1.75rem] bg-surface border border-primary/8 transition-all duration-700 group-hover:border-primary/20 group-hover:shadow-2xl group-hover:shadow-primary/8">
        <div className="relative h-56 overflow-hidden bg-gradient-to-b from-primary/8 via-primary/4 to-surface">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_top,var(--color-primary)_0%,transparent_70%)] opacity-10 transition-opacity duration-700 group-hover:opacity-20" />

          <div className="absolute inset-0 flex items-end justify-center pb-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                loading="lazy"
                className="h-full max-h-[220px] w-auto max-w-[85%] object-contain object-bottom transition-all duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="flex items-center justify-center pb-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl animate-pulse" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 border-2 border-primary/10">
                    <UserCircle2 className="h-14 w-14 text-primary/30" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-surface to-transparent" />
        </div>

        <div className="relative px-6 pb-6 pt-2">
          {/* <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 border border-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Star className="h-2.5 w-2.5 fill-current" />
              {t('divineLiturgies.fields.priests')}
            </span>
          </div> */}

          <h3 className="text-lg sm:text-xl font-extrabold text-heading leading-tight">{displayName}</h3>
          {user?.phonePrimary ? (
            <p className="mt-2 text-sm leading-relaxed text-muted direction-ltr">{user.phonePrimary}</p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted">{t('common.placeholder.empty')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChurchPriestsPage() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canManagePriests = hasPermission('DIVINE_LITURGIES_PRIESTS_MANAGE');
  const [selectedPriestIds, setSelectedPriestIds] = useState([]);
  const [priestsDirty, setPriestsDirty] = useState(false);

  const overviewQuery = useQuery({
    queryKey: ['divine-liturgies', 'overview'],
    queryFn: async () => {
      const { data } = await divineLiturgiesApi.getOverview();
      return data?.data || null;
    },
    staleTime: 30000,
  });

  const usersQuery = useQuery({
    queryKey: ['divine-liturgies', 'users'],
    enabled: canManagePriests,
    queryFn: async () => {
      const allUsers = [];
      const seen = new Set();
      let cursor = null;

      for (let index = 0; index < 30; index += 1) {
        const { data } = await usersApi.list({
          limit: 100,
          sort: 'createdAt',
          order: 'desc',
          ...(cursor && { cursor }),
        });

        const rows = Array.isArray(data?.data) ? data.data : [];
        rows.forEach((row) => {
          const id = row?._id || row?.id;
          if (!id || seen.has(id)) return;
          seen.add(id);
          allUsers.push(row);
        });

        const nextCursor = data?.meta?.nextCursor || null;
        if (!nextCursor || rows.length < 100) break;
        cursor = nextCursor;
      }

      return allUsers.sort((a, b) =>
        String(a?.fullName || '').localeCompare(String(b?.fullName || ''))
      );
    },
    staleTime: 60000,
  });

  const priestsMutation = useMutation({
    mutationFn: (priestIds) => divineLiturgiesApi.setChurchPriests(priestIds),
    onSuccess: () => {
      toast.success(t('divineLiturgies.messages.priestsUpdated'));
      setPriestsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['divine-liturgies', 'overview'] });
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  const churchPriests = useMemo(
    () => (Array.isArray(overviewQuery.data?.churchPriests) ? overviewQuery.data.churchPriests : []),
    [overviewQuery.data]
  );

  useEffect(() => {
    if (priestsDirty) return;
    setSelectedPriestIds(
      churchPriests
        .map((entry) => entry.user?.id)
        .filter(Boolean)
    );
  }, [churchPriests, priestsDirty]);

  const userOptions = useMemo(
    () =>
      (Array.isArray(usersQuery.data) ? usersQuery.data : []).map((user) => ({
        value: user._id || user.id,
        label: user.fullName || user.phonePrimary || user._id || user.id,
      })),
    [usersQuery.data]
  );

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('divineLiturgies.page'), href: '/dashboard/divine-liturgies' },
          { label: t('dashboardLayout.menu.churchPriests') },
        ]}
      />

      <PageHeader
        className="border-b border-border pb-6"
        title={t('dashboardLayout.menu.churchPriests')}
      />

      <section className="space-y-4">
        {/* <SectionLabel>{t('divineLiturgies.sections.priests')}</SectionLabel> */}

        <div className="rounded-2xl space-y-4">
          {/* <div className="text-sm text-muted">
            {canManagePriests
              ? t('divineLiturgies.hints.priestsManage')
              : t('divineLiturgies.hints.priestsReadOnly')}
          </div> */}

          {canManagePriests && (
            <>
              <MultiSelectChips
                label={t('divineLiturgies.fields.priests')}
                options={userOptions}
                values={selectedPriestIds}
                onChange={(values) => {
                  setPriestsDirty(true);
                  setSelectedPriestIds(values);
                }}
                placeholder={t('common.search.placeholder')}
                containerClassName="!mb-0"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  icon={Save}
                  loading={priestsMutation.isPending}
                  onClick={() => priestsMutation.mutate(selectedPriestIds)}
                >
                  {t('divineLiturgies.actions.savePriests')}
                </Button>
              </div>
            </>
          )}

          {!churchPriests.length ? (
            <p className="text-sm text-muted">{t('divineLiturgies.hints.noPriests')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {churchPriests.map((entry) => (
                <PriestCard key={entry.id} entry={entry} t={t} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
