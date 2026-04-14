import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '../../i18n/i18n';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeOption(option) {
  if (option && typeof option === 'object') {
    const value = normalizeValue(option.value);
    const label = normalizeValue(option.label || option.value);
    return value ? { value, label } : null;
  }

  const value = normalizeValue(option);
  return value ? { value, label: value } : null;
}

function normalizeOptions(options = []) {
  const mappedOptions = (Array.isArray(options) ? options : [])
    .map(normalizeOption)
    .filter(Boolean);

  return Array.from(new Map(mappedOptions.map((option) => [option.value.toLowerCase(), option])).values());
}

export default function CreatableComboboxInput({
  label,
  hint,
  error,
  required = false,
  options = [],
  value = '',
  onChange,
  placeholder,
  disabled = false,
  containerClassName = '',
  className = '',
}) {
  const { isRTL } = useI18n();
  const [open, setOpen] = useState(false);
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const normalizedInputValue = normalizeValue(value);
  const normalizedValue = normalizedInputValue.toLowerCase();
  const filteredOptions = useMemo(
    () =>
      normalizedOptions
        .filter(
          (option) =>
            !normalizedValue ||
            option.value.toLowerCase().includes(normalizedValue) ||
            option.label.toLowerCase().includes(normalizedValue)
        )
        .slice(0, 20),
    [normalizedOptions, normalizedValue],
  );
  const selectedOption = normalizedOptions.find((option) => option.value.toLowerCase() === normalizedValue);

  return (
    <div className={`mb-4 ${containerClassName}`.trim()}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-base">
          {label}
          {required && <span className={`text-danger ${isRTL ? 'mr-1' : 'ml-1'}`}>*</span>}
        </label>
      )}

      <div className="relative">
        <div
          className={`relative overflow-hidden rounded-xl border bg-surface transition-colors ${
            error
              ? 'border-danger focus-within:ring-2 focus-within:ring-danger/15'
              : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10'
          } ${disabled ? 'opacity-70' : ''}`}
        >
          <input
            type="text"
            value={selectedOption ? selectedOption.label : value}
            disabled={disabled}
            onChange={(event) => {
              onChange?.(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className={`w-full bg-transparent px-3 py-2.5 text-sm text-heading placeholder:text-muted focus:outline-none ${
              isRTL ? 'pl-10' : 'pr-10'
            } ${className}`.trim()}
          />
          <ChevronDown
            className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted ${
              isRTL ? 'left-3' : 'right-3'
            }`}
          />
        </div>

        {open && filteredOptions.length > 0 ? (
          <ul
            role="listbox"
            className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-border bg-surface py-1 shadow-lg"
          >
            {filteredOptions.map((option) => {
              const isSelected = option.value.toLowerCase() === normalizedValue;
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onChange?.(option.value);
                    setOpen(false);
                  }}
                  className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary/8 font-semibold text-primary'
                      : 'text-heading hover:bg-primary/8 hover:text-primary'
                  }`}
                >
                  {option.label}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
