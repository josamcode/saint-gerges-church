import { useId, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useI18n } from '../../i18n/i18n';

function normalizeToken(value) {
  return String(value || '').trim();
}

function uniqueTokens(values = []) {
  return [...new Set((values || []).map(normalizeToken).filter(Boolean))];
}

export default function TagInput({
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
  const suggestionsListId = useId();

  const tags = uniqueTokens(values);
  const availableSuggestions = useMemo(() => {
    const normalizedDraft = normalizeToken(draft).toLowerCase();
    return uniqueTokens(suggestions)
      .filter((suggestion) => !tags.includes(suggestion))
      .filter((suggestion) =>
        !normalizedDraft || suggestion.toLowerCase().includes(normalizedDraft)
      )
      .slice(0, 20);
  }, [draft, suggestions, tags]);

  const commitDraft = () => {
    if (disabled) return;
    const token = normalizeToken(draft);
    if (!token) return;
    if (tags.includes(token)) {
      setDraft('');
      return;
    }
    onChange?.([...tags, token]);
    setDraft('');
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
        <label className="block text-sm font-medium text-base mb-1.5">
          {label}
          {required && <span className={`text-danger ${isRTL ? 'mr-1' : 'ml-1'}`}>*</span>}
        </label>
      )}

      <div
        className={`rounded-md border border-border bg-surface px-3 py-2.5 transition-colors ${
          error ? 'border-danger' : 'focus-within:border-primary focus-within:ring-1 focus-within:ring-primary'
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

          <input
            type="text"
            value={draft}
            disabled={disabled}
            list={availableSuggestions.length > 0 ? suggestionsListId : undefined}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitDraft}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="min-w-[140px] flex-1 bg-transparent text-sm placeholder:text-muted outline-none"
          />
          {availableSuggestions.length > 0 ? (
            <datalist id={suggestionsListId}>
              {availableSuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          ) : null}

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

      {hint && !error && <p className="text-xs text-muted mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
