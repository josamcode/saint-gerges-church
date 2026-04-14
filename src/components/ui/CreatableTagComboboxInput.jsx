import { useMemo, useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { useI18n } from '../../i18n/i18n';

function normalizeToken(value) {
  return String(value || '').trim();
}

function uniqueTokens(values = []) {
  return [...new Set((values || []).map(normalizeToken).filter(Boolean))];
}

export default function CreatableTagComboboxInput({
  label,
  hint,
  error,
  required = false,
  values = [],
  onChange,
  placeholder,
  disabled = false,
  containerClassName = '',
  className = '',
  addButtonLabel,
  suggestions = [],
}) {
  const { isRTL, t } = useI18n();
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);

  const tags = uniqueTokens(values);
  const availableSuggestions = useMemo(() => {
    const normalizedDraft = normalizeToken(draft).toLowerCase();
    return uniqueTokens(suggestions)
      .filter((suggestion) => !tags.includes(suggestion))
      .filter((suggestion) => !normalizedDraft || suggestion.toLowerCase().includes(normalizedDraft))
      .slice(0, 20);
  }, [draft, suggestions, tags]);

  const commitDraft = () => {
    if (disabled) return;
    const token = normalizeToken(draft);
    if (!token || tags.includes(token)) {
      setDraft('');
      return;
    }
    onChange?.([...tags, token]);
    setDraft('');
    setOpen(false);
  };

  const selectSuggestion = (suggestion) => {
    if (disabled || tags.includes(suggestion)) return;
    onChange?.([...tags, suggestion]);
    setDraft('');
    setOpen(false);
  };

  const removeTag = (tag) => {
    if (disabled) return;
    onChange?.(tags.filter((entry) => entry !== tag));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commitDraft();
      return;
    }

    if (event.key === 'Backspace' && !draft.trim() && tags.length > 0) {
      event.preventDefault();
      removeTag(tags[tags.length - 1]);
    }
  };

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
          className={`rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors ${
            error
              ? 'border-danger'
              : 'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10'
          } ${disabled ? 'opacity-70' : ''} ${className}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt px-2.5 py-1 text-xs"
              >
                <span className="font-medium text-heading">{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  disabled={disabled}
                  className="text-muted hover:text-danger disabled:opacity-50"
                  aria-label={`${t('common.actions.delete')} ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            <div className="relative min-w-[180px] flex-1">
              <input
                type="text"
                value={draft}
                disabled={disabled}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setOpen(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder={tags.length === 0 ? placeholder : ''}
                className={`w-full bg-transparent py-0.5 text-sm placeholder:text-muted outline-none ${
                  isRTL ? 'pl-6' : 'pr-6'
                }`}
              />
              <ChevronDown
                className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted ${
                  isRTL ? 'left-0' : 'right-0'
                }`}
              />
            </div>

            <button
              type="button"
              onClick={commitDraft}
              disabled={disabled || !draft.trim()}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:bg-surface-alt disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{addButtonLabel || t('common.actions.add')}</span>
            </button>
          </div>
        </div>

        {open && availableSuggestions.length > 0 ? (
          <ul
            role="listbox"
            className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-border bg-surface py-1 shadow-lg"
          >
            {availableSuggestions.map((suggestion) => (
              <li
                key={suggestion}
                role="option"
                aria-selected={false}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectSuggestion(suggestion);
                }}
                className="cursor-pointer px-3 py-2 text-sm text-heading transition-colors hover:bg-primary/8 hover:text-primary"
              >
                {suggestion}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
