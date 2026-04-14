import { Navigate } from 'react-router-dom';

import { useAuth } from '../../../auth/auth.hooks';

export default function BookingsIndexPage() {
  const { hasPermission } = useAuth();

  if (hasPermission('BOOKINGS_VIEW') || hasPermission('BOOKINGS_MANAGE')) {
    return <Navigate to="/dashboard/bookings/requests" replace />;
  }

  if (hasPermission('BOOKINGS_TYPES_MANAGE')) {
    return <Navigate to="/dashboard/bookings/types" replace />;
  }

  if (hasPermission('BOOKINGS_VIEW_OWN')) {
    return <Navigate to="/dashboard/bookings/mine" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
