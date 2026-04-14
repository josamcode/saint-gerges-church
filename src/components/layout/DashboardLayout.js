import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Church,
  LayoutDashboard,
  Users,
  UserCircle,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  FileClock,
  Sun,
  Moon,
  Construction,
  CalendarCheck2,
  BellRing,
  BarChart3,
  Sparkles,
  Building2,
  CalendarDays,
  Layers3,
  Settings2,
  X,
  CalendarClock,
  Image,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../auth/auth.hooks';
import { bookingsApi, chatApi, userNotificationsApi } from '../../api/endpoints';
import AppRouteEffects from '../../app/AppRouteEffects';
import NotificationBell from '../notifications/NotificationBell';
import {
  getUnreadBadgeLabel,
  NOTIFICATION_UNREAD_COUNT_QUERY_KEY,
} from '../notifications/notificationCenter.shared';
import Tooltip from '../ui/Tooltip';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useI18n } from '../../i18n/i18n';
import { getRoleLabel } from '../../utils/formatters';

// ─────────────────────────────────────────────────────────────────────────────
// NavItem
// ─────────────────────────────────────────────────────────────────────────────
function NavItem({ item, active, collapsed, isRTL, tooltipSide, onClick }) {
  const badgeClassName = item.badgeGlow
    ? 'bg-danger ring-4 ring-danger/15 shadow-[0_0_18px_rgba(220,38,38,0.45)] motion-safe:animate-pulse'
    : 'bg-danger';

  if (collapsed) {
    return (
      <Tooltip content={item.label} position={tooltipSide}>
        <Link
          to={item.href}
          onClick={onClick}
          className={[
            'relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150',
            active
              ? 'bg-primary text-white/90 shadow-md shadow-primary/20'
              : 'text-muted hover:bg-surface-alt hover:text-heading',
          ].join(' ')}
        >
          <item.icon className="h-[18px] w-[18px]" />
          {item.badge ? (
            <span className={`absolute -top-1 flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ${badgeClassName} ${isRTL ? '-left-1' : '-right-1'}`}>
              {item.badge}
            </span>
          ) : null}
          {active && (
            <span className={`absolute inset-y-2.5 w-0.5 rounded-full bg-primary-light/60 ${isRTL ? 'right-0.5' : 'left-0.5'}`} />
          )}
        </Link>
      </Tooltip>
    );
  }

  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={[
        'group relative flex w-full items-center gap-3 rounded-xl font-medium transition-all duration-150 select-none',
        'px-3 py-2.5 text-sm',
        active
          ? 'bg-primary text-white/90 shadow-md rounded-sm shadow-primary/20'
          : 'text-muted hover:bg-surface-alt hover:text-heading',
      ].join(' ')}
    >
      {active && (
        <span className={`absolute inset-y-2.5 w-0.5 rounded-full bg-primary-light/60 ${isRTL ? 'right-0' : 'left-0'}`} />
      )}
      <span className={[
        'flex flex-shrink-0 items-center justify-center rounded-lg transition-colors',
        'h-7 w-7',
        active ? 'text-white/90' : 'text-muted group-hover:text-heading',
      ].join(' ')}>
        <item.icon className="h-4 w-4" />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate">{item.label}</span>
        {item.badge ? (
          <span className={`inline-flex flex-shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold leading-none text-white ${badgeClassName}`}>
            {item.badge}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
function NavDivider({ collapsed }) {
  return (
    <div className={`my-1.5 ${collapsed ? 'flex justify-center' : ''}`}>
      <div className={`h-px bg-border/30 ${collapsed ? 'w-8' : 'w-full'}`} />
    </div>
  );
}

function NavSectionLabel({ label }) {
  return (
    <p className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted/40 first:mt-0">
      {label}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardLayout
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  const { user, logout, hasPermission } = useAuth();
  const { t, isRTL } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const tf = useCallback((key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);
  const canViewBookingRequests =
    hasPermission('BOOKINGS_VIEW') || hasPermission('BOOKINGS_MANAGE');
  const canViewChats = hasPermission('CHATS_VIEW');
  const canViewNotifications = hasPermission('NOTIFICATIONS_VIEW');
  const hasFullMeetingsView = hasPermission('MEETINGS_VIEW');
  const hasOwnMeetingsViewOnly = hasPermission('MEETINGS_VIEW_OWN') && !hasFullMeetingsView;
  const hasAssignedMeetings = useMemo(
    () => Array.isArray(user?.meetingIds) && user.meetingIds.length > 0,
    [user?.meetingIds]
  );
  const pendingBookingsQuery = useQuery({
    queryKey: ['dashboard', 'sidebar', 'bookings', 'pending-count'],
    enabled: canViewBookingRequests,
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await bookingsApi.admin.list({ status: 'pending', limit: 1 });
      return data;
    },
  });
  const pendingBookingsCount = pendingBookingsQuery.data?.meta?.totalCount ?? 0;
  const pendingBookingsBadge =
    pendingBookingsCount > 99 ? '99+' : pendingBookingsCount > 0 ? String(pendingBookingsCount) : null;
  const unreadChatsQuery = useQuery({
    queryKey: ['chats', 'list'],
    enabled: canViewChats,
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await chatApi.list();
      return data.data || [];
    },
  });
  const unreadChatsCount = useMemo(() => {
    const threads = Array.isArray(unreadChatsQuery.data) ? unreadChatsQuery.data : [];
    return threads.reduce((total, thread) => total + Number(thread?.unreadCount || 0), 0);
  }, [unreadChatsQuery.data]);
  const unreadChatsBadge =
    unreadChatsCount > 99 ? '99+' : unreadChatsCount > 0 ? String(unreadChatsCount) : null;
  const unreadNotificationsQuery = useQuery({
    queryKey: NOTIFICATION_UNREAD_COUNT_QUERY_KEY,
    enabled: canViewNotifications,
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await userNotificationsApi.unreadCount();
      return Number(data?.data?.unreadCount || 0);
    },
  });
  const unreadNotificationsCount = Number(unreadNotificationsQuery.data || 0);
  const unreadNotificationsBadge = getUnreadBadgeLabel(unreadNotificationsCount);

  // ── Menu definitions ──────────────────────────────────────────────────────

  const topItems = useMemo(() => [
    {
      label: t('dashboardLayout.menu.dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      permission: null,
      matchChildren: false,
    },
    {
      label: t('dashboardLayout.menu.profile'),
      href: '/dashboard/profile',
      icon: UserCircle,
      permission: 'AUTH_VIEW_SELF',
      matchChildren: false,
    },
  ], [t]);

  const groupedItems = useMemo(() => [
    {
      key: 'users',
      sectionLabel: t('dashboardLayout.section.usersManagement'),
      parent: {
        label: t('dashboardLayout.menu.users'),
        href: '/dashboard/users',
        icon: Users,
        permission: 'USERS_VIEW',
        matchChildren: true,
      },
      children: [
        {
          key: 'users-requests',
          label: tf('dashboardLayout.menu.userRequests', 'User Requests'),
          href: '/dashboard/users/requests',
          icon: FileClock,
          permission: 'USERS_VIEW',
          matchChildren: false,
        },
        // {
        //   key: 'family-house-lookup',
        //   label: tf('dashboardLayout.menu.familyHouseLookup', 'Family & House Lookup'),
        //   href: '/dashboard/users/family-house',
        //   icon: Building2,
        //   permission: 'USERS_VIEW',
        //   matchChildren: false,
        // },
        {
          key: 'users-explorer',
          label: tf('dashboardLayout.menu.usersExplorer', 'User Explorer'),
          href: '/dashboard/users/explorer',
          icon: Sparkles,
          permission: 'USERS_VIEW',
          matchChildren: false,
        },
        {
          key: 'family-house-analytics',
          label: tf('dashboardLayout.menu.familyHouseAnalytics', 'Family Analytics'),
          href: '/dashboard/users/family-house/analytics',
          icon: BarChart3,
          permission: 'USERS_VIEW',
          matchChildren: false,
        },
        {
          key: 'family-house-details',
          label: tf('dashboardLayout.menu.familyHouseDetails', 'Family/House Details'),
          href: '/dashboard/users/family-house/details',
          icon: Building2,
          permission: 'USERS_VIEW',
          matchChildren: false,
        },
        // {
        //   key: 'birthdays',
        //   label: tf('dashboardLayout.menu.birthdays', 'Birthdays'),
        //   href: '/dashboard/under-development',
        //   icon: Building2,
        //   // permission: '',
        //   // matchChildren: false,
        // }
      ],
    },
    {
      key: 'the-lords-brethren',
      sectionLabel: t('dashboardLayout.section.theLordsBrethren'),
      parent: {
        label: t('dashboardLayout.menu.theLordsBrethren'),
        icon: Users,
        href: '/dashboard/lords-brethren',
        permission: 'HOUSEHOLD_CLASSIFICATIONS_VIEW',
        matchChildren: false,
      },
      children: [
        {
          key: 'household-results',
          label: tf('dashboardLayout.menu.householdClassificationResults', 'Household Statuses'),
          href: '/dashboard/households/results',
          icon: Building2,
          permission: 'HOUSEHOLD_CLASSIFICATIONS_VIEW',
          matchChildren: false,
        },
        {
          key: 'household-classifications',
          label: tf(
            'dashboardLayout.menu.householdClassificationRules',
            'Household Classification Rules'
          ),
          href: '/dashboard/households/classifications',
          icon: Sparkles,
          permission: 'HOUSEHOLD_CLASSIFICATIONS_MANAGE',
          matchChildren: false,
        },
        {
          key: 'lords-brethren-aid-history',
          label: tf('dashboardLayout.menu.disbursedAidHistory', 'المساعدات المصروفة'),
          href: '/dashboard/lords-brethren/aid-history',
          icon: Users,
          permission: 'HOUSEHOLD_CLASSIFICATIONS_VIEW',
          matchChildren: true,
        },
      ]
    },
    {
      key: 'confessions',
      sectionLabel: t('dashboardLayout.section.confessions'),
      parent: {
        label: t('dashboardLayout.menu.confessionSessions'),
        href: '/dashboard/confessions',
        icon: CalendarCheck2,
        permission: 'CONFESSIONS_VIEW',
        matchChildren: true,
      },
      children: [
        {
          label: t('confessions.sessions.createAction'),
          href: '/dashboard/confessions/new',
          icon: Sparkles,
          permission: 'CONFESSIONS_CREATE',
          matchChildren: false,
        },
        {
          label: t('dashboardLayout.menu.confessionAlerts'),
          href: '/dashboard/confessions/alerts',
          icon: BellRing,
          permission: 'CONFESSIONS_ALERTS_VIEW',
          matchChildren: false,
        },
        {
          label: t('dashboardLayout.menu.confessionAnalytics'),
          href: '/dashboard/confessions/analytics',
          icon: BarChart3,
          permission: 'CONFESSIONS_ANALYTICS_VIEW',
          matchChildren: false,
        },
      ],
    },
    {
      key: 'visitations',
      sectionLabel: t('dashboardLayout.section.visitations'),
      parent: {
        label: t('dashboardLayout.menu.pastoralVisitations'),
        href: '/dashboard/visitations',
        icon: CalendarCheck2,
        permission: 'PASTORAL_VISITATIONS_VIEW',
        matchChildren: true,
      },
      children: [
        {
          label: t('dashboardLayout.menu.pastoralVisitationsCreate'),
          href: '/dashboard/visitations/new',
          icon: Sparkles,
          permission: 'PASTORAL_VISITATIONS_CREATE',
          matchChildren: false,
        },
        {
          label: t('dashboardLayout.menu.pastoralVisitationsAnalytics'),
          href: '/dashboard/visitations/analytics',
          icon: BarChart3,
          permission: 'PASTORAL_VISITATIONS_ANALYTICS_VIEW',
          matchChildren: false,
        },
      ],
    },
    {
      key: 'divine-liturgies',
      sectionLabel: t('dashboardLayout.section.divineLiturgies'),
      parent: {
        label: t('dashboardLayout.menu.divineLiturgies'),
        href: '/dashboard/divine-liturgies',
        icon: Church,
        permission: [
          'DIVINE_LITURGIES_VIEW',
          'DIVINE_LITURGIES_MANAGE',
          'DIVINE_LITURGIES_ATTENDANCE_MANAGE',
          'DIVINE_LITURGIES_ATTENDANCE_MANAGE_ASSIGNED_USERS',
        ],
        matchChildren: true,
      },
      children: [
        {
          label: t('dashboardLayout.menu.churchPriests'),
          href: '/dashboard/divine-liturgies/priests',
          icon: Users,
          permission: 'DIVINE_LITURGIES_VIEW',
          matchChildren: false,
        },
      ],
    },
    {
      key: 'communication',
      sectionLabel: tf('dashboardLayout.section.communication', 'Communication'),
      parent: {
        label: tf('dashboardLayout.menu.chats', 'Chats'),
        href: '/dashboard/chats',
        badge: unreadChatsBadge,
        badgeGlow: unreadChatsCount > 0,
        icon: MessageSquare,
        permission: 'CHATS_VIEW',
        matchChildren: true,
      },
      children: [],
    },
    {
      key: 'notifications',
      sectionLabel: tf('dashboardLayout.section.notifications', 'Notifications'),
      parent: {
        label: tf('dashboardLayout.menu.notifications', 'Notifications'),
        href: '/dashboard/notifications',
        badge: unreadNotificationsBadge,
        badgeGlow: unreadNotificationsCount > 0,
        icon: BellRing,
        permission: 'NOTIFICATIONS_VIEW',
        matchChildren: true,
      },
      children: [],
    },
    {
      key: 'archive',
      sectionLabel: tf('dashboardLayout.menu.archive', 'Archive'),
      parent: {
        label: tf('dashboardLayout.menu.archive', 'Archive'),
        href: '/dashboard/archive',
        icon: Image,
        permission: [
          'ARCHIVE_VIEW',
          'ARCHIVE_UPLOAD',
          'ARCHIVE_COLLECTIONS_MANAGE',
          'ARCHIVE_STORIES_MANAGE',
          'ARCHIVE_HONOREES_MANAGE',
          'ARCHIVE_PUBLISH',
        ],
        matchChildren: false,
      },
      children: [],
    },
    {
      // key: 'bookings',
      key: 'bookings-requests',
      sectionLabel: tf('dashboardLayout.section.bookings', 'Bookings'),
      parent: {
        // label: tf('dashboardLayout.menu.bookings', 'Bookings'),
        // href: '/dashboard/bookings',
        label: tf('dashboardLayout.menu.bookingRequests', 'Booking requests'),
        href: '/dashboard/bookings/requests',
        badge: pendingBookingsBadge,
        icon: CalendarClock,
        permission: ['BOOKINGS_VIEW', 'BOOKINGS_MANAGE', 'BOOKINGS_TYPES_MANAGE'],
        matchChildren: true,
      },
      children: [
        {
          key: 'booking-types',
          label: tf('dashboardLayout.menu.bookingTypes', 'Booking types'),
          href: '/dashboard/bookings/types',
          icon: Settings2,
          permission: 'BOOKINGS_TYPES_MANAGE',
          matchChildren: false,
        },
        {
          key: 'my-bookings',
          label: tf('dashboardLayout.menu.myBookings', 'My bookings'),
          href: '/dashboard/bookings/mine',
          icon: CalendarCheck2,
          permission: ['BOOKINGS_VIEW_OWN', 'BOOKINGS_VIEW', 'BOOKINGS_MANAGE'],
          matchChildren: false,
        },
      ],
    },
    {
      key: 'meetings',
      sectionLabel: t('dashboardLayout.section.meetings'),
      parent: {
        label: t('dashboardLayout.menu.meetingsAndSectors'),
        href: '/dashboard/meetings',
        icon: CalendarDays,
        // hidden: hasOwnMeetingsViewOnly,
        permission: null,
        matchChildren: true,
      },
      children: [
        {
          key: 'meetings-my',
          label: tf('dashboardLayout.menu.myMeetings', 'My Meetings'),
          href: '/dashboard/meetings/list',
          icon: CalendarDays,
          permission: 'MEETINGS_VIEW_OWN',
          excludePermissions: ['MEETINGS_VIEW'],
          requiresMeetingAssignment: true,
          matchChildren: true,
        },
        {
          label: t('dashboardLayout.menu.sectorsManagement'),
          href: '/dashboard/meetings/sectors',
          icon: Layers3,
          permission: ['SECTORS_VIEW', 'SECTORS_CREATE', 'SECTORS_UPDATE', 'SECTORS_DELETE'],
          matchChildren: true,
        },
        {
          key: 'meetings-management',
          label: t('dashboardLayout.menu.meetingsManagement'),
          href: '/dashboard/meetings/list',
          icon: CalendarDays,
          hidden: hasOwnMeetingsViewOnly,
          permission: [
            'MEETINGS_VIEW',
            'MEETINGS_CREATE',
            'MEETINGS_UPDATE',
            'MEETINGS_DELETE',
            'MEETINGS_SERVANTS_MANAGE',
            'MEETINGS_COMMITTEES_MANAGE',
            'MEETINGS_ACTIVITIES_MANAGE',
            'MEETINGS_DOCUMENTATION_MANAGE',
          ],
          matchChildren: true,
        },
      ],
    },
    {
      key: 'settings',
      sectionLabel: t('dashboardLayout.section.settings'),
      parent: {
        label: tf('dashboardLayout.menu.accountSettings', 'Account Settings'),
        href: '/dashboard/settings/account',
        icon: Settings2,
        permission: 'AUTH_VIEW_SELF',
        matchChildren: false,
      },
      children: [
        {
          key: 'platform-settings',
          label: tf('dashboardLayout.menu.platformSettings', 'Platform Settings'),
          href: '/dashboard/settings/platform',
          icon: BellRing,
          permission: 'NOTIFICATIONS_TEMPLATES_MANAGE',
          matchChildren: false,
        },
        {
          label: t('dashboardLayout.menu.landingContent'),
          href: '/dashboard/public-site/landing',
          icon: Church,
          permission: 'LANDING_CONTENT_MANAGE',
          matchChildren: false,
        },
        {
          key: 'system-analytics',
          label: tf('dashboardLayout.menu.systemAnalytics', 'System Analytics'),
          href: '/dashboard/system-analytics',
          icon: BarChart3,
          permission: 'SYSTEM_ANALYTICS_VIEW',
          matchChildren: false,
        },
      ],
    },
  ], [
    t,
    tf,
    hasOwnMeetingsViewOnly,
    pendingBookingsBadge,
    unreadChatsBadge,
    unreadChatsCount,
    unreadNotificationsBadge,
    unreadNotificationsCount,
  ]);

  const bottomItems = useMemo(() => [
    {
      label: t('dashboardLayout.menu.underDevelopment'),
      href: '/dashboard/under-development',
      icon: Construction,
      permission: null,
      matchChildren: false,
    },
  ], [t]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const isItemAllowed = useCallback((item) => {
    if (item.hidden) return false;

    let isAllowed = true;

    if (item.permission) {
      isAllowed = Array.isArray(item.permission)
        ? item.permission.some((p) => hasPermission(p))
        : hasPermission(item.permission);
    }

    if (!isAllowed) return false;

    if (Array.isArray(item.excludePermissions) && item.excludePermissions.some((p) => hasPermission(p))) {
      return false;
    }

    if (item.requiresMeetingAssignment && !hasAssignedMeetings) {
      return false;
    }

    return true;
  }, [hasPermission, hasAssignedMeetings]);

  const doesItemMatchPath = useCallback((item, pathname) => {
    if (!item?.href) return false;
    if (pathname === item.href) return true;
    if (!item.matchChildren) return false;
    return pathname.startsWith(`${item.href}/`);
  }, []);

  // ── Filtered menu ─────────────────────────────────────────────────────────

  const visibleTopItems = useMemo(() => topItems.filter(isItemAllowed), [topItems, isItemAllowed]);

  const visibleManageSections = useMemo(
    () =>
      groupedItems
        .map((group) => {
          const items = [group.parent, ...group.children].filter(isItemAllowed);
          if (!items.length) return null;
          return {
            key: group.key,
            label: group.sectionLabel,
            items,
          };
        })
        .filter(Boolean),
    [groupedItems, isItemAllowed]
  );

  const visibleManageItems = useMemo(
    () => visibleManageSections.flatMap((section) => section.items),
    [visibleManageSections]
  );

  const visibleBottomItems = useMemo(() => bottomItems.filter(isItemAllowed), [bottomItems, isItemAllowed]);

  // ── Active item (for breadcrumb) ──────────────────────────────────────────

  const visibleNavItems = useMemo(
    () => [...visibleTopItems, ...visibleManageItems, ...visibleBottomItems].filter((item) => item.href),
    [visibleTopItems, visibleManageItems, visibleBottomItems]
  );

  const activeHref = useMemo(() => {
    const matches = visibleNavItems
      .filter((item) => doesItemMatchPath(item, location.pathname))
      .sort((a, b) => b.href.length - a.href.length);
    return matches[0]?.href ?? null;
  }, [visibleNavItems, doesItemMatchPath, location.pathname]);

  const isItemActive = useCallback(
    (item) => Boolean(item?.href && item.href === activeHref),
    [activeHref]
  );

  const activeItem = useMemo(
    () => visibleNavItems.find((item) => item.href === activeHref),
    [visibleNavItems, activeHref]
  );

  // ── Theme / auth ──────────────────────────────────────────────────────────

  const toggleDark = useCallback(() => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }, [darkMode]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/auth/login');
  }, [logout, navigate]);

  const tooltipSide = isRTL ? 'left' : 'right';
  const CollapseIcon = isRTL
    ? (collapsed ? ChevronLeft : ChevronRight)
    : (collapsed ? ChevronRight : ChevronLeft);

  // ── Nav JSX helpers (pure JSX, not components — no state risk) ────────────

  const renderExpandedNav = (onLinkClick) => (
    <>
      <NavSectionLabel label={t('dashboardLayout.section.main')} />

      {visibleTopItems.map((item) => (
        <NavItem
          key={item.key ?? item.href}
          item={item}
          active={isItemActive(item)}
          collapsed={false}
          isRTL={isRTL}
          tooltipSide={tooltipSide}
          onClick={onLinkClick}
        />
      ))}

      {visibleManageSections.length > 0 && (
        <>
          <NavDivider collapsed={false} />
          {visibleManageSections.map((section, index) => (
            <div key={section.key}>
              <NavSectionLabel label={section.label} />
              {section.items.map((item) => (
                <NavItem
                  key={item.key ?? item.href}
                  item={item}
                  active={isItemActive(item)}
                  collapsed={false}
                  isRTL={isRTL}
                  tooltipSide={tooltipSide}
                  onClick={onLinkClick}
                />
              ))}
              {index < visibleManageSections.length - 1 && <NavDivider collapsed={false} />}
            </div>
          ))}
        </>
      )}

      {/* {visibleBottomItems.length > 0 && (
        <>
          <NavDivider collapsed={false} />
          <NavSectionLabel label={t('dashboardLayout.section.other')} />
          {visibleBottomItems.map((item) => (
            <NavItem
              key={item.key ?? item.href}
              item={item}
              active={isItemActive(item)}
              collapsed={false}
              isRTL={isRTL}
              tooltipSide={tooltipSide}
              onClick={onLinkClick}
            />
          ))}
        </>
      )} */}
    </>
  );

  const renderCollapsedNav = () => (
    <>
      {visibleTopItems.map((item) => (
        <NavItem
          key={item.key ?? item.href}
          item={item}
          active={isItemActive(item)}
          collapsed
          isRTL={isRTL}
          tooltipSide={tooltipSide}
          onClick={() => { }}
        />
      ))}

      {visibleManageItems.length > 0 && <NavDivider collapsed />}

      {visibleManageItems.map((item) => (
        <NavItem
          key={item.key ?? item.href}
          item={item}
          active={isItemActive(item)}
          collapsed
          isRTL={isRTL}
          tooltipSide={tooltipSide}
          onClick={() => { }}
        />
      ))}

      {visibleBottomItems.length > 0 && <NavDivider collapsed />}

      {visibleBottomItems.map((item) => (
        <NavItem
          key={item.key ?? item.href}
          item={item}
          active={isItemActive(item)}
          collapsed
          isRTL={isRTL}
          tooltipSide={tooltipSide}
          onClick={() => { }}
        />
      ))}
    </>
  );

  // ── Sidebar footer (shared between desktop & mobile) ─────────────────────
  // Defined as a real component OUTSIDE render so it never remounts.
  // We pass all dependencies as props.

  const footerProps = {
    collapsed,
    darkMode,
    toggleDark,
    handleLogout,
    tooltipSide,
    user,
    t,
    isRTL,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-page">
      <AppRouteEffects />
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-primary/8 blur-[80px]" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-accent/8 blur-[60px]" />
      </div>

      <div className="flex">

        {/* ── Desktop Sidebar ───────────────────────────────────────────── */}
        <aside
          className={[
            'fixed top-0 z-30 hidden h-screen flex-col bg-surface transition-[width] duration-300 ease-in-out lg:flex',
            isRTL ? 'right-0 border-l border-border/45' : 'left-0 border-r border-border/45',
            collapsed ? 'w-[68px]' : 'w-[260px]',
          ].join(' ')}
        >
          {/* Brand */}
          <div className={[
            'flex flex-shrink-0 items-center gap-3 border-b border-border/35',
            collapsed ? 'justify-center px-2 py-[14px]' : 'px-4 py-[14px]',
          ].join(' ')}>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white/90 shadow-md shadow-primary/25 transition-all hover:scale-105 active:scale-95"
            >
              <img src='/logo.PNG' />
            </button>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold leading-tight tracking-tight text-heading">
                  {t('common.appName')}
                </p>
                <p className="truncate text-[11px] leading-tight text-muted/60">
                  {user?.role ? getRoleLabel(user.role) : ''}
                </p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className={[
            'flex-1 overflow-y-auto overflow-x-hidden py-3',
            collapsed ? 'flex flex-col items-center gap-1 px-2' : 'space-y-0.5 px-3',
          ].join(' ')}>
            {collapsed ? renderCollapsedNav() : renderExpandedNav(() => { })}
          </nav>

          {/* Footer */}
          <SidebarFooter {...footerProps} onLinkClick={() => { }} />

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={[
              'absolute top-[52px] flex h-5 w-5 items-center justify-center rounded-full border border-border/50 bg-surface text-muted shadow-sm transition-all hover:border-primary/30 hover:text-primary',
              isRTL ? '-left-2.5' : '-right-2.5',
            ].join(' ')}
            aria-label={collapsed ? t('dashboardLayout.expandSidebar') : t('dashboardLayout.collapseSidebar')}
          >
            <CollapseIcon className="h-2.5 w-2.5" />
          </button>
        </aside>

        {/* ── Mobile Drawer ──────────────────────────────────────────────── */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setSidebarOpen(false)} />
            <aside className={[
              'absolute top-0 flex h-full w-[260px] flex-col bg-surface shadow-2xl',
              isRTL ? 'right-0 border-l border-border/45' : 'left-0 border-r border-border/45',
            ].join(' ')}>
              {/* Header + close */}
              <div className="flex flex-shrink-0 items-center gap-3 border-b border-border/35 px-4 py-[14px]">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white/90 shadow-md shadow-primary/25"
                >
                  <img src='/logo.PNG' />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold leading-tight tracking-tight text-heading">
                    {t('common.appName')}
                  </p>
                  <p className="truncate text-[11px] leading-tight text-muted/60">
                    {user?.role ? getRoleLabel(user.role) : ''}
                  </p>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-alt hover:text-heading"
                  aria-label={t('common.actions.close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-3 py-3">
                {renderExpandedNav(() => setSidebarOpen(false))}
              </nav>

              {/* Footer */}
              <SidebarFooter {...footerProps} onLinkClick={() => setSidebarOpen(false)} />
            </aside>
          </div>
        )}

        {/* ── Main area ─────────────────────────────────────────────────── */}
        <div className={[
          'flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-in-out',
          collapsed
            ? isRTL ? 'lg:mr-[68px]' : 'lg:ml-[68px]'
            : isRTL ? 'lg:mr-[260px]' : 'lg:ml-[260px]',
        ].join(' ')}>

          {/* Topbar */}
          <header className="sticky top-0 z-20 flex h-[56px] flex-shrink-0 items-center gap-3 border-b border-border/35 bg-surface/95 px-4 backdrop-blur-sm lg:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 text-muted transition-colors hover:bg-surface-alt hover:text-heading lg:hidden"
              aria-label={t('common.actions.openMenu')}
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Breadcrumb */}
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="hidden text-[13px] text-muted/50 lg:inline">{t('common.appName')}</span>
              {activeItem ? (
                <>
                  <ChevronRight className="hidden h-3 w-3 flex-shrink-0 text-muted/30 lg:block" />
                  <h1 className="truncate text-[13px] font-semibold text-heading">{activeItem.label}</h1>
                </>
              ) : (
                <h1 className="truncate text-[13px] font-semibold text-heading">
                  {t('dashboardLayout.menu.dashboard')}
                </h1>
              )}
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>

              <NotificationBell />

              <button
                onClick={toggleDark}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 text-muted transition-colors hover:bg-surface-alt hover:text-heading"
                aria-label={darkMode ? t('common.theme.light') : t('common.theme.dark')}
              >
                {darkMode ? <Sun className="h-[15px] w-[15px]" /> : <Moon className="h-[15px] w-[15px]" />}
              </button>

              <Link
                to="/dashboard/profile"
                className="flex items-center gap-2 rounded-xl border border-border/40 bg-surface-alt/40 px-2 py-1.5 transition-colors hover:border-primary/20 hover:bg-surface-alt"
              >
                {user?.avatar?.url ? (
                  <img src={user.avatar.url} alt="" className="h-7 w-7 rounded-full border border-border/40 object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <UserCircle className="h-[16px] w-[16px] text-primary" />
                  </div>
                )}
                <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-heading md:inline">
                  {user?.fullName || '—'}
                </span>
              </Link>
            </div>
          </header>

          {/* Page content */}
          <main className="mx-auto w-full min-w-0 max-w-[1240px] flex-1 px-4 py-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SidebarFooter — defined at module level so it NEVER remounts
// ─────────────────────────────────────────────────────────────────────────────
function SidebarFooter({ collapsed, darkMode, toggleDark, handleLogout, tooltipSide, user, t, isRTL, onLinkClick }) {
  return (
    <div className={[
      'border-t border-border/35',
      collapsed ? 'flex flex-col items-center gap-1 p-2' : 'space-y-1 p-3',
    ].join(' ')}>

      <Tooltip content={collapsed ? t('common.actions.logout') : null} position={tooltipSide}>
        <button
          onClick={handleLogout}
          className={[
            'flex items-center rounded-xl text-sm font-medium text-danger transition-colors hover:bg-danger-light',
            collapsed ? 'h-10 w-10 justify-center' : 'w-full gap-3 px-3 py-2.5',
          ].join(' ')}
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center">
            <LogOut className="h-[15px] w-[15px]" />
          </span>
          {!collapsed && <span>{t('common.actions.logout')}</span>}
        </button>
      </Tooltip>

      {!collapsed ? (
        <Link
          to="/dashboard/profile"
          onClick={onLinkClick}
          className="mt-1 flex items-center gap-2.5 rounded-xl border border-border/40 bg-surface-alt/40 px-3 py-2.5 transition-colors hover:border-primary/20 hover:bg-surface-alt"
        >
          {user?.avatar?.url ? (
            <img src={user.avatar.url} alt="" className="h-8 w-8 flex-shrink-0 rounded-full border border-border/40 object-cover" />
          ) : (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
              <UserCircle className="h-[18px] w-[18px] text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight text-heading">{user?.fullName || '—'}</p>
            <p className="truncate text-[11px] leading-tight text-muted/60">
              {user?.role ? getRoleLabel(user.role) : ''}
            </p>
          </div>
        </Link>
      ) : (
        <Tooltip content={user?.name || ''} position={tooltipSide}>
          <Link
            to="/dashboard/profile"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-surface-alt/40 transition-colors hover:border-primary/20 hover:bg-surface-alt"
          >
            {user?.avatar?.url ? (
              <img src={user.avatar.url} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <UserCircle className="h-[18px] w-[18px] text-muted" />
            )}
          </Link>
        </Tooltip>
      )}
    </div>
  );
}
