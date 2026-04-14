import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useI18n } from '../../i18n/i18n';

function toOptionShape(option) {
  if (typeof option === 'string') {
    return { value: option, label: option };
  }
  return {
    value: String(option?.value || ''),
    label: String(option?.label || option?.value || ''),
  };
}

export default function MultiSelectChips({
  label,
  hint,
  error,
  required = false,
  options = [],
  values = [],
  onChange,
  placeholder,
  disabled = false,
  containerClassName = '',
}) {
  const { isRTL, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  const normalizedOptions = useMemo(
    () =>
      options
        .map(toOptionShape)
        .filter((opt) => opt.value && opt.label)
        .filter((opt, index, arr) => arr.findIndex((entry) => entry.value === opt.value) === index),
    [options]
  );

  const selectedValues = [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))];
  const selectedSet = new Set(selectedValues);

  const selectedOptions = selectedValues.map((value) => {
    const found = normalizedOptions.find((opt) => opt.value === value);
    return found || { value, label: value };
  });

  const filteredOptions = normalizedOptions.filter((option) => {
    if (!query.trim()) return true;
    const normalizedQuery = query.trim().toLowerCase();
    return option.label.toLowerCase().includes(normalizedQuery);
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleValue = (value) => {
    if (disabled) return;
    if (selectedSet.has(value)) {
      onChange?.(selectedValues.filter((entry) => entry !== value));
      return;
    }
    onChange?.([...selectedValues, value]);
  };

  const removeValue = (value) => {
    if (disabled) return;
    onChange?.(selectedValues.filter((entry) => entry !== value));
  };

  return (
    <div className={`mb-4 ${containerClassName}`.trim()} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-base mb-1.5">
          {label}
          {required && <span className={`text-danger ${isRTL ? 'mr-1' : 'ml-1'}`}>*</span>}
        </label>
      )}

      <div className={`relative rounded-md border ${error ? 'border-danger' : 'border-border'} bg-surface`}>
        <div
          className={`min-h-[44px] px-3 py-2.5 flex items-center gap-2 ${
            disabled ? 'opacity-70' : 'cursor-pointer'
          }`}
          onClick={() => !disabled && setOpen((prev) => !prev)}
        >
          <div className="flex-1 flex flex-wrap items-center gap-1.5">
            {selectedOptions.length === 0 && (
              <span className="text-sm text-muted">{placeholder || t('common.search.placeholder')}</span>
            )}

            {selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-2.5 py-1 text-xs"
              >
                <span className="font-medium text-heading">{option.label}</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeValue(option.value);
                  }}
                  disabled={disabled}
                  className="text-muted hover:text-danger disabled:opacity-50"
                  aria-label={`${t('common.actions.delete')} ${option.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>

        {open && !disabled && (
          <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-surface shadow-lg">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className={`h-4 w-4 text-muted absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-2' : 'left-2'}`} />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('common.search.placeholder')}
                  className={`input-base w-full py-2 ${isRTL ? 'pr-8 pl-3' : 'pl-8 pr-3'}`}
                />
              </div>
            </div>

            <ul className="max-h-56 overflow-auto py-1">
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-3 text-sm text-muted text-center">{t('common.search.noResults')}</li>
              ) : (
                filteredOptions.map((option) => {
                  const checked = selectedSet.has(option.value);

                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        onClick={() => toggleValue(option.value)}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-surface-alt flex items-center justify-between gap-2"
                      >
                        <span className="text-base">{option.label}</span>
                        {checked && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      {hint && !error && <p className="text-xs text-muted mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
