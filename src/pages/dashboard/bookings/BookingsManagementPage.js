import { Navigate } from 'react-router-dom';

export default function BookingsManagementPage({ mode = 'requests' }) {
  if (mode === 'types') {
    return <Navigate to="/dashboard/bookings/types" replace />;
  }

  return <Navigate to="/dashboard/bookings/requests" replace />;
}
