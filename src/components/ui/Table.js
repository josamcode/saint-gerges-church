import { ArrowUp, ArrowDown, LayoutGrid, MoreVertical, TableProperties } from 'lucide-react';
import Skeleton, { SkeletonRow } from './Skeleton';
import EmptyState from './EmptyState';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/i18n';

const MOBILE_VIEW_STORAGE_KEY = 'dashboard_table_mobile_view';
const MOBILE_VIEW_EVENT = 'dashboard-table-mobile-view-change';
const MOBILE_BREAKPOINT_QUERY = '(max-width: 639px)';

function normalizeMobileView(value) {
  return value === 'table' ? 'table' : 'cards';
}

function getStoredMobileView() {
  if (typeof window === 'undefined') return 'cards';
  return normalizeMobileView(window.localStorage.getItem(MOBILE_VIEW_STORAGE_KEY));
}

function persistMobileView(nextView) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(MOBILE_VIEW_STORAGE_KEY, nextView);
  window.dispatchEvent(new CustomEvent(MOBILE_VIEW_EVENT, { detail: nextView }));
}

function useIsSmallScreen() {
  const getMatch = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;

  const [isSmallScreen, setIsSmallScreen] = useState(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const handleChange = (event) => setIsSmallScreen(event.matches);

    setIsSmallScreen(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isSmallScreen;
}

function isActionColumn(column) {
  return column?.key === 'actions' || !String(column?.label || '').trim();
}

function getCellContent(column, row, rowIndex, emptyValue) {
  return column.render ? column.render(row, rowIndex) : row[column.key] ?? emptyValue;
}

function getInteractiveCellProps(column, row) {
  if (!column.onClick) return {};

  return {
    onClick: () => column.onClick(row),
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        column.onClick(row);
      }
    },
    role: 'button',
    tabIndex: 0,
  };
}

export default function Table({
  columns = [],
  data = [],
  loading = false,
  skeletonRows = 5,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  sortField,
  sortOrder,
  onSort,
}) {
  const { isRTL, t } = useI18n();
  const isSmallScreen = useIsSmallScreen();
  const [mobileView, setMobileView] = useState(getStoredMobileView);
  const emptyValue = t('common.placeholder.empty');
  const primaryColumn = columns.find((column) => !isActionColumn(column)) || null;
  const detailColumns = columns.filter(
    (column) => column !== primaryColumn && !isActionColumn(column)
  );
  const actionColumns = columns.filter((column) => column !== primaryColumn && isActionColumn(column));
  const showCardView = isSmallScreen && mobileView === 'cards';

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncViewPreference = (event) => {
      if (event?.type === 'storage' && event.key && event.key !== MOBILE_VIEW_STORAGE_KEY) return;
      setMobileView(
        event?.type === MOBILE_VIEW_EVENT
          ? normalizeMobileView(event.detail)
          : getStoredMobileView()
      );
    };

    window.addEventListener('storage', syncViewPreference);
    window.addEventListener(MOBILE_VIEW_EVENT, syncViewPreference);

    return () => {
      window.removeEventListener('storage', syncViewPreference);
      window.removeEventListener(MOBILE_VIEW_EVENT, syncViewPreference);
    };
  }, []);

  const handleMobileViewChange = (nextView) => {
    const normalizedView = normalizeMobileView(nextView);
    setMobileView(normalizedView);
    persistMobileView(normalizedView);
  };

  return (
    <div className="space-y-3">
      {isSmallScreen && (
        <div dir="ltr" className="flex justify-start">
          <div className="inline-flex items-center gap-1 rounded-sm border border-border/70 bg-surface/95 p-1 m-2 mb-0 shadow-card backdrop-blur-sm">
            <button
              type="button"
              onClick={() => handleMobileViewChange('cards')}
              aria-pressed={mobileView === 'cards'}
              aria-label={t('common.table.cardsView')}
              title={t('common.table.cardsView')}
              className={`inline-flex h-6 w-6 items-center justify-center rounded-sm transition-all duration-200 ${mobileView === 'cards'
                ? 'bg-primary text-white shadow-sm ring-1 ring-primary/15'
                : 'text-muted hover:bg-surface-alt hover:text-heading'
                }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="sr-only">{t('common.table.cardsView')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleMobileViewChange('table')}
              aria-pressed={mobileView === 'table'}
              aria-label={t('common.table.tableView')}
              title={t('common.table.tableView')}
              className={`inline-flex h-6 w-6 items-center justify-center rounded-sm transition-all duration-200 ${mobileView === 'table'
                ? 'bg-primary text-white shadow-sm ring-1 ring-primary/15'
                : 'text-muted hover:bg-surface-alt hover:text-heading'
                }`}
            >
              <TableProperties className="h-4 w-4" />
              <span className="sr-only">{t('common.table.tableView')}</span>
            </button>
          </div>
        </div>
      )}

      {!loading && data.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} />
        </div>
      ) : showCardView ? (
        <div className="space-y-3">
          {loading
            ? Array.from({ length: skeletonRows }).map((_, index) => (
              <MobileTableSkeletonCard key={index} />
            ))
            : data.map((row, rowIndex) => (
              <MobileTableCard
                key={row._id || row.id || rowIndex}
                row={row}
                rowIndex={rowIndex}
                primaryColumn={primaryColumn}
                detailColumns={detailColumns}
                actionColumns={actionColumns}
                emptyValue={emptyValue}
                isRTL={isRTL}
              />
            ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt border-b border-border">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`p-3 font-semibold text-heading whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'
                      } ${col.className || ''}`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort?.(col.key)}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                      >
                        {col.label}
                        {sortField === col.key &&
                          (sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5" />
                          ))}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <SkeletonRow key={i} cols={columns.length} />
                ))
                : data.map((row, i) => (
                  <tr
                    key={row._id || row.id || i}
                    className="border-b border-border last:border-b-0 hover:bg-surface-alt/50 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`p-3 whitespace-nowrap ${col.cellClassName || ''}`}
                        {...getInteractiveCellProps(col, row)}
                      >
                        {getCellContent(col, row, i, emptyValue)}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MobileTableCard({
  row,
  rowIndex,
  primaryColumn,
  detailColumns,
  actionColumns,
  emptyValue,
  isRTL,
}) {
  const alignmentClass = isRTL ? 'text-right' : 'text-left';
  const detailGridTemplate =
    detailColumns.length > 1
      ? 'repeat(auto-fit, minmax(100px, 1fr))'
      : 'minmax(0, 1fr)';

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      {(primaryColumn || actionColumns.length > 0) && (
        <div className="border-b border-border/70 bg-gradient-to-b from-surface-alt/40 to-surface px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            {primaryColumn ? (
              <div
                className={`min-w-0 flex-1 ${primaryColumn.onClick ? 'cursor-pointer rounded-xl transition-colors hover:bg-surface-alt/30 focus:outline-none focus:ring-2 focus:ring-primary/20' : ''}`}
                {...getInteractiveCellProps(primaryColumn, row)}
              >
                {getCellContent(primaryColumn, row, rowIndex, emptyValue)}
              </div>
            ) : null}

            {actionColumns.length > 0 ? (
              <div className="flex shrink-0 items-center gap-2">
                {actionColumns.map((column) => (
                  <div key={`${row._id || row.id || rowIndex}-${column.key}`}>
                    {getCellContent(column, row, rowIndex, emptyValue)}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {detailColumns.length > 0 ? (
        <div className="px-4 py-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: detailGridTemplate }}>
            {detailColumns.map((column) => (
              <div
                key={`${row._id || row.id || rowIndex}-${column.key}`}
                className={`flex min-h-[88px] flex-col justify-between rounded-xl border border-border/80 bg-surface-alt/35 px-3.5 py-3 shadow-sm ${column.onClick
                  ? 'cursor-pointer transition-all hover:-translate-y-0.5 hover:bg-surface-alt/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20'
                  : ''
                  }`}
                {...getInteractiveCellProps(column, row)}
              >
                {String(column.label || '').trim() ? (
                  <p className={`text-[11px] font-medium text-muted ${alignmentClass}`}>
                    {column.label}
                  </p>
                ) : null}
                <div className={`mt-2 text-sm font-semibold leading-6 text-heading break-words ${alignmentClass}`}>
                  {getCellContent(column, row, rowIndex, emptyValue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MobileTableSkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="border-b border-border/70 bg-gradient-to-b from-surface-alt/40 to-surface px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <Skeleton variant="circle" className="h-10 w-10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      <div className="px-4 py-4">
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))' }}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex min-h-[88px] flex-col justify-between rounded-xl border border-border/80 bg-surface-alt/35 px-3.5 py-3 shadow-sm"
            >
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="mt-3 h-4 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RowActions({ actions = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { isRTL, t } = useI18n();

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded hover:bg-surface-alt transition-colors"
        aria-label={t('common.table.actions')}
      >
        <MoreVertical className="w-4 h-4 text-muted" />
      </button>
      {open && (
        <div
          className={`absolute top-full mt-1 w-44 bg-surface border border-border rounded-lg shadow-dropdown z-30 py-1 animate-fade-in ${isRTL ? 'left-0' : 'right-0'
            }`}
        >
          {actions.map((action, i) =>
            action.divider ? (
              <hr key={i} className="my-1 border-border" />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setOpen(false);
                  action.onClick?.();
                }}
                disabled={action.disabled}
                className={`
                  w-full px-3 py-2 text-sm flex items-center gap-2 transition-colors
                  ${isRTL ? 'text-right' : 'text-left'}
                  ${action.danger ? 'text-danger hover:bg-danger-light' : 'text-base hover:bg-surface-alt'}
                  ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {action.icon && <action.icon className="w-4 h-4" />}
                {action.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
