import { useMemo } from 'react';
import { useI18n } from '../../i18n/i18n';

export default function UserFormSectionTabs({ sections = [], activeSection, onChange }) {
  const { language } = useI18n();

  const activeIndex = useMemo(() => {
    const index = sections.findIndex((section) => section.id === activeSection);
    return index >= 0 ? index : 0;
  }, [activeSection, sections]);

  const active = sections[activeIndex] || sections[0] || null;
  const progress = sections.length > 0 ? ((activeIndex + 1) / sections.length) * 100 : 0;
  const copy = language === 'ar'
    ? {
      sections: 'أقسام النموذج',
      progress: 'القسم الحالي',
      of: 'من',
    }
    : {
      sections: 'Form sections',
      progress: 'Current section',
      of: 'of',
    };

  if (!sections.length || !active) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          {copy.sections}
        </p>
        <p className="text-xs text-muted">
          {copy.progress} {activeIndex + 1} {copy.of} {sections.length}
        </p>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden scrollbar-none">        {sections.map((section) => {
        const isActive = section.id === activeSection;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange?.(section.id)}
            className={`min-w-[200px] rounded-2xl border px-4 py-3 text-start transition-all ${isActive
              ? 'border-primary bg-primary/8 shadow-sm'
              : 'border-border bg-surface-alt/40 hover:border-primary/25 hover:bg-surface-alt'
              }`}
          >
            <div className="flex justify-center items-center gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isActive
                  ? 'bg-primary text-white'
                  : 'bg-surface text-muted'
                  }`}
              >
                {section.step}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-heading">
                  {section.label}
                </span>
              </span>
            </div>
          </button>
        );
      })}
      </div>

      <div className="mt-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
