import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, HandCoins, History, Search, Plus, Filter, BellRing } from 'lucide-react';
import { aidsApi } from '../../../api/endpoints';
import { useAuth } from '../../../auth/auth.hooks';
import { useI18n } from '../../../i18n/i18n';
import Badge from '../../../components/ui/Badge';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import PageHeader from '../../../components/ui/PageHeader';
import Pagination from '../../../components/ui/Pagination';
import Table from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import SearchInput from '../../../components/ui/SearchInput';
import Select from '../../../components/ui/Select';

const COPY = {
  en: {
    title: 'Disbursed Aid History',
    subtitle: 'View a timeline of all aid distributed to households.',
    addAction: 'Disburse Aid',
    filtersTitle: 'Filters',
    searchPlaceholder: 'Search by description...',
    categoryFilter: 'All Categories',
    emptyTitle: 'No distributed aid found',
    emptyDesc: 'Once aid is disbursed, the records will appear here.',
    columns: {
      date: 'Date',
      category: 'Category',
      occurrence: 'Occurrence',
      description: 'Description',
      beneficiaries: 'Beneficiaries',
    },
  },
  ar: {
    title: 'المساعدات المصروفة',
    subtitle: 'عرض السجل الزمني لجميع المساعدات التي تم صرفها للأسر.',
    addAction: 'صرف مساعدة',
    filtersTitle: 'عوامل التصفية',
    searchPlaceholder: 'ابحث بالوصف...',
    categoryFilter: 'جميع الفئات',
    emptyTitle: 'لا توجد مساعدات منصرفة',
    emptyDesc: 'بمجرد صرف المساعدات للأسر، ستظهر السجلات هنا.',
    columns: {
      date: 'التاريخ',
      category: 'فئة المساعدة',
      occurrence: 'الدورية',
      description: 'الوصف',
      beneficiaries: 'المستفيدين',
    },
  },
};

export default function DisbursedAidsPage() {
  const { language, t } = useI18n();
  const copy = COPY[language === 'ar' ? 'ar' : 'en'];
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  const canCreate = hasPermission('HOUSEHOLD_CLASSIFICATIONS_MANAGE');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const limit = 20;

  const { data: optionsData } = useQuery({
    queryKey: ['aids-options'],
    queryFn: async () => {
      const resp = await aidsApi.getOptions();
      return resp.data?.data || { categories: [], occurrences: [], descriptions: [] };
    },
    staleTime: 60000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['aids-history', page, limit, search, category],
    queryFn: async () => {
      const resp = await aidsApi.getDisbursedAids({ page, limit, search, category });
      return resp.data || { data: [], meta: { totalPages: 1 } };
    },
  });

  const items = data?.data || [];
  const meta = data?.meta || { totalPages: 1 };

  const categoryOptions = [
    { label: copy.categoryFilter, value: '' },
    ...(optionsData?.categories || []).map((cat) => ({ label: cat, value: cat })),
  ];

  const handleRowClick = (row) => {
    // Navigate to details page with query params
    const searchParams = new URLSearchParams({
      date: row.date,
      category: row.category,
      occurrence: row.occurrence,
      description: row.description,
    });
    navigate(`/dashboard/lords-brethren/aid-history/details?${searchParams.toString()}`);
  };

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('dashboardLayout.menu.theLordsBrethren'), href: '/dashboard/lords-brethren' },
          { label: copy.title },
        ]}
      />

      <PageHeader
        className="border-b border-border pb-6"
        eyebrow={t('dashboardLayout.menu.theLordsBrethren')}
        title={copy.title}
        subtitle={copy.subtitle}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              icon={BellRing}
              onClick={() => navigate('/dashboard/lords-brethren/aid-history/notifications')}
            >
              {language === 'ar' ? 'الإشعارات' : 'Notifications'}
            </Button>
            {canCreate ? (
              <Button
                icon={Plus}
                onClick={() => navigate('/dashboard/lords-brethren/aid')}
              >
                {copy.addAction}
              </Button>
            ) : null}
          </div>
        }
      />

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted" />
          <p className="text-sm font-semibold text-heading">{copy.filtersTitle}</p>
        </div>
        <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-[1.4fr_1fr]">
          <SearchInput
            value={search}
            onChange={(next) => {
              setSearch(next);
              setPage(1);
            }}
            placeholder={copy.searchPlaceholder}
          />
          <Select
            options={categoryOptions}
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            containerClassName="!mb-0"
          />
        </div>
      </Card>

      <Table
        columns={[
          {
            key: 'date',
            label: copy.columns.date,
            render: (row) => (
              <div className="flex items-center gap-2 font-medium text-heading">
                <CalendarDays className="h-4 w-4 text-muted" />
                {row.date ? new Date(row.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
              </div>
            ),
            onClick: handleRowClick,
          },
          {
            key: 'category',
            label: copy.columns.category,
            render: (row) => <Badge variant="outline">{row.category}</Badge>,
            onClick: handleRowClick,
          },
          {
            key: 'occurrence',
            label: copy.columns.occurrence,
            cellClassName: 'text-muted',
            onClick: handleRowClick,
          },
          {
            key: 'description',
            label: copy.columns.description,
            onClick: handleRowClick,
          },
          {
            key: 'beneficiariesCount',
            label: copy.columns.beneficiaries,
            cellClassName: 'font-semibold text-primary',
            onClick: handleRowClick,
          },
        ]}
        data={items}
        loading={isLoading}
        emptyTitle={copy.emptyTitle}
        emptyDescription={copy.emptyDesc}
        emptyIcon={HandCoins}
      />

      {meta.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
