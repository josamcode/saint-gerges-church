import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth.hooks';
import { Shield, Loader } from 'lucide-react';

export function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-page">
        <Loader className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return children;
}

export function PermissionGuard({ required = [], mode = 'all', fallback, children }) {
  const { hasAllPermissions, hasAnyPermission, loading } = useAuth();

  if (loading) return null;

  const hasAccess = mode === 'all' ? hasAllPermissions(required) : hasAnyPermission(required);

  if (!hasAccess) {
    if (fallback) return fallback;

    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-danger-light flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-danger" />
        </div>
        <h2 className="text-xl font-bold text-heading mb-2">ليس لديك صلاحية</h2>
        <p className="text-muted max-w-md">
          ليس لديك الصلاحيات المطلوبة للوصول إلى هذه الصفحة. تواصل مع المسؤول إذا كنت تعتقد أن هذا خطأ.
        </p>
      </div>
    );
  }

  return children;
}

export function GuestGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-page">
        <Loader className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
