import Button from './Button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useI18n } from '../../i18n/i18n';

export default function Pagination({
  meta,
  onLoadMore,
  onPrev,
  loading = false,
  cursors = [],
  pageInfo = null,
}) {
  const { t, isRTL } = useI18n();

  if (!meta) return null;

  const canGoBack = cursors && cursors.length > 1;
  const canLoadMore = Boolean(meta?.hasMore ?? meta?.nextCursor);
  const currentPage = Math.max(Array.isArray(cursors) ? cursors.length : 1, 1);
  const totalPages = meta?.hasMore ? '?' : currentPage;
  const resolvedPageInfo = pageInfo || `${currentPage}/${totalPages}`;

  return (
    <div className="flex items-center justify-end pt-4">
      {/* <p className="text-sm text-muted">{t('common.pagination.showing', { count: meta.count })}</p> */}
      <div className="flex items-center gap-2">
        {onPrev && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPrev}
            disabled={!canGoBack || loading}
            icon={isRTL ? ChevronRight : ChevronLeft}
          >
            {t('common.pagination.previous')}
          </Button>
        )}
        <span className="min-w-12 text-center text-sm font-medium text-muted direction-ltr">
          {resolvedPageInfo}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onLoadMore}
          disabled={!canLoadMore || loading}
          loading={loading}
          icon={isRTL ? ChevronLeft : ChevronRight}
          iconPosition="end"
        >
          {t('common.pagination.next')}
        </Button>
      </div>
    </div>
  );
}
