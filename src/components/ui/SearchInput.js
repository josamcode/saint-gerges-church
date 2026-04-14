import { useRef, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useI18n } from '../../i18n/i18n';

export default function SearchInput({
  value,
  onChange,
  placeholder,
  debounceMs = 400,
  className = '',
}) {
  const { t, isRTL } = useI18n();
  const [localValue, setLocalValue] = useState(value || '');
  const timer = useRef(null);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onChange?.(val);
    }, debounceMs);
  };

  const handleClear = () => {
    setLocalValue('');
    if (timer.current) clearTimeout(timer.current);
    onChange?.('');
  };

  const finalPlaceholder = placeholder || t('common.search.placeholder');

  return (
    <div className={`relative ${className}`}>
      <Search
        className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted ${
          isRTL ? 'right-3' : 'left-3'
        }`}
      />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={finalPlaceholder}
        className={`input-base ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
      />
      {localValue && (
        <button
          onClick={handleClear}
          className={`absolute top-1/2 -translate-y-1/2 text-muted hover:text-base transition-colors ${
            isRTL ? 'left-3' : 'right-3'
          }`}
          aria-label={t('common.search.clear')}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
