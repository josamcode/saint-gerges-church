import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  BarChart3,
  BellRing,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Home,
  MessageCircle,
  NotebookPen,
  ShieldCheck,
  UserCircle,
  Users,
} from 'lucide-react';
import {
  authApi,
  bookingsApi,
  chatApi,
  confessionsApi,
  divineLiturgiesApi,
  meetingsApi,
  notificationsApi,
  usersApi,
  visitationsApi,
} from '../../api/endpoints';
import { useAuth } from '../../auth/auth.hooks';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import { useI18n } from '../../i18n/i18n';
import { formatDate, getRoleLabel } from '../../utils/formatters';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && DATE_ONLY.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function mapTrend(items = []) {
  const map = new Map();
  items.forEach((item) => {
    const year = Number(item?.year);
    const month = Number(item?.month);
    if (!Number.isInteger(year) || !Number.isInteger(month)) return;
    map.set(monthKey(year, month), Number(item?.count) || 0);
  });
  return map;
}

function mapDates(values = []) {
  const map = new Map();
  values.forEach((value) => {
    const date = isoDate(value);
    if (!date) return;
    const [year, month] = date.split('-').map(Number);
    const key = monthKey(year, month);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

function buildBuckets(months, language, series) {
  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const now = new Date();
  const buckets = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const key = monthKey(date.getUTCFullYear(), date.getUTCMonth() + 1);
    const label = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(date);
    const fullLabel = new Intl.DateTimeFormat(locale, {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
    const parts = series.map((item) => ({ ...item, value: item.map.get(key) || 0 }));
    buckets.push({
      key,
      label,
      fullLabel,
      total: parts.reduce((sum, item) => sum + item.value, 0),
      parts,
    });
  }
  return buckets;
}

function familyLinksCount(profile = {}) {
  return (
    (profile?.father ? 1 : 0) +
    (profile?.mother ? 1 : 0) +
    (profile?.spouse ? 1 : 0) +
    (Array.isArray(profile?.siblings) ? profile.siblings.length : 0) +
    (Array.isArray(profile?.children) ? profile.children.length : 0) +
    (Array.isArray(profile?.familyMembers) ? profile.familyMembers.length : 0)
  );
}

function SectionHeading({ eyebrow, title, subtitle, icon: Icon }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">{eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold text-heading">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {Icon ? <Icon className="h-5 w-5 text-primary" /> : null}
    </div>
  );
}

function StatCard({ label, value, hint, tone = 'default' }) {
  const surface =
    tone === 'success'
      ? 'border-success/20 bg-success-light'
      : tone === 'warning'
        ? 'border-warning/20 bg-warning-light'
        : tone === 'primary'
          ? 'border-primary/20 bg-primary/8'
          : 'border-border bg-surface';
  const color =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'primary'
          ? 'text-primary'
          : 'text-heading';

  return (
    <div className={`rounded-3xl border p-5 ${surface}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className={`mt-4 text-4xl font-bold tracking-tight ${color}`}>{value}</p>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

function StackedBars({ buckets, emptyLabel, lastLabel }) {
  if (!buckets.length || buckets.every((bucket) => bucket.total === 0)) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }
  const maxTotal = Math.max(...buckets.map((bucket) => bucket.total), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {buckets[0].parts.map((part) => (
          <span
            key={part.key}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-alt/50 px-3 py-1 text-xs font-medium text-heading"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${part.color}`} />
            {part.label}
          </span>
        ))}
        <span className="inline-flex items-center rounded-full border border-border bg-surface-alt/35 px-3 py-1 text-xs font-medium text-muted">
          {lastLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {buckets.map((bucket) => (
          <div key={bucket.key} className="flex flex-col items-center gap-2">
            <p className="text-xs font-semibold text-heading">{bucket.total}</p>
            <div className="flex h-40 w-full max-w-[72px] items-end rounded-3xl border border-border bg-surface-alt/30 p-1.5">
              <div className="flex h-full w-full flex-col justify-end overflow-hidden rounded-[18px] bg-surface">
                {bucket.total === 0 ? (
                  <div className="h-2 rounded-full bg-border/70" />
                ) : (
                  bucket.parts.map((part) => (
                    <div
                      key={`${bucket.key}-${part.key}`}
                      className={part.color}
                      style={{ height: `${(part.value / maxTotal) * 100}%` }}
                      title={`${part.label}: ${part.value}`}
                    />
                  ))
                )}
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-heading">{bucket.label}</p>
              <p className="text-[11px] text-muted">{bucket.fullLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricBars({ items, emptyLabel }) {
  if (!items.length || items.every((item) => item.value === 0)) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-heading">{item.label}</p>
              {item.meta ? <p className="text-xs text-muted">{item.meta}</p> : null}
            </div>
            <Badge variant={item.variant || 'primary'}>{item.value}</Badge>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
            <div
              className={`h-full rounded-full ${item.color || 'bg-primary'}`}
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 6 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickAction({ action, isRTL, openLabel }) {
  const Icon = action.icon;
  return (
    <Link
      to={action.href}
      className="group flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface-alt/20 p-4 transition-all hover:border-primary/25 hover:bg-surface-alt/35"
    >
      <div className="flex min-w-0 gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${action.iconTone}`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-heading">{action.label}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{action.desc}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={action.variant || 'primary'}>{action.metric}</Badge>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{openLabel}</span>
          </div>
        </div>
      </div>
      <ArrowUpRight
        className={`mt-1 h-4 w-4 shrink-0 text-border transition-all group-hover:text-primary ${isRTL ? 'group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'
          }`}
      />
    </Link>
  );
}

export default function DashboardHome() {
  const { user, hasPermission, hasAnyPermission } = useAuth();
  const { t, isRTL, language } = useI18n();
  const tx = useCallback((en, ar) => (language === 'ar' ? ar : en), [language]);
  const dots = '...';

  const canUsers = hasPermission('USERS_VIEW');
  const canConfessions = hasPermission('CONFESSIONS_VIEW');
  const canConfessionAlerts = hasPermission('CONFESSIONS_ALERTS_VIEW');
  const canConfessionAnalytics = hasPermission('CONFESSIONS_ANALYTICS_VIEW');
  const canVisitations = hasPermission('PASTORAL_VISITATIONS_VIEW');
  const canVisitationAnalytics = hasPermission('PASTORAL_VISITATIONS_ANALYTICS_VIEW');
  const canMeetings = hasAnyPermission(['MEETINGS_VIEW', 'MEETINGS_VIEW_OWN']);
  const canBookings = hasAnyPermission(['BOOKINGS_VIEW_OWN', 'BOOKINGS_VIEW', 'BOOKINGS_MANAGE']);
  const canNotifications = hasPermission('NOTIFICATIONS_VIEW');
  const canChats = hasPermission('CHATS_VIEW');
  const canDivine = hasAnyPermission([
    'DIVINE_LITURGIES_VIEW',
    'DIVINE_LITURGIES_MANAGE',
    'DIVINE_LITURGIES_ATTENDANCE_MANAGE',
    'DIVINE_LITURGIES_ATTENDANCE_MANAGE_ASSIGNED_USERS',
  ]);

  const systemMode = hasAnyPermission([
    'USERS_VIEW',
    'CONFESSIONS_VIEW',
    'CONFESSIONS_ALERTS_VIEW',
    'CONFESSIONS_ANALYTICS_VIEW',
    'PASTORAL_VISITATIONS_VIEW',
    'PASTORAL_VISITATIONS_ANALYTICS_VIEW',
  ]);

  const usersQuery = useQuery({
    queryKey: ['dashboard', 'users', 'summary'],
    enabled: systemMode && canUsers,
    staleTime: 60000,
    queryFn: async () => {
      const [totalUsersResponse, lockedUsersResponse, familyNamesResponse] = await Promise.all([
        usersApi.list({
          limit: 1,
          sort: 'createdAt',
          order: 'desc',
        }),
        usersApi.list({
          limit: 1,
          sort: 'createdAt',
          order: 'desc',
          isLocked: true,
        }),
        usersApi.getFamilyNames(),
      ]);

      const total = Number(totalUsersResponse?.data?.meta?.totalCount || 0);
      const locked = Number(lockedUsersResponse?.data?.meta?.totalCount || 0);
      const familyNames = Array.isArray(familyNamesResponse?.data?.data)
        ? familyNamesResponse.data.data
        : [];

      return {
        total,
        active: Math.max(0, total - locked),
        locked,
        families: familyNames.length,
      };
    },
  });

  const confAnalyticsQuery = useQuery({
    queryKey: ['dashboard', 'confessions', 'analytics'],
    enabled: systemMode && canConfessionAnalytics,
    staleTime: 60000,
    queryFn: async () => (await confessionsApi.getAnalytics({ months: 6 })).data?.data || null,
  });

  const confAlertsQuery = useQuery({
    queryKey: ['dashboard', 'confessions', 'alerts'],
    enabled: systemMode && canConfessionAlerts,
    staleTime: 60000,
    queryFn: async () => (await confessionsApi.getAlerts({})).data?.data || null,
  });

  const visitAnalyticsQuery = useQuery({
    queryKey: ['dashboard', 'visitations', 'analytics'],
    enabled: systemMode && canVisitationAnalytics,
    staleTime: 60000,
    queryFn: async () => (await visitationsApi.getAnalytics({ months: 6 })).data?.data || null,
  });

  const meQuery = useQuery({
    queryKey: ['dashboard', 'me'],
    enabled: !systemMode,
    staleTime: 300000,
    queryFn: async () => (await authApi.me()).data?.data || null,
  });

  const meetingsQuery = useQuery({
    queryKey: ['dashboard', 'member', 'meetings'],
    enabled: !systemMode && canMeetings,
    staleTime: 60000,
    queryFn: async () => (await meetingsApi.meetings.list({ limit: 100, order: 'desc' })).data?.data || [],
  });

  const bookingsQuery = useQuery({
    queryKey: ['dashboard', 'member', 'bookings'],
    enabled: !systemMode && canBookings,
    staleTime: 60000,
    queryFn: async () => (await bookingsApi.self.list({ limit: 100, order: 'desc' })).data?.data || [],
  });

  const notificationsQuery = useQuery({
    queryKey: ['dashboard', 'member', 'notifications'],
    enabled: !systemMode && canNotifications,
    staleTime: 60000,
    queryFn: async () => (await notificationsApi.list({ limit: 20, order: 'desc', excludeSourceType: 'aid_recurring' })).data?.data || [],
  });

  const chatsQuery = useQuery({
    queryKey: ['dashboard', 'member', 'chats'],
    enabled: !systemMode && canChats,
    staleTime: 60000,
    queryFn: async () => (await chatApi.list()).data?.data || [],
  });

  const divineQuery = useQuery({
    queryKey: ['dashboard', 'member', 'divine'],
    enabled: !systemMode && canDivine,
    staleTime: 60000,
    queryFn: async () => (await divineLiturgiesApi.getOverview()).data?.data || null,
  });

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date()),
    [language]
  );

  const confSummary = confAnalyticsQuery.data?.summary || {};
  const visitSummary = visitAnalyticsQuery.data?.summary || {};
  const overdueAlerts = confAlertsQuery.data?.count ?? confSummary.overdueUsers ?? 0;
  const me = meQuery.data || user || {};
  const meetings = useMemo(() => (Array.isArray(meetingsQuery.data) ? meetingsQuery.data : []), [meetingsQuery.data]);
  const bookings = useMemo(() => (Array.isArray(bookingsQuery.data) ? bookingsQuery.data : []), [bookingsQuery.data]);
  const notifications = useMemo(
    () => (Array.isArray(notificationsQuery.data) ? notificationsQuery.data : []),
    [notificationsQuery.data]
  );
  const chats = useMemo(() => (Array.isArray(chatsQuery.data) ? chatsQuery.data : []), [chatsQuery.data]);
  const meetingAttendance = useMemo(
    () => (Array.isArray(me?.meetingAttendance) ? me.meetingAttendance : []),
    [me?.meetingAttendance]
  );
  const divineAttendance = useMemo(
    () => (Array.isArray(me?.divineLiturgyAttendance) ? me.divineLiturgyAttendance : []),
    [me?.divineLiturgyAttendance]
  );
  const recurringLiturgies = useMemo(
    () => (Array.isArray(divineQuery.data?.recurringDivineLiturgies) ? divineQuery.data.recurringDivineLiturgies : []),
    [divineQuery.data?.recurringDivineLiturgies]
  );
  const recurringVespers = useMemo(
    () => (Array.isArray(divineQuery.data?.recurringVespers) ? divineQuery.data.recurringVespers : []),
    [divineQuery.data?.recurringVespers]
  );
  const exceptional = useMemo(
    () => (Array.isArray(divineQuery.data?.exceptionalDivineLiturgies) ? divineQuery.data.exceptionalDivineLiturgies : []),
    [divineQuery.data?.exceptionalDivineLiturgies]
  );
  const weeklyServices = recurringLiturgies.length + recurringVespers.length;
  const pendingBookings = bookings.filter((booking) => booking?.status === 'pending').length;
  const unreadChats = chats.filter((thread) => thread?.hasUnread).length;
  const profileScore = Math.round(([
    me?.avatar?.url,
    me?.email,
    me?.address?.governorate || me?.address?.city || me?.address?.street || me?.address?.details,
    me?.familyName,
    me?.houseName,
    me?.notes,
    familyLinksCount(me) > 0,
  ].filter(Boolean).length / 7) * 100);

  const adminBuckets = useMemo(
    () =>
      buildBuckets(6, language, [
        { key: 'conf', label: tx('Confessions', 'الاعترافات'), color: 'bg-primary', map: mapTrend(confAnalyticsQuery.data?.monthlyTrend || []) },
        { key: 'visit', label: tx('Visitations', 'الزيارات'), color: 'bg-accent', map: mapTrend(visitAnalyticsQuery.data?.monthlyTrend || []) },
      ]),
    [confAnalyticsQuery.data?.monthlyTrend, language, tx, visitAnalyticsQuery.data?.monthlyTrend]
  );

  const memberBuckets = useMemo(
    () =>
      buildBuckets(6, language, [
        { key: 'meet', label: tx('Meetings', 'الاجتماعات'), color: 'bg-primary', map: mapDates(meetingAttendance.map((entry) => entry?.attendanceDate)) },
        { key: 'divine', label: tx('Liturgies', 'القداسات'), color: 'bg-success', map: mapDates(divineAttendance.map((entry) => entry?.attendanceDate)) },
        { key: 'book', label: tx('Bookings', 'الحجوزات'), color: 'bg-accent', map: mapDates(bookings.map((entry) => entry?.scheduledDate || entry?.createdAt)) },
      ]),
    [bookings, divineAttendance, language, meetingAttendance, tx]
  );

  const nextExceptional = useMemo(() => {
    const today = isoDate(new Date());
    return exceptional
      .filter((entry) => isoDate(entry?.date) && isoDate(entry.date) >= today)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0] || null;
  }, [exceptional]);

  const familyItems = [
    { label: tx('Parents', 'الوالدان'), value: (me?.father ? 1 : 0) + (me?.mother ? 1 : 0), color: 'bg-primary' },
    { label: tx('Spouse', 'الزوج أو الزوجة'), value: me?.spouse ? 1 : 0, color: 'bg-accent' },
    { label: tx('Siblings', 'الإخوة'), value: Array.isArray(me?.siblings) ? me.siblings.length : 0, color: 'bg-success' },
    { label: tx('Children', 'الأبناء'), value: Array.isArray(me?.children) ? me.children.length : 0, color: 'bg-warning', variant: 'warning' },
    { label: tx('Extended family', 'أقارب آخرون'), value: Array.isArray(me?.familyMembers) ? me.familyMembers.length : 0, color: 'bg-primary' },
  ];

  const bookingItems = ['pending', 'confirmed', 'completed', 'cancelled'].map((status) => ({
    label:
      language === 'ar'
        ? status === 'confirmed'
          ? 'تمت الموافقة'
          : status === 'completed'
            ? 'مكتمل'
            : status === 'cancelled'
              ? 'مرفوض'
              : 'قيد المراجعة'
        : status === 'confirmed'
          ? 'Approved'
          : status === 'completed'
            ? 'Completed'
            : status === 'cancelled'
              ? 'Rejected'
              : 'Pending',
    value: bookings.filter((booking) => booking?.status === status).length,
    color: status === 'pending' ? 'bg-warning' : status === 'completed' ? 'bg-success' : status === 'cancelled' ? 'bg-danger' : 'bg-primary',
    variant: status === 'pending' ? 'warning' : status === 'completed' ? 'success' : status === 'cancelled' ? 'danger' : 'primary',
  }));

  const adminCards = [
    canUsers ? { label: tx('Total users', 'إجمالي الأفراد'), value: usersQuery.isLoading && !usersQuery.data ? dots : usersQuery.data?.total ?? 0, hint: `${usersQuery.data?.active ?? 0} ${tx('active', 'نشط')}` } : null,
    canUsers ? { label: tx('Families', 'العائلات'), value: usersQuery.isLoading && !usersQuery.data ? dots : usersQuery.data?.families ?? 0, hint: tx('Distinct family', 'عدد العائلات') } : null,
    canConfessionAnalytics ? { label: tx('Confessions in 6 months', 'جلسات الاعتراف خلال 6 أشهر'), value: confAnalyticsQuery.isLoading && !confAnalyticsQuery.data ? dots : confSummary.sessionsInPeriod ?? 0, hint: `${confSummary.uniqueAttendees ?? 0} ${tx('unique people', 'شخص مختلف')}`, tone: 'primary' } : null,
    canConfessionAlerts || canConfessionAnalytics ? { label: tx('Overdue follow-up', 'متابعة متأخرة'), value: (confAlertsQuery.isLoading && !confAlertsQuery.data) || (confAnalyticsQuery.isLoading && !confAnalyticsQuery.data) ? dots : overdueAlerts, hint: `${confSummary.upcomingSessions ?? 0} ${tx('upcoming', 'قادم')}`, tone: overdueAlerts > 0 ? 'warning' : 'success' } : null,
    canVisitationAnalytics ? { label: tx('Visitations in 6 months', 'الزيارات خلال 6 أشهر'), value: visitAnalyticsQuery.isLoading && !visitAnalyticsQuery.data ? dots : visitSummary.visitationsInPeriod ?? 0, hint: `${visitSummary.avgDurationMinutes ?? 0} ${tx('avg. minutes', 'متوسط دقيقة')}`, tone: 'primary' } : null,
    canVisitationAnalytics ? { label: tx('Visited houses', 'المنازل التي تمت زيارتها'), value: visitAnalyticsQuery.isLoading && !visitAnalyticsQuery.data ? dots : visitSummary.uniqueHouses ?? 0, hint: `${(visitAnalyticsQuery.data?.topRecorders || []).length} ${tx('active recorders', 'مسجل نشط')}` } : null,
  ].filter(Boolean);

  const memberCards = [
    { label: tx('Profile completion', 'اكتمال الملف الشخصي'), value: meQuery.isLoading && !meQuery.data ? dots : `${profileScore}%`, hint: me?.houseName || tx('No house name yet', 'لا يوجد اسم بيت بعد'), tone: profileScore >= 70 ? 'success' : 'primary' },
    { label: tx('Family links', 'روابط العائلة'), value: meQuery.isLoading && !meQuery.data ? dots : familyLinksCount(me), hint: me?.familyName || tx('No family name yet', 'لا يوجد اسم عائلة بعد') },
    { label: tx('Meeting attendance', 'حضور الاجتماعات'), value: meQuery.isLoading && !meQuery.data ? dots : meetingAttendance.length, hint: `${meetings.length} ${tx('visible meetings', 'اجتماعات ظاهرة')}`, tone: 'primary' },
    { label: tx('Divine attendance', 'حضور القداسات'), value: meQuery.isLoading && !meQuery.data ? dots : divineAttendance.length, hint: `${weeklyServices} ${tx('weekly services', 'خدمات أسبوعية')}`, tone: 'success' },
    canBookings ? { label: tx('Pending bookings', 'الحجوزات المعلقة'), value: bookingsQuery.isLoading && !bookingsQuery.data ? dots : pendingBookings, hint: `${bookings.length} ${tx('total bookings', 'إجمالي الحجوزات')}`, tone: pendingBookings > 0 ? 'warning' : 'default' } : null,
    canChats ? { label: tx('Unread chats', 'دردشات غير مقروءة'), value: chatsQuery.isLoading && !chatsQuery.data ? dots : unreadChats, hint: `${chats.length} ${tx('chat threads', 'محادثة')}`, tone: unreadChats > 0 ? 'warning' : 'default' } : null,
  ].filter(Boolean);

  const actionTone = (warning = false) => (warning ? 'bg-warning-light text-warning' : 'bg-primary/10 text-primary');
  const systemActions = [
    canUsers ? { href: '/dashboard/users', icon: Users, label: tx('Users', 'الأفراد'), desc: tx('Review church accounts and follow-up.', 'راجع حسابات الكنيسة والمتابعة.'), metric: usersQuery.data?.active ?? 0, iconTone: actionTone() } : null,
    canConfessions ? { href: '/dashboard/confessions', icon: CalendarCheck2, label: tx('Confessions', 'الاعترافات'), desc: tx('Open confession sessions and scheduling.', 'افتح الجلسات والجدولة الخاصة بها.'), metric: confSummary.upcomingSessions ?? 0, iconTone: actionTone(), variant: 'primary' } : null,
    canConfessionAlerts ? { href: '/dashboard/confessions/alerts', icon: BellRing, label: tx('Alerts', 'التنبيهات'), desc: tx('Review overdue confession follow-up.', 'راجع حالات المتابعة المتأخرة.'), metric: overdueAlerts, iconTone: actionTone(overdueAlerts > 0), variant: overdueAlerts > 0 ? 'warning' : 'success' } : null,
    canConfessionAnalytics ? { href: '/dashboard/confessions/analytics', icon: BarChart3, label: tx('Confession analytics', 'تحليلات الاعتراف'), desc: tx('Inspect confession volume and trends.', 'حلل الحجم والاتجاهات الحالية.'), metric: confSummary.sessionsInPeriod ?? 0, iconTone: actionTone() } : null,
    canVisitations ? { href: '/dashboard/visitations', icon: Home, label: tx('Visitations', 'الزيارات'), desc: tx('Open the pastoral visitation records.', 'افتح سجلات الزيارات الرعوية.'), metric: visitSummary.visitationsInPeriod ?? 0, iconTone: actionTone() } : null,
    canVisitationAnalytics ? { href: '/dashboard/visitations/analytics', icon: Building2, label: tx('Visitation analytics', 'تحليلات الزيارات'), desc: tx('Track houses and recorders.', 'تابع المنازل والمسجلين.'), metric: visitSummary.uniqueHouses ?? 0, iconTone: actionTone() } : null,
  ].filter(Boolean);

  const memberActions = [
    { href: '/dashboard/profile', icon: UserCircle, label: tx('My profile', 'ملفي الشخصي'), desc: tx('Update your profile and household details.', 'حدّث بياناتك وبيانات البيت.'), metric: `${profileScore}%`, iconTone: actionTone(), variant: profileScore >= 70 ? 'success' : 'primary' },
    canMeetings ? { href: '/dashboard/meetings', icon: Users, label: tx('My meetings', 'اجتماعاتي'), desc: tx('Open the meetings and service workspace.', 'افتح الاجتماعات وصفحات الخدمة.'), metric: meetings.length, iconTone: actionTone() } : null,
    canDivine ? { href: '/dashboard/divine-liturgies', icon: CalendarDays, label: tx('Divine liturgies', 'القداسات'), desc: tx('See recurring and exceptional services.', 'راجع الخدمات الدورية والاستثنائية.'), metric: weeklyServices, iconTone: 'bg-success-light text-success', variant: 'success' } : null,
    canBookings ? { href: '/dashboard/bookings/mine', icon: NotebookPen, label: tx('My bookings', 'حجوزاتي'), desc: tx('Track approvals, notes, and request status.', 'تابع الموافقات والملاحظات وحالة الطلب.'), metric: pendingBookings, iconTone: actionTone(pendingBookings > 0), variant: pendingBookings > 0 ? 'warning' : 'primary' } : null,
    canNotifications ? { href: '/dashboard/notifications', icon: BellRing, label: tx('Notifications', 'الإشعارات'), desc: tx('Read the latest church announcements.', 'اقرأ آخر إعلانات الكنيسة.'), metric: notifications.length, iconTone: actionTone() } : null,
    canChats ? { href: '/dashboard/chats', icon: MessageCircle, label: tx('Chats', 'الدردشات'), desc: tx('Jump into unread and active conversations.', 'ادخل مباشرة إلى المحادثات غير المقروءة.'), metric: unreadChats, iconTone: actionTone(unreadChats > 0), variant: unreadChats > 0 ? 'warning' : 'primary' } : null,
  ].filter(Boolean);

  const highlights = systemMode
    ? [
      { label: tx('Top session type', 'أكثر نوع جلسة'), value: confAnalyticsQuery.data?.typeBreakdown?.[0]?.sessionType || tx('Not available', 'غير متاح') },
      { label: tx('Most visited house', 'أكثر منزل تمت زيارته'), value: visitAnalyticsQuery.data?.topHouses?.[0]?.houseName || tx('Not available', 'غير متاح') },
      { label: tx('Most active recorder', 'أكثر مسجل نشاطًا'), value: visitAnalyticsQuery.data?.topRecorders?.[0]?.fullName || tx('Not available', 'غير متاح') },
      { label: tx('Average visit duration', 'متوسط مدة الزيارة'), value: `${visitSummary.avgDurationMinutes ?? 0} ${tx('minutes', 'دقيقة')}` },
    ]
    : [
      { label: tx('Visible meetings', 'الاجتماعات الظاهرة'), value: `${meetings.length}` },
      { label: tx('Weekly services', 'الخدمات الأسبوعية'), value: `${weeklyServices}` },
      { label: tx('Active notifications', 'الإشعارات النشطة'), value: `${notifications.length}` },
      { label: tx('Next exceptional service', 'أقرب خدمة استثنائية'), value: nextExceptional?.date ? formatDate(nextExceptional.date) : tx('No upcoming exceptional service', 'لا توجد خدمة استثنائية قادمة') },
    ];

  const confessionItems = (confAnalyticsQuery.data?.typeBreakdown || []).map((item, index) => ({
    label: item.sessionType,
    value: item.count,
    color: index % 2 === 0 ? 'bg-primary' : 'bg-accent',
  }));

  const houseItems = (visitAnalyticsQuery.data?.topHouses || []).map((item, index) => ({
    label: item.houseName,
    value: item.count,
    meta: `${item.avgDurationMinutes || 0} ${tx('avg. min', 'متوسط دقيقة')}`,
    color: index % 2 === 0 ? 'bg-primary' : 'bg-accent',
  }));

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        className="border-b border-border pb-6"
        eyebrow={todayLabel}
        title={t('dashboardHome.welcome', { name: user?.fullName || '' })}
        subtitle={
          systemMode
            ? tx('Live church analytics built from your system data.', 'لوحة تحليلات حية مبنية من بيانات النظام.')
            : tx('Your own church activity, requests, and household context.', 'نشاطك الشخصي وطلباتك وسياق البيت الخاص بك.')
        }
        actions={(
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary">{getRoleLabel(user?.role)}</Badge>
            <Badge variant={user?.isLocked ? 'danger' : 'success'}>
              {user?.isLocked ? t('common.status.locked') : t('common.status.active')}
            </Badge>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-3 py-1 text-xs font-medium text-muted">
              <ShieldCheck className="h-3 w-3" />
              {systemMode ? tx('System analytics', 'تحليلات النظام') : tx('My analytics', 'تحليلاتي')}
            </span>
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(systemMode ? adminCards : memberCards).map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-card">
            <SectionHeading
              eyebrow={tx('Last 6 months', 'آخر 6 أشهر')}
              title={systemMode ? tx('Monthly ministry activity', 'النشاط الشهري للخدمة') : tx('My activity timeline', 'مخطط نشاطي')}
              subtitle={
                systemMode
                  ? tx('Confession sessions and visitations stacked together.', 'جلسات الاعتراف والزيارات مكدسة معًا.')
                  : tx('Meetings, liturgies, and bookings over time.', 'الاجتماعات والقداسات والحجوزات عبر الوقت.')
              }
              icon={BarChart3}
            />
            <div className="mt-6">
              <StackedBars
                buckets={systemMode ? adminBuckets : memberBuckets}
                emptyLabel={tx('No data available yet.', 'لا توجد بيانات بعد.')}
                lastLabel={tx('Last 6 months', 'آخر 6 أشهر')}
              />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-border bg-surface p-6 shadow-card">
              <SectionHeading
                eyebrow={systemMode ? tx('Confession analytics', 'تحليلات الاعتراف') : tx('Household details', 'تفاصيل البيت')}
                title={systemMode ? tx('Confession session mix', 'توزيع أنواع جلسات الاعتراف') : tx('Family and household context', 'سياق العائلة والبيت')}
                subtitle={
                  systemMode
                    ? tx('The session types most used in the current period.', 'أكثر أنواع الجلسات استخدامًا في الفترة الحالية.')
                    : tx('House data available from your own profile record.', 'بيانات البيت المتاحة من ملفك الشخصي فقط.')
                }
              />
              {!systemMode ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge variant="secondary">{tx('Family', 'العائلة')}: {me?.familyName || tx('No family name yet', 'لا يوجد اسم عائلة بعد')}</Badge>
                  <Badge variant="primary">{tx('House', 'البيت')}: {me?.houseName || tx('No house name yet', 'لا يوجد اسم بيت بعد')}</Badge>
                </div>
              ) : null}
              <div className="mt-6">
                <MetricBars
                  items={systemMode ? confessionItems : familyItems}
                  emptyLabel={tx('No data available yet.', 'لا توجد بيانات بعد.')}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-surface p-6 shadow-card">
              <SectionHeading
                eyebrow={systemMode ? tx('Visitation analytics', 'تحليلات الزيارات') : tx('My bookings', 'حجوزاتي')}
                title={systemMode ? tx('Top visited houses', 'أكثر المنازل افتقادًا') : tx('My booking status', 'حالة حجوزاتي')}
                subtitle={
                  systemMode
                    ? tx('Homes receiving the highest visitation volume.', 'المنازل التي تستقبل أكبر حجم من الزيارات.')
                    : tx('How your requests are distributed right now.', 'توزيع طلباتك الحالية حسب الحالة.')
                }
              />
              <div className="mt-6">
                <MetricBars
                  items={systemMode ? houseItems : bookingItems}
                  emptyLabel={systemMode ? tx('No data available yet.', 'لا توجد بيانات بعد.') : tx('You have not submitted any bookings yet.', 'لم تقم بإرسال أي حجز بعد.')}
                />
              </div>
            </section>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-card">
            <SectionHeading
              eyebrow={tx('Open', 'فتح')}
              title={tx('Quick actions', 'إجراءات سريعة')}
              subtitle={tx('Use the dashboard as a launchpad into the modules you need next.', 'استخدم لوحة البداية للوصول السريع إلى الوحدات التي تحتاجها.')}
            />
            <div className="mt-6 space-y-3">
              {(systemMode ? systemActions : memberActions).length === 0 ? (
                <p className="text-sm text-muted">{tx('No quick actions are available for your current access.', 'لا توجد إجراءات سريعة ضمن صلاحياتك الحالية.')}</p>
              ) : (
                (systemMode ? systemActions : memberActions).map((action) => (
                  <QuickAction key={action.href} action={action} isRTL={isRTL} openLabel={tx('Open', 'فتح')} />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
