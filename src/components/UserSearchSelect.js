import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/endpoints';
import { UserCheck, X } from 'lucide-react';
import { useI18n } from '../i18n/i18n';

export default function UserSearchSelect({
  label,
  value,
  onChange,
  placeholder,
  excludeUserId,
  disabled = false,
  className = '',
  searchApi,
  queryKeyPrefix = 'users',
}) {
  const { t, isRTL } = useI18n();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const { data: listRes, isFetching } = useQuery({
    queryKey: [queryKeyPrefix, 'search', query.trim()],
    queryFn: async () => {
      const params = { limit: 15 };
      params.fullName = query.trim();
      params.phonePrimary = query.trim();
      const request = searchApi || usersApi.list;
      const { data } = await request(params);
      return data?.data ?? data?.users ?? [];
    },
    enabled: query.trim().length >= 2,
    staleTime: 30000,
  });
  const users = Array.isArray(listRes) ? listRes : [];
  const filtered = excludeUserId ? users.filter((u) => (u._id || u.id) !== excludeUserId) : users;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (u) => {
    if (disabled) return;
    onChange?.({ _id: u._id || u.id, fullName: u.fullName, phonePrimary: u.phonePrimary });
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    if (disabled) return;
    onChange?.(null);
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className={className} ref={containerRef}>
      {label && <label className="block text-sm font-medium text-base mb-1.5">{label}</label>}
      {value ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-surface-alt/50">
          <UserCheck className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-heading truncate">{value.fullName}</p>
            {value.phonePrimary && (
              <p className="text-sm text-muted direction-ltr text-left">{value.phonePrimary}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
            aria-label={t('userSearch.clearLink')}
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              disabled={disabled}
              value={query}
              onChange={(e) => {
                if (disabled) return;
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => !disabled && query.trim().length >= 2 && setOpen(true)}
              placeholder={
                placeholder ||
                `${t('userSearch.searchUsing')} ${t('userSearch.byName')} / ${t('userSearch.byPhone')}...`
              }
              className="input-base w-full"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            {open && query.trim().length >= 2 && (
              <ul
                className="absolute z-30 mt-1 w-full max-h-56 overflow-auto rounded-md border border-border shadow-lg py-1 bg-surface"
                role="listbox"
              >
                {isFetching ? (
                  <li className="px-3 py-4 text-center text-sm text-muted">{t('common.search.loading')}</li>
                ) : filtered.length === 0 ? (
                  <li className="px-3 py-4 text-center text-sm text-muted">{t('common.search.noResults')}</li>
                ) : (
                  filtered.map((u) => (
                    <li
                      key={u._id || u.id}
                      role="option"
                      aria-selected={false}
                      className="px-3 py-2.5 text-sm cursor-pointer hover:bg-muted flex flex-col gap-0.5"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(u);
                      }}
                    >
                      <span className="font-medium text-heading">{u.fullName}</span>
                      {u.phonePrimary && (
                        <span className="text-muted direction-ltr text-left text-xs">
                          {u.phonePrimary}
                        </span>
                      )}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
