import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Calendar, Clock3, Edit, ExternalLink, GraduationCap, Lock, Mail, MapPin,
  MessageCircle, Phone, Plus, Shield, Tag, Unlock, User,
  UserCircle, Users as UsersIcon,
} from 'lucide-react';
import { confessionsApi, meetingsApi, usersApi, visitationsApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import { useI18n } from '../../../i18n/i18n';
import {
  formatDate,
  formatDateTime,
  getAccountStatusLabel,
  getAccountStatusVariant,
  getGenderLabel,
  getRoleLabel,
} from '../../../utils/formatters';
import { localizeSessionTypeName } from '../../../utils/sessionTypeLocalization';
import Badge from '../../../components/ui/Badge';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import PageHeader from '../../../components/ui/PageHeader';
import Skeleton from '../../../components/ui/Skeleton';
import Tabs from '../../../components/ui/Tabs';
import TextArea from '../../../components/ui/TextArea';
import UserSearchSelect from '../../../components/UserSearchSelect';
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLE_PERMISSIONS,
  computeEffectivePermissionsForRole,
  filterAssignablePermissions,
} from '../../../constants/permissions';
import {
  getEmploymentStatusLabel,
  getPresenceStatusLabel,
} from '../../../constants/householdProfiles';
import {
  getEducationStageLabel,
  getEducationStageMeta,
} from '../../../constants/education';
import { getDayLabel } from '../meetings/meetingsForm.utils';
import toast from 'react-hot-toast';

const EMPTY = '---';

function formatCurrencyValue(value, language = 'en') {
  if (value == null || value === '') return EMPTY;
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);

  try {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(numericValue);
  } catch {
    return `${numericValue} EGP`;
  }
}

const PERMISSION_LABELS_AR = {
  USERS_VIEW: 'عرض المستخدمين',
  USERS_VIEW_SELF: 'عرض الملف الشخصي',
  USERS_CREATE: 'إنشاء مستخدمين',
  USERS_UPDATE: 'تعديل المستخدمين',
  USERS_UPDATE_SELF: 'تعديل الملف الشخصي',
  USERS_DELETE: 'حذف المستخدمين',
  USERS_LOCK: 'قفل الحسابات',
  USERS_UNLOCK: 'فتح قفل الحسابات',
  USERS_TAGS_MANAGE: 'إدارة وسوم المستخدمين',
  USERS_FAMILY_LINK: 'إدارة روابط العائلة',
  USERS_UPLOAD_AVATAR: 'رفع صور المستخدمين',
  USERS_UPLOAD_AVATAR_SELF: 'رفع الصورة الشخصية',
  AUTH_VIEW_SELF: 'عرض ملف المصادقة الشخصي',
  AUTH_MANAGE_SESSIONS: 'إدارة الجلسات',
  AUTH_CHANGE_PASSWORD: 'تغيير كلمة المرور',
  CONFESSIONS_VIEW: 'عرض الاعترافات',
  CONFESSIONS_CREATE: 'إنشاء جلسات اعتراف',
  CONFESSIONS_ASSIGN_USER: 'تعيين أشخاص للاعتراف',
  CONFESSIONS_SESSION_TYPES_MANAGE: 'إدارة أنواع جلسات الاعتراف',
  CONFESSIONS_ALERTS_VIEW: 'عرض تنبيهات الاعتراف',
  CONFESSIONS_ALERTS_MANAGE: 'إدارة تنبيهات الاعتراف',
  CONFESSIONS_ANALYTICS_VIEW: 'عرض تحليلات الاعتراف',
  PASTORAL_VISITATIONS_VIEW: 'عرض الافتقادات الرعوية',
  PASTORAL_VISITATIONS_CREATE: 'إنشاء افتقادات رعوية',
  PASTORAL_VISITATIONS_ANALYTICS_VIEW: 'عرض تحليلات الافتقاد الرعوي',
  SECTORS_VIEW: 'عرض القطاعات',
  SECTORS_CREATE: 'إنشاء قطاعات',
  SECTORS_UPDATE: 'تعديل القطاعات',
  SECTORS_DELETE: 'حذف القطاعات',
  MEETINGS_VIEW: 'عرض الاجتماعات',
  MEETINGS_VIEW_OWN: 'عرض اجتماعاتي',
  MEETINGS_CREATE: 'إنشاء اجتماعات',
  MEETINGS_UPDATE: 'تعديل بيانات الاجتماع الأساسية',
  MEETINGS_DELETE: 'حذف الاجتماعات',
  MEETINGS_SERVANTS_MANAGE: 'إدارة خدام الاجتماع',
  MEETINGS_COMMITTEES_MANAGE: 'إدارة لجان الاجتماع',
  MEETINGS_ACTIVITIES_MANAGE: 'إدارة أنشطة الاجتماع',
  MEETINGS_RESPONSIBILITIES_VIEW: 'عرض اقتراحات المسؤوليات',
  MEETINGS_SERVANT_HISTORY_VIEW: 'عرض سجل خدمة الخادم',
  MEETINGS_MEMBERS_VIEW: 'عرض أعضاء الاجتماع',
  MEETINGS_ATTENDANCE_MANAGE: 'إدارة حضور الاجتماع',
  MEETINGS_DOCUMENTATION_MANAGE: 'إدارة التوثيق اليومي للاجتماع',
  MEETINGS_SETTINGS_MANAGE: 'إدارة إعدادات توثيق الاجتماع',
  MEETINGS_MEMBERS_NOTES_UPDATE: 'تعديل ملاحظات أعضاء الاجتماع',
  DIVINE_LITURGIES_VIEW: 'عرض جداول القداسات الإلهية',
  DIVINE_LITURGIES_MANAGE: 'إدارة جداول القداسات الإلهية',
  DIVINE_LITURGIES_ATTENDANCE_MANAGE: 'إدارة حضور القداسات الإلهية',
  DIVINE_LITURGIES_PRIESTS_MANAGE: 'إدارة قائمة كهنة الكنيسة',
};


const PERMISSION_GROUP_LABELS_AR = {
  users: 'إدارة المستخدمين',
  auth: 'المصادقة',
  confessions: 'الاعترافات',
  visitations: 'الافتقادات الرعوية',
  divineLiturgies: 'القداسات الإلهية',
  meetings: 'القطاعات والاجتماعات',
  custom: 'مخصص',
};

/* ── primitives ──────────────────────────────────────────────────────────── */

function SectionLabel({ children, count }) {
  const language = 'en';
  const educationCopy = language === 'ar'
    ? {
      title: 'التعليم',
      stage: 'المرحلة التعليمية',
      fieldOfStudy: 'مجال الدراسة',
      kindergartenName: 'اسم الحضانة',
      schoolName: 'اسم المدرسة',
      universityName: 'اسم الجامعة',
      facultyName: 'اسم الكلية',
    }
    : {
      title: 'Education',
      stage: 'Educational Stage',
      fieldOfStudy: 'Field of Study',
      kindergartenName: 'Kindergarten Name',
      schoolName: 'School Name',
      universityName: 'University Name',
      facultyName: 'Faculty Name',
    };

  void educationCopy;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
        {children}
      </span>
      <div className="h-px flex-1 bg-border/60" />
      {count != null && (
        <span className="text-[11px] font-semibold tabular-nums text-muted">{count}</span>
      )}
    </div>
  );
}

function Field({ icon: Icon, label, value, ltr = false }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted" />}
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</p>
      </div>
      <p className={`mt-1 text-sm font-medium text-heading ${ltr ? 'direction-ltr text-left' : ''}`}>
        {value || EMPTY}
      </p>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default function UserDetailsPage() {
  const { id } = useParams();
  const { hasPermission, hasAnyPermission } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const { data: user, isLoading } = useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data } = await usersApi.getById(id);
      return data.data;
    },
    staleTime: 60000,
  });

  const refreshUser = () => {
    queryClient.invalidateQueries({ queryKey: ['users', id] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const unlockMutation = useMutation({
    mutationFn: () => usersApi.unlock(id),
    onSuccess: () => {
      toast.success(t('userDetails.messages.unlockedSuccess'));
      refreshUser();
    },
    onError: (err) => toast.error(normalizeApiError(err).message),
  });

  if (isLoading) return <UserDetailsSkeleton />;

  if (!user) {
    return (
      <EmptyState
        icon={UsersIcon}
        title={t('userDetails.notFound.title')}
        description={t('userDetails.notFound.description')}
      />
    );
  }

  const whatsappUrl = buildWhatsAppUrl(user.whatsappNumber || user.phonePrimary);
  const callUrl = buildCallUrl(user.phonePrimary || user.whatsappNumber);
  const familyCount = countFamilyMembers(user);
  const initial = String(user.fullName || '?').trim().charAt(0).toUpperCase();

  const tabs = [
    {
      label: t('userDetails.tabs.profile'),
      content: <ProfileTab user={user} />,
    },
    {
      label: t('userDetails.tabs.family'),
      content: (
        <FamilyTab
          user={user}
          hasPermission={hasPermission}
          queryClient={queryClient}
          onRefresh={refreshUser}
        />
      ),
    },
    {
      label: tf('userDetails.system.sidebar.overview', 'Overview'),
      content: (
        <SystemTab
          user={user}
          userId={id}
          hasPermission={hasPermission}
          hasAnyPermission={hasAnyPermission}
          tf={tf}
          section="overview"
        />
      ),
    },
    {
      label: tf('userDetails.system.sidebar.confessions', 'Confessions'),
      content: (
        <SystemTab
          user={user}
          userId={id}
          hasPermission={hasPermission}
          hasAnyPermission={hasAnyPermission}
          tf={tf}
          section="confessions"
        />
      ),
    },
    {
      label: tf('userDetails.system.sidebar.meetings', 'Meetings'),
      content: (
        <SystemTab
          user={user}
          userId={id}
          hasPermission={hasPermission}
          hasAnyPermission={hasAnyPermission}
          tf={tf}
          section="meetings"
        />
      ),
    },
    {
      label: tf('userDetails.system.sidebar.divineLiturgies', 'Divine Liturgy & Vespers'),
      content: (
        <SystemTab
          user={user}
          userId={id}
          hasPermission={hasPermission}
          hasAnyPermission={hasAnyPermission}
          tf={tf}
          section="divineLiturgies"
        />
      ),
    },
    {
      label: tf('userDetails.system.sidebar.visitations', 'Visitations'),
      content: (
        <SystemTab
          user={user}
          userId={id}
          hasPermission={hasPermission}
          hasAnyPermission={hasAnyPermission}
          tf={tf}
          section="visitations"
        />
      ),
    },
    {
      label: tf('userDetails.system.sidebar.permissions', 'Permissions'),
      content: (
        <SystemTab
          user={user}
          userId={id}
          hasPermission={hasPermission}
          hasAnyPermission={hasAnyPermission}
          tf={tf}
          section="permissions"
        />
      ),
    },
  ];

  return (
    <div className="min-w-0 animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('shared.users'), href: '/dashboard/users' },
          { label: user.fullName || EMPTY },
        ]}
      />

      {/* ══ HERO ════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-surface">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/6" />

        <div className="relative p-6 lg:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

            {/* avatar + name */}
            <div className="flex items-center gap-5">
              {user.avatar?.url ? (
                <img
                  src={user.avatar.url}
                  alt=""
                  className="h-20 w-20 rounded-2xl border-2 border-primary/20 object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-primary/20 bg-primary/10 text-2xl font-bold text-primary shadow-inner">
                  {initial}
                </div>
              )}

              <PageHeader
                contentOnly
                eyebrow={t('shared.users')}
                title={user.fullName || EMPTY}
                subtitle={user.phonePrimary || EMPTY}
                eyebrowClassName="text-primary/70"
                titleClassName="mt-0.5 text-3xl font-bold tracking-tight text-heading"
                childrenClassName="mt-2.5 flex flex-wrap items-center gap-1.5"
              >
                <Badge variant="primary">{getRoleLabel(user.role)}</Badge>
                <Badge variant={getAccountStatusVariant(user.accountStatus || 'approved')}>
                  {getAccountStatusLabel(user.accountStatus || 'approved')}
                </Badge>
                <Badge variant={user.isLocked ? 'danger' : 'success'}>
                  {user.isLocked ? t('common.status.locked') : t('common.status.active')}
                </Badge>
              </PageHeader>
            </div>

            {/* actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={MessageCircle}
                onClick={() => whatsappUrl && window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
                disabled={!whatsappUrl}
              >
                {t('userDetails.fields.whatsapp')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Phone}
                onClick={() => callUrl && window.open(callUrl, '_self')}
                disabled={!callUrl}
              >
                {t('userDetails.fields.call')}
              </Button>
              {hasPermission('USERS_UPDATE') && (
                <Link to={`/dashboard/users/${id}/edit`}>
                  <Button variant="outline" size="sm" icon={Edit}>
                    {t('common.actions.edit')}
                  </Button>
                </Link>
              )}
              {hasPermission('USERS_LOCK') && !user.isLocked && (
                <Link to={`/dashboard/users/${id}/lock`}>
                  <Button variant="outline" size="sm" icon={Lock}>
                    {t('common.actions.lock')}
                  </Button>
                </Link>
              )}
              {hasPermission('USERS_UNLOCK') && user.isLocked && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Unlock}
                  onClick={() => unlockMutation.mutate()}
                  loading={unlockMutation.isPending}
                >
                  {t('common.actions.unlock')}
                </Button>
              )}
            </div>
          </div>

          {/* quick stats strip */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <QuickStat icon={Clock3} label={t('userDetails.summary.joinedOn')} value={formatDate(user.createdAt)} />
            <QuickStat icon={Calendar} label={t('userDetails.summary.lastUpdated')} value={formatDate(user.updatedAt)} />
            <QuickStat icon={UsersIcon} label={t('userDetails.summary.familyLinks')} value={familyCount} />
          </div>

          {/* lock reason */}
          {user.isLocked && user.lockReason && (
            <div className="mt-4 rounded-xl border border-danger/20 bg-danger-light px-4 py-3 text-sm text-danger">
              <span className="font-semibold">{t('userDetails.summary.lockReasonLabel')}</span>{' '}
              {user.lockReason}
            </div>
          )}
        </div>
      </div>

      {/* ══ TABS ════════════════════════════════════════════════════════ */}
      <div className="min-w-0">
        <Tabs tabs={tabs} />
      </div>
    </div>
  );
}

/* ── QuickStat ──────────────────────────────────────────────────────────── */

function QuickStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface/80 px-4 py-3 backdrop-blur-sm">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-muted" />}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-heading">{value || EMPTY}</p>
      </div>
    </div>
  );
}

/* ── ProfileTab ─────────────────────────────────────────────────────────── */

function ProfileTab({ user }) {
  const { t, language } = useI18n();
  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const tags = Array.isArray(user.tags) ? user.tags : [];
  const customDetails =
    user.customDetails && typeof user.customDetails === 'object'
      ? Object.entries(user.customDetails)
      : [];
  const healthConditions = Array.isArray(user.health?.conditions)
    ? user.health.conditions
      .map((condition) => String(condition?.name || '').trim())
      .filter(Boolean)
    : [];
  const householdSummary = user.householdClassificationSummary;
  const educationMeta = getEducationStageMeta(user.education?.stage);

  const address =
    [user.address?.governorate, user.address?.city, user.address?.street, user.address?.details]
      .filter(Boolean).join(', ') || EMPTY;
  const educationCopy = language === 'ar'
    ? {
      title: 'التعليم',
      stage: 'المرحلة التعليمية',
      fieldOfStudy: 'مجال الدراسة',
      kindergartenName: 'اسم الحضانة',
      schoolName: 'اسم المدرسة',
      universityName: 'اسم الجامعة',
      facultyName: 'اسم الكلية',
    }
    : {
      title: 'Education',
      stage: 'Educational Stage',
      fieldOfStudy: 'Field of Study',
      kindergartenName: 'Kindergarten Name',
      schoolName: 'School Name',
      universityName: 'University Name',
      facultyName: 'Faculty Name',
    };

  const copy = language === 'ar'
    ? {
      socioeconomicTitle: 'الملف الاقتصادي والصحي',
      monthlyIncome: 'الدخل الشهري',
      incomeSource: 'مصدر الدخل',
      employmentStatus: 'حالة العمل',
      jobEmployer: 'الوظيفة / جهة العمل',
      presenceStatus: 'حالة التواجد',
      travelDestination: 'جهة السفر',
      healthConditions: 'الحالات الصحية',
      householdClassification: 'تصنيف الأسرة',
      householdName: 'اسم الأسرة',
      members: 'عدد الأفراد',
      totalIncome: 'إجمالي الدخل',
      primaryStatus: 'الحالة الأساسية',
    }
    : {
      socioeconomicTitle: 'Socioeconomic Profile',
      monthlyIncome: 'Monthly Income',
      incomeSource: 'Income Source',
      employmentStatus: 'Employment Status',
      jobEmployer: 'Job / Employer',
      presenceStatus: 'Presence Status',
      travelDestination: 'Travel Destination',
      healthConditions: 'Health Conditions',
      householdClassification: 'Household Classification',
      householdName: 'Household Name',
      members: 'Members',
      totalIncome: 'Total Income',
      primaryStatus: 'Primary Status',
    };

  return (
    <div className="space-y-8">

      {/* ── Personal + Contact side-by-side ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* personal */}
        <div className="space-y-4 xl:col-span-2">
          <SectionLabel>{t('userDetails.profile.personalTitle')}</SectionLabel>
          <div className="rounded-2xl border border-border bg-surface px-6 py-5">
            <div className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
              <Field icon={UserCircle} label={t('userDetails.fields.fullName')} value={user.fullName} />
              <Field icon={Shield} label={t('userDetails.fields.role')} value={getRoleLabel(user.role)} />
              <Field icon={UserCircle} label={tf('userDetails.fields.spiritualFather', 'Spiritual Father')} value={user.confessionFatherName || EMPTY} />
              <Field icon={User} label={t('userDetails.fields.gender')} value={getGenderLabel(user.gender)} />
              <Field icon={Calendar} label={t('userDetails.fields.birthDate')} value={formatDate(user.birthDate)} />
              <Field icon={User} label={t('userDetails.fields.ageGroup')} value={user.ageGroup || EMPTY} />
              <Field icon={Shield} label={t('userDetails.fields.nationalId')} value={user.nationalId || EMPTY} />
            </div>
          </div>
        </div>

        {/* contact */}
        <div className="space-y-4">
          <SectionLabel>{t('userDetails.profile.contactTitle')}</SectionLabel>
          <div className="rounded-2xl border border-border bg-surface px-6 py-5 space-y-5">
            <Field icon={Phone} label={t('userDetails.fields.primaryPhone')} value={user.phonePrimary || EMPTY} />
            <Field icon={Phone} label={t('userDetails.fields.secondaryPhone')} value={user.phoneSecondary || EMPTY} />
            <Field icon={Phone} label={t('userDetails.fields.whatsapp')} value={user.whatsappNumber || EMPTY} />
            <Field icon={Mail} label={t('userDetails.fields.email')} value={user.email || EMPTY} />
          </div>
        </div>
      </div>

      {/* ── Address + Tags + Notes ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* address */}
        <div className="space-y-4 xl:col-span-2">
          <SectionLabel>{t('userDetails.profile.addressTitle')}</SectionLabel>
          <div className="rounded-2xl border border-border bg-surface px-6 py-5">
            <div className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
              <Field icon={MapPin} label={t('userDetails.fields.address')} value={address} />
              <Field icon={UsersIcon} label={t('userDetails.fields.familyName')} value={user.familyName || EMPTY} />
              <Field icon={UsersIcon} label={t('userDetails.fields.houseName')} value={user.houseName || EMPTY} />
              {user.notes && (
                <div className="sm:col-span-2">
                  <Field icon={User} label={t('userDetails.fields.notes')} value={user.notes} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* tags */}
        <div className="space-y-4">
          <SectionLabel count={tags.length}>{t('userDetails.profile.tagsTitle')}</SectionLabel>
          <div className="rounded-2xl border border-border bg-surface px-6 py-5">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">{EMPTY}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Custom details ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <SectionLabel>{educationCopy.title}</SectionLabel>
          <div className="rounded-2xl border border-border bg-surface px-6 py-5">
            <div className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
              <Field
                icon={GraduationCap}
                label={educationCopy.stage}
                value={user.education?.stage ? getEducationStageLabel(user.education.stage, language) : EMPTY}
              />
              <Field
                icon={GraduationCap}
                label={educationCopy.fieldOfStudy}
                value={user.education?.fieldOfStudy || EMPTY}
              />
              {educationMeta.isKindergarten ? (
                <Field
                  icon={Building2}
                  label={educationCopy.kindergartenName}
                  value={user.education?.kindergartenName || EMPTY}
                />
              ) : null}
              {educationMeta.isSchool ? (
                <Field
                  icon={Building2}
                  label={educationCopy.schoolName}
                  value={user.education?.schoolName || EMPTY}
                />
              ) : null}
              {educationMeta.isUniversity ? (
                <>
                  <Field
                    icon={Building2}
                    label={educationCopy.universityName}
                    value={user.education?.universityName || EMPTY}
                  />
                  <Field
                    icon={Building2}
                    label={educationCopy.facultyName}
                    value={user.education?.facultyName || EMPTY}
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <SectionLabel>{copy.socioeconomicTitle}</SectionLabel>
          <div className="rounded-2xl border border-border bg-surface px-6 py-5">
            <div className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
              <Field
                icon={Building2}
                label={copy.monthlyIncome}
                value={
                  user.financial?.monthlyIncome != null
                    ? formatCurrencyValue(user.financial.monthlyIncome, language)
                    : EMPTY
                }
              />
              <Field
                icon={Building2}
                label={copy.incomeSource}
                value={user.financial?.source || EMPTY}
              />
              <Field
                icon={Shield}
                label={copy.employmentStatus}
                value={
                  user.employment?.status
                    ? getEmploymentStatusLabel(user.employment.status, language)
                    : EMPTY
                }
              />
              <Field
                icon={User}
                label={copy.jobEmployer}
                value={
                  [user.employment?.jobTitle, user.employment?.employerName]
                    .filter(Boolean)
                    .join(' - ') || EMPTY
                }
              />
              <Field
                icon={Clock3}
                label={copy.presenceStatus}
                value={
                  user.presence?.status
                    ? getPresenceStatusLabel(user.presence.status, language)
                    : EMPTY
                }
              />
              <Field
                icon={MapPin}
                label={copy.travelDestination}
                value={user.presence?.travelDestination || EMPTY}
              />
              {healthConditions.length > 0 ? (
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                    {copy.healthConditions}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {healthConditions.map((condition) => (
                      <Badge key={condition} variant="warning">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SectionLabel>{copy.householdClassification}</SectionLabel>
          <div className="rounded-2xl border border-border bg-surface px-6 py-5 space-y-4">
            <Field
              icon={UsersIcon}
              label={copy.householdName}
              value={householdSummary?.householdName || user.houseName || user.familyName || EMPTY}
            />
            <Field
              icon={UsersIcon}
              label={copy.members}
              value={householdSummary?.memberCount ?? EMPTY}
            />
            <Field
              icon={Building2}
              label={copy.totalIncome}
              value={
                householdSummary?.totalMemberIncome != null
                  ? formatCurrencyValue(householdSummary.totalMemberIncome, language)
                  : EMPTY
              }
            />
            {/* <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                {copy.primaryStatus}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {householdSummary?.primaryClassification ? (
                  <span
                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      color: householdSummary.primaryClassification.color || '#2563eb',
                      borderColor: `${householdSummary.primaryClassification.color || '#2563eb'}33`,
                      backgroundColor: `${householdSummary.primaryClassification.color || '#2563eb'}12`,
                    }}
                  >
                    {householdSummary.primaryClassification.name}
                  </span>
                ) : (
                  <Badge>{EMPTY}</Badge>
                )}
                {(householdSummary?.matchedCategories || []).slice(1).map((category) => (
                  <span
                    key={category.id}
                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      color: category.color || '#2563eb',
                      borderColor: `${category.color || '#2563eb'}33`,
                      backgroundColor: `${category.color || '#2563eb'}12`,
                    }}
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            </div> */}
          </div>
        </div>
      </div>

      {customDetails.length > 0 && (
        <div className="space-y-4">
          <SectionLabel count={customDetails.length}>
            {t('userDetails.profile.customDetailsTitle')}
          </SectionLabel>
          <div className="rounded-2xl border border-border bg-surface px-6 py-5">
            <div className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
              {customDetails.map(([key, value]) => (
                <Field key={key} icon={Tag} label={key} value={value || EMPTY} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── FamilyTab ──────────────────────────────────────────────────────────── */

const MEETING_OVERVIEW_PERMISSIONS = [
  'MEETINGS_VIEW',
  'MEETINGS_VIEW_OWN',
  'MEETINGS_UPDATE',
  'MEETINGS_SERVANTS_MANAGE',
  'MEETINGS_COMMITTEES_MANAGE',
  'MEETINGS_ACTIVITIES_MANAGE',
];

const MEETING_MEMBER_DETAILS_PERMISSIONS = [
  'MEETINGS_MEMBERS_VIEW',
  'MEETINGS_MEMBERS_NOTES_UPDATE',
  'MEETINGS_UPDATE',
  'MEETINGS_SERVANTS_MANAGE',
];

const DIVINE_LITURGY_OVERVIEW_PERMISSIONS = [
  'DIVINE_LITURGIES_VIEW',
  'DIVINE_LITURGIES_MANAGE',
  'DIVINE_LITURGIES_ATTENDANCE_MANAGE',
  'DIVINE_LITURGIES_ATTENDANCE_MANAGE_ASSIGNED_USERS',
];

function SystemTab({ user, userId, hasPermission, hasAnyPermission, tf, section = 'overview' }) {
  const { t, language } = useI18n();
  const canViewConfessions = hasPermission('CONFESSIONS_VIEW');
  const canViewVisitations = hasPermission('PASTORAL_VISITATIONS_VIEW');
  const canViewMeetings = hasAnyPermission(MEETING_OVERVIEW_PERMISSIONS);
  const canViewMeetingMemberDetails = hasAnyPermission(MEETING_MEMBER_DETAILS_PERMISSIONS);
  const canViewDivineLiturgies = hasAnyPermission(DIVINE_LITURGY_OVERVIEW_PERMISSIONS);
  const canViewPermissions = hasPermission('USERS_VIEW');
  const houseName = String(user.houseName || '').trim();

  const getPermissionLabel = (permission) => {
    if (language === 'ar') {
      return PERMISSION_LABELS_AR[permission] || PERMISSION_LABELS[permission] || permission;
    }
    return PERMISSION_LABELS[permission] || permission;
  };

  const getPermissionGroupLabel = (groupId, fallbackLabel) => {
    if (language === 'ar') {
      return PERMISSION_GROUP_LABELS_AR[groupId] || fallbackLabel;
    }
    return fallbackLabel;
  };

  const [
    confessionsQuery,
    recorderVisitationsQuery,
    houseVisitationsQuery,
    meetingsQuery,
  ] = useQueries({
    queries: [
      {
        queryKey: ['user-details', userId, 'confessions'],
        enabled: canViewConfessions && Boolean(userId),
        staleTime: 30000,
        queryFn: async () => {
          const { data } = await confessionsApi.listSessions({
            limit: 100,
            order: 'desc',
            attendeeUserId: userId,
          });
          return Array.isArray(data?.data) ? data.data : [];
        },
      },
      {
        queryKey: ['user-details', userId, 'visitations', 'recorded'],
        enabled: canViewVisitations && Boolean(userId),
        staleTime: 30000,
        queryFn: async () => {
          const { data } = await visitationsApi.list({
            limit: 100,
            order: 'desc',
            recordedByUserId: userId,
          });
          return Array.isArray(data?.data) ? data.data : [];
        },
      },
      {
        queryKey: ['user-details', userId, 'visitations', 'house', houseName],
        enabled: canViewVisitations && Boolean(houseName),
        staleTime: 30000,
        queryFn: async () => {
          const { data } = await visitationsApi.list({
            limit: 100,
            order: 'desc',
            houseName,
          });
          return Array.isArray(data?.data) ? data.data : [];
        },
      },
      {
        queryKey: ['user-details', userId, 'meetings'],
        enabled: canViewMeetings,
        staleTime: 30000,
        queryFn: async () => {
          const { data } = await meetingsApi.meetings.list({ limit: 100, order: 'desc' });
          return Array.isArray(data?.data) ? data.data : [];
        },
      },
    ],
  });

  const confessions = useMemo(
    () => (Array.isArray(confessionsQuery.data) ? confessionsQuery.data : []),
    [confessionsQuery.data]
  );
  const recordedVisitations = useMemo(
    () => (Array.isArray(recorderVisitationsQuery.data) ? recorderVisitationsQuery.data : []),
    [recorderVisitationsQuery.data]
  );
  const houseVisitations = useMemo(
    () => (Array.isArray(houseVisitationsQuery.data) ? houseVisitationsQuery.data : []),
    [houseVisitationsQuery.data]
  );
  const meetings = useMemo(
    () => (Array.isArray(meetingsQuery.data) ? meetingsQuery.data : []),
    [meetingsQuery.data]
  );

  const involvedMeetings = useMemo(
    () =>
      meetings
        .map((meeting) => {
          const involvement = deriveMeetingInvolvement(meeting, userId);
          if (involvement.roles.length === 0) return null;
          return { meeting, involvement };
        })
        .filter(Boolean),
    [meetings, userId]
  );
  const memberScopedMeetings = useMemo(
    () => involvedMeetings.filter(({ involvement }) => involvement.isMember),
    [involvedMeetings]
  );
  const meetingMemberQueries = useQueries({
    queries: canViewMeetings && canViewMeetingMemberDetails
      ? memberScopedMeetings.map(({ meeting }) => ({
        queryKey: ['user-details', userId, 'meetings', meeting.id, 'member'],
        staleTime: 30000,
        enabled: Boolean(userId && meeting?.id),
        queryFn: async () => {
          const { data } = await meetingsApi.meetings.getMemberById(meeting.id, userId);
          return data?.data || null;
        },
      }))
      : [],
  });
  const meetingMemberDetailsByMeetingId = useMemo(
    () =>
      new Map(
        memberScopedMeetings.map(({ meeting }, index) => [
          meeting.id,
          {
            data: meetingMemberQueries[index]?.data || null,
            error: meetingMemberQueries[index]?.error || null,
            isLoading: Boolean(meetingMemberQueries[index]?.isLoading),
          },
        ])
      ),
    [memberScopedMeetings, meetingMemberQueries]
  );
  const meetingAttendanceByMeetingId = useMemo(() => {
    const grouped = new Map();

    (Array.isArray(user.meetingAttendance) ? user.meetingAttendance : []).forEach((entry) => {
      const meetingKey = toComparableId(entry?.meeting?.id || entry?.meetingId);
      if (!meetingKey) return;

      if (!grouped.has(meetingKey)) {
        grouped.set(meetingKey, []);
      }

      grouped.get(meetingKey).push(entry);
    });

    grouped.forEach((entries, key) => {
      grouped.set(
        key,
        [...entries].sort((a, b) => {
          const attendanceCompare = String(b?.attendanceDate || '').localeCompare(
            String(a?.attendanceDate || '')
          );
          if (attendanceCompare !== 0) return attendanceCompare;
          return new Date(b?.updatedAt || 0).getTime() - new Date(a?.updatedAt || 0).getTime();
        })
      );
    });

    return grouped;
  }, [user.meetingAttendance]);
  const meetingSummary = useMemo(
    () =>
      involvedMeetings.reduce(
        (summary, { meeting, involvement }) => {
          if (involvement.roles.includes('leadership')) summary.leadershipCount += 1;
          if (involvement.roles.includes('servant')) summary.servantCount += 1;
          if (involvement.roles.includes('committee')) summary.committeeCount += involvement.committees.length;
          summary.activityCount += Array.isArray(meeting.activities) ? meeting.activities.length : 0;
          summary.attendanceCount += (meetingAttendanceByMeetingId.get(meeting.id) || []).length;
          summary.noteCount += (meetingMemberDetailsByMeetingId.get(meeting.id)?.data?.notes || []).length;
          return summary;
        },
        {
          leadershipCount: 0,
          servantCount: 0,
          committeeCount: 0,
          activityCount: 0,
          attendanceCount: 0,
          noteCount: 0,
        }
      ),
    [involvedMeetings, meetingAttendanceByMeetingId, meetingMemberDetailsByMeetingId]
  );
  const meetingProfiles = useMemo(
    () =>
      involvedMeetings.map(({ meeting, involvement }) => ({
        meeting,
        involvement,
        attendance: meetingAttendanceByMeetingId.get(meeting.id) || [],
        memberDetails: meetingMemberDetailsByMeetingId.get(meeting.id) || {
          data: null,
          error: null,
          isLoading: false,
        },
      })),
    [involvedMeetings, meetingAttendanceByMeetingId, meetingMemberDetailsByMeetingId]
  );
  const divineLiturgyAttendanceEntries = useMemo(
    () => (Array.isArray(user.divineLiturgyAttendance) ? user.divineLiturgyAttendance : []),
    [user.divineLiturgyAttendance]
  );
  const divineLiturgyProfiles = useMemo(() => {
    const grouped = new Map();

    divineLiturgyAttendanceEntries.forEach((entry) => {
      const serviceKey =
        `${String(entry?.entryType || 'recurring').trim().toLowerCase()}:${toComparableId(entry?.service?.id || entry?.serviceId) || 'unknown'}`;
      if (!grouped.has(serviceKey)) {
        grouped.set(serviceKey, {
          key: serviceKey,
          service: entry?.service || null,
          attendance: [],
        });
      }

      grouped.get(serviceKey).attendance.push(entry);
    });

    return [...grouped.values()]
      .map((profile) => ({
        ...profile,
        attendance: [...profile.attendance].sort((a, b) => {
          const attendanceCompare = String(b?.attendanceDate || '').localeCompare(
            String(a?.attendanceDate || '')
          );
          if (attendanceCompare !== 0) return attendanceCompare;
          return new Date(b?.updatedAt || 0).getTime() - new Date(a?.updatedAt || 0).getTime();
        }),
      }))
      .sort((a, b) =>
        String(b?.attendance?.[0]?.attendanceDate || '').localeCompare(
          String(a?.attendance?.[0]?.attendanceDate || '')
        )
      );
  }, [divineLiturgyAttendanceEntries]);
  const divineLiturgySummary = useMemo(
    () =>
      divineLiturgyProfiles.reduce(
        (summary, profile) => {
          summary.attendanceCount += profile.attendance.length;
          if (profile.service?.serviceType === 'VESPERS') {
            summary.vespersCount += profile.attendance.length;
          } else {
            summary.divineLiturgyCount += profile.attendance.length;
          }
          return summary;
        },
        {
          attendanceCount: 0,
          divineLiturgyCount: 0,
          vespersCount: 0,
        }
      ),
    [divineLiturgyProfiles]
  );

  const permissionsSnapshot = useMemo(() => buildPermissionsSnapshot(user), [user]);

  const showOverview = section === 'overview';
  const showConfessions = section === 'confessions';
  const showMeetings = section === 'meetings';
  const showDivineLiturgies = section === 'divineLiturgies';
  const showVisitations = section === 'visitations';
  const showPermissions = section === 'permissions';

  return (
    <div className="space-y-6">
      {showOverview && (
        <section className="space-y-4">
          <SectionLabel>{tf('userDetails.system.overview.title', 'Cross-System Overview')}</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickStat
              icon={Calendar}
              label={tf('userDetails.system.stats.confessions', 'Confessions')}
              value={canViewConfessions ? confessions.length : EMPTY}
            />
            <QuickStat
              icon={UsersIcon}
              label={tf('userDetails.system.stats.meetings', 'Meetings')}
              value={canViewMeetings ? involvedMeetings.length : EMPTY}
            />
            <QuickStat
              icon={MapPin}
              label={tf('userDetails.system.stats.visitations', 'Visitations')}
              value={canViewVisitations ? recordedVisitations.length : EMPTY}
            />
            <QuickStat
              icon={Shield}
              label={tf('userDetails.system.stats.permissions', 'Effective Permissions')}
              value={canViewPermissions ? permissionsSnapshot.effectivePermissions.length : EMPTY}
            />
          </div>
        </section>
      )}

      {showConfessions && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel count={canViewConfessions ? confessions.length : null}>
              {tf('userDetails.system.confessions.title', 'Confessions')}
            </SectionLabel>
            {canViewConfessions && (
              <Link to="/dashboard/confessions">
                <Button variant="ghost" size="sm">{tf('userDetails.system.actions.openModule', 'Open Module')}</Button>
              </Link>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            {!canViewConfessions ? (
              <NoPermissionBox message={tf('userDetails.system.permissionRequired', 'You do not have permission to view this section.')} />
            ) : (
              <div className="space-y-3">
                {user.confessionFatherName ? (
                  <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-primary">
                        <UserCircle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                          {tf('userDetails.fields.spiritualFather', 'Spiritual Father')}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-heading">
                          {user.confessionFatherName}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {confessionsQuery.isLoading ? (
                  <p className="text-sm text-muted">{t('common.loading')}</p>
                ) : confessionsQuery.error ? (
                  <p className="text-sm text-danger">{normalizeApiError(confessionsQuery.error).message}</p>
                ) : confessions.length === 0 ? (
                  <p className="text-sm text-muted">{tf('userDetails.system.confessions.empty', 'No confession sessions were found for this user.')}</p>
                ) : (
                  <div className="space-y-2.5">
                    {confessions.slice(0, 12).map((session) => (
                      <div key={session.id} className="rounded-xl border border-border/80 bg-surface-alt/40 px-3.5 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-heading">
                            {localizeSessionTypeName(session.sessionType?.name, t)}
                          </p>
                          <p className="text-xs text-muted">
                            {formatDateTime(session.scheduledAt)}
                          </p>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                          <span>
                            {tf('userDetails.system.confessions.nextLabel', 'Next')}: {formatDateTime(session.nextSessionAt)}
                          </span>
                          <span>
                            {tf('userDetails.system.confessions.createdByLabel', 'Created by')}: {session.createdByUser?.fullName || EMPTY}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {showMeetings && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel count={canViewMeetings ? involvedMeetings.length : null}>
              {tf('userDetails.system.meetings.title', 'Meetings')}
            </SectionLabel>
            {canViewMeetings && (
              <Link to="/dashboard/meetings/list">
                <Button variant="ghost" size="sm">{tf('userDetails.system.actions.openModule', 'Open Module')}</Button>
              </Link>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            {!canViewMeetings ? (
              <NoPermissionBox message={tf('userDetails.system.permissionRequired', 'You do not have permission to view this section.')} />
            ) : meetingsQuery.isLoading ? (
              <p className="text-sm text-muted">{t('common.loading')}</p>
            ) : meetingsQuery.error ? (
              <p className="text-sm text-danger">{normalizeApiError(meetingsQuery.error).message}</p>
            ) : meetingProfiles.length === 0 ? (
              <p className="text-sm text-muted">{tf('userDetails.system.meetings.empty', 'No meeting records were found for this user.')}</p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <QuickStat
                    icon={UsersIcon}
                    label={tf('userDetails.system.meetings.summaryMeetings', 'Meetings')}
                    value={meetingProfiles.length}
                  />
                  <QuickStat
                    icon={Shield}
                    label={tf('userDetails.system.meetings.summaryLeadership', 'Leadership')}
                    value={meetingSummary.leadershipCount}
                  />
                  <QuickStat
                    icon={UserCircle}
                    label={tf('userDetails.system.meetings.summaryServant', 'Servant roles')}
                    value={meetingSummary.servantCount}
                  />
                  <QuickStat
                    icon={Calendar}
                    label={tf('userDetails.system.meetings.summaryAttendance', 'Attendance records')}
                    value={meetingSummary.attendanceCount}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <QuickStat
                    icon={Shield}
                    label={tf('userDetails.system.meetings.summaryCommittees', 'Committee memberships')}
                    value={meetingSummary.committeeCount}
                  />
                  <QuickStat
                    icon={Building2}
                    label={tf('userDetails.system.meetings.summaryActivities', 'Meeting activities')}
                    value={meetingSummary.activityCount}
                  />
                  <QuickStat
                    icon={MessageCircle}
                    label={tf('userDetails.system.meetings.summaryNotes', 'Recorded notes')}
                    value={meetingSummary.noteCount}
                  />
                </div>

                <div className="space-y-4">
                  {meetingProfiles.map(({ meeting, involvement, attendance, memberDetails }) => (
                    <MeetingProfileCard
                      key={meeting.id}
                      meeting={meeting}
                      involvement={involvement}
                      attendance={attendance}
                      memberDetails={memberDetails}
                      tf={tf}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {showDivineLiturgies && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel count={canViewDivineLiturgies ? divineLiturgyProfiles.length : null}>
              {tf('userDetails.system.divineLiturgies.title', 'Divine Liturgy & Vespers')}
            </SectionLabel>
            {canViewDivineLiturgies && (
              <Link to="/dashboard/divine-liturgies">
                <Button variant="ghost" size="sm">{tf('userDetails.system.actions.openModule', 'Open Module')}</Button>
              </Link>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            {!canViewDivineLiturgies ? (
              <NoPermissionBox message={tf('userDetails.system.permissionRequired', 'You do not have permission to view this section.')} />
            ) : divineLiturgyProfiles.length === 0 ? (
              <p className="text-sm text-muted">
                {tf('userDetails.system.divineLiturgies.empty', 'No Divine Liturgy or Vespers attendance records were found for this user.')}
              </p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <QuickStat
                    icon={Calendar}
                    label={tf('userDetails.system.divineLiturgies.summaryAttendance', 'Attendance records')}
                    value={divineLiturgySummary.attendanceCount}
                  />
                  <QuickStat
                    icon={Building2}
                    label={tf('userDetails.system.divineLiturgies.summaryServices', 'Services')}
                    value={divineLiturgyProfiles.length}
                  />
                  <QuickStat
                    icon={Clock3}
                    label={tf('userDetails.system.divineLiturgies.summaryDivine', 'Divine Liturgy')}
                    value={divineLiturgySummary.divineLiturgyCount}
                  />
                  <QuickStat
                    icon={Clock3}
                    label={tf('userDetails.system.divineLiturgies.summaryVespers', 'Vespers')}
                    value={divineLiturgySummary.vespersCount}
                  />
                </div>

                <div className="space-y-4">
                  {divineLiturgyProfiles.map((profile) => (
                    <DivineLiturgyAttendanceCard
                      key={profile.key}
                      profile={profile}
                      tf={tf}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {showVisitations && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel count={canViewVisitations ? recordedVisitations.length : null}>
              {tf('userDetails.system.visitations.title', 'Visitations')}
            </SectionLabel>
            {canViewVisitations && (
              <Link to="/dashboard/visitations">
                <Button variant="ghost" size="sm">{tf('userDetails.system.actions.openModule', 'Open Module')}</Button>
              </Link>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                {tf('userDetails.system.visitations.houseVisits', 'Visits related to this user house')}
              </p>
              {!canViewVisitations ? (
                <div className="mt-3">
                  <NoPermissionBox message={tf('userDetails.system.permissionRequired', 'You do not have permission to view this section.')} />
                </div>
              ) : !houseName ? (
                <p className="mt-3 text-sm text-muted">{tf('userDetails.system.visitations.noHouseName', 'This user has no house name assigned.')}</p>
              ) : houseVisitationsQuery.isLoading ? (
                <p className="mt-3 text-sm text-muted">{t('common.loading')}</p>
              ) : houseVisitationsQuery.error ? (
                <p className="mt-3 text-sm text-danger">{normalizeApiError(houseVisitationsQuery.error).message}</p>
              ) : houseVisitations.length === 0 ? (
                <p className="mt-3 text-sm text-muted">{tf('userDetails.system.visitations.emptyHouse', 'No house visitations were found for this house name.')}</p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {houseVisitations.slice(0, 10).map((visitation) => (
                    <Link
                      key={visitation.id}
                      to={`/dashboard/visitations/${visitation.id}`}
                      className="block rounded-xl border border-border/80 bg-surface-alt/40 px-3.5 py-3 transition-colors hover:border-primary/30"
                    >
                      <p className="text-sm font-semibold text-heading">{visitation.houseName || EMPTY}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatDateTime(visitation.visitedAt)} • {visitation.recordedBy?.fullName || EMPTY}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {showPermissions && (
        <section className="space-y-4">
          <SectionLabel count={canViewPermissions ? permissionsSnapshot.effectivePermissions.length : null}>
            {tf('userDetails.system.permissions.title', 'Permissions')}
          </SectionLabel>

          <div className="rounded-2xl border border-border bg-surface p-5">
            {!canViewPermissions ? (
              <NoPermissionBox message={tf('userDetails.system.permissionRequired', 'You do not have permission to view this section.')} />
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <QuickStat icon={Shield} label={tf('userDetails.system.permissions.role', 'Role')} value={getRoleLabel(user.role)} />
                  <QuickStat icon={Shield} label={tf('userDetails.system.permissions.base', 'Role permissions')} value={permissionsSnapshot.rolePermissions.length} />
                  <QuickStat icon={Shield} label={tf('userDetails.system.permissions.extra', 'Extra permissions')} value={permissionsSnapshot.extraPermissions.length} />
                  <QuickStat icon={Shield} label={tf('userDetails.system.permissions.denied', 'Denied permissions')} value={permissionsSnapshot.deniedPermissions.length} />
                </div>

                {permissionsSnapshot.extraPermissions.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                      {tf('userDetails.system.permissions.extra', 'Extra permissions')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {permissionsSnapshot.extraPermissions.map((permission) => (
                        <Badge key={`extra-${permission}`} variant="success">
                          {getPermissionLabel(permission)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {permissionsSnapshot.deniedPermissions.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                      {tf('userDetails.system.permissions.denied', 'Denied permissions')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {permissionsSnapshot.deniedPermissions.map((permission) => (
                        <Badge key={`denied-${permission}`} variant="danger">
                          {getPermissionLabel(permission)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {permissionsSnapshot.groupedEffectivePermissions.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <SectionLabel count={group.permissions.length}>
                        {getPermissionGroupLabel(group.id, group.label)}
                      </SectionLabel>
                      {group.permissions.length === 0 ? (
                        <p className="text-sm text-muted">{tf('userDetails.system.permissions.emptyGroup', 'No effective permissions in this group.')}</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {group.permissions.map((permission) => (
                            <Badge
                              key={`${group.id}-${permission}`}
                              variant={permissionsSnapshot.extraPermissionSet.has(permission) ? 'success' : 'primary'}
                            >
                              {getPermissionLabel(permission)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function NoPermissionBox({ message }) {
  return (
    <div className="rounded-xl border border-warning/25 bg-warning-light px-4 py-3 text-sm text-warning">
      {message}
    </div>
  );
}

function MeetingProfileCard({ meeting, involvement, attendance, memberDetails, tf, t }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-br from-surface via-surface to-surface-alt/20 shadow-sm">
      <div className="border-b border-border/70 bg-surface-alt/30 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              {meeting.sector?.name ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1">
                  <Building2 className="h-3 w-3" />
                  {meeting.sector.name}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {formatDayTime(meeting.day, meeting.time)}
              </span>
            </div>
            <p className="mt-2 text-lg font-bold tracking-tight text-heading">{meeting.name || EMPTY}</p>
          </div>

          <Link to={`/dashboard/meetings/list/${meeting.id}`}>
            <Button variant="outline" size="sm" icon={ExternalLink}>
              {t('common.actions.view')}
            </Button>
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {involvement.roles.map((role) => (
            <Badge key={`${meeting.id}-${role}`} variant="primary">
              {getMeetingRoleLabel(role, tf)}
            </Badge>
          ))}
          {involvement.groups.map((group) => (
            <Badge key={`${meeting.id}-group-${group}`} variant="default">
              {group}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {involvement.leadershipRoles.length > 0 ? (
            <MeetingInfoBlock title={tf('userDetails.system.meetings.leadershipTitle', 'Leadership')}>
              <div className="flex flex-wrap gap-2">
                {involvement.leadershipRoles.map((role) => (
                  <Badge key={`${meeting.id}-leadership-${role}`} variant="primary">
                    {getMeetingLeadershipLabel(role, tf)}
                  </Badge>
                ))}
              </div>
            </MeetingInfoBlock>
          ) : null}

          {involvement.servantEntries.length > 0 ? (
            <MeetingInfoBlock title={tf('userDetails.system.meetings.servantTitle', 'Servant Details')}>
              <div className="space-y-3">
                {involvement.servantEntries.map((servantEntry) => (
                  <div key={servantEntry.id || servantEntry.name} className="rounded-2xl border border-border/70 bg-surface px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-heading">
                          {servantEntry.responsibility || tf('userDetails.system.meetings.servantRoleFallback', 'Servant')}
                        </p>
                        {servantEntry.name ? (
                          <p className="mt-1 text-xs text-muted">{servantEntry.name}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(servantEntry.groupsManaged || []).map((group) => (
                          <Badge key={`${servantEntry.id || servantEntry.name}-managed-${group}`}>
                            {group}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {servantEntry.notes ? (
                      <p className="mt-2 text-sm text-muted">{servantEntry.notes}</p>
                    ) : null}

                    {servantEntry.servedUsers.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                          {tf('userDetails.system.meetings.directServedUsers', 'Directly served users')}
                        </p>
                        <MeetingLinkedUserList users={servantEntry.servedUsers} />
                      </div>
                    ) : null}

                    {servantEntry.groupAssignments.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                          {tf('userDetails.system.meetings.groupAssignmentsTitle', 'Group assignments')}
                        </p>
                        {servantEntry.groupAssignments.map((assignment) => (
                          <div key={`${servantEntry.id || servantEntry.name}-${assignment.group}`} className="rounded-xl border border-border/60 bg-surface-alt/40 px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{assignment.group || EMPTY}</Badge>
                              <span className="text-xs text-muted">
                                {(assignment.servedUsers || []).length} {tf('userDetails.system.meetings.membersLabel', 'members')}
                              </span>
                            </div>
                            <MeetingLinkedUserList users={assignment.servedUsers} className="mt-2" />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </MeetingInfoBlock>
          ) : null}

          {involvement.memberServants.length > 0 ? (
            <MeetingInfoBlock title={tf('userDetails.system.meetings.memberServantsTitle', 'Servants following this user')}>
              <div className="space-y-2">
                {involvement.memberServants.map((servant) => (
                  <div key={`${meeting.id}-member-servant-${servant.key}`} className="rounded-xl border border-border/60 bg-surface px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {servant.userId ? (
                        <Link
                          to={`/dashboard/users/${servant.userId}`}
                          className="text-sm font-semibold text-heading transition hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          {servant.name || EMPTY}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold text-heading">{servant.name || EMPTY}</span>
                      )}
                      {servant.responsibility ? <Badge>{servant.responsibility}</Badge> : null}
                      {servant.viaGroups.map((group) => (
                        <Badge key={`${servant.key}-${group}`} variant="secondary">
                          {group}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </MeetingInfoBlock>
          ) : null}

          {involvement.committees.length > 0 ? (
            <MeetingInfoBlock title={tf('userDetails.system.meetings.committeesTitle', 'Committees')}>
              <div className="space-y-3">
                {involvement.committees.map((committee) => (
                  <div key={committee.id || committee.name} className="rounded-2xl border border-border/70 bg-surface px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-heading">{committee.name || EMPTY}</p>
                      {(committee.memberNames || []).length > 0 ? (
                        <Badge variant="secondary">
                          {(committee.memberNames || []).length} {tf('userDetails.system.meetings.membersLabel', 'members')}
                        </Badge>
                      ) : null}
                    </div>
                    {committee.notes ? (
                      <p className="mt-2 text-sm text-muted">{committee.notes}</p>
                    ) : null}
                    {committee.memberNames?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {committee.memberNames.map((name) => (
                          <Badge key={`${committee.id || committee.name}-${name}`}>{name}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </MeetingInfoBlock>
          ) : null}

          {meeting.activities?.length ? (
            <MeetingInfoBlock title={tf('userDetails.system.meetings.activitiesTitle', 'Activities')}>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {meeting.activities.map((activity) => (
                  <div key={activity.id || `${meeting.id}-${activity.name}`} className="rounded-2xl border border-border/70 bg-surface px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-heading">{activity.name || EMPTY}</p>
                      {activity.type ? <Badge variant="secondary">{activity.type}</Badge> : null}
                    </div>
                    {activity.scheduledAt ? (
                      <p className="mt-2 text-xs text-muted">
                        {formatDateTime(activity.scheduledAt)}
                      </p>
                    ) : null}
                    {activity.notes ? (
                      <p className="mt-2 text-sm text-muted">{activity.notes}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </MeetingInfoBlock>
          ) : null}

          {meeting.notes ? (
            <MeetingInfoBlock title={tf('userDetails.system.meetings.meetingNotesTitle', 'Meeting Notes')}>
              <p className="text-sm leading-6 text-muted">{meeting.notes}</p>
            </MeetingInfoBlock>
          ) : null}
        </div>

        <div className="space-y-4">
          <MeetingInfoBlock title={tf('userDetails.system.meetings.attendanceTitle', 'Attendance')}>
            {attendance.length === 0 ? (
              <p className="text-sm text-muted">
                {tf('userDetails.system.meetings.attendanceEmpty', 'No attendance records were found for this meeting.')}
              </p>
            ) : (
              <div className="space-y-2">
                {attendance.slice(0, 6).map((entry) => (
                  <div key={entry.id || `${meeting.id}-${entry.attendanceDate}`} className="rounded-xl border border-border/60 bg-surface px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-heading">
                        {formatDate(entry.attendanceDate)}
                      </p>
                      <Badge variant="success">
                        {tf('userDetails.system.meetings.attendedStatus', 'Attended')}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted">
                      {entry.recordedBy?.fullName ? (
                        <p>
                          {tf('userDetails.system.meetings.recordedBy', 'Recorded by')}: {entry.recordedBy.fullName}
                        </p>
                      ) : null}
                      {entry.updatedBy?.fullName ? (
                        <p>
                          {tf('userDetails.system.meetings.updatedBy', 'Updated by')}: {entry.updatedBy.fullName}
                        </p>
                      ) : null}
                      {entry.updatedAt ? <p>{formatDateTime(entry.updatedAt)}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </MeetingInfoBlock>

          <MeetingInfoBlock title={tf('userDetails.system.meetings.memberNotesTitle', 'Member Notes')}>
            {memberDetails.isLoading ? (
              <p className="text-sm text-muted">{t('common.loading')}</p>
            ) : memberDetails.error ? (
              <p className="text-sm text-muted">
                {normalizeApiError(memberDetails.error).message}
              </p>
            ) : !(memberDetails.data?.notes || []).length ? (
              <p className="text-sm text-muted">
                {tf('userDetails.system.meetings.notesEmpty', 'No member notes were recorded for this meeting.')}
              </p>
            ) : (
              <div className="space-y-2.5">
                {(memberDetails.data?.notes || []).slice(0, 5).map((note) => (
                  <div key={note.id || `${meeting.id}-${note.updatedAt}`} className="rounded-xl border border-border/60 bg-surface px-3 py-2.5">
                    <p className="text-sm leading-6 text-heading">{note.note || EMPTY}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                      {note.updatedBy?.fullName ? (
                        <span>
                          {tf('userDetails.system.meetings.updatedBy', 'Updated by')}: {note.updatedBy.fullName}
                        </span>
                      ) : null}
                      {note.addedBy?.fullName ? (
                        <span>
                          {tf('userDetails.system.meetings.addedBy', 'Added by')}: {note.addedBy.fullName}
                        </span>
                      ) : null}
                      {note.updatedAt ? <span>{formatDateTime(note.updatedAt)}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </MeetingInfoBlock>
        </div>
      </div>
    </div>
  );
}

function MeetingInfoBlock({ title, children }) {
  return (
    <div className="rounded-[1.35rem] border border-border/70 bg-surface-alt/25 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MeetingLinkedUserList({ users = [], className = '' }) {
  if (!Array.isArray(users) || users.length === 0) return null;

  return (
    <div className={`mt-2 flex flex-wrap gap-1.5 ${className}`.trim()}>
      {users.map((linkedUser) => (
        <Badge key={linkedUser.id || linkedUser.fullName} variant="default">
          {linkedUser.fullName || linkedUser.name || EMPTY}
        </Badge>
      ))}
    </div>
  );
}

function DivineLiturgyAttendanceCard({ profile, tf, t }) {
  const { language } = useI18n();
  const service = profile?.service || null;
  const attendance = Array.isArray(profile?.attendance) ? profile.attendance : [];
  const serviceId = toComparableId(service?.id);
  const localizedDisplayName = getDivineServiceDisplayName(service, t, language);
  const localizedTitle = language === 'ar'
    ? formatArabicDivineServiceTitle(service, localizedDisplayName, tf)
    : localizedDisplayName;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-br from-surface via-surface to-surface-alt/20 shadow-sm">
      <div className="border-b border-border/70 bg-surface-alt/30 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <Badge variant="primary">
                {getDivineServiceTypeLabel(service?.serviceType, tf)}
              </Badge>
              <Badge variant="secondary">
                {getDivineEntryTypeLabel(service?.entryType || attendance?.[0]?.entryType, tf)}
              </Badge>
              {service?.dayOfWeek ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {getDayLabel(service.dayOfWeek, t)}
                </span>
              ) : null}
              {service?.date ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(service.date)}
                </span>
              ) : null}
              {(service?.startTime || service?.endTime) ? (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatServiceWindow(service?.startTime, service?.endTime)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-lg font-bold tracking-tight text-heading">
              {localizedTitle || EMPTY}
            </p>
          </div>

          {serviceId ? (
            <Link to={`/dashboard/divine-liturgies/attendance/${service?.entryType || attendance?.[0]?.entryType || 'recurring'}/${serviceId}`}>
              <Button variant="outline" size="sm" icon={ExternalLink}>
                {t('common.actions.view')}
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        <MeetingInfoBlock title={tf('userDetails.system.divineLiturgies.attendanceTitle', 'Attendance')}>
          {attendance.length === 0 ? (
            <p className="text-sm text-muted">
              {tf('userDetails.system.divineLiturgies.attendanceEmpty', 'No attendance records were found for this service.')}
            </p>
          ) : (
            <div className="space-y-2">
              {attendance.slice(0, 8).map((entry) => (
                <div key={entry.id || `${profile.key}-${entry.attendanceDate}`} className="rounded-xl border border-border/60 bg-surface px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-heading">
                      {formatDate(entry.attendanceDate)}
                    </p>
                    <Badge variant="success">
                      {tf('userDetails.system.divineLiturgies.attendedStatus', 'Attended')}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    {entry.recordedBy?.fullName ? (
                      <span>
                        {tf('userDetails.system.divineLiturgies.recordedBy', 'Recorded by')}: {entry.recordedBy.fullName}
                      </span>
                    ) : null}
                    {entry.updatedBy?.fullName ? (
                      <span>
                        {tf('userDetails.system.divineLiturgies.updatedBy', 'Updated by')}: {entry.updatedBy.fullName}
                      </span>
                    ) : null}
                    {entry.updatedAt ? <span>{formatDateTime(entry.updatedAt)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </MeetingInfoBlock>
      </div>
    </div>
  );
}

function FamilyTab({ user, hasPermission, queryClient, onRefresh }) {
  const { t, isRTL } = useI18n();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ relationRole: '', name: '', targetPhone: '', notes: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [addErrors, setAddErrors] = useState({});
  const [relationRoleDropdownOpen, setRelationRoleDropdownOpen] = useState(false);

  const { data: relationRolesRes } = useQuery({
    queryKey: ['users', 'relation-roles'],
    queryFn: async () => {
      const { data } = await usersApi.getRelationRoles();
      return data?.data ?? data ?? [];
    },
    enabled: addModalOpen,
  });

  const relationRoles = Array.isArray(relationRolesRes) ? relationRolesRes : [];
  const canAdd = hasPermission('USERS_FAMILY_LINK');
  const canEdit = hasPermission('USERS_UPDATE');
  const currentUserId = String(user._id || user.id || '');

  const familyGroups = useMemo(() => buildFamilyGroups(user, t), [user, t]);
  const hasAnyFamily = familyGroups.some((group) => group.members.length > 0);
  const totalFamilyCount = familyGroups.reduce((sum, g) => sum + g.members.length, 0);

  const filteredRelationRoles = relationRoles
    .filter((item) =>
      !addForm.relationRole.trim()
        ? true
        : item.label.toLowerCase().includes(addForm.relationRole.trim().toLowerCase())
    )
    .slice(0, 20);

  const linkFamilyMutation = useMutation({
    mutationFn: (payload) => usersApi.linkFamily(user._id || user.id, payload),
    onSuccess: () => {
      toast.success(t('userDetails.messages.familyLinkedSuccess'));
      handleCloseModal();
      onRefresh();
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      if (normalized.code === 'VALIDATION_ERROR' && normalized.details) setAddErrors(normalized.details);
      toast.error(normalized.message);
    },
  });

  const handleCloseModal = () => {
    setAddModalOpen(false);
    setAddErrors({});
    setSelectedUser(null);
    setAddForm({ relationRole: '', name: '', targetPhone: '', notes: '' });
    setRelationRoleDropdownOpen(false);
  };

  const handleAddFamilySubmit = async () => {
    const relationRoleValue = addForm.relationRole.trim();
    const nameValue = selectedUser?.fullName || addForm.name.trim();
    const phoneValue = selectedUser?.phonePrimary || addForm.targetPhone.trim();

    if (!relationRoleValue) { setAddErrors({ relationRole: t('userDetails.family.modal.relationRequired') }); return; }
    if (!nameValue && !phoneValue) { setAddErrors({ targetPhone: t('userDetails.family.modal.nameOrPhoneRequired') }); return; }

    setAddErrors({});

    const existingRole = relationRoles.find(
      (role) => role.label.trim().toLowerCase() === relationRoleValue.toLowerCase()
    );

    if (!existingRole && canEdit) {
      try {
        await usersApi.createRelationRole(relationRoleValue);
        queryClient.invalidateQueries({ queryKey: ['users', 'relation-roles'] });
      } catch (err) {
        toast.error(normalizeApiError(err).message);
        return;
      }
    }

    const relation = existingRole?.relation || 'other';
    linkFamilyMutation.mutate({
      relation,
      relationRole: relationRoleValue,
      name: nameValue || undefined,
      targetPhone: phoneValue || undefined,
      notes: addForm.notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">

      {/* header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel count={totalFamilyCount}>
          {t('userDetails.family.title')}
        </SectionLabel>
        <div className="flex flex-wrap gap-2">
          {canAdd && (
            <Button variant="outline" size="sm" icon={Plus} onClick={() => setAddModalOpen(true)}>
              {t('userDetails.family.actions.addFamilyMember')}
            </Button>
          )}
          {canEdit && (
            <Link to={`/dashboard/users/${user._id || user.id}/edit`}>
              <Button variant="ghost" size="sm" icon={Edit}>
                {t('userDetails.family.actions.editProfile')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* family name / house name chips */}
      {(user.familyName || user.houseName) && (
        <div className="flex flex-wrap gap-2">
          {user.familyName && (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-alt px-4 py-1.5 text-sm">
              <span className="text-muted">{t('userDetails.fields.familyName')}</span>
              <span className="font-semibold text-heading">{user.familyName}</span>
            </span>
          )}
          {user.houseName && (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-alt px-4 py-1.5 text-sm">
              <span className="text-muted">{t('userDetails.fields.houseName')}</span>
              <span className="font-semibold text-heading">{user.houseName}</span>
            </span>
          )}
        </div>
      )}

      {/* family groups */}
      {hasAnyFamily ? (
        <div className="space-y-6">
          {familyGroups.map((group) =>
            group.members.length > 0 ? (
              <FamilyGroupSection
                key={group.key}
                title={group.title}
                members={group.members}
                currentUserId={currentUserId}
                inverse={group.inverse}
              />
            ) : null
          )}
        </div>
      ) : (
        <EmptyState
          icon={UsersIcon}
          title={t('userDetails.family.empty.title')}
          description={t('userDetails.family.empty.description')}
        />
      )}

      {/* add modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={handleCloseModal}
        title={t('userDetails.family.modal.title')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={handleCloseModal}>{t('common.actions.cancel')}</Button>
            <Button loading={linkFamilyMutation.isPending} onClick={handleAddFamilySubmit}>
              {t('common.actions.add')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <label className="mb-1.5 block text-sm font-medium text-base">
              {t('userDetails.family.modal.relationLabel')}
              <span className={`${isRTL ? 'mr-1' : 'ml-1'} text-danger`}>*</span>
            </label>
            <input
              type="text"
              value={addForm.relationRole}
              onChange={(e) => {
                setAddForm((prev) => ({ ...prev, relationRole: e.target.value }));
                setRelationRoleDropdownOpen(true);
                if (addErrors.relationRole) setAddErrors((prev) => ({ ...prev, relationRole: undefined }));
              }}
              onFocus={() => setRelationRoleDropdownOpen(true)}
              onBlur={() => setTimeout(() => setRelationRoleDropdownOpen(false), 150)}
              placeholder={t('userDetails.family.modal.relationPlaceholder')}
              className={`input-base w-full ${addErrors.relationRole ? 'border-danger focus:border-danger' : ''}`}
            />
            {addErrors.relationRole && <p className="mt-1 text-xs text-danger">{addErrors.relationRole}</p>}
            {relationRoleDropdownOpen && filteredRelationRoles.length > 0 && (
              <div className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-border bg-surface p-1 shadow-lg">
                {filteredRelationRoles.map((role) => (
                  <button
                    key={role.id || role.label}
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-base transition-colors hover:bg-surface-alt"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setAddForm((prev) => ({ ...prev, relationRole: role.label }));
                      setRelationRoleDropdownOpen(false);
                    }}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <UserSearchSelect
            label={t('userDetails.family.modal.linkExistingUser')}
            value={selectedUser}
            onChange={(selected) => {
              setSelectedUser(selected);
              setAddForm((prev) => ({
                ...prev,
                name: selected ? selected.fullName : '',
                targetPhone: selected ? selected.phonePrimary || '' : '',
              }));
            }}
            excludeUserId={user._id || user.id}
          />

          <Input
            label={t('userDetails.family.modal.name')}
            value={addForm.name}
            onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
            containerClassName="!mb-0"
          />
          <Input
            label={t('userDetails.family.modal.phone')}
            value={addForm.targetPhone}
            dir="ltr"
            className="text-left"
            onChange={(e) => {
              setAddForm((prev) => ({ ...prev, targetPhone: e.target.value }));
              if (addErrors.targetPhone) setAddErrors((prev) => ({ ...prev, targetPhone: undefined }));
            }}
            error={addErrors.targetPhone}
            containerClassName="!mb-0"
          />
          <TextArea
            label={t('userDetails.fields.notes')}
            value={addForm.notes}
            onChange={(e) => setAddForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}

/* ── FamilyGroupSection ─────────────────────────────────────────────────── */

function FamilyGroupSection({ title, members, currentUserId, inverse = false }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{title}</span>
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-[11px] tabular-nums text-muted">{members.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((member, index) => (
          <FamilyMemberCard
            key={member._id || member.id || resolveMemberProfileId(member) || `${title}-${index}`}
            member={member}
            currentUserId={currentUserId}
            inverse={inverse}
          />
        ))}
      </div>
    </div>
  );
}

/* ── FamilyMemberCard ────────────────────────────────────────────────────── */

function FamilyMemberCard({ member, currentUserId, inverse }) {
  const { t } = useI18n();
  const profileId = resolveMemberProfileId(member);
  const isCurrentUser = profileId && profileId === currentUserId;
  const name = member?.name || EMPTY;
  const initial = String(name).trim().charAt(0).toUpperCase();

  const inner = (
    <div className={`group flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-150
      ${isCurrentUser
        ? 'border-primary/30 bg-primary/8'
        : 'border-border bg-surface hover:border-primary/30 hover:shadow-sm'
      }`}
    >
      {/* avatar */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors
        ${isCurrentUser
          ? 'bg-primary text-white'
          : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
        }`}
      >
        {member?.avatar?.url
          ? <img src={member.avatar.url} alt="" className="h-9 w-9 rounded-full object-cover" />
          : initial
        }
      </div>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold transition-colors
          ${isCurrentUser ? 'text-primary' : 'text-heading group-hover:text-primary'}`}>
          {name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {member?.relationRole && <Badge>{member.relationRole}</Badge>}
          {inverse && <Badge variant="secondary">{t('userDetails.family.inverseLink')}</Badge>}
        </div>
        {member?.notes && (
          <p className="mt-1 line-clamp-1 text-xs text-muted">{member.notes}</p>
        )}
      </div>

      {profileId && !isCurrentUser && (
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-border transition-colors group-hover:text-primary" />
      )}
    </div>
  );

  if (profileId && !isCurrentUser) {
    return (
      <Link to={`/dashboard/users/${profileId}`} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        {inner}
      </Link>
    );
  }

  return inner;
}

/* ── helpers (unchanged logic) ───────────────────────────────────────────── */

function normalizePermissionList(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter(Boolean))];
}

function toComparableId(value) {
  if (!value) return null;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (value.id != null) return String(value.id);
    if (value._id != null) return String(value._id);
  }
  return String(value);
}

function deriveMeetingInvolvement(meeting, userId) {
  const targetId = toComparableId(userId);
  if (!targetId || !meeting) {
    return {
      roles: [],
      groups: [],
      leadershipRoles: [],
      servantEntries: [],
      memberServants: [],
      committees: [],
      isMember: false,
    };
  }

  const roles = new Set();
  const groups = new Set();
  const leadershipRoles = [];
  const servantEntries = [];
  const committees = [];
  const memberServantsMap = new Map();
  let isMember = false;
  const isTarget = (candidate) => toComparableId(candidate) === targetId;
  const hasTargetUser = (users) =>
    (Array.isArray(users) ? users : []).some((entry) => isTarget(entry?.id || entry?._id || entry));
  const registerMemberServant = (servant, group = null) => {
    const key =
      toComparableId(servant?.user?.id || servant?.id || servant?.name) ||
      `servant-${String(servant?.name || 'unknown').trim().toLowerCase()}`;
    if (!memberServantsMap.has(key)) {
      memberServantsMap.set(key, {
        key,
        userId: toComparableId(servant?.user?.id),
        name: servant?.user?.fullName || servant?.name || '',
        responsibility: servant?.responsibility || '',
        viaGroups: [],
      });
    }

    if (group) {
      const current = memberServantsMap.get(key);
      if (!current.viaGroups.includes(group)) {
        current.viaGroups.push(group);
      }
    }
  };

  if (isTarget(meeting?.serviceSecretary?.user?.id)) {
    roles.add('leadership');
    leadershipRoles.push('serviceSecretary');
  }

  if (
    Array.isArray(meeting?.assistantSecretaries) &&
    meeting.assistantSecretaries.some((assistant) => isTarget(assistant?.user?.id))
  ) {
    roles.add('leadership');
    leadershipRoles.push('assistantSecretary');
  }

  if (hasTargetUser(meeting?.servedUsers)) {
    roles.add('member');
    isMember = true;
  }

  (Array.isArray(meeting?.groupAssignments) ? meeting.groupAssignments : []).forEach((assignment) => {
    if (hasTargetUser(assignment?.servedUsers)) {
      roles.add('member');
      isMember = true;
      if (assignment?.group) groups.add(assignment.group);
    }
  });

  (Array.isArray(meeting?.servants) ? meeting.servants : []).forEach((servant) => {
    const isServant = isTarget(servant?.user?.id);
    if (isServant) {
      roles.add('servant');
      servantEntries.push({
        id: servant?.id || servant?.user?.id || servant?.name,
        name: servant?.user?.fullName || servant?.name || '',
        responsibility: servant?.responsibility || '',
        groupsManaged: Array.isArray(servant?.groupsManaged) ? servant.groupsManaged : [],
        groupAssignments: Array.isArray(servant?.groupAssignments) ? servant.groupAssignments : [],
        servedUsers: Array.isArray(servant?.servedUsers) ? servant.servedUsers : [],
        notes: servant?.notes || '',
      });
      (Array.isArray(servant?.groupsManaged) ? servant.groupsManaged : []).forEach((group) => {
        if (group) groups.add(group);
      });
    }

    if (hasTargetUser(servant?.servedUsers)) {
      roles.add('member');
      isMember = true;
      registerMemberServant(servant);
    }

    (Array.isArray(servant?.groupAssignments) ? servant.groupAssignments : []).forEach((assignment) => {
      if (isServant && assignment?.group) groups.add(assignment.group);
      if (hasTargetUser(assignment?.servedUsers)) {
        roles.add('member');
        isMember = true;
        if (assignment?.group) groups.add(assignment.group);
        registerMemberServant(servant, assignment?.group);
      }
    });
  });

  (Array.isArray(meeting?.committees) ? meeting.committees : []).forEach((committee) => {
    if (hasTargetUser(committee?.members)) {
      roles.add('committee');
      committees.push(committee);
    }
  });

  return {
    roles: [...roles],
    groups: [...groups],
    leadershipRoles,
    servantEntries,
    memberServants: [...memberServantsMap.values()],
    committees,
    isMember,
  };
}

function getMeetingRoleLabel(role, tf) {
  switch (role) {
    case 'leadership':
      return tf('userDetails.system.meetings.roleLeadership', 'Leadership');
    case 'servant':
      return tf('userDetails.system.meetings.roleServant', 'Servant');
    case 'member':
      return tf('userDetails.system.meetings.roleMember', 'Member');
    case 'committee':
      return tf('userDetails.system.meetings.roleCommittee', 'Committee');
    default:
      return role;
  }
}

function getMeetingLeadershipLabel(role, tf) {
  switch (role) {
    case 'serviceSecretary':
      return tf('userDetails.system.meetings.serviceSecretaryRole', 'Service Secretary');
    case 'assistantSecretary':
      return tf('userDetails.system.meetings.assistantSecretaryRole', 'Assistant Secretary');
    default:
      return role;
  }
}

function getDivineServiceTypeLabel(serviceType, tf) {
  switch (serviceType) {
    case 'VESPERS':
      return tf('userDetails.system.divineLiturgies.typeVespers', 'Vespers');
    case 'DIVINE_LITURGY':
    default:
      return tf('userDetails.system.divineLiturgies.typeDivine', 'Divine Liturgy');
  }
}

function getDivineServiceDisplayName(service, t, language) {
  const manualName = String(service?.name || '').trim();
  if (manualName) return service?.displayName || manualName;

  if (String(language || '').trim().toLowerCase() === 'ar') {
    return getArabicDivineServiceDisplayName(service, t);
  }

  return service?.displayName || service?.name || '';
}

function getArabicDivineServiceDisplayName(service, t) {
  if (!service) return '';

  const dayLabel = getDayLabel(service?.dayOfWeek, t) || service?.dayOfWeek || '';
  const dateLabel = service?.date ? formatDate(service.date) : '';

  if (String(service?.entryType || '').trim().toLowerCase() === 'exception') {
    return dateLabel ? `قداس استثنائي (${dateLabel})` : 'قداس استثنائي';
  }

  if (service?.serviceType === 'VESPERS') {
    return dayLabel ? `عشية القداس يوم ${dayLabel}` : 'عشية القداس';
  }

  return dayLabel ? `قداس يوم ${dayLabel}` : 'قداس إلهي';
}

function formatArabicDivineServiceTitle(service, localizedDisplayName, tf) {
  const serviceTypeLabel = getDivineServiceTypeLabel(service?.serviceType, tf);
  if (!localizedDisplayName) return serviceTypeLabel;
  if (localizedDisplayName === serviceTypeLabel) return serviceTypeLabel;
  return `${localizedDisplayName}`;
}

function getDivineEntryTypeLabel(entryType, tf) {
  switch (String(entryType || '').trim().toLowerCase()) {
    case 'exception':
      return tf('userDetails.system.divineLiturgies.entryException', 'Exceptional service');
    case 'recurring':
    default:
      return tf('userDetails.system.divineLiturgies.entryRecurring', 'Recurring service');
  }
}

function formatDayTime(day, time) {
  if (day && time) return `${day} - ${time}`;
  return day || time || EMPTY;
}

function formatServiceWindow(startTime, endTime) {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || EMPTY;
}

function buildPermissionsSnapshot(user) {
  const role = user?.role || 'USER';
  const rolePermissions = role === 'SUPER_ADMIN'
    ? [...PERMISSIONS]
    : normalizePermissionList(ROLE_PERMISSIONS[role] || []);
  const extraPermissions =
    role === 'SUPER_ADMIN'
      ? []
      : normalizePermissionList(filterAssignablePermissions(role, user?.extraPermissions));
  const deniedPermissions =
    role === 'SUPER_ADMIN'
      ? []
      : normalizePermissionList(filterAssignablePermissions(role, user?.deniedPermissions));

  const effectivePermissions = normalizePermissionList(
    computeEffectivePermissionsForRole(role, extraPermissions, deniedPermissions)
  );
  const effectiveSet = new Set(effectivePermissions);
  const groupedPermissionSet = new Set(PERMISSION_GROUPS.flatMap((group) => group.permissions));
  const groupedEffectivePermissions = PERMISSION_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    permissions: group.permissions.filter((permission) => effectiveSet.has(permission)),
  }));

  const customPermissions = effectivePermissions.filter((permission) => !groupedPermissionSet.has(permission));
  if (customPermissions.length > 0) {
    groupedEffectivePermissions.push({
      id: 'custom',
      label: 'Custom',
      permissions: customPermissions,
    });
  }

  return {
    rolePermissions,
    extraPermissions,
    deniedPermissions,
    effectivePermissions,
    groupedEffectivePermissions,
    extraPermissionSet: new Set(extraPermissions),
  };
}

function buildFamilyGroups(user, t) {
  return [
    { key: 'parents', title: t('userDetails.family.sections.parents'), members: [user.father, user.mother].filter(Boolean), inverse: false },
    { key: 'spouse', title: t('userDetails.family.sections.spouse'), members: [user.spouse].filter(Boolean), inverse: false },
    { key: 'siblings', title: t('userDetails.family.sections.siblings'), members: Array.isArray(user.siblings) ? user.siblings : [], inverse: false },
    { key: 'children', title: t('userDetails.family.sections.children'), members: Array.isArray(user.children) ? user.children : [], inverse: false },
    { key: 'other', title: t('userDetails.family.sections.extended'), members: Array.isArray(user.familyMembers) ? user.familyMembers : [], inverse: false },
    { key: 'inverse', title: t('userDetails.family.sections.inverse'), members: Array.isArray(user.inverseFamily) ? user.inverseFamily : [], inverse: true },
  ];
}

function resolveMemberProfileId(member) {
  if (!member) return null;
  const raw =
    member.userId != null
      ? typeof member.userId === 'object'
        ? member.userId._id ?? member.userId.id
        : member.userId
      : member._id || member.id;
  return raw != null ? String(raw) : null;
}

function countFamilyMembers(user) {
  return (
    (user.father ? 1 : 0) +
    (user.mother ? 1 : 0) +
    (user.spouse ? 1 : 0) +
    (Array.isArray(user.siblings) ? user.siblings.length : 0) +
    (Array.isArray(user.children) ? user.children.length : 0) +
    (Array.isArray(user.familyMembers) ? user.familyMembers.length : 0) +
    (Array.isArray(user.inverseFamily) ? user.inverseFamily.length : 0)
  );
}

function buildWhatsAppUrl(rawPhone) {
  const p = normalizePhoneNumber(rawPhone);
  return p ? `https://wa.me/${p}` : null;
}

function buildCallUrl(rawPhone) {
  const p = normalizePhoneNumber(rawPhone);
  return p ? `tel:${p}` : null;
}

function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return null;
  const asciiPhone = toAsciiDigits(rawPhone);
  const digits = asciiPhone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('201')) return `+${digits}`;
  if (digits.startsWith('20')) return `+${digits}`;
  if (digits.startsWith('0')) return `+2${digits}`;
  if (digits.startsWith('1') && digits.length === 10) return `+20${digits}`;
  return `+${digits}`;
}

function toAsciiDigits(value) {
  return String(value).split('').map((char) => {
    const code = char.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
    return char;
  }).join('').trim();
}

function UserDetailsSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-52 w-full" />
      <Skeleton className="h-14 w-full" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Skeleton className="h-72 w-full xl:col-span-2" />
        <Skeleton className="h-72 w-full xl:col-span-1" />
      </div>
    </div>
  );
}
