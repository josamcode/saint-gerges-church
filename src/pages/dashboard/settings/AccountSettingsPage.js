import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Save, Shield, Upload, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';

import { authApi, usersApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card, { CardHeader } from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import PageHeader from '../../../components/ui/PageHeader';
import Switch from '../../../components/ui/Switch';
import Tabs from '../../../components/ui/Tabs';
import { useI18n } from '../../../i18n/i18n';

function SettingsCard({ children, className = '', ...props }) {
  return (
    <Card
      padding={false}
      className={['min-w-0 rounded-2xl p-4 sm:p-6', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </Card>
  );
}

export default function AccountSettingsPage() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { user, loading, hydrateUser, hasPermission } = useAuth();
  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const canCreateConfessionSessions = hasPermission('CONFESSIONS_CREATE');
  const canChangePassword = hasPermission('AUTH_CHANGE_PASSWORD');
  const canUseChats = hasPermission('CHATS_VIEW');
  const canUploadOwnAvatar = hasPermission('USERS_UPLOAD_AVATAR_SELF');
  const userId = user?._id || user?.id || null;
  const hasUserId = Boolean(userId);
  const savedVisibility = user?.allowOthersToViewCreatedConfessionSessions !== false;
  const savedChatVisibility = user?.allowOthersToViewCreatedChats !== false;
  const [allowOthersToViewCreatedConfessionSessions, setAllowOthersToViewCreatedConfessionSessions] =
    useState(savedVisibility);
  const [allowOthersToViewCreatedChats, setAllowOthersToViewCreatedChats] =
    useState(savedChatVisibility);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    setAllowOthersToViewCreatedConfessionSessions(savedVisibility);
  }, [savedVisibility]);

  useEffect(() => {
    setAllowOthersToViewCreatedChats(savedChatVisibility);
  }, [savedChatVisibility]);

  const passwordMismatch =
    passwordForm.confirmPassword &&
    passwordForm.newPassword !== passwordForm.confirmPassword;
  const canSubmitPassword =
    Boolean(passwordForm.currentPassword) &&
    Boolean(passwordForm.newPassword) &&
    Boolean(passwordForm.confirmPassword) &&
    !passwordMismatch;

  const saveMutation = useMutation({
    mutationFn: (payload) => authApi.updateMySettings(payload),
    onSuccess: async () => {
      await hydrateUser();
      queryClient.invalidateQueries({ queryKey: ['confessions', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      toast.success(tf('accountSettings.messages.saved', 'Account settings saved successfully.'));
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (payload) => authApi.changePassword(payload),
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(tf('accountSettings.messages.passwordChanged', 'Password updated successfully.'));
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file) => usersApi.uploadMyAvatar(file),
    onSuccess: async () => {
      await hydrateUser();
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['users', userId] });
      }
      toast.success(tf('accountSettings.messages.avatarUploaded', 'Avatar updated successfully.'));
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const handlePasswordFieldChange = (field) => (event) => {
    const value = event.target.value;
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangePassword = () => {
    if (passwordMutation.isPending) return;

    if (!canSubmitPassword) {
      if (passwordMismatch) {
        toast.error(
          tf(
            'accountSettings.password.confirmMismatch',
            'New password and confirmation do not match.'
          )
        );
      }
      return;
    }

    passwordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const resetAvatarInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAvatarSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      resetAvatarInput();
      toast.error(tf('accountSettings.avatar.invalidFile', 'Please choose an image file.'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      resetAvatarInput();
      toast.error(tf('accountSettings.avatar.fileTooLarge', 'Please choose an image smaller than 5 MB.'));
      return;
    }

    avatarMutation.mutate(file);
    resetAvatarInput();
  };

  const initial = String(user?.fullName || '').trim().charAt(0).toUpperCase();
  const settingTabs = [
    canUploadOwnAvatar
      ? {
          label: tf('accountSettings.tabs.avatar', 'Avatar'),
          content: (
            <SettingsCard>
              <CardHeader
                title={tf('accountSettings.avatar.title', 'Profile Avatar')}
                subtitle={tf(
                  'accountSettings.avatar.subtitle',
                  'Upload a profile image for your account.'
                )}
                action={(
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleAvatarSelection}
                      disabled={avatarMutation.isPending}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={Upload}
                      loading={avatarMutation.isPending}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {user?.avatar?.url
                        ? tf('accountSettings.avatar.changeButton', 'Change Avatar')
                        : tf('accountSettings.avatar.uploadButton', 'Upload Avatar')}
                    </Button>
                  </>
                )}
              />

              <div className="rounded-2xl border border-border bg-surface-alt/40 p-3 sm:p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {user?.avatar?.url ? (
                    <img
                      src={user.avatar.url}
                      alt={user?.fullName || ''}
                      className="h-20 w-20 rounded-2xl border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-border bg-surface text-xl font-semibold text-primary">
                      {initial ? initial : <UserIcon className="h-8 w-8" />}
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-heading">
                      {tf('accountSettings.avatar.currentLabel', 'Current avatar')}
                    </p>
                    <p className="text-sm text-muted">
                      {tf(
                        'accountSettings.avatar.help',
                        'Use a clear square image for the best result across the dashboard.'
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      {tf(
                        'accountSettings.avatar.requirements',
                        'Accepted formats: JPEG, PNG, GIF, WEBP. Maximum size: 5 MB.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </SettingsCard>
          ),
        }
      : null,
    canChangePassword
      ? {
          label: tf('accountSettings.tabs.password', 'Password'),
          content: (
            <SettingsCard>
              <CardHeader
                title={tf('accountSettings.password.title', 'Change Password')}
                subtitle={tf(
                  'accountSettings.password.subtitle',
                  'Update your account password using your current password.'
                )}
                action={(
                  <Button
                    type="button"
                    size="sm"
                    icon={KeyRound}
                    loading={passwordMutation.isPending}
                    disabled={!canSubmitPassword || passwordMutation.isPending}
                    onClick={handleChangePassword}
                  >
                    {tf('accountSettings.password.saveButton', 'Update Password')}
                  </Button>
                )}
              />

              <div className="rounded-2xl border border-border bg-surface-alt/40 p-3 sm:p-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <Input
                    type="password"
                    label={tf('accountSettings.password.currentLabel', 'Current password')}
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordFieldChange('currentPassword')}
                    containerClassName="!mb-0"
                  />
                  <Input
                    type="password"
                    label={tf('accountSettings.password.newLabel', 'New password')}
                    value={passwordForm.newPassword}
                    onChange={handlePasswordFieldChange('newPassword')}
                    containerClassName="!mb-0"
                    hint={tf(
                      'accountSettings.password.rules',
                      'Use at least 8 characters with uppercase, lowercase, number, and special character.'
                    )}
                  />
                  <Input
                    type="password"
                    label={tf(
                      'accountSettings.password.confirmLabel',
                      'Confirm new password'
                    )}
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordFieldChange('confirmPassword')}
                    containerClassName="!mb-0"
                    error={
                      passwordMismatch
                        ? tf(
                            'accountSettings.password.confirmMismatch',
                            'New password and confirmation do not match.'
                          )
                        : undefined
                    }
                  />
                </div>
              </div>
            </SettingsCard>
          ),
        }
      : null,
    canCreateConfessionSessions
      ? {
          label: tf('accountSettings.tabs.confessions', 'Confessions'),
          content: (
            <SettingsCard>
              <CardHeader
                title={tf('accountSettings.confessions.title', 'Confession Session Privacy')}
                subtitle={tf(
                  'accountSettings.confessions.subtitle',
                  'Control whether other users can view confession sessions created by your account.'
                )}
                action={(
                  <Button
                    type="button"
                    size="sm"
                    icon={Save}
                    loading={saveMutation.isPending}
                    disabled={
                      allowOthersToViewCreatedConfessionSessions === savedVisibility || !hasUserId
                    }
                    onClick={() =>
                      saveMutation.mutate({
                        allowOthersToViewCreatedConfessionSessions,
                      })
                    }
                  >
                    {t('common.actions.save')}
                  </Button>
                )}
              />

              <div className="rounded-2xl border border-border bg-surface-alt/40 p-3 sm:p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-heading">
                      <Shield className="h-4 w-4 text-primary" />
                      <span>
                        {tf(
                          'accountSettings.confessions.visibilityLabel',
                          'Allow others to view confession sessions I created'
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      {tf(
                        'accountSettings.confessions.visibilityHelp',
                        'When disabled, other users will not see sessions recorded by your account. You will still see your own created sessions.'
                      )}
                    </p>
                  </div>

                  <Switch
                    checked={allowOthersToViewCreatedConfessionSessions}
                    onChange={setAllowOthersToViewCreatedConfessionSessions}
                    label={
                      allowOthersToViewCreatedConfessionSessions
                        ? t('common.status.active')
                        : t('common.status.inactive')
                    }
                  />
                </div>
              </div>
            </SettingsCard>
          ),
        }
      : null,
    canUseChats
      ? {
          label: tf('accountSettings.tabs.chats', 'Chats'),
          content: (
            <SettingsCard>
              <CardHeader
                title={tf('accountSettings.chats.title', 'Chat Visibility')}
                subtitle={tf(
                  'accountSettings.chats.subtitle',
                  'Control whether users with advanced chat permissions can view chats created by your account.'
                )}
                action={(
                  <Button
                    type="button"
                    size="sm"
                    icon={Save}
                    loading={saveMutation.isPending}
                    disabled={allowOthersToViewCreatedChats === savedChatVisibility || !hasUserId}
                    onClick={() =>
                      saveMutation.mutate({
                        allowOthersToViewCreatedChats,
                      })
                    }
                  >
                    {t('common.actions.save')}
                  </Button>
                )}
              />

              <div className="rounded-2xl border border-border bg-surface-alt/40 p-3 sm:p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-heading">
                      <Shield className="h-4 w-4 text-primary" />
                      <span>
                        {tf(
                          'accountSettings.chats.visibilityLabel',
                          'Allow users with chat oversight permission to view chats I created'
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      {tf(
                        'accountSettings.chats.visibilityHelp',
                        'When disabled, other users cannot inspect conversations created by your account unless they are direct participants. You still keep full access to your own chats.'
                      )}
                    </p>
                  </div>

                  <Switch
                    checked={allowOthersToViewCreatedChats}
                    onChange={setAllowOthersToViewCreatedChats}
                    label={
                      allowOthersToViewCreatedChats
                        ? t('common.status.active')
                        : t('common.status.inactive')
                    }
                  />
                </div>
              </div>
            </SettingsCard>
          ),
        }
      : null,
  ].filter(Boolean);

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <Breadcrumbs
          items={[
            { label: t('shared.dashboard'), href: '/dashboard' },
            { label: tf('accountSettings.pageTitle', 'Account Settings') },
          ]}
        />
        <p className="text-sm text-muted">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: tf('accountSettings.pageTitle', 'Account Settings') },
        ]}
      />

      <PageHeader
        className="border-b border-border pb-6"
        eyebrow={tf('dashboardLayout.section.settings', 'Settings')}
        title={tf('accountSettings.pageTitle', 'Account Settings')}
        subtitle={tf(
          'accountSettings.pageSubtitle',
          'Manage privacy, security, and profile options for your account.'
        )}
      />

      {settingTabs.length ? <Tabs tabs={settingTabs} framedPanel={false} bodyClassName="p-3 sm:p-4" /> : null}
    </div>
  );
}
