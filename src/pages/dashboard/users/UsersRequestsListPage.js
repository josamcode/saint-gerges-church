import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, FileClock, Pencil, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { usersApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import PageHeader from '../../../components/ui/PageHeader';
import Pagination from '../../../components/ui/Pagination';
import SearchInput from '../../../components/ui/SearchInput';
import Select from '../../../components/ui/Select';
import Table, { RowActions } from '../../../components/ui/Table';
import { useI18n } from '../../../i18n/i18n';
import { formatDate, getAccountStatusLabel } from '../../../utils/formatters';

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{children}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

function StatusPill({ value }) {
  const className =
    value === 'approved'
      ? 'bg-success-light text-success border-success/20'
      : value === 'rejected'
        ? 'bg-danger-light text-danger border-danger/20'
        : 'bg-primary/10 text-primary border-primary/20';

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{getAccountStatusLabel(value)}</span>;
}

export default function UsersRequestsListPage() {
  const { t } = useI18n();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ fullName: '', accountStatus: 'pending' });
  const [cursor, setCursor] = useState(null);
  const [cursorStack, setCursorStack] = useState([null]);

  const queryParams = {
    limit: 10,
    sort: 'createdAt',
    order: 'desc',
    ...(cursor ? { cursor } : {}),
    ...(filters.fullName ? { fullName: filters.fullName } : {}),
    ...(filters.accountStatus ? { accountStatus: filters.accountStatus } : {}),
  };

  const requestsQuery = useQuery({
    queryKey: ['users', 'requests', queryParams],
    queryFn: async () => (await usersApi.list(queryParams)).data,
    keepPreviousData: true,
    staleTime: 30000,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, accountStatus }) => usersApi.update(id, { accountStatus }),
    onSuccess: (_, variables) => {
      toast.success(
        variables.accountStatus === 'approved'
          ? 'تم اعتماد الطلب بنجاح'
          : 'تم رفض الطلب بنجاح'
      );
      queryClient.invalidateQueries({ queryKey: ['users', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });

  const rows = Array.isArray(requestsQuery.data?.data) ? requestsQuery.data.data : [];
  const meta = requestsQuery.data?.meta || null;

  const columns = useMemo(
    () => [
      {
        key: 'fullName',
        label: 'الطلب',
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-heading">{row.fullName || '---'}</p>
            <p className="truncate text-xs text-muted direction-ltr text-left">{row.phonePrimary || row.email || '---'}</p>
          </div>
        ),
      },
      {
        key: 'createdAt',
        label: 'تاريخ الإرسال',
        render: (row) => formatDate(row.createdAt),
      },
      {
        key: 'accountStatus',
        label: 'الحالة',
        render: (row) => <StatusPill value={row.accountStatus || 'pending'} />,
      },
      {
        key: 'actions',
        label: '',
        cellClassName: 'w-10',
        render: (row) => (
          <RowActions
            actions={[
              { label: t('common.actions.view'), icon: Eye, onClick: () => navigate(`/dashboard/users/${row._id}`) },
              ...(hasPermission('USERS_UPDATE')
                ? [{ label: t('common.actions.edit'), icon: Pencil, onClick: () => navigate(`/dashboard/users/${row._id}/edit`) }]
                : []),
              ...(hasPermission('USERS_UPDATE') && row.accountStatus !== 'approved'
                ? [{ label: 'اعتماد', icon: CheckCircle2, onClick: () => actionMutation.mutate({ id: row._id, accountStatus: 'approved' }) }]
                : []),
              ...(hasPermission('USERS_UPDATE') && row.accountStatus !== 'rejected'
                ? [{ label: 'رفض', icon: XCircle, danger: true, onClick: () => actionMutation.mutate({ id: row._id, accountStatus: 'rejected' }) }]
                : []),
            ]}
          />
        ),
      },
    ],
    [actionMutation, hasPermission, navigate, t]
  );

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('shared.users'), href: '/dashboard/users' },
          { label: 'طلبات المستخدمين' },
        ]}
      />

      <PageHeader
        className="border-b border-border pb-6"
        title="طلبات المستخدمين"
        subtitle="راجع طلبات التسجيل الجديدة، ثم افتح الطلب للتعديل أو اعتمده أو ارفضه مباشرة."
        actions={
          <Link to="/dashboard/users">
            <Button variant="outline">العودة إلى المستخدمين</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">المعروض الآن</p>
          <p className="mt-4 text-4xl font-bold tracking-tight text-heading">{rows.length}</p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/6 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">الفلاتر الحالية</p>
          <p className="mt-4 text-lg font-semibold text-heading">{filters.accountStatus ? getAccountStatusLabel(filters.accountStatus) : 'كل الحالات'}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">الطلبات المفتوحة</p>
          <p className="mt-4 text-lg font-semibold text-heading">يمكنك فتح كل طلب من صفحة التعديل أو من تفاصيل المستخدم.</p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>كيف تريد فلترة الطلبات؟</SectionLabel>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => {
              setFilters({ fullName: '', accountStatus: 'pending' });
              setCursor(null);
              setCursorStack([null]);
            }}
          >
            إعادة التعيين
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SearchInput
            value={filters.fullName}
            onChange={(value) => {
              setFilters((prev) => ({ ...prev, fullName: value }));
              setCursor(null);
              setCursorStack([null]);
            }}
            placeholder="ابحث بالاسم"
          />
          <Select
            options={[
              { value: 'pending', label: 'قيد المراجعة' },
              { value: 'approved', label: 'معتمد' },
              { value: 'rejected', label: 'مرفوض' },
            ]}
            value={filters.accountStatus}
            onChange={(event) => {
              setFilters((prev) => ({ ...prev, accountStatus: event.target.value }));
              setCursor(null);
              setCursorStack([null]);
            }}
            placeholder="اختر الحالة"
            containerClassName="!mb-0"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>ما الطلبات التي تحتاج إلى مراجعة الآن؟</SectionLabel>
          <span className="text-xs text-muted">يمكنك الاعتماد أو الرفض مباشرة من القائمة</span>
        </div>

        <div className="overflow-hidden tttable">
          <Table
            columns={columns}
            data={rows}
            loading={requestsQuery.isLoading}
            emptyTitle="لا توجد طلبات حالياً"
            emptyDescription="جرّب تغيير الفلاتر أو انتظر حتى تصل طلبات تسجيل جديدة."
            emptyIcon={FileClock}
          />

          <div className="border-t border-border px-4 pb-4 pt-2">
            <Pagination
              meta={meta}
              loading={requestsQuery.isLoading}
              cursors={cursorStack}
              onLoadMore={() => {
                if (!meta?.nextCursor || meta.nextCursor === cursor) return;
                setCursorStack((prev) => [...prev, meta.nextCursor]);
                setCursor(meta.nextCursor);
              }}
              onPrev={() => {
                setCursorStack((prev) => {
                  if (prev.length <= 1) return prev;
                  const next = prev.slice(0, -1);
                  setCursor(next[next.length - 1] || null);
                  return next;
                });
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
