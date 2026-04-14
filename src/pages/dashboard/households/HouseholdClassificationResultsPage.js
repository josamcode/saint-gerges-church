import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Eye, Filter, ShieldCheck } from 'lucide-react';
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
import Select from '../../../components/ui/Select';
import Switch from '../../../components/ui/Switch';
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
    title: 'Household statuses',
    subtitle:
      'See how each household is classified based on the current rule definitions and member information.',
    filtersTitle: 'Filters',
    classificationFilter: 'Primary classification',
    allClassifications: 'All classifications',
    includeUnclassified: 'Include unclassified',
    categoryCardsTitle: 'Classification categories',
    categoryCardsSubtitle:
      'Each card shows the number of households currently matching one active category.',
    householdsCount: 'households',
    criteriaCount: 'criteria',
    noCategoryCards: 'No active household classification categories found.',
    tableResults: '{count} household results',
    columns: {
      householdName: 'Household',
      source: 'Source',
      members: 'Members',
      income: 'Total income',
      status: 'Primary status',
      matches: 'Matched categories',
      actions: 'Actions',
    },
    viewDetails: 'View details',
    noDataTitle: 'No household classifications found',
    noDataDescription:
      'Try adjusting your filters or define category criteria before reviewing the results.',
    searchPlaceholder: 'Search by household or member name',
    previous: 'Previous',
    next: 'Next',
    manageRules: 'Manage rules',
  },
  ar: {
    title: 'حالات الأسر',
    subtitle:
      'راجع تصنيف كل أسرة بناءً على القواعد الحالية وبيانات أفرادها الفعلية.',
    filtersTitle: 'الفلاتر',
    classificationFilter: 'التصنيف الأساسي',
    allClassifications: 'كل التصنيفات',
    includeUnclassified: 'إظهار الأسر غير المصنفة',
    categoryCardsTitle: 'فئات التصنيف',
    categoryCardsSubtitle:
      'كل بطاقة تعرض عدد الأسر المطابقة حاليًا لكل فئة نشطة.',
    householdsCount: 'أسر',
    criteriaCount: 'معايير',
    noCategoryCards: 'لا توجد فئات تصنيف أسر نشطة.',
    tableResults: '{count} نتيجة',
    columns: {
      householdName: 'الأسرة',
      source: 'مصدر التجميع',
      members: 'عدد الأفراد',
      income: 'إجمالي الدخل',
      status: 'الحالة الأساسية',
      matches: 'التصنيفات المطابقة',
      actions: 'الإجراءات',
    },
    viewDetails: 'عرض التفاصيل',
    noDataTitle: 'لا توجد نتائج لتصنيف الأسر',
    noDataDescription:
      'عدّل الفلاتر أو عرّف شروط التصنيف أولًا ثم أعد المراجعة.',
    searchPlaceholder: 'ابحث باسم الأسرة أو أحد الأفراد',
    previous: 'السابق',
    next: 'التالي',
    manageRules: 'إدارة القواعد',
  },
};

function buildCategorySummaryCards(categories, breakdown = []) {
  const breakdownMap = new Map(
    (Array.isArray(breakdown) ? breakdown : []).map((entry) => [String(entry.id), entry])
  );

  const activeCategories = (Array.isArray(categories) ? categories : []).filter(
    (category) => category?.isActive !== false
  );

  if (activeCategories.length > 0) {
    return activeCategories.map((category) => {
      const summaryEntry = breakdownMap.get(String(category.id));
      return {
        id: String(category.id),
        name: category.name,
        color: category.color || summaryEntry?.color || '#2563eb',
        count:
          summaryEntry?.count ??
          (Number.isFinite(Number(category.count)) ? Number(category.count) : 0),
        criteriaCount: Number(category.criteriaCount) || 0,
      };
    });
  }

  return (Array.isArray(breakdown) ? breakdown : []).map((entry) => ({
    id: String(entry.id),
    name: entry.name,
    color: entry.color || '#2563eb',
    count: entry.count || 0,
    criteriaCount: 0,
  }));
}

function splitCardsIntoRows(cards = []) {
  const total = cards.length;
  if (total === 0) return [];
  if (total <= 4) return [cards];

  const rowsCount = Math.ceil(total / 3);
  const baseSize = Math.floor(total / rowsCount);
  const remainder = total % rowsCount;
  const rowSizes = Array.from({ length: rowsCount }, (_, index) =>
    baseSize + (index < remainder ? 1 : 0)
  );

  const rows = [];
  let cursor = 0;

  rowSizes.forEach((size) => {
    rows.push(cards.slice(cursor, cursor + size));
    cursor += size;
  });

  return rows;
}

function getCategoryRowGridClass(length) {
  if (length === 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  if (length === 3) return 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';
  if (length === 2) return 'grid-cols-1 md:grid-cols-2';
  return 'grid-cols-1';
}

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

function CategorySummaryCard({ category, copy }) {
  const color = category.color || '#2563eb';

  return (
    <div
      className="rounded-2xl border p-5 shadow-card"
      style={{
        borderColor: `${color}33`,
        background: `linear-gradient(135deg, ${color}14 0%, rgba(255, 255, 255, 0.96) 100%)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            {copy.classificationFilter}
          </p>
          <h3
            className="mt-2 truncate text-lg font-bold tracking-tight"
            style={{ color }}
            title={category.name}
          >
            {category.name}
          </h3>
        </div>
        <span
          className="mt-1 inline-flex h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-bold tracking-tight text-heading">{category.count}</p>
          <p className="mt-1 text-sm text-muted">{copy.householdsCount}</p>
        </div>
        <Badge variant="default">
          {category.criteriaCount} {copy.criteriaCount}
        </Badge>
      </div>
    </div>
  );
}

export default function HouseholdClassificationResultsPage() {
  const { hasPermission } = useAuth();
  const { language, t } = useI18n();
  const copy = COPY[language === 'ar' ? 'ar' : 'en'];
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [classificationId, setClassificationId] = useState('');
  const [includeUnclassified, setIncludeUnclassified] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ['household-classifications', 'categories'],
    queryFn: async () => {
      const { data } = await householdClassificationsApi.listCategories();
      return Array.isArray(data?.data) ? data.data : [];
    },
    staleTime: 60000,
  });

  const householdsQuery = useQuery({
    queryKey: [
      'household-classifications',
      'results',
      page,
      search,
      classificationId,
      includeUnclassified,
    ],
    queryFn: async () => {
      const { data } = await householdClassificationsApi.listHouseholds({
        page,
        limit: 10,
        search: search.trim() || undefined,
        classificationId: classificationId || undefined,
        includeUnclassified,
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

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const households = useMemo(
    () => householdsQuery.data?.households ?? [],
    [householdsQuery.data?.households]
  );
  const meta = householdsQuery.data?.meta || {};
  const summary = householdsQuery.data?.summary || {};

  const categoryOptions = useMemo(
    () => [
      { value: '', label: copy.allClassifications },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ],
    [categories, copy.allClassifications]
  );

  const categorySummaryCards = useMemo(
    () => buildCategorySummaryCards(categories, summary.categoryBreakdown),
    [categories, summary.categoryBreakdown]
  );

  const categorySummaryRows = useMemo(
    () => splitCardsIntoRows(categorySummaryCards),
    [categorySummaryCards]
  );

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
        eyebrow={copy.filtersTitle}
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

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted" />
          <p className="text-sm font-semibold text-heading">{copy.filtersTitle}</p>
        </div>
        <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-[1.4fr_0.8fr_auto]">
          <SearchInput
            value={search}
            onChange={(next) => {
              setSearch(next);
              setPage(1);
            }}
            placeholder={copy.searchPlaceholder}
          />
          <Select
            label={copy.classificationFilter}
            options={categoryOptions}
            value={classificationId}
            onChange={(event) => {
              setClassificationId(event.target.value);
              setPage(1);
            }}
            containerClassName="!mb-0"
          />
          <div className="flex items-end">
            <div className="rounded-xl border border-border bg-surface-alt/50 px-4 py-3">
              <Switch
                checked={includeUnclassified}
                onChange={(checked) => {
                  setIncludeUnclassified(checked);
                  setPage(1);
                }}
                label={copy.includeUnclassified}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-heading">{copy.categoryCardsTitle}</p>
            <p className="mt-1 text-sm text-muted">{copy.categoryCardsSubtitle}</p>
          </div>
          <Badge variant="default">{categorySummaryCards.length}</Badge>
        </div>

        {categorySummaryRows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={copy.categoryCardsTitle}
            description={copy.noCategoryCards}
          />
        ) : (
          <div className="space-y-4">
            {categorySummaryRows.map((row, index) => (
              <div
                key={`category-summary-row-${index}`}
                className={`grid gap-4 ${getCategoryRowGridClass(row.length)}`}
              >
                {row.map((category) => (
                  <CategorySummaryCard
                    key={category.id}
                    category={category}
                    copy={copy}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>

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
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-heading">{copy.title}</p>
            <span className="text-xs text-muted">
              {copy.tableResults.replace('{count}', String(meta.totalCount || households.length))}
            </span>
          </div>
          <Table
            columns={columns}
            data={households}
            loading={householdsQuery.isLoading}
            emptyTitle={copy.noDataTitle}
            emptyDescription={copy.noDataDescription}
            emptyIcon={Building2}
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
