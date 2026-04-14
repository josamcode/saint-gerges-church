import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useI18n } from '../../i18n/i18n';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  bodyClassName = '',
  footerClassName = '',
}) {
  const { t } = useI18n();

  const handleEsc = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEsc]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div
        className={`relative bg-surface rounded-lg shadow-modal w-full ${sizes[size]} animate-slide-up z-10 max-h-[90vh] flex flex-col`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-bold text-heading">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted hover:text-base hover:bg-surface-alt transition-colors"
            aria-label={t('common.actions.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className={`p-4 overflow-y-auto flex-1 ${bodyClassName}`.trim()}>{children}</div>
        {footer ? (
          <div className={`p-4 border-t border-border flex gap-2 justify-end ${footerClassName}`.trim()}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
