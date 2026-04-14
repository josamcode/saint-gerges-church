import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../../i18n/i18n';

export default function Breadcrumbs({ items = [] }) {
  const { isRTL } = useI18n();
  const SeparatorIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <nav aria-label="breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1 text-sm text-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && <SeparatorIcon className="w-3.5 h-3.5" />}
              {isLast || !item.href ? (
                <span className={isLast ? 'text-base font-medium' : ''}>{item.label}</span>
              ) : (
                <Link to={item.href} className="hover:text-primary transition-colors">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
