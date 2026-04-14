import { matchPath } from 'react-router-dom';

function translate(t, language, key, fallback, fallbackAr = fallback) {
  const value = t(key);
  return value === key ? (language === 'ar' ? fallbackAr : fallback) : value;
}

function normalizePathname(pathname = '/') {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

const TITLE_ROUTES = [
  {
    pattern: '/dashboard/lords-brethren/aid-history/notifications/:id',
    key: 'routeTitles.notificationDetails',
    fallback: 'Notification Details',
    fallbackAr: 'تفاصيل الإشعار',
  },
  {
    pattern: '/dashboard/notifications/:id/edit',
    key: 'notifications.form.editTitle',
    fallback: 'Edit Notification',
  },
  {
    pattern: '/dashboard/bookings/types/:id/edit',
    key: 'bookings.dashboard.editTypeTitle',
    fallback: 'Edit Booking Type',
  },
  {
    pattern: '/dashboard/users/:id/edit',
    key: 'usersForm.edit.title',
    fallback: 'Edit User',
  },
  {
    pattern: '/dashboard/meetings/sectors/:id/edit',
    key: 'meetings.actions.editSectorPage',
    fallback: 'Edit Sector',
  },
  {
    pattern: '/dashboard/meetings/:id/edit',
    key: 'meetings.actions.editMeetingPage',
    fallback: 'Edit Meeting',
  },
  {
    pattern: '/dashboard/divine-liturgies/attendance/:entryType/:id',
    key: 'divineLiturgies.attendance.pageTitle',
    fallback: 'Users Attendance Check-in',
  },
  {
    pattern: '/dashboard/meetings/list/:meetingId/members/:memberId',
    key: 'meetings.memberDetails.pageTitle',
    fallback: 'Member Details',
  },
  {
    pattern: '/dashboard/meetings/list/:id/attendance',
    key: 'meetings.attendance.pageTitle',
    fallback: 'Attendance Check-in',
  },
  {
    pattern: '/dashboard/meetings/list/:id/documentation',
    key: 'meetings.documentation.pageTitle',
    fallback: 'Daily Meeting Documentation',
  },
  {
    pattern: '/dashboard/notifications/inbox',
    key: 'notificationCenter.pageTitle',
    fallback: 'Your Notifications',
  },
  {
    pattern: '/dashboard/notifications/new',
    key: 'notifications.form.createTitle',
    fallback: 'Create Notification',
  },
  {
    pattern: '/dashboard/notifications/:id',
    key: 'routeTitles.notificationDetails',
    fallback: 'Notification Details',
    fallbackAr: 'تفاصيل الإشعار',
  },
  {
    pattern: '/dashboard/bookings/types/new',
    key: 'bookings.dashboard.createTypeTitle',
    fallback: 'Create Booking Type',
  },
  {
    pattern: '/dashboard/bookings/mine',
    key: 'bookings.dashboard.myTitle',
    fallback: 'My Bookings',
  },
  {
    pattern: '/dashboard/bookings/requests',
    key: 'bookings.dashboard.requestsTitle',
    fallback: 'Booking Requests',
  },
  {
    pattern: '/dashboard/bookings/types',
    key: 'bookings.dashboard.typesTitle',
    fallback: 'Booking Types',
  },
  {
    pattern: '/dashboard/system-analytics',
    key: 'systemAnalyticsPage.title',
    fallback: 'System Analytics',
  },
  {
    pattern: '/dashboard/public-site/landing',
    key: 'landingContentPage.title',
    fallback: 'Landing Page Content',
  },
  {
    pattern: '/dashboard/archive',
    key: 'archive.title',
    fallback: 'Archive',
  },
  {
    pattern: '/dashboard/divine-liturgies/priests',
    key: 'dashboardLayout.menu.churchPriests',
    fallback: 'Church Priests',
  },
  {
    pattern: '/dashboard/divine-liturgies',
    key: 'divineLiturgies.title',
    fallback: 'Divine Liturgy & Vespers',
  },
  {
    pattern: '/dashboard/visitations/new',
    key: 'visitations.create.page',
    fallback: 'Create Visitation',
  },
  {
    pattern: '/dashboard/visitations/analytics',
    key: 'visitations.analytics.page',
    fallback: 'Visitation Analytics',
  },
  {
    pattern: '/dashboard/visitations/:id',
    key: 'visitations.details.page',
    fallback: 'Visitation Details',
  },
  {
    pattern: '/dashboard/visitations',
    key: 'visitations.list.page',
    fallback: 'Pastoral Visitations',
  },
  {
    pattern: '/dashboard/confessions/new',
    key: 'confessions.sessions.createTitle',
    fallback: 'Create Confession Session',
  },
  {
    pattern: '/dashboard/confessions/alerts',
    key: 'confessions.alerts.title',
    fallback: 'Confession Alerts',
  },
  {
    pattern: '/dashboard/confessions/analytics',
    key: 'confessions.analytics.title',
    fallback: 'Confession Analytics',
  },
  {
    pattern: '/dashboard/confessions',
    key: 'confessions.sessions.page',
    fallback: 'Confession Sessions',
  },
  {
    pattern: '/dashboard/users/explorer',
    key: 'usersExplorerPage.title',
    fallback: 'User Explorer',
  },
  {
    pattern: '/dashboard/users/requests',
    key: 'routeTitles.userRequests',
    fallback: 'User Requests',
    fallbackAr: 'طلبات المستخدمين',
  },
  {
    pattern: '/dashboard/users/new',
    key: 'usersForm.create.title',
    fallback: 'Create User',
  },
  {
    pattern: '/dashboard/users/family-house/details',
    key: 'familyHouseLookup.detailsPage.page',
    fallback: 'Family/House Details',
  },
  {
    pattern: '/dashboard/users/family-house/analytics',
    key: 'familyHouseLookup.analyticsPage.page',
    fallback: 'Family Analytics',
  },
  {
    pattern: '/dashboard/users/family-house',
    key: 'familyHouseLookup.page',
    fallback: 'Family & House Lookup',
  },
  {
    pattern: '/dashboard/users/:id',
    key: 'routeTitles.userDetails',
    fallback: 'User Details',
    fallbackAr: 'تفاصيل المستخدم',
  },
  {
    pattern: '/dashboard/users',
    key: 'usersListPage.table.title',
    fallback: 'User Directory',
  },
  {
    pattern: '/dashboard/lords-brethren/aid-history/details',
    key: 'dashboardLayout.menu.aidDetails',
    fallback: 'Aid Details',
  },
  {
    pattern: '/dashboard/lords-brethren/aid-history/notifications',
    key: 'routeTitles.aidNotifications',
    fallback: 'Recurring Aid Notifications',
    fallbackAr: 'إشعارات المساعدات المتكررة',
  },
  {
    pattern: '/dashboard/lords-brethren/aid-history',
    key: 'dashboardLayout.menu.disbursedAidHistory',
    fallback: 'Disbursed Aid History',
  },
  {
    pattern: '/dashboard/lords-brethren/aid',
    key: 'routeTitles.disburseAid',
    fallback: 'Disburse Aid',
    fallbackAr: 'صرف مساعدات',
  },
  {
    pattern: '/dashboard/lords-brethren',
    key: 'dashboardLayout.menu.theLordsBrethren',
    fallback: "The Lord's Brethren",
  },
  {
    pattern: '/dashboard/households/results',
    key: 'dashboardLayout.menu.householdClassificationResults',
    fallback: 'Household Statuses',
  },
  {
    pattern: '/dashboard/households/classifications',
    key: 'dashboardLayout.menu.householdClassificationRules',
    fallback: 'Household Classification Rules',
  },
  {
    pattern: '/dashboard/notifications',
    key: 'notifications.title',
    fallback: 'Notification Center',
  },
  {
    pattern: '/dashboard/bookings',
    key: 'bookings.dashboard.title',
    fallback: 'Bookings',
  },
  {
    pattern: '/dashboard/meetings/list/:id/settings',
    key: 'meetings.settings.pageTitle',
    fallback: 'Meeting Documentation Settings',
  },
  {
    pattern: '/dashboard/meetings/sectors/new',
    key: 'meetings.actions.createSectorPage',
    fallback: 'Create Sector',
  },
  {
    pattern: '/dashboard/meetings/sectors/:id',
    key: 'routeTitles.sectorDetails',
    fallback: 'Sector Details',
    fallbackAr: 'تفاصيل القطاع',
  },
  {
    pattern: '/dashboard/meetings/sectors',
    key: 'meetings.sectorsPageTitle',
    fallback: 'Sectors Management',
  },
  {
    pattern: '/dashboard/meetings/list/:id',
    key: 'routeTitles.meetingDetails',
    fallback: 'Meeting Details',
    fallbackAr: 'تفاصيل الاجتماع',
  },
  {
    pattern: '/dashboard/meetings/list',
    key: 'meetings.meetingsPageTitle',
    fallback: 'Meetings Management',
  },
  {
    pattern: '/dashboard/meetings/new',
    key: 'meetings.actions.createMeetingPage',
    fallback: 'Create Meeting',
  },
  {
    pattern: '/dashboard/meetings',
    key: 'meetings.dashboardTitle',
    fallback: 'Meetings Dashboard',
  },
  {
    pattern: '/dashboard/settings/account',
    key: 'accountSettings.pageTitle',
    fallback: 'Account Settings',
  },
  {
    pattern: '/dashboard/settings/platform',
    key: 'platformSettingsPage.title',
    fallback: 'Platform Settings',
    fallbackAr: 'إعدادات المنصة',
  },
  {
    pattern: '/dashboard/chats',
    key: 'dashboardLayout.menu.chats',
    fallback: 'Chats',
  },
  {
    pattern: '/dashboard/profile',
    key: 'dashboardLayout.menu.profile',
    fallback: 'Profile',
  },
  {
    pattern: '/dashboard/under-development',
    key: 'shared.underDevelopment.title',
    fallback: 'Under Development',
  },
  {
    pattern: '/dashboard',
    key: 'dashboardLayout.menu.dashboard',
    fallback: 'Dashboard',
  },
  {
    pattern: '/bookings/new',
    key: 'bookings.public.title',
    fallback: 'Book an Appointment',
  },
  {
    pattern: '/bookings',
    key: 'bookings.public.title',
    fallback: 'Book an Appointment',
  },
  {
    pattern: '/auth/login',
    key: 'auth.title',
    fallback: 'Sign In',
  },
  {
    pattern: '/auth/register',
    key: 'routeTitles.register',
    fallback: 'Create Account',
    fallbackAr: 'إنشاء حساب',
  },
  {
    pattern: '/',
    key: 'routeTitles.landing',
    fallback: 'St. Michael Church',
    fallbackAr: 'كنيسة الملاك ميخائيل بالقطوشة',
  },
];

export function resolveRoutePageTitle(pathname, t, language) {
  const normalizedPathname = normalizePathname(pathname);

  const matchedRoute = TITLE_ROUTES.find(({ pattern }) =>
    matchPath({ path: pattern, end: true }, normalizedPathname)
  );

  if (matchedRoute) {
    return translate(
      t,
      language,
      matchedRoute.key,
      matchedRoute.fallback,
      matchedRoute.fallbackAr
    );
  }

  return translate(t, language, 'shared.notFound.title', 'Page Not Found', 'الصفحة غير موجودة');
}

export function buildDocumentTitle(pageTitle, t, language) {
  const appName = translate(
    t,
    language,
    'common.appName',
    'St. Michael Church',
    'كنيسة الملاك ميخائيل بالقطوشة'
  );

  if (!pageTitle || pageTitle === appName) {
    return appName;
  }

  return `${pageTitle} | ${appName}`;
}
