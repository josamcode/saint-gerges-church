import { forwardRef } from 'react';
import { useI18n } from '../../i18n/i18n';

const TextArea = forwardRef(
  ({ label, hint, error, required, className = '', containerClassName = '', ...props }, ref) => {
    const { isRTL } = useI18n();

    return (
      <div className={`mb-4 ${containerClassName}`.trim()}>
        {label && (
          <label className="block text-sm font-medium text-base mb-1.5">
            {label}
            {required && <span className={`text-danger ${isRTL ? 'mr-1' : 'ml-1'}`}>*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={`input-base min-h-[100px] resize-y ${error ? 'border-danger' : ''} ${className}`}
          {...props}
        />
        {hint && !error && <p className="text-xs text-muted mt-1">{hint}</p>}
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
export default TextArea;
