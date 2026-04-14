import { forwardRef, useState } from 'react';
import { Contact } from 'lucide-react';
import toast from 'react-hot-toast';

const CONTACTS_SUPPORTED =
  typeof navigator !== 'undefined' &&
  'contacts' in navigator &&
  typeof navigator.contacts?.select === 'function';

const PhoneInput = forwardRef(
  (
    {
      label,
      hint,
      error,
      required = false,
      containerClassName = '',
      className = '',
      value,
      onChange,
      placeholder,
      ...rest
    },
    ref
  ) => {
    const [picking, setPicking] = useState(false);

    const handlePickFromContacts = async () => {
      if (!CONTACTS_SUPPORTED) {
        toast.error('اختيار جهة اتصال غير متاح في هذا المتصفح');
        return;
      }
      setPicking(true);
      try {
        const contacts = await navigator.contacts.select(['tel'], { multiple: false });
        const contact = contacts?.[0];
        const tel = contact?.tel?.[0];
        if (tel) {
          const normalized = String(tel).replace(/\s/g, '').trim();
          onChange?.({ target: { value: normalized } });
        }
      } catch (err) {
        if (err?.name !== 'SecurityError' && err?.name !== 'AbortError') {
          toast.error('لم يتم اختيار جهة اتصال');
        }
      } finally {
        setPicking(false);
      }
    };

    return (
      <div className={`mb-4 ${containerClassName}`}>
        {label && (
          <label className="block text-sm font-medium text-base mb-1.5">
            {label}
            {required && <span className="text-danger mr-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoComplete="tel"
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder}
            className={`
              input-base w-full text-left
              ${CONTACTS_SUPPORTED ? 'pr-10' : ''}
              ${error ? 'border-danger focus:border-danger focus:ring-danger' : ''}
              ${className}
            `}
            {...rest}
          />
          {CONTACTS_SUPPORTED && (
            <button
              type="button"
              onClick={handlePickFromContacts}
              disabled={picking}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-base transition-colors disabled:opacity-50"
              tabIndex={-1}
              aria-label="اختيار من جهات الاتصال"
              title="اختيار من جهات الاتصال"
            >
              <Contact className="w-4 h-4" />
            </button>
          )}
        </div>
        {hint && !error && <p className="text-xs text-muted mt-1">{hint}</p>}
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
export default PhoneInput;
