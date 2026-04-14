import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useI18n } from '../../i18n/i18n';

const Input = forwardRef(
  (
    {
      label,
      hint,
      error,
      icon: Icon,
      type = 'text',
      className = '',
      containerClassName = '',
      required = false,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const { isRTL, t } = useI18n();
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className={`mb-4 ${containerClassName}`}>
        {label && (
          <label className="block text-sm font-medium text-base mb-1.5">
            {label}
            {required && <span className={`text-danger ${isRTL ? 'mr-1' : 'ml-1'}`}>*</span>}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <span
              className={`absolute top-1/2 -translate-y-1/2 text-muted pointer-events-none ${isRTL ? 'right-3' : 'left-3'
                }`}
            >
              <Icon className="w-4 h-4" />
            </span>
          )}
          <input
            ref={ref}
            type={inputType}
            className={`
              input-base
              ${Icon && isRTL ? 'pr-10' : ''}
              ${Icon && !isRTL ? 'pl-10' : ''}
              ${isPassword && isRTL ? 'pl-10' : ''}
              ${isPassword && !isRTL ? 'pr-10' : ''}
              ${error ? 'border-danger focus:border-danger focus:ring-danger' : ''}
              ${className}
            `}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={`absolute top-1/2 -translate-y-1/2 text-muted hover:text-base transition-colors ${isRTL ? 'left-3' : 'right-3'
                }`}
              tabIndex={-1}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {hint && !error && <p className="text-xs text-muted mt-1">{hint}</p>}
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
