import { forwardRef, useId, useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useI18n } from '../../i18n/i18n';

const Select = forwardRef(
  (
    {
      label,
      hint,
      error,
      required,
      options = [],
      placeholder,
      className = '',
      containerClassName = '',
      size = 'md',
      value,
      defaultValue,
      onChange,
      disabled = false,
      name,
      id: propId,
    },
    _ref
  ) => {
    const { isRTL } = useI18n();
    const autoId = useId();
    const id = propId ?? autoId;

    // controlled vs uncontrolled
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(defaultValue ?? '');
    const current = isControlled ? value : internalValue;

    const [open, setOpen] = useState(false);
    const [focused, setFocused] = useState(null); // index of keyboard-focused option
    const containerRef = useRef(null);
    const listRef = useRef(null);
    const triggerRef = useRef(null);

    const selectedOption = options.find((o) => o.value === current) ?? null;

    const sizeStyles = {
      sm: 'h-8 text-xs px-3',
      md: 'h-10 text-sm px-3.5',
      lg: 'h-12 text-sm px-4',
    };

    /* ── close on outside click ── */
    useEffect(() => {
      const handler = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target)) {
          setOpen(false);
          setFocused(null);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ── scroll focused option into view ── */
    useEffect(() => {
      if (!open || focused === null || !listRef.current) return;
      const item = listRef.current.children[focused];
      item?.scrollIntoView({ block: 'nearest' });
    }, [focused, open]);

    const select = useCallback(
      (opt) => {
        if (opt.disabled) return;
        if (!isControlled) setInternalValue(opt.value);
        onChange?.({ target: { name, value: opt.value } });
        setOpen(false);
        setFocused(null);
        triggerRef.current?.focus();
      },
      [isControlled, name, onChange]
    );

    const handleKeyDown = (e) => {
      const enabledOptions = options.map((o, i) => ({ ...o, i })).filter((o) => !o.disabled);

      if (!open) {
        if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
          e.preventDefault();
          setOpen(true);
          const currentIdx = options.findIndex((o) => o.value === current);
          setFocused(currentIdx >= 0 ? currentIdx : 0);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        setFocused(null);
        triggerRef.current?.focus();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = enabledOptions.find((o) => o.i > (focused ?? -1));
        if (next) setFocused(next.i);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = [...enabledOptions].reverse().find((o) => o.i < (focused ?? options.length));
        if (prev) setFocused(prev.i);
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focused !== null) select(options[focused]);
        return;
      }

      if (e.key === 'Tab') {
        setOpen(false);
        setFocused(null);
      }
    };

    return (
      <div ref={containerRef} className={`group/field ${containerClassName}`.trim()}>

        {/* hidden native input for form compat */}
        <input type="hidden" name={name} value={current ?? ''} />

        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted transition-colors group-focus-within/field:text-primary"
          >
            {label}
            {required && (
              <>
                <span aria-hidden="true" className="text-danger">·</span>
                <span className="sr-only">(required)</span>
              </>
            )}
          </label>
        )}

        {/* Trigger */}
        <div className="relative">
          <button
            ref={triggerRef}
            id={id}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={`${id}-listbox`}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            onClick={() => {
              if (disabled) return;
              setOpen((v) => {
                if (!v) {
                  const idx = options.findIndex((o) => o.value === current);
                  setFocused(idx >= 0 ? idx : 0);
                } else {
                  setFocused(null);
                }
                return !v;
              });
            }}
            className={[
              'flex w-full items-center justify-between rounded-sm border bg-surface font-medium outline-none py-5',
              'transition-all duration-150 cursor-default',
              sizeStyles[size] ?? sizeStyles.md,
              disabled ? 'opacity-50 cursor-not-allowed' : '',
              !error
                ? open
                  ? 'border-primary ring-2 ring-primary/15'
                  : 'border-border hover:border-primary/40'
                : open
                  ? 'border-danger ring-2 ring-danger/15'
                  : 'border-danger',
              !selectedOption ? 'text-muted' : 'text-heading',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder ?? ''}
            </span>
            <ChevronDown
              strokeWidth={2.5}
              aria-hidden="true"
              className={[
                'h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200',
                isRTL ? 'mr-1' : 'ml-1',
                open ? 'rotate-180 text-primary' : '',
              ].join(' ')}
            />
          </button>

          {/* Dropdown */}
          {open && (
            <ul
              ref={listRef}
              id={`${id}-listbox`}
              role="listbox"
              aria-label={label}
              className={[
                'absolute z-50 mt-1.5 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg',
                'animate-fade-in max-h-60',
                // open above if near bottom — pure CSS fallback; real flip needs JS
                isRTL ? 'right-0' : 'left-0',
              ].join(' ')}
            >
              {options.map((opt, i) => {
                const isSelected = opt.value === current;
                const isFocused = focused === i;

                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onMouseEnter={() => !opt.disabled && setFocused(i)}
                    onMouseLeave={() => setFocused(null)}
                    onClick={() => select(opt)}
                    className={[
                      'relative flex cursor-default select-none items-center justify-between px-3.5 py-2.5 text-sm transition-colors',
                      opt.disabled
                        ? 'pointer-events-none text-muted/50'
                        : isFocused || isSelected
                          ? 'bg-primary/8 text-primary'
                          : 'text-heading hover:bg-surface-alt',
                    ].join(' ')}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check
                        aria-hidden="true"
                        strokeWidth={2.5}
                        className={`h-3.5 w-3.5 shrink-0 text-primary ${isRTL ? 'mr-2' : 'ml-2'}`}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Hint */}
        {hint && !error && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        )}

        {/* Error */}
        {error && (
          <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger">
            <span aria-hidden="true" className="inline-block h-1 w-1 rounded-full bg-danger" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;