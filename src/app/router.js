import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Loader } from 'lucide-react';

import PublicLayout from '../components/layout/PublicLayout';
import AuthLayout from '../components/layout/AuthLayout';
import DashboardLayout from '../components/layout/DashboardLayout';
import { AuthGuard, GuestGuard, PermissionGuard } from '../auth/guards';

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader className="w-6 h-6 text-primary animate-spin" />
  </div>
);

const Lazy = ({ children }) => <Suspense fallback={<PageLoader />}>{children}</Suspense>;

/* Lazy-loaded pages */
const LandingPage = lazy(() => import('../pages/public/LandingPage'));
const BookingPublicPage = lazy(() => import('../pages/public/BookingPublicPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const UserRegisterPage = lazy(() => import('../pages/dashboard/users/UserRegisterPage'));
const DashboardHome = lazy(() => import('../pages/dashboard/DashboardHome'));
const ProfilePage = lazy(() => import('../pages/dashboard/ProfilePage'));
const AccountSettingsPage = lazy(() => import('../pages/dashboard/settings/AccountSettingsPage'));
const PlatformSettingsPage = lazy(() => import('../pages/dashboard/settings/PlatformSettingsPage'));
const ChatsPage = lazy(() => import('../pages/dashboard/chats/ChatsPage'));
const UsersListPage = lazy(() => import('../pages/dashboard/users/UsersListPage'));
const UsersRequestsListPage = lazy(() => import('../pages/dashboard/users/UsersRequestsListPage'));
const UsersExplorerPage = lazy(() => import('../pages/dashboard/users/UsersExplorerPage'));
const FamilyHouseAnalyticsPage = lazy(() => import('../pages/dashboard/users/FamilyHouseAnalyticsPage'));
const FamilyHouseLookupPage = lazy(() => import('../pages/dashboard/users/FamilyHouseLookupPage'));
const UserDetailsPage = lazy(() => import('../pages/dashboard/users/UserDetailsPage'));
const UserCreatePage = lazy(() => import('../pages/dashboard/users/UserCreatePage'));
const UserEditPage = lazy(() => import('../pages/dashboard/users/UserEditPage'));
const HouseholdClassificationResultsPage = lazy(() =>
  import('../pages/dashboard/households/HouseholdClassificationResultsPage')
);
const LordsBrethrenPage = lazy(() =>
  import('../pages/dashboard/households/LordsBrethrenPage')
);
const LordsBrethrenAidPage = lazy(() =>
  import('../pages/dashboard/households/LordsBrethrenAidPage')
);
const DisbursedAidsPage = lazy(() =>
  import('../pages/dashboard/households/DisbursedAidsPage')
);
const AidNotificationsPage = lazy(() =>
  import('../pages/dashboard/households/AidNotificationsPage')
);
const AidDetailsPage = lazy(() =>
  import('../pages/dashboard/households/AidDetailsPage')
);
const HouseholdClassificationCategoriesPage = lazy(() =>
  import('../pages/dashboard/households/HouseholdClassificationCategoriesPage')
);
const ConfessionSessionsPage = lazy(() => import('../pages/dashboard/confessions/ConfessionSessionsPage'));
const ConfessionSessionCreatePage = lazy(() => import('../pages/dashboard/confessions/ConfessionSessionCreatePage'));
const ConfessionAlertsPage = lazy(() => import('../pages/dashboard/confessions/ConfessionAlertsPage'));
const ConfessionAnalyticsPage = lazy(() => import('../pages/dashboard/confessions/ConfessionAnalyticsPage'));
const PastoralVisitationListPage = lazy(() => import('../pages/dashboard/visitations/PastoralVisitationListPage'));
const PastoralVisitationCreatePage = lazy(() => import('../pages/dashboard/visitations/PastoralVisitationCreatePage'));
const PastoralVisitationDetailsPage = lazy(() => import('../pages/dashboard/visitations/PastoralVisitationDetailsPage'));
const PastoralVisitationAnalyticsPage = lazy(() => import('../pages/dashboard/visitations/PastoralVisitationAnalyticsPage'));
const DivineLiturgiesPage = lazy(() => import('../pages/dashboard/divineLiturgies/DivineLiturgiesPage'));
const ChurchPriestsPage = lazy(() => import('../pages/dashboard/divineLiturgies/ChurchPriestsPage'));
const ArchiveManagementPage = lazy(() => import('../pages/dashboard/archive/ArchiveManagementPage'));
const DivineLiturgyAttendanceCheckInPage = lazy(() =>
  import('../pages/dashboard/divineLiturgies/DivineLiturgyAttendanceCheckInPage')
);
const NotificationsPage = lazy(() => import('../pages/dashboard/notifications/NotificationsPage'));
const NotificationInboxPage = lazy(() => import('../pages/dashboard/notifications/NotificationInboxPage'));
const NotificationFormPage = lazy(() => import('../pages/dashboard/notifications/NotificationFormPage'));
const NotificationDetailsPage = lazy(() => import('../pages/dashboard/notifications/NotificationDetailsPage'));
const BookingsIndexPage = lazy(() => import('../pages/dashboard/bookings/BookingsIndexPage'));
const BookingsRequestsPage = lazy(() => import('../pages/dashboard/bookings/BookingsRequestsPage'));
const BookingTypesPage = lazy(() => import('../pages/dashboard/bookings/BookingTypesPage'));
const BookingTypeFormPage = lazy(() => import('../pages/dashboard/bookings/BookingTypeFormPage'));
const MyBookingsPage = lazy(() => import('../pages/dashboard/bookings/MyBookingsPage'));
const MeetingsDashboardPage = lazy(() => import('../pages/dashboard/meetings/MeetingsDashboardPage'));
const SectorsManagementPage = lazy(() => import('../pages/dashboard/meetings/SectorsManagementPage'));
const MeetingsManagementPage = lazy(() => import('../pages/dashboard/meetings/MeetingsManagementPage'));
const SectorDetailsPage = lazy(() => import('../pages/dashboard/meetings/SectorDetailsPage'));
const MeetingDetailsPage = lazy(() => import('../pages/dashboard/meetings/MeetingDetailsPage'));
const MeetingAttendanceCheckInPage = lazy(() =>
  import('../pages/dashboard/meetings/MeetingAttendanceCheckInPage')
);
const MeetingDailyDocumentationPage = lazy(() =>
  import('../pages/dashboard/meetings/MeetingDailyDocumentationPage')
);
const MeetingSettingsPage = lazy(() => import('../pages/dashboard/meetings/MeetingSettingsPage'));
const MeetingMemberDetailsPage = lazy(() => import('../pages/dashboard/meetings/MeetingMemberDetailsPage'));
const SectorFormPage = lazy(() => import('../pages/dashboard/meetings/SectorFormPage'));
const MeetingFormPage = lazy(() => import('../pages/dashboard/meetings/MeetingFormPage'));
const LandingContentPage = lazy(() => import('../pages/dashboard/publicSite/LandingContentPage'));
const SystemAnalyticsPage = lazy(() =>
  import('../pages/dashboard/systemAnalytics/SystemAnalyticsPage')
);
const UnderDevelopmentPage = lazy(() => import('../pages/shared/UnderDevelopmentPage'));
const NotFoundPage = lazy(() => import('../pages/shared/NotFoundPage'));

const router = createBrowserRouter([
  /* ══════════ Public ══════════ */
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <Lazy><LandingPage /></Lazy> },
      { path: 'bookings', element: <Lazy><BookingPublicPage /></Lazy> },
      { path: 'bookings/new', element: <Lazy><BookingPublicPage /></Lazy> },
    ],
  },

  /* ══════════ Auth (Guest Only) ══════════ */
  {
    element: <GuestGuard><AuthLayout /></GuestGuard>,
    children: [
      { path: 'auth/login', element: <Lazy><LoginPage /></Lazy> },
      { path: 'auth/register', element: <Lazy><UserRegisterPage /></Lazy> },
    ],
  },

  /* ══════════ Dashboard (Protected) ══════════ */
  {
    path: 'dashboard',
    element: <AuthGuard><DashboardLayout /></AuthGuard>,
    children: [
      { index: true, element: <Lazy><DashboardHome /></Lazy> },
      {
        path: 'profile',
        element: (
          <PermissionGuard required={['AUTH_VIEW_SELF']}>
            <Lazy><ProfilePage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'settings/account',
        element: (
          <PermissionGuard required={['AUTH_VIEW_SELF']}>
            <Lazy><AccountSettingsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'settings/platform',
        element: (
          <PermissionGuard required={['NOTIFICATIONS_TEMPLATES_MANAGE']}>
            <Lazy><PlatformSettingsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'chats',
        element: (
          <PermissionGuard required={['CHATS_VIEW']}>
            <Lazy><ChatsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'users',
        element: (
          <PermissionGuard required={['USERS_VIEW']}>
            <Lazy><UsersListPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'users/explorer',
        element: (
          <PermissionGuard required={['USERS_VIEW']}>
            <Lazy><UsersExplorerPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'users/requests',
        element: (
          <PermissionGuard required={['USERS_VIEW']}>
            <Lazy><UsersRequestsListPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'users/new',
        element: (
          <PermissionGuard required={['USERS_CREATE']}>
            <Lazy><UserCreatePage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'users/family-house',
        element: (
          <PermissionGuard required={['USERS_VIEW']}>
            <Lazy><FamilyHouseLookupPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'users/family-house/details',
        element: (
          <PermissionGuard required={['USERS_VIEW']}>
            <Lazy><FamilyHouseLookupPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'users/family-house/analytics',
        element: (
          <PermissionGuard required={['USERS_VIEW']}>
            <Lazy><FamilyHouseAnalyticsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'lords-brethren',
        element: (
          <PermissionGuard required={['HOUSEHOLD_CLASSIFICATIONS_VIEW']}>
            <Lazy><LordsBrethrenPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'lords-brethren/aid',
        element: (
          <PermissionGuard required={['HOUSEHOLD_CLASSIFICATIONS_VIEW']}>
            <Lazy><LordsBrethrenAidPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'lords-brethren/aid-history',
        element: (
          <PermissionGuard required={['HOUSEHOLD_CLASSIFICATIONS_VIEW']}>
            <Lazy><DisbursedAidsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'lords-brethren/aid-history/details',
        element: (
          <PermissionGuard required={['HOUSEHOLD_CLASSIFICATIONS_VIEW']}>
            <Lazy><AidDetailsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'lords-brethren/aid-history/notifications',
        element: (
          <PermissionGuard required={['HOUSEHOLD_CLASSIFICATIONS_VIEW']}>
            <Lazy><AidNotificationsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'lords-brethren/aid-history/notifications/:id',
        element: (
          <PermissionGuard required={['HOUSEHOLD_CLASSIFICATIONS_VIEW']}>
            <Lazy><NotificationDetailsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'households/results',
        element: (
          <PermissionGuard required={['HOUSEHOLD_CLASSIFICATIONS_VIEW']}>
            <Lazy><HouseholdClassificationResultsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'households/classifications',
        element: (
          <PermissionGuard required={['HOUSEHOLD_CLASSIFICATIONS_MANAGE']}>
            <Lazy><HouseholdClassificationCategoriesPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'users/:id',
        element: (
          <PermissionGuard required={['USERS_VIEW']}>
            <Lazy><UserDetailsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'users/:id/edit',
        element: (
          <PermissionGuard required={['USERS_UPDATE']}>
            <Lazy><UserEditPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'confessions',
        element: (
          <PermissionGuard required={['CONFESSIONS_VIEW']}>
            <Lazy><ConfessionSessionsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'confessions/new',
        element: (
          <PermissionGuard required={['CONFESSIONS_CREATE']}>
            <Lazy><ConfessionSessionCreatePage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'confessions/alerts',
        element: (
          <PermissionGuard required={['CONFESSIONS_ALERTS_VIEW']}>
            <Lazy><ConfessionAlertsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'confessions/analytics',
        element: (
          <PermissionGuard required={['CONFESSIONS_ANALYTICS_VIEW']}>
            <Lazy><ConfessionAnalyticsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'visitations',
        element: (
          <PermissionGuard required={['PASTORAL_VISITATIONS_VIEW']}>
            <Lazy><PastoralVisitationListPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'visitations/new',
        element: (
          <PermissionGuard required={['PASTORAL_VISITATIONS_CREATE']}>
            <Lazy><PastoralVisitationCreatePage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'visitations/analytics',
        element: (
          <PermissionGuard required={['PASTORAL_VISITATIONS_ANALYTICS_VIEW']}>
            <Lazy><PastoralVisitationAnalyticsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'visitations/:id',
        element: (
          <PermissionGuard required={['PASTORAL_VISITATIONS_VIEW']}>
            <Lazy><PastoralVisitationDetailsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'divine-liturgies',
        element: (
          <PermissionGuard
            required={[
              'DIVINE_LITURGIES_VIEW',
              'DIVINE_LITURGIES_MANAGE',
              'DIVINE_LITURGIES_ATTENDANCE_MANAGE',
              'DIVINE_LITURGIES_ATTENDANCE_MANAGE_ASSIGNED_USERS',
            ]}
            mode="any"
          >
            <Lazy><DivineLiturgiesPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'divine-liturgies/priests',
        element: (
          <PermissionGuard required={['DIVINE_LITURGIES_VIEW']}>
            <Lazy><ChurchPriestsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'divine-liturgies/attendance/:entryType/:id',
        element: (
          <PermissionGuard
            required={[
              'DIVINE_LITURGIES_ATTENDANCE_MANAGE',
              'DIVINE_LITURGIES_ATTENDANCE_MANAGE_ASSIGNED_USERS',
              'DIVINE_LITURGIES_MANAGE',
            ]}
            mode="any"
          >
            <Lazy><DivineLiturgyAttendanceCheckInPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'archive',
        element: (
          <PermissionGuard
            required={[
              'ARCHIVE_VIEW',
              'ARCHIVE_UPLOAD',
              'ARCHIVE_COLLECTIONS_MANAGE',
              'ARCHIVE_STORIES_MANAGE',
              'ARCHIVE_HONOREES_MANAGE',
              'ARCHIVE_PUBLISH',
            ]}
            mode="any"
          >
            <Lazy><ArchiveManagementPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'public-site/landing',
        element: (
          <PermissionGuard required={['LANDING_CONTENT_MANAGE']}>
            <Lazy><LandingContentPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'system-analytics',
        element: (
          <PermissionGuard required={['SYSTEM_ANALYTICS_VIEW']}>
            <Lazy><SystemAnalyticsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'notifications',
        element: (
          <PermissionGuard required={['NOTIFICATIONS_VIEW']}>
            <Lazy><NotificationsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'notifications/inbox',
        element: (
          <PermissionGuard required={['NOTIFICATIONS_VIEW']}>
            <Lazy><NotificationInboxPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'notifications/new',
        element: (
          <PermissionGuard required={['NOTIFICATIONS_CREATE']}>
            <Lazy><NotificationFormPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'notifications/:id/edit',
        element: (
          <PermissionGuard required={['NOTIFICATIONS_UPDATE']}>
            <Lazy><NotificationFormPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'notifications/:id',
        element: (
          <PermissionGuard required={['NOTIFICATIONS_VIEW']}>
            <Lazy><NotificationDetailsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'bookings',
        element: (
          <PermissionGuard
            required={['BOOKINGS_VIEW_OWN', 'BOOKINGS_VIEW', 'BOOKINGS_MANAGE', 'BOOKINGS_TYPES_MANAGE']}
            mode="any"
          >
            <Lazy><BookingsIndexPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'bookings/requests',
        element: (
          <PermissionGuard
            required={['BOOKINGS_VIEW', 'BOOKINGS_MANAGE']}
            mode="any"
          >
            <Lazy><BookingsRequestsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'bookings/types',
        element: (
          <PermissionGuard required={['BOOKINGS_TYPES_MANAGE']}>
            <Lazy><BookingTypesPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'bookings/types/new',
        element: (
          <PermissionGuard required={['BOOKINGS_TYPES_MANAGE']}>
            <Lazy><BookingTypeFormPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'bookings/types/:id/edit',
        element: (
          <PermissionGuard required={['BOOKINGS_TYPES_MANAGE']}>
            <Lazy><BookingTypeFormPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'bookings/mine',
        element: (
          <PermissionGuard
            required={['BOOKINGS_VIEW_OWN', 'BOOKINGS_VIEW', 'BOOKINGS_MANAGE']}
            mode="any"
          >
            <Lazy><MyBookingsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'meetings',
        element: <Lazy><MeetingsDashboardPage /></Lazy>,
      },
      {
        path: 'meetings/sectors',
        element: (
          <PermissionGuard
            required={['SECTORS_VIEW', 'SECTORS_CREATE', 'SECTORS_UPDATE', 'SECTORS_DELETE']}
            mode="any"
          >
            <Lazy><SectorsManagementPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'meetings/list',
        element: (
          <PermissionGuard
            required={[
              'MEETINGS_VIEW',
              'MEETINGS_VIEW_OWN',
              'MEETINGS_CREATE',
              'MEETINGS_UPDATE',
              'MEETINGS_DELETE',
              'MEETINGS_SERVANTS_MANAGE',
              'MEETINGS_COMMITTEES_MANAGE',
              'MEETINGS_ACTIVITIES_MANAGE',
              'MEETINGS_DOCUMENTATION_MANAGE',
              'MEETINGS_SETTINGS_MANAGE',
            ]}
            mode="any"
          >
            <Lazy><MeetingsManagementPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'meetings/list/:id',
        element: (
          <PermissionGuard
            required={[
              'MEETINGS_VIEW',
              'MEETINGS_VIEW_OWN',
              'MEETINGS_UPDATE',
              'MEETINGS_SERVANTS_MANAGE',
              'MEETINGS_COMMITTEES_MANAGE',
              'MEETINGS_ACTIVITIES_MANAGE',
              'MEETINGS_DOCUMENTATION_MANAGE',
            ]}
            mode="any"
          >
            <Lazy><MeetingDetailsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'meetings/list/:meetingId/members/:memberId',
        element: (
          <PermissionGuard
            required={[
              'MEETINGS_VIEW',
              'MEETINGS_VIEW_OWN',
              'MEETINGS_MEMBERS_VIEW',
              'MEETINGS_UPDATE',
              'MEETINGS_SERVANTS_MANAGE',
              'MEETINGS_COMMITTEES_MANAGE',
              'MEETINGS_ACTIVITIES_MANAGE',
            ]}
            mode="any"
          >
            <Lazy><MeetingMemberDetailsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'meetings/list/:id/attendance',
        element: (
          <PermissionGuard
            required={[
              'MEETINGS_ATTENDANCE_MANAGE',
              'MEETINGS_UPDATE',
              'MEETINGS_SERVANTS_MANAGE',
            ]}
            mode="any"
          >
            <Lazy><MeetingAttendanceCheckInPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'meetings/list/:id/documentation',
        element: (
          <PermissionGuard
            required={[
              'MEETINGS_DOCUMENTATION_MANAGE',
              'MEETINGS_UPDATE',
              'MEETINGS_SERVANTS_MANAGE',
            ]}
            mode="any"
          >
            <Lazy><MeetingDailyDocumentationPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'meetings/list/:id/settings',
        element: (
          <PermissionGuard
            required={[
              'MEETINGS_VIEW',
              'MEETINGS_VIEW_OWN',
              'MEETINGS_UPDATE',
              'MEETINGS_SERVANTS_MANAGE',
              'MEETINGS_DOCUMENTATION_MANAGE',
              'MEETINGS_SETTINGS_MANAGE',
            ]}
            mode="any"
          >
            <Lazy><MeetingSettingsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'meetings/sectors/new',
        element: (
          <PermissionGuard required={['SECTORS_CREATE']}>
            <Lazy><SectorFormPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'meetings/sectors/:id/edit',
        element: (
          <PermissionGuard required={['SECTORS_UPDATE']}>
            <Lazy><SectorFormPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'meetings/sectors/:id',
        element: (
          <PermissionGuard required={['SECTORS_VIEW']}>
            <Lazy><SectorDetailsPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'meetings/new',
        element: (
          <PermissionGuard required={['MEETINGS_CREATE']}>
            <Lazy><MeetingFormPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'meetings/:id/edit',
        element: (
          <PermissionGuard
            required={[
              'MEETINGS_UPDATE',
              'MEETINGS_SERVANTS_MANAGE',
              'MEETINGS_COMMITTEES_MANAGE',
              'MEETINGS_ACTIVITIES_MANAGE',
            ]}
            mode="any"
          >
            <Lazy><MeetingFormPage /></Lazy>
          </PermissionGuard>
        ),
      },
      {
        path: 'under-development',
        element: <Lazy><UnderDevelopmentPage /></Lazy>,
      },
    ],
  },

  /* ══════════ 404 ══════════ */
  { path: '*', element: <Lazy><NotFoundPage /></Lazy> },
]);

export default router;
