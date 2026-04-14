import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Edit2,
  HandCoins,
  RotateCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { aidsApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import { useI18n } from '../../../i18n/i18n';
import { localizeAidOccurrence } from '../../../utils/aidOccurrenceLocalization';
import Badge from '../../../components/ui/Badge';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import PageHeader from '../../../components/ui/PageHeader';

const COPY = {
  en: {
    title: 'Aid Details',
    subtitle: 'View the details of this aid group and the beneficiary households.',
    emptyTitle: 'No records found',
    emptyDesc: 'No household records were found for this aid group.',
    detailsSection: 'Group Specifications',
    beneficiariesSection: 'Beneficiary Households',
    editAction: 'Edit Aid Group',
    recurringSection: 'Recurring Aid Reminder',
    recurringSubtitle: 'This reminder is tied to a recurring aid group.',
    dueToday: 'Due today',
    pending: 'Pending',
    readyToApprove: 'Approve and record this repeat only after the households receive it.',
    keepPending: 'If they have not received it yet, leave this reminder pending and approve it later today.',
    approveAction: 'Approve And Record',
    approveSuccess: 'The repeated aid was approved and recorded successfully.',
    dueDate: 'Current due date',
    nextRepeat: 'Next repeat date',
    originalDate: 'Original aid date',
    fields: {
      date: 'Date',
      category: 'Category',
      occurrence: 'Occurrence',
      description: 'Description',
      notes: 'Notes',
    },
  },
  ar: {
    title: 'تفاصيل المساعدة',
    subtitle: 'اعرض تفاصيل مجموعة المساعدة والأسر المستفيدة منها.',
    emptyTitle: 'لا توجد سجلات',
    emptyDesc: 'لم يتم العثور على سجلات أسر لهذه المجموعة من المساعدات.',
    detailsSection: 'بيانات مجموعة المساعدة',
    beneficiariesSection: 'الأسر المستفيدة',
    editAction: 'تعديل مجموعة المساعدة',
    recurringSection: 'تذكير مساعدة متكررة',
    recurringSubtitle: 'هذا التذكير مرتبط بمجموعة مساعدة متكررة.',
    dueToday: 'مستحقة اليوم',
    pending: 'قيد الانتظار',
    readyToApprove: 'اعتمد وسجل هذا التكرار فقط بعد أن تستلم الأسر المساعدة فعليًا.',
    keepPending: 'إذا لم تستلم الأسر المساعدة بعد، اترك التذكير معلقًا واعتمده لاحقًا اليوم.',
    approveAction: 'اعتماد وتسجيل',
    approveSuccess: 'تم اعتماد وتسجيل تكرار المساعدة بنجاح.',
    dueDate: 'تاريخ الاستحقاق الحالي',
    nextRepeat: 'تاريخ التكرار التالي',
    originalDate: 'تاريخ المساعدة الأصلي',
    fields: {
      date: 'التاريخ',
      category: 'الفئة',
      occurrence: 'التكرار',
      description: 'الوصف',
      notes: 'ملاحظات',
    },
  },
};

function formatDateLabel(value, language) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function buildAidDetailsUrl(group) {
  const params = new URLSearchParams({
    date: group.date,
    category: group.category,
    occurrence: group.occurrence,
    description: group.description,
  });

  return `/dashboard/lords-brethren/aid-history/details?${params.toString()}`;
}

export default function AidDetailsPage() {
  const { language, t } = useI18n();
  const copy = COPY[language === 'ar' ? 'ar' : 'en'];
  const [searchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canEdit = hasPermission('HOUSEHOLD_CLASSIFICATIONS_MANAGE');

  const queryDate = searchParams.get('date');
  const queryCategory = searchParams.get('category');
  const queryOccurrence = searchParams.get('occurrence');
  const queryDescription = searchParams.get('description');
  const reminderId = searchParams.get('reminderId');
  const dueDate = searchParams.get('dueDate');
  const nextDueDate = searchParams.get('nextDueDate');

  const payloadParams = useMemo(
    () => ({
      date: queryDate,
      category: queryCategory,
      occurrence: queryOccurrence,
      description: queryDescription,
    }),
    [queryDate, queryCategory, queryOccurrence, queryDescription]
  );

  const { data, isLoading } = useQuery({
    queryKey: ['aid-details', payloadParams],
    queryFn: async () => {
      if (!queryDate || !queryCategory || !queryOccurrence || !queryDescription) return [];
      const resp = await aidsApi.getAidDetails(payloadParams);
      return resp.data?.data || [];
    },
    enabled: !!(queryDate && queryCategory && queryOccurrence && queryDescription),
  });

  const beneficiaries = data || [];
  const isReminderContext = Boolean(reminderId && dueDate);
  const isDueToday = Boolean(dueDate) && dueDate === new Date().toISOString().slice(0, 10);

  const approveMutation = useMutation({
    mutationFn: () => aidsApi.approveReminder(reminderId),
    onSuccess: (response) => {
      const group = response?.data?.data?.group;

      toast.success(copy.approveSuccess);
      queryClient.invalidateQueries({ queryKey: ['aid-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['aids-history'] });
      queryClient.invalidateQueries({ queryKey: ['aid-details'] });

      if (group?.date && group?.category && group?.occurrence && group?.description) {
        navigate(buildAidDetailsUrl(group));
      }
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  const handleOpenEdit = () => {
    const params = new URLSearchParams({
      date: queryDate,
      category: queryCategory,
      occurrence: queryOccurrence,
      description: queryDescription,
    });
    navigate(`/dashboard/lords-brethren/aid?${params.toString()}`);
  };

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('dashboardLayout.menu.theLordsBrethren'), href: '/dashboard/lords-brethren' },
          { label: t('dashboardLayout.menu.disbursedAidHistory'), href: '/dashboard/lords-brethren/aid-history' },
          { label: copy.title },
        ]}
      />

      <PageHeader
        className="border-b border-border pb-6"
        eyebrow={t('dashboardLayout.menu.theLordsBrethren')}
        title={copy.title}
        subtitle={copy.subtitle}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-heading">{copy.detailsSection}</p>
              </div>
              {canEdit ? (
                <Button variant="ghost" size="sm" onClick={handleOpenEdit} className="h-8 group">
                  <Edit2 className="mr-1.5 h-4 w-4 text-muted transition-colors group-hover:text-primary" />
                  {copy.editAction}
                </Button>
              ) : null}
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-medium text-muted">{copy.fields.date}</p>
                <div className="flex items-center gap-2 font-medium text-heading">
                  <CalendarDays className="h-4 w-4 text-muted" />
                  {formatDateLabel(queryDate, language)}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-muted">{copy.fields.category}</p>
                <Badge variant="success">{queryCategory || '-'}</Badge>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-muted">{copy.fields.occurrence}</p>
                <div className="font-medium text-heading">{localizeAidOccurrence(queryOccurrence || '-', language)}</div>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-muted">{copy.fields.description}</p>
                <div className="font-medium text-heading">{queryDescription || '-'}</div>
              </div>

              {beneficiaries?.[0]?.notes ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted">{copy.fields.notes}</p>
                  <p className="whitespace-pre-wrap text-sm font-medium text-heading">{beneficiaries[0].notes}</p>
                </div>
              ) : null}
            </div>
          </Card>

          {isReminderContext ? (
            <Card className="space-y-4 border-primary/15 bg-primary/5">
              <div className="space-y-1 border-b border-primary/10 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-heading">{copy.recurringSection}</p>
                  <Badge variant={isDueToday ? 'warning' : 'primary'}>
                    {isDueToday ? copy.dueToday : copy.pending}
                  </Badge>
                </div>
                <p className="text-sm text-muted">{copy.recurringSubtitle}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-surface/80 px-3 py-2">
                  <div className="flex items-center gap-2 text-heading">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span>{copy.originalDate}</span>
                  </div>
                  <span className="font-medium text-heading">{formatDateLabel(queryDate, language)}</span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl bg-surface/80 px-3 py-2">
                  <div className="flex items-center gap-2 text-heading">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <span>{copy.dueDate}</span>
                  </div>
                  <span className="font-medium text-heading">{formatDateLabel(dueDate, language)}</span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl bg-surface/80 px-3 py-2">
                  <div className="flex items-center gap-2 text-heading">
                    <RotateCw className="h-4 w-4 text-primary" />
                    <span>{copy.nextRepeat}</span>
                  </div>
                  <span className="font-medium text-heading">{formatDateLabel(nextDueDate, language)}</span>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border/70 bg-surface/90 p-4">
                <p className="text-sm text-heading">{copy.readyToApprove}</p>
                <p className="text-sm text-muted">{copy.keepPending}</p>

                {canEdit && isDueToday ? (
                  <Button
                    type="button"
                    icon={CheckCircle2}
                    loading={approveMutation.isPending}
                    onClick={() => approveMutation.mutate()}
                    className="w-full"
                  >
                    {copy.approveAction}
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="lg:col-span-2">
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-heading">{copy.beneficiariesSection}</p>
                <Badge variant="secondary">{beneficiaries.length}</Badge>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : beneficiaries.length === 0 ? (
              <EmptyState icon={HandCoins} title={copy.emptyTitle} description={copy.emptyDesc} />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {beneficiaries.map((row) => (
                  <button
                    key={row.houseName}
                    onClick={() =>
                      navigate(
                        `/dashboard/users/family-house/details?lookupType=houseName&lookupName=${encodeURIComponent(
                          row.houseName
                        )}`
                      )
                    }
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-start shadow-sm transition-colors hover:border-primary/30 hover:bg-surface-alt hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-heading">{row.houseName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
