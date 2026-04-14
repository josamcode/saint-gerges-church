import { Loader } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import { getUserNotificationPresentation } from '../../utils/userNotificationPresentation';
import { useI18n } from '../../i18n/i18n';
import { getLocalizedUserNotificationContent } from '../../utils/userNotificationContent';

export default function NotificationListItem({
  notification,
  tf,
  onOpen,
  compact = false,
  loading = false,
}) {
  const { language } = useI18n();
  const presentation = getUserNotificationPresentation(notification, tf);
  const Icon = presentation.icon;
  const nextSessionAt =
    notification?.type === 'confession_next_session' ? notification?.metadata?.nextSessionAt : null;
  const content = getLocalizedUserNotificationContent(notification, language);

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={loading}
      className={[
        'w-full rounded-2xl border p-4 text-left transition-all duration-150',
        'hover:border-primary/30 hover:bg-surface-alt/40',
        notification?.isRead ? 'border-border bg-surface' : 'border-primary/20 bg-primary/5',
        loading ? 'opacity-70' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-alt">
          <Icon className={`h-4 w-4 ${presentation.iconClassName}`} />
          {!notification?.isRead ? (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${presentation.badgeClassName}`}>
              {presentation.label}
            </span>
            <span className="text-[11px] text-muted">
              {formatDateTime(notification?.createdAt)}
            </span>
          </div>

          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-heading">
                {content.title || tf('notificationCenter.defaults.title', 'Notification')}
              </h3>
              <p
                className={[
                  'mt-1 text-sm text-muted',
                  compact ? 'truncate' : '',
                ].join(' ')}
              >
                {content.message || tf('notificationCenter.defaults.message', 'Open to view the details.')}
              </p>
              {nextSessionAt ? (
                <p className="mt-1 text-xs font-medium text-heading">
                  {tf('notificationCenter.confessionNextSession.scheduledFor', 'Scheduled for {date}', {
                    date: formatDateTime(nextSessionAt),
                  })}
                </p>
              ) : null}
            </div>

            {loading ? <Loader className="mt-0.5 h-4 w-4 animate-spin text-primary" /> : null}
          </div>
        </div>
      </div>
    </button>
  );
}
