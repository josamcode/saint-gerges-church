import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Users, CalendarDays, CalendarClock, AlertTriangle, Clock,
} from 'lucide-react';
import { confessionsApi } from '../../../api/endpoints';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Select from '../../../components/ui/Select';
import Table from '../../../components/ui/Table';
import Badge from '../../../components/ui/Badge';
import PageHeader from '../../../components/ui/PageHeader';
import { formatDateTime } from '../../../utils/formatters';
import { localizeSessionTypeName } from '../../../utils/sessionTypeLocalization';
import { useI18n } from '../../../i18n/i18n';

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

/* ── page ────────────────────────────────────────────────────────────────── */

export default function ConfessionAnalyticsPage() {
  const [months, setMonths] = useState('6');
  const { t } = useI18n();

  const { data: analyticsRes, isLoading } = useQuery({
    queryKey: ['confessions', 'analytics', { months }],
    queryFn: async () => {
      const { data } = await confessionsApi.getAnalytics({ months: Number(months) });
      return data?.data || null;
    },
    staleTime: 30000,
  });

  const summary = analyticsRes?.summary || {};
  const typeBreakdown = Array.isArray(analyticsRes?.typeBreakdown) ? analyticsRes.typeBreakdown : [];
  const monthlyTrend = Array.isArray(analyticsRes?.monthlyTrend) ? analyticsRes.monthlyTrend : [];
  const topAttendees = Array.isArray(analyticsRes?.topAttendees) ? analyticsRes.topAttendees : [];

  const maxTrendCount = Math.max(...monthlyTrend.map((item) => item.count || 0), 1);
  const maxTypeCount = Math.max(...typeBreakdown.map((item) => item.count || 0), 1);

  /* ── KPI config ── */
  const kpiTiles = [
    { label: t('confessions.analytics.cards.totalSessions'), value: summary.totalSessions ?? 0, icon: BarChart3, variant: 'default' },
    { label: t('confessions.analytics.cards.sessionsInPeriod'), value: summary.sessionsInPeriod ?? 0, icon: CalendarDays, variant: 'primary' },
    { label: t('confessions.analytics.cards.uniqueAttendees'), value: summary.uniqueAttendees ?? 0, icon: Users, variant: 'default' },
    { label: t('confessions.analytics.cards.upcomingSessions'), value: summary.upcomingSessions ?? 0, icon: CalendarClock, variant: 'default' },
    { label: t('confessions.analytics.cards.overdueUsers'), value: summary.overdueUsers ?? 0, icon: AlertTriangle, variant: (summary.overdueUsers ?? 0) > 0 ? 'warning' : 'success' },
    {
      label: t('confessions.analytics.cards.alertThreshold'),
      value: `${summary.alertThresholdDays ?? 0}`,
      suffix: t('confessions.alerts.daysWord'),
      icon: Clock,
      variant: 'default',
    },
  ];

  /* ── columns ── */
  const topAttendeesColumns = useMemo(() => [
    {
      key: 'fullName',
      label: t('confessions.analytics.columns.user'),
      render: (row) => <span className="font-medium text-heading">{row.fullName}</span>,
    },
    {
      key: 'sessionsCount',
      label: t('confessions.analytics.columns.sessions'),
      render: (row) => <Badge variant="primary">{row.sessionsCount}</Badge>,
    },
    {
      key: 'lastSessionAt',
      label: t('confessions.analytics.columns.lastSession'),
      render: (row) => (
        <span className="text-sm text-heading">
          {row.lastSessionAt
            ? formatDateTime(row.lastSessionAt)
            : <span className="text-muted">{t('common.placeholder.empty')}</span>}
        </span>
      ),
    },
  ], [t]);

  return (
    <div className="animate-fade-in space-y-8 pb-10">

      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('confessions.analytics.page') },
        ]}
      />

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <PageHeader
        className="border-b border-border pb-6"
        eyebrow={t('shared.dashboard')}
        title={t('confessions.analytics.title')}
        subtitle={t('confessions.analytics.subtitle')}
        actions={(
          <div className="w-full sm:w-48">
            <Select
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              options={[
                { value: '3', label: t('confessions.analytics.period3') },
                { value: '6', label: t('confessions.analytics.period6') },
                { value: '12', label: t('confessions.analytics.period12') },
                { value: '24', label: t('confessions.analytics.period24') },
              ]}
              containerClassName="!mb-0"
            />
          </div>
        )}
      />

      {/* ══ KPI TILES ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {kpiTiles.map(({ label, value, suffix, icon: Icon, variant }) => (
          <div key={label} className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted leading-tight">
                {label}
              </p>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
                ${variant === 'primary' ? 'bg-primary/10 text-primary' :
                  variant === 'warning' ? 'bg-warning-light text-warning' :
                    variant === 'success' ? 'bg-success-light text-success' :
                      'bg-surface-alt text-muted'}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <p className={`text-3xl font-bold tracking-tight
                ${variant === 'primary' ? 'text-heading' :
                  variant === 'warning' ? 'text-warning' :
                    variant === 'success' ? 'text-success' :
                      'text-heading'}`}>
                {value}
              </p>
              {suffix && <p className="mt-0.5 text-xs text-muted">{suffix}</p>}
            </div>
            <div className={`mt-4 h-0.5 w-10 rounded-full
              ${variant === 'primary' ? 'bg-primary' :
                variant === 'warning' ? 'bg-warning' :
                  variant === 'success' ? 'bg-success' :
                    'bg-border'}`}
            />
          </div>
        ))}
      </div>

      {/* ══ CHARTS ROW ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* monthly trend */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <SectionLabel>{t('confessions.analytics.monthlyTitle')}</SectionLabel>
            <BarChart3 className="h-3.5 w-3.5 shrink-0 text-primary" />
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            {isLoading ? (
              <p className="text-sm text-muted">{t('confessions.analytics.loading')}</p>
            ) : monthlyTrend.length === 0 ? (
              <p className="text-sm text-muted">{t('confessions.analytics.noData')}</p>
            ) : (
              <div className="space-y-4">
                {monthlyTrend.map((item) => {
                  const pct = Math.max((item.count / maxTrendCount) * 100, 2);
                  return (
                    <div key={`${item.year}-${item.month}`}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-heading">{item.label}</span>
                        <span className="text-xs font-bold tabular-nums text-primary">{item.count}</span>
                      </div>
                      {/* track */}
                      <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* session type breakdown */}
        <section className="space-y-4">
          <SectionLabel>{t('confessions.analytics.sessionTypesTitle')}</SectionLabel>

          <div className="rounded-2xl border border-border bg-surface p-5">
            {isLoading ? (
              <p className="text-sm text-muted">{t('confessions.analytics.loading')}</p>
            ) : typeBreakdown.length === 0 ? (
              <p className="text-sm text-muted">{t('confessions.analytics.noTypeData')}</p>
            ) : (
              <div className="space-y-4">
                {typeBreakdown.map((item, i) => {
                  const pct = Math.max((item.count / maxTypeCount) * 100, 2);
                  /* cycle through a small palette for visual variety */
                  const trackColors = ['bg-primary', 'bg-accent', 'bg-success', 'bg-warning'];
                  const color = trackColors[i % trackColors.length];
                  return (
                    <div key={item.sessionType}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="truncate text-xs font-medium text-heading">
                          {localizeSessionTypeName(item.sessionType, t)}
                        </span>
                        <Badge variant="primary">{item.count}</Badge>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ══ TOP ATTENDEES TABLE ══════════════════════════════════════════ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>{t('confessions.analytics.topAttendeesTitle')}</SectionLabel>
          <span className="text-xs text-muted">{topAttendees.length}</span>
        </div>

        <div className="overflow-hidden tttable">
          <Table
            columns={topAttendeesColumns}
            data={topAttendees}
            loading={isLoading}
            emptyTitle={t('confessions.analytics.emptyTitle')}
            emptyDescription={t('confessions.analytics.emptyDescription')}
          />
        </div>
      </section>

    </div>
  );
}
