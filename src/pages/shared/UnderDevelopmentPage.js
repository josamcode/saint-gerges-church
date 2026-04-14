import { Construction, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import { useI18n } from '../../i18n/i18n';

export default function UnderDevelopmentPage() {
  const { t, isRTL } = useI18n();

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: t('shared.dashboard'), href: '/dashboard' }, { label: t('dashboardLayout.menu.underDevelopment') }]} />

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-warning-light flex items-center justify-center mb-6">
          <Construction className="w-10 h-10 text-warning" />
        </div>
        <h1 className="text-2xl font-bold text-heading mb-3">{t('shared.underDevelopment.title')}</h1>
        <p className="text-muted max-w-md mb-2">{t('shared.underDevelopment.description')}</p>
        <p className="text-sm text-muted mb-8">{t('shared.underDevelopment.soon')}</p>
        <Link to="/dashboard">
          <Button variant="outline" icon={isRTL ? ArrowRight : ArrowLeft}>
            {t('shared.underDevelopment.backDashboard')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
