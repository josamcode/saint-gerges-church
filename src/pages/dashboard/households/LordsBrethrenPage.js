import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Eye, ShieldCheck, Users } from 'lucide-react';
import { householdClassificationsApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import { useI18n } from '../../../i18n/i18n';
import Badge from '../../../components/ui/Badge';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import PageHeader from '../../../components/ui/PageHeader';
import SearchInput from '../../../components/ui/SearchInput';
import Table from '../../../components/ui/Table';
import {
  formatCurrencyEGP,
  getHouseholdSourceLabel,
  getStatusText,
} from './householdClassifications.shared';
import {
  buildLookupQuery,
  FAMILY_HOUSE_DETAILS_PATH,
} from '../users/familyHouseLookup.shared';

const COPY = {
  en: {
    title: 'The Lords Brethren',
    subtitle:
      'View households currently classified as The Lords Brethren according to the active rules.',
    householdsCount: 'households',
    tableResults: '{count} household results',
    columns: {
      householdName: 'Household',
      members: 'Members',
      income: 'Total income',
      status: 'Primary status',
      matches: 'Matched categories',
      actions: 'Actions',
    },
    viewDetails: 'View details',
    noDataTitle: 'No Lords Brethren households found',
    noDataDescription:
      'Currently no households meet the active criteria for being classified as The Lords Brethren.',
    searchPlaceholder: 'Search by household or member name',
    previous: 'Previous',
    next: 'Next',
    manageRules: 'Manage rules',
  },
  ar: {
    title: 'إخوة الرب',
    subtitle:
      'عرض الأسر المصنفة حاليًا كإخوة الرب وفقًا للقواعد النشطة المحددة.',
    householdsCount: 'أسر',
    tableResults: '{count} نتيجة',
    columns: {
      householdName: 'الأسرة',
      members: 'عدد الأفراد',
      income: 'إجمالي الدخل',
      status: 'الحالة الأساسية',
      matches: 'التصنيفات المطابقة',
      actions: 'الإجراءات',
    },
    viewDetails: 'عرض التفاصيل',
    noDataTitle: 'لا توجد أسر تابعة لإخوة الرب',
    noDataDescription:
      'لا توجد أسر تطابق الشروط النشطة الحالية لتصنيف إخوة الرب.',
    searchPlaceholder: 'ابحث باسم الأسرة أو أحد الأفراد',
    previous: 'السابق',
    next: 'التالي',
    manageRules: 'إدارة القواعد',
  },
};

function HouseholdStatusBadge({ classification, language }) {
  if (!classification) {
    return <Badge>{getStatusText('unclassified', language)}</Badge>;
  }

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{
        color: classification.color || '#2563eb',
        borderColor: `${classification.color || '#2563eb'}33`,
        backgroundColor: `${classification.color || '#2563eb'}12`,
      }}
    >
      {classification.name}
    </span>
  );
}

export default function LordsBrethrenPage() {
  const { hasPermission } = useAuth();
  const { language, t } = useI18n();
  const copy = COPY[language === 'ar' ? 'ar' : 'en'];
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const householdsQuery = useQuery({
    queryKey: [
      'household-classifications',
      'lords-brethren',
      page,
      search,
    ],
    queryFn: async () => {
      const { data } = await householdClassificationsApi.listHouseholds({
        page,
        limit: 10,
        search: search.trim() || undefined,
        isLordsBrethren: true,
        includeUnclassified: false,
      });

      return {
        households: Array.isArray(data?.data) ? data.data : [],
        meta: data?.meta || {},
        summary: data?.summary || {},
      };
    },
    keepPreviousData: true,
    staleTime: 30000,
  });

  const households = useMemo(
    () => householdsQuery.data?.households ?? [],
    [householdsQuery.data?.households]
  );
  const meta = householdsQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        key: 'householdName',
        label: copy.columns.householdName,
        render: (row) => (
          <div>
            <p className="font-semibold text-heading">{row.householdName}</p>
          </div>
        ),
      },
      {
        key: 'memberCount',
        label: copy.columns.members,
        render: (row) => row.memberCount,
      },
      {
        key: 'totalMemberIncome',
        label: copy.columns.income,
        render: (row) => formatCurrencyEGP(row.totalMemberIncome, language),
      },
      {
        key: 'primaryClassification',
        label: copy.columns.status,
        render: (row) => (
          <HouseholdStatusBadge
            classification={row.primaryClassification}
            language={language}
          />
        ),
      },
      {
        key: 'matchedCategories',
        label: copy.columns.matches,
        render: (row) => (
          <div className="flex flex-wrap gap-1.5">
            {(row.matchedCategories || []).slice(0, 3).map((category) => (
              <HouseholdStatusBadge
                key={category.id}
                classification={category}
                language={language}
              />
            ))}
            {!row.matchedCategories?.length ? (
              <Badge>{getStatusText('unclassified', language)}</Badge>
            ) : null}
          </div>
        ),
      },
      {
        key: 'actions',
        label: copy.columns.actions,
        render: (row) => (
          <Link
            to={`${FAMILY_HOUSE_DETAILS_PATH}?${buildLookupQuery('houseName', row.householdName)}`}
          >
            <Button type="button" variant="outline" size="sm" icon={Eye}>
              {copy.viewDetails}
            </Button>
          </Link>
        ),
      },
    ],
    [copy, language]
  );

  const errorMessage = householdsQuery.error
    ? normalizeApiError(householdsQuery.error).message
    : null;

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: copy.title },
        ]}
      />

      <PageHeader
        className="border-b border-border pb-6"
        eyebrow={copy.title}
        title={copy.title}
        subtitle={copy.subtitle}
        actions={
          hasPermission('HOUSEHOLD_CLASSIFICATIONS_MANAGE') ? (
            <Link to="/dashboard/households/classifications">
              <Button icon={ShieldCheck}>{copy.manageRules}</Button>
            </Link>
          ) : null
        }
      />

      {errorMessage ? (
        <Card>
          <EmptyState
            icon={Building2}
            title={copy.noDataTitle}
            description={errorMessage}
          />
        </Card>
      ) : (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-heading">{copy.title}</p>
                <span className="text-xs text-muted">
                  {copy.tableResults.replace('{count}', String(meta.totalCount || households.length))}
                </span>
              </div>
            </div> */}
            <div className="flex flex-1 items-center gap-3 desktop:flex-none">
              <SearchInput
                value={search}
                onChange={(next) => {
                  setSearch(next);
                  setPage(1);
                }}
                placeholder={copy.searchPlaceholder}
                className="w-full max-w-[400px]"
              />
            </div>
          </div>
          <Table
            columns={columns}
            data={households}
            loading={householdsQuery.isLoading}
            emptyTitle={copy.noDataTitle}
            emptyDescription={copy.noDataDescription}
            emptyIcon={Users}
          />

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={!meta.hasPrevPage}
            >
              {copy.previous}
            </Button>
            <span className="text-xs text-muted">
              {meta.page || 1} / {meta.totalPages || 1}
            </span>
            <Button
              variant="ghost"
              onClick={() => setPage((current) => current + 1)}
              disabled={!meta.hasNextPage}
            >
              {copy.next}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
