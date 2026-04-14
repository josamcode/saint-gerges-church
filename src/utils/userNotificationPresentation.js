import {
  Bell,
  CalendarPlus,
  CalendarClock,
  Church,
  Megaphone,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

export function getUserNotificationPresentation(notification, tf) {
  const type = String(notification?.type || '').trim().toLowerCase();

  switch (type) {
    case 'chat_message':
      return {
        icon: MessageSquare,
        label: tf('notificationCenter.types.chatMessage', 'Chat message'),
        iconClassName: 'text-primary',
        badgeClassName: 'bg-primary/10 text-primary',
      };
    case 'admin':
      return {
        icon: Megaphone,
        label: tf('notificationCenter.types.admin', 'Admin'),
        iconClassName: 'text-accent',
        badgeClassName: 'bg-accent/10 text-accent',
      };
    case 'backup_success':
      return {
        icon: ShieldCheck,
        label: tf('notificationCenter.types.backupSuccess', 'Backup success'),
        iconClassName: 'text-success',
        badgeClassName: 'bg-success/10 text-success',
      };
    case 'backup_failure':
      return {
        icon: ShieldAlert,
        label: tf('notificationCenter.types.backupFailure', 'Backup failure'),
        iconClassName: 'text-danger',
        badgeClassName: 'bg-danger/10 text-danger',
      };
    case 'aid_reminder':
      return {
        icon: CalendarClock,
        label: tf('notificationCenter.types.aidReminder', 'Aid reminder'),
        iconClassName: 'text-secondary',
        badgeClassName: 'bg-secondary/10 text-secondary',
      };
    case 'meeting_reminder':
      return {
        icon: CalendarClock,
        label: tf('notificationCenter.types.meetingReminder', 'Meeting reminder'),
        iconClassName: 'text-primary',
        badgeClassName: 'bg-primary/10 text-primary',
      };
    case 'confession_next_session':
      return {
        icon: CalendarPlus,
        label: tf('notificationCenter.types.confessionNextSession', 'Next confession session'),
        iconClassName: 'text-secondary',
        badgeClassName: 'bg-secondary/10 text-secondary',
      };
    case 'divine_liturgy_exception':
      return {
        icon: Church,
        label: tf('notificationCenter.types.divineLiturgyException', 'Exceptional divine liturgy'),
        iconClassName: 'text-accent',
        badgeClassName: 'bg-accent/10 text-accent',
      };
    default:
      return {
        icon: Bell,
        label: tf('notificationCenter.types.system', 'System'),
        iconClassName: 'text-heading',
        badgeClassName: 'bg-surface-alt text-heading',
      };
  }
}
