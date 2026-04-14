import { useI18n } from '../../i18n/i18n';

export default function LanguageSwitcher({ className = '' }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-md border border-border/40 bg-surface-alt/70 p-1 ${className}`}
      role="group"
      aria-label={t('common.language.switch')}
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
          language === 'en' ? 'bg-primary text-white/90' : 'text-muted hover:text-base'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('ar')}
        className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
          language === 'ar' ? 'bg-primary text-white/90' : 'text-muted hover:text-base'
        }`}
      >
        AR
      </button>
    </div>
  );
}
