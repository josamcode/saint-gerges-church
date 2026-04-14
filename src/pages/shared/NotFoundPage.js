import { Link } from 'react-router-dom';
import { Home, SearchX } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useI18n } from '../../i18n/i18n';

export default function NotFoundPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-warning-light flex items-center justify-center mx-auto mb-6">
          <SearchX className="w-10 h-10 text-warning" />
        </div>
        <h1 className="text-6xl font-extrabold text-heading mb-2">404</h1>
        <h2 className="text-xl font-bold text-heading mb-3">{t('shared.notFound.title')}</h2>
        <p className="text-muted mb-8">{t('shared.notFound.description')}</p>
        <Link to="/">
          <Button icon={Home}>{t('shared.notFound.backHome')}</Button>
        </Link>
      </div>
    </div>
  );
}
