import { Outlet, Link, useLocation } from 'react-router-dom';
import { Church } from 'lucide-react';
import AppRouteEffects from '../../app/AppRouteEffects';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useI18n } from '../../i18n/i18n';

export default function AuthLayout() {
  const { t } = useI18n();
  const location = useLocation();
  const isRegisterPage = location.pathname === '/auth/register';

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <AppRouteEffects />
      <div className={`w-full ${isRegisterPage ? 'max-w-6xl' : 'max-w-md'}`}>
        <div className="flex justify-end mb-3">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center">
              <img src='/logo.png' />
            </div>
            <div>
              <h1 className="text-xl font-bold text-heading">كنيسة مار جرجس بسيلة الغربية</h1>
              <p className="text-xs text-muted">{t('auth.authLayoutSubTitle')}</p>
            </div>
          </Link>
        </div>

        <div className={`bg-surface rounded-xl border border-border shadow-card ${isRegisterPage ? 'p-4 sm:p-6 lg:p-8' : 'p-6 sm:p-8'}`}>
          <Outlet />
        </div>

        <p className="text-center text-xs text-muted mt-6">
          {t('auth.rightsReserved')} — {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
