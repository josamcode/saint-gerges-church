import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { divineLiturgiesApi, usersApi } from '../../../api/endpoints';
import { normalizeApiError, mapFieldErrors } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  canAssignPermissionToRole,
  computeEffectivePermissionsForRole,
  filterAssignablePermissions,
} from '../../../constants/permissions';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import TextArea from '../../../components/ui/TextArea';
import Switch from '../../../components/ui/Switch';
import Button from '../../../components/ui/Button';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import PageHeader from '../../../components/ui/PageHeader';
import Skeleton from '../../../components/ui/Skeleton';
import CreatableTagComboboxInput from '../../../components/ui/CreatableTagComboboxInput';
import UserSearchSelect from '../../../components/UserSearchSelect';
import HouseholdSocioeconomicSection, {
  buildSocioeconomicPayload,
  mapUserToSocioeconomicForm,
} from '../../../components/users/HouseholdSocioeconomicSection';
import UserEducationSection, {
  buildEducationPayload,
  mapUserToEducationForm,
} from '../../../components/users/UserEducationSection';
import UserFormSectionTabs from '../../../components/users/UserFormSectionTabs';
import { extractBirthDateFromNationalId } from '../../../utils/egyptianNationalId';
import toast from 'react-hot-toast';
import { useI18n } from '../../../i18n/i18n';
import {
  ArrowRight, CheckCircle2, MinusCircle, Plus,
  Save, ShieldAlert, ShieldCheck, ShieldOff, Trash2, Upload, Users,
} from 'lucide-react';

/* ── constants ───────────────────────────────────────────────────────────── */

const genderOptions = [
  { value: 'male', label: 'ذكر' },
  { value: 'female', label: 'أنثى' },
  { value: 'other', label: 'آخر' },
];

const roleOptions = [
  { value: 'USER', label: 'مستخدم' },
  { value: 'ADMIN', label: 'مسؤول' },
  { value: 'SUPER_ADMIN', label: 'مدير النظام' },
];

const normalizePermissionArray = (value) =>
  [...new Set((Array.isArray(value) ? value : []).filter(Boolean))];

const normalizeTagArray = (value) =>
  [...new Set((Array.isArray(value) ? value : []).map((entry) => String(entry || '').trim()).filter(Boolean))];

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
  DIVINE_LITURGIES_ATTENDANCE_MANAGE_ASSIGNED_USERS: 'إدارة حضور القداسات الإلهية للمستخدمين المخدومين',
  DIVINE_LITURGIES_PRIESTS_MANAGE: 'إدارة قائمة كهنة الكنيسة',
};

const PERMISSION_GROUP_LABELS_AR = {
  users: 'إدارة المستخدمين',
  auth: 'المصادقة',
  confessions: 'الاعترافات',
  visitations: 'الافتقادات الرعوية',
  divineLiturgies: 'القداسات الإلهية',
  meetings: 'القطاعات والاجتماعات',
};

/* ── primitives ──────────────────────────────────────────────────────────── */

function SectionLabel({ children, count }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
        {children}
      </span>
      <div className="h-px flex-1 bg-border/60" />
      {count != null && (
        <span className="text-[11px] tabular-nums text-muted">{count}</span>
      )}
    </div>
  );
}

function StepBadge({ n }) {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
      {n}
    </div>
  );
}

function getEditFormSections(language = 'ar', canManagePermissionOverrides = false) {
  const labels = language === 'ar'
    ? {
      basic: 'البيانات الأساسية',
      additional: 'معلومات إضافية',
      permissions: 'إدارة الصلاحيات',
      family: 'أفراد العائلة',
      address: 'العنوان',
      custom: 'تفاصيل مخصصة',
      socioeconomic: 'الملف الاقتصادي والصحي',
    }
    : {
      basic: 'Basic information',
      additional: 'Additional information',
      permissions: 'Permissions',
      family: 'Family members',
      address: 'Address',
      custom: 'Custom details',
      socioeconomic: 'Socioeconomic profile',
    };

  const sections = [
    { id: 'basic', label: labels.basic },
    { id: 'additional', label: labels.additional },
    ...(canManagePermissionOverrides ? [{ id: 'permissions', label: labels.permissions }] : []),
    { id: 'family', label: labels.family },
    { id: 'address', label: labels.address },
    { id: 'custom', label: labels.custom },
    { id: 'socioeconomic', label: labels.socioeconomic },
  ];

  return sections.map((section, index) => ({ ...section, step: index + 1 }));
}

function getEditFormSectionsWithEducation(language = 'ar', canManagePermissionOverrides = false) {
  const baseSections = getEditFormSections(language, canManagePermissionOverrides);
  const educationSection = {
    id: 'education',
    label: language === 'ar' ? 'التعليم' : 'Education',
    step: 3,
  };

  return [
    ...baseSections.slice(0, 2),
    educationSection,
    ...baseSections.slice(2).map((section, index) => ({
      ...section,
      step: index + 4,
    })),
  ];
}

function NameCombobox({ label, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const filtered = options
    .filter((n) => !value || n.toLowerCase().includes(value.toLowerCase().trim()))
    .slice(0, 20);

  return (
    <div className="relative">
      <label className="mb-1.5 block text-sm font-medium text-base">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="input-base w-full"
      />
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          {filtered.map((name) => (
            <li
              key={name}
              role="option"
              aria-selected={value === name}
              onMouseDown={(e) => { e.preventDefault(); onChange(name); setOpen(false); }}
              className={`cursor-pointer px-3 py-2 text-sm transition-colors
                ${value === name
                  ? 'bg-primary/8 font-semibold text-primary'
                  : 'text-heading hover:bg-primary/8 hover:text-primary'
                }`}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── PermissionRow ──────────────────────────────────────────────────────── */

function PermissionRow({ permission, label, roleHasPermission, isExtra, isDenied, disabled, onChange }) {
  const effective = (roleHasPermission && !isDenied) || isExtra;

  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors
      ${isDenied
        ? 'border-danger/25 bg-danger-light'
        : isExtra
          ? 'border-success/25 bg-success-light'
          : effective
            ? 'border-border bg-surface'
            : 'border-border/50 bg-surface-alt/40'
      }`}
    >
      {/* left: label + code */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {/* effective indicator */}
          {effective
            ? <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${isExtra ? 'text-success' : 'text-primary/40'}`} />
            : <MinusCircle className="h-3.5 w-3.5 shrink-0 text-muted/40" />
          }
          <p className="truncate text-sm font-medium text-heading">{label}</p>
        </div>
        <p className="mt-0.5 ps-5 text-[11px] font-mono text-muted">{permission}</p>
      </div>

      {/* right: tag + toggle buttons */}
      <div className="flex shrink-0 items-center gap-2">
        {/* role-source tag */}
        {roleHasPermission && !isDenied && !isExtra && (
          <span className="rounded-full border border-primary/20 bg-primary/50 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            أساسي
          </span>
        )}
        {isDenied && (
          <span className="rounded-full border border-danger/20 bg-danger-light px-2.5 py-0.5 text-[11px] font-semibold text-danger">
            محسوب
          </span>
        )}
        {isExtra && (
          <span className="rounded-full border border-success/20 bg-success-light px-2.5 py-0.5 text-[11px] font-semibold text-success">
            مضاف
          </span>
        )}

        {/* grant / revoke toggle */}
        {!disabled && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="إضافة صلاحية"
              onClick={() => onChange(permission, 'extra', !isExtra)}
              className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all
                ${isExtra
                  ? 'border-success/30 bg-success-light text-success'
                  : 'border-border text-muted hover:border-success/30 hover:bg-success-light hover:text-success'
                }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="سحب الصلاحية"
              onClick={() => onChange(permission, 'denied', !isDenied)}
              className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all
                ${isDenied
                  ? 'border-danger/30 bg-danger-light text-danger'
                  : 'border-border text-muted hover:border-danger/30 hover:bg-danger-light hover:text-danger'
                }`}
            >
              <ShieldOff className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── PermissionsPanel ───────────────────────────────────────────────────── */

function PermissionsPanel({
  form,
  selectedRolePermissions,
  effectivePermissionsPreview,
  onPermissionChange,
  language,
}) {
  const [expandedGroups, setExpandedGroups] = useState(() =>
    Object.fromEntries(PERMISSION_GROUPS.map((g) => [g.id, true]))
  );

  const toggleGroup = (id) =>
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const isSuperAdmin = form.role === 'SUPER_ADMIN';

  const getPermissionLabel = (permission) => {
    if (language === 'ar') {
      return PERMISSION_LABELS_AR[permission] || PERMISSION_LABELS[permission] || permission;
    }
    return PERMISSION_LABELS[permission] || permission;
  };

  const getGroupLabel = (group) => {
    if (language === 'ar') {
      return PERMISSION_GROUP_LABELS_AR[group.id] || group.label;
    }
    return group.label;
  };

  const permissionGroups = useMemo(
    () =>
      PERMISSION_GROUPS.map((group) => ({
        ...group,
        permissions: group.permissions.filter((permission) => canAssignPermissionToRole(form.role, permission)),
      })).filter((group) => group.permissions.length > 0),
    [form.role]
  );

  /* stats */
  const extraCount = (form.extraPermissions || []).length;
  const deniedCount = (form.deniedPermissions || []).length;

  return (
    <div className="space-y-5">

      {/* summary strip */}
      <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-5 py-4
        ${isSuperAdmin ? 'border-primary/20 bg-primary/8' : 'border-border bg-surface-alt/50'}`}>
        <ShieldAlert className={`h-5 w-5 shrink-0 ${isSuperAdmin ? 'text-primary' : 'text-muted'}`} />
        {isSuperAdmin ? (
          <p className="text-sm font-medium text-primary">
            مدير النظام يمتلك جميع الصلاحيات دائمًا — لا يمكن تقييد صلاحياته.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted">
              صلاحيات الدور الأساسية:
              <span className="ms-1 font-bold text-heading">{selectedRolePermissions.length}</span>
            </span>
            {extraCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-success/25 bg-success-light px-2.5 py-0.5 text-xs font-semibold text-success">
                <ShieldCheck className="h-3 w-3" />
                {extraCount} مضافة
              </span>
            )}
            {deniedCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-danger/25 bg-danger-light px-2.5 py-0.5 text-xs font-semibold text-danger">
                <ShieldOff className="h-3 w-3" />
                {deniedCount} مسحوبة
              </span>
            )}
            <span className="text-muted">
              الفعالة النهائية:
              <span className="ms-1 font-bold text-heading">{effectivePermissionsPreview.length}</span>
            </span>
          </div>
        )}
      </div>

      {/* groups */}
      {permissionGroups.map((group) => {
        const isOpen = expandedGroups[group.id];
        const groupExtra = group.permissions.filter((p) => (form.extraPermissions || []).includes(p)).length;
        const groupDenied = group.permissions.filter((p) => (form.deniedPermissions || []).includes(p)).length;

        return (
          <div key={group.id} className="rounded-2xl border border-border bg-surface overflow-hidden">
            {/* group header */}
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start hover:bg-surface-alt/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-heading">{getGroupLabel(group)}</p>
                <span className="text-[11px] text-muted">{group.permissions.length} صلاحية</span>
                {groupExtra > 0 && (
                  <span className="rounded-full border border-success/25 bg-success-light px-2 py-0.5 text-[11px] font-semibold text-success">
                    +{groupExtra}
                  </span>
                )}
                {groupDenied > 0 && (
                  <span className="rounded-full border border-danger/25 bg-danger-light px-2 py-0.5 text-[11px] font-semibold text-danger">
                    −{groupDenied}
                  </span>
                )}
              </div>
              <span className={`text-[11px] font-semibold uppercase tracking-widest text-muted transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`}>
                ▲
              </span>
            </button>

            {/* permission rows */}
            {isOpen && (
              <div className="border-t border-border/60 px-5 py-4">
                <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
                  {group.permissions.map((permission) => {
                    const roleHasPermission =
                      isSuperAdmin || selectedRolePermissions.includes(permission);
                    const isExtra = (form.extraPermissions || []).includes(permission);
                    const isDenied = (form.deniedPermissions || []).includes(permission);

                    return (
                      <PermissionRow
                        key={permission}
                        permission={permission}
                        label={getPermissionLabel(permission)}
                        roleHasPermission={roleHasPermission}
                        isExtra={isExtra}
                        isDenied={isDenied}
                        disabled={isSuperAdmin || !canAssignPermissionToRole(form.role, permission)}
                        onChange={onPermissionChange}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default function UserEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { language, t } = useI18n();

  const [form, setForm] = useState(null);
  const [activeSection, setActiveSection] = useState('basic');
  const [errors, setErrors] = useState({});
  const [customDetailsRows, setCustomDetailsRows] = useState([{ id: 1, key: '', value: '' }]);
  const fileInputRef = useRef(null);
  const nextCustomDetailId = useRef(2);
  const customDetailsInitializedFor = useRef(null);
  const pendingLinkByPhoneRef = useRef([]);

  /* ── queries ── */
  const { data: user, isLoading } = useQuery({
    queryKey: ['users', id],
    queryFn: async () => { const { data } = await usersApi.getById(id); return data.data; },
  });

  const { data: savedKeysRes } = useQuery({
    queryKey: ['users', 'custom-detail-keys'],
    queryFn: async () => { const { data } = await usersApi.getCustomDetailKeys(); return data.data; },
  });
  const savedKeys = Array.isArray(savedKeysRes) ? savedKeysRes : [];

  const { data: familyNamesRes } = useQuery({
    queryKey: ['users', 'family-names'],
    queryFn: async () => { const res = await usersApi.getFamilyNames(); const data = res.data?.data ?? res.data; return Array.isArray(data) ? data : []; },
  });
  const familyNames = Array.isArray(familyNamesRes) ? familyNamesRes : [];

  const { data: houseNamesRes } = useQuery({
    queryKey: ['users', 'house-names'],
    queryFn: async () => { const res = await usersApi.getHouseNames(); const data = res.data?.data ?? res.data; return Array.isArray(data) ? data : []; },
  });
  const houseNames = Array.isArray(houseNamesRes) ? houseNamesRes : [];

  const { data: profileOptionValuesResponse } = useQuery({
    queryKey: ['users', 'profile-option-values', 'edit-user-tags'],
    queryFn: async () => {
      const { data } = await usersApi.getProfileOptionValues();
      return data?.data ?? {};
    },
    staleTime: 60000,
  });
  const tagSuggestions = useMemo(
    () => normalizeTagArray(profileOptionValuesResponse?.tags),
    [profileOptionValuesResponse]
  );

  const { data: divineLiturgiesOverview } = useQuery({
    queryKey: ['divine-liturgies', 'overview', 'spiritual-father-options'],
    queryFn: async () => {
      const { data } = await divineLiturgiesApi.getOverview();
      return data?.data || null;
    },
    staleTime: 60000,
  });
  const churchPriests = useMemo(
    () =>
      Array.isArray(divineLiturgiesOverview?.churchPriests)
        ? divineLiturgiesOverview.churchPriests
        : [],
    [divineLiturgiesOverview]
  );
  const churchPriestLookup = useMemo(
    () =>
      new Map(
        churchPriests
          .map((entry) => entry?.user)
          .filter((entry) => entry?.id)
          .map((entry) => [
            entry.id,
            { _id: entry.id, fullName: entry.fullName || '', phonePrimary: entry.phonePrimary || '' },
          ])
      ),
    [churchPriests]
  );
  const churchPriestOptions = useMemo(
    () => [
      {
        value: '',
        label: language === 'ar' ? 'بدون أب روحي' : 'No Spiritual Father',
      },
      ...churchPriests
        .map((entry) => entry?.user)
        .filter((entry) => entry?.id && entry?.fullName)
        .map((entry) => ({
          value: entry.id,
          label: entry.fullName,
        })),
    ],
    [churchPriests, language]
  );

  const { data: relationRolesRes } = useQuery({
    queryKey: ['users', 'relation-roles'],
    queryFn: async () => { const { data } = await usersApi.getRelationRoles(); return data?.data ?? data ?? []; },
  });
  const relationRoles = Array.isArray(relationRolesRes) ? relationRolesRes : [];

  /* ── derived ── */
  const canManagePermissionOverrides = currentUser?.role === 'SUPER_ADMIN';
  const formSections = useMemo(
    () => getEditFormSectionsWithEducation(language, canManagePermissionOverrides),
    [canManagePermissionOverrides, language],
  );
  const activeSectionIndex = formSections.findIndex((section) => section.id === activeSection);
  const previousSection = activeSectionIndex > 0 ? formSections[activeSectionIndex - 1] : null;
  const nextSection =
    activeSectionIndex >= 0 && activeSectionIndex < formSections.length - 1
      ? formSections[activeSectionIndex + 1]
      : null;
  const sectionNavCopy = language === 'ar'
    ? { previous: 'السابق', next: 'التالي' }
    : { previous: 'Previous', next: 'Next' };
  const getSectionStep = (sectionId) =>
    formSections.find((section) => section.id === sectionId)?.step || 1;

  useEffect(() => {
    if (!formSections.some((section) => section.id === activeSection)) {
      setActiveSection(formSections[0]?.id || 'basic');
    }
  }, [activeSection, formSections]);

  const roleOptionsForEditor = useMemo(() => {
    const base = canManagePermissionOverrides
      ? [...roleOptions]
      : roleOptions.filter((o) => o.value !== 'SUPER_ADMIN');
    if (form?.role === 'SUPER_ADMIN' && !base.some((o) => o.value === 'SUPER_ADMIN')) {
      const sa = roleOptions.find((o) => o.value === 'SUPER_ADMIN');
      if (sa) base.push(sa);
    }
    return base;
  }, [canManagePermissionOverrides, form?.role]);

  const accountStatusOptions = useMemo(() => ([
    {
      value: 'pending',
      label: language === 'ar' ? 'قيد المراجعة' : 'Pending approval',
    },
    {
      value: 'approved',
      label: language === 'ar' ? 'معتمد' : 'Approved',
    },
    {
      value: 'rejected',
      label: language === 'ar' ? 'مرفوض' : 'Rejected',
    },
  ]), [language]);

  const selectedRolePermissions = useMemo(() => {
    if (!form?.role) return [];
    if (form.role === 'SUPER_ADMIN') return [...PERMISSIONS];
    return ROLE_PERMISSIONS[form.role] || [];
  }, [form?.role]);

  const effectivePermissionsPreview = useMemo(() => {
    if (!form?.role) return [];
    return computeEffectivePermissionsForRole(
      form.role,
      form.extraPermissions || [],
      form.deniedPermissions || []
    );
  }, [form?.role, form?.extraPermissions, form?.deniedPermissions]);

  /* linked users */
  const linkedUserIds = (form?.family || []).map((r) => r.userId).filter(Boolean);
  const uniqueLinkedIds = [...new Set(linkedUserIds)];
  const linkedUsersQueries = useQueries({
    queries: uniqueLinkedIds.map((uid) => ({
      queryKey: ['users', uid],
      queryFn: async () => { const { data } = await usersApi.getById(uid); return data?.data ?? data; },
      enabled: !!uid && !!form,
    })),
  });
  const linkedUsersMap = {};
  uniqueLinkedIds.forEach((uid, idx) => {
    const res = linkedUsersQueries[idx]?.data;
    if (res) linkedUsersMap[uid] = res;
  });

  const SLOT_DEFAULT_ROLE = { father: 'الأب', mother: 'الأم', spouse: 'الزوج/ة', sibling: 'أخ/أخت', child: 'ابن/بنت' };
  const flattenFamily = (u) => {
    const list = [];
    if (u?.father) list.push({ ...u.father, relationRole: u.father.relationRole?.trim() || SLOT_DEFAULT_ROLE.father });
    if (u?.mother) list.push({ ...u.mother, relationRole: u.mother.relationRole?.trim() || SLOT_DEFAULT_ROLE.mother });
    if (u?.spouse) list.push({ ...u.spouse, relationRole: u.spouse.relationRole?.trim() || SLOT_DEFAULT_ROLE.spouse });
    (u?.siblings || []).forEach((s) => list.push({ ...s, relationRole: s.relationRole?.trim() || SLOT_DEFAULT_ROLE.sibling }));
    (u?.children || []).forEach((c) => list.push({ ...c, relationRole: c.relationRole?.trim() || SLOT_DEFAULT_ROLE.child }));
    (u?.familyMembers || []).forEach((m) => list.push({ ...m, relationRole: m.relationRole?.trim() || 'آخر' }));
    return list.map((m) => ({
      userId: m.userId ? String(m.userId) : null,
      name: m.name || '',
      relationRole: m.relationRole || '',
      targetPhone: '',
      notes: m.notes || '',
    }));
  };

  /* ── effects ── */
  useEffect(() => {
    if (user && !form) {
      setForm({
        fullName: user.fullName || '',
        phonePrimary: user.phonePrimary || '',
        email: user.email || '',
        birthDate: user.birthDate ? user.birthDate.split('T')[0] : '',
        gender: user.gender || 'male',
        nationalId: user.nationalId || '',
        notes: user.notes || '',
        tags: normalizeTagArray(user.tags),
        phoneSecondary: user.phoneSecondary || '',
        whatsappNumber: user.whatsappNumber || '',
        familyName: user.familyName || '',
        houseName: user.houseName || '',
        confessionFather:
          user.confessionFatherUserId || user.confessionFatherName
            ? {
              _id: user.confessionFatherUserId || null,
              fullName: user.confessionFatherName || '',
            }
            : null,
        role: user.role || 'USER',
        accountStatus: user.accountStatus || 'approved',
        hasLogin: Boolean(user.hasLogin),
        password: '',
        extraPermissions: filterAssignablePermissions(user.role || 'USER', user.extraPermissions),
        deniedPermissions: filterAssignablePermissions(user.role || 'USER', user.deniedPermissions),
        governorate: user.address?.governorate || '',
        city: user.address?.city || '',
        street: user.address?.street || '',
        details: user.address?.details || '',
        family: flattenFamily(user),
        ...mapUserToEducationForm(user),
        ...mapUserToSocioeconomicForm(user),
      });
    }
  }, [user, form]);

  useEffect(() => {
    const userId = user?._id ?? user?.id;
    const idStr = userId != null ? String(userId) : null;
    if (!user || idStr !== id) return;
    if (customDetailsInitializedFor.current === id) return;
    customDetailsInitializedFor.current = id;
    const cd = user.customDetails;
    if (cd && typeof cd === 'object' && Object.keys(cd).length > 0) {
      const rows = Object.entries(cd).map(([key, value], i) => ({ id: i + 1, key, value: value ?? '' }));
      setCustomDetailsRows(rows);
      nextCustomDetailId.current = rows.length + 2;
    } else {
      setCustomDetailsRows([{ id: 1, key: '', value: '' }]);
      nextCustomDetailId.current = 2;
    }
  }, [user, id]);

  useEffect(() => { customDetailsInitializedFor.current = null; }, [id]);

  const linkedUsersFetched = linkedUsersQueries.every((q) => !q.isLoading) && uniqueLinkedIds.length > 0;
  useEffect(() => {
    if (!form?.family || !linkedUsersFetched || uniqueLinkedIds.length === 0) return;
    setForm((prev) => {
      const family = [...(prev.family || [])];
      let changed = false;
      family.forEach((row, idx) => {
        if (!row.userId) return;
        const fetched = linkedUsersMap[row.userId];
        if (fetched?.phonePrimary && !(row.targetPhone || '').trim()) {
          family[idx] = { ...row, targetPhone: fetched.phonePrimary };
          changed = true;
        }
      });
      return changed ? { ...prev, family } : prev;
    });
  }, [linkedUsersFetched, uniqueLinkedIds.length]);

  /* ── mutations ── */
  const mutation = useMutation({
    mutationFn: (data) => usersApi.update(id, data),
    onSuccess: async () => {
      const pending = pendingLinkByPhoneRef.current || [];
      pendingLinkByPhoneRef.current = [];
      for (const m of pending) {
        try {
          const relation = relationRoles.find((r) => r.label === (m.relationRole || '').trim())?.relation || 'other';
          await usersApi.linkFamily(id, {
            relation,
            relationRole: (m.relationRole || '').trim(),
            targetPhone: (m.targetPhone || '').trim(),
            name: (m.name || '').trim() || undefined,
            notes: (m.notes || '').trim() || undefined,
          });
        } catch (err) { toast.error(normalizeApiError(err).message); }
      }
      toast.success('تم تحديث بيانات المستخدم بنجاح');
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'family-names'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'house-names'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'profile-option-values'] });
      navigate(`/dashboard/users/${id}`);
    },
    onError: (err) => {
      const normalized = normalizeApiError(err);
      if (normalized.code === 'VALIDATION_ERROR') setErrors(mapFieldErrors(normalized.details));
      toast.error(normalized.message);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file) => usersApi.uploadAvatar(id, file),
    onSuccess: () => {
      toast.success('تم رفع الصورة الشخصية بنجاح');
      queryClient.invalidateQueries({ queryKey: ['users', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(normalizeApiError(err).message),
  });

  /* ── handlers ── */
  const update = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'role') {
        if (value === 'SUPER_ADMIN') {
          next.extraPermissions = [];
          next.deniedPermissions = [];
        } else {
          next.extraPermissions = filterAssignablePermissions(value, next.extraPermissions);
          next.deniedPermissions = filterAssignablePermissions(value, next.deniedPermissions);
        }
      }
      if (field === 'hasLogin' && !value) {
        next.password = '';
      }
      if (field === 'nationalId' && !prev.birthDate) {
        const extractedBirthDate = extractBirthDateFromNationalId(value);
        if (extractedBirthDate) next.birthDate = extractedBirthDate;
      }
      return next;
    });
    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
      ...(field === 'nationalId' ? { birthDate: undefined } : {}),
      ...(field === 'hasLogin' && !value ? { password: undefined } : {}),
    }));
  };

  const setPermissionOverride = (permission, mode, checked) => {
    setForm((prev) => {
      if (!prev) return prev;
      if (!canAssignPermissionToRole(prev.role, permission)) return prev;
      const currentExtra = normalizePermissionArray(prev.extraPermissions);
      const currentDenied = normalizePermissionArray(prev.deniedPermissions);
      const removeFrom = (arr) => arr.filter((item) => item !== permission);
      const addTo = (arr) => arr.includes(permission) ? arr : [...arr, permission];

      if (mode === 'extra') {
        return {
          ...prev,
          extraPermissions: checked ? addTo(currentExtra) : removeFrom(currentExtra),
          deniedPermissions: checked ? removeFrom(currentDenied) : currentDenied,
        };
      }
      return {
        ...prev,
        deniedPermissions: checked ? addTo(currentDenied) : removeFrom(currentDenied),
        extraPermissions: checked ? removeFrom(currentExtra) : currentExtra,
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    if (!canManagePermissionOverrides && user.role === 'SUPER_ADMIN') {
      toast.error('فقط مدير النظام يمكنه تعديل حساب مدير النظام');
      return;
    }

    if (form.hasLogin && !String(form.email || '').trim() && !String(form.phonePrimary || '').trim()) {
      setErrors({
        password: 'يجب توفير بريد إلكتروني أو رقم هاتف لتفعيل تسجيل الدخول',
      });
      return;
    }

    const payload = {};
    if (form.fullName !== user.fullName) payload.fullName = form.fullName;
    if (form.phonePrimary !== (user.phonePrimary || '')) payload.phonePrimary = form.phonePrimary || null;
    if (form.email !== (user.email || '')) payload.email = form.email || null;
    if (form.birthDate !== (user.birthDate?.split('T')[0] || '')) payload.birthDate = form.birthDate || null;
    if (form.gender !== user.gender) payload.gender = form.gender;
    if (form.nationalId !== (user.nationalId || '')) payload.nationalId = form.nationalId || null;
    if (form.notes !== (user.notes || '')) payload.notes = form.notes;
    const nextTags = normalizeTagArray(form.tags);
    const currentTags = normalizeTagArray(user.tags);
    if (JSON.stringify(nextTags) !== JSON.stringify(currentTags)) payload.tags = nextTags;
    if (form.phoneSecondary !== (user.phoneSecondary || '')) payload.phoneSecondary = form.phoneSecondary;
    if (form.whatsappNumber !== (user.whatsappNumber || '')) payload.whatsappNumber = form.whatsappNumber;
    if (form.familyName !== (user.familyName || '')) payload.familyName = form.familyName;
    if (form.houseName !== (user.houseName || '')) payload.houseName = form.houseName;
    const nextConfessionFatherId = form.confessionFather?._id || form.confessionFather?.id || null;
    const currentConfessionFatherId = user.confessionFatherUserId || null;
    const nextConfessionFatherName = form.confessionFather?.fullName || '';
    const currentConfessionFatherName = user.confessionFatherName || '';
    if (
      nextConfessionFatherId !== currentConfessionFatherId ||
      nextConfessionFatherName !== currentConfessionFatherName
    ) {
      payload.confessionFatherUserId = nextConfessionFatherId;
      payload.confessionFatherName = nextConfessionFatherName || null;
    }
    if (form.role !== user.role) payload.role = form.role;
    if (form.accountStatus !== (user.accountStatus || 'approved')) {
      payload.accountStatus = form.accountStatus;
    }
    if (form.hasLogin !== Boolean(user.hasLogin)) payload.hasLogin = Boolean(form.hasLogin);
    if (form.hasLogin && (form.password || '').trim()) payload.password = form.password.trim();

    if (canManagePermissionOverrides) {
      const nextExtra = filterAssignablePermissions(form.role || 'USER', form.extraPermissions);
      const nextDenied = filterAssignablePermissions(form.role || 'USER', form.deniedPermissions);
      const oldExtra = filterAssignablePermissions(user.role || 'USER', user.extraPermissions);
      const oldDenied = filterAssignablePermissions(user.role || 'USER', user.deniedPermissions);
      if (JSON.stringify(nextExtra) !== JSON.stringify(oldExtra)) payload.extraPermissions = nextExtra;
      if (JSON.stringify(nextDenied) !== JSON.stringify(oldDenied)) payload.deniedPermissions = nextDenied;
    }

    const newAddress = { governorate: form.governorate || '', city: form.city || '', street: form.street || '', details: form.details || '' };
    const oldAddr = user.address || {};
    const oldNorm = { governorate: oldAddr.governorate || '', city: oldAddr.city || '', street: oldAddr.street || '', details: oldAddr.details || '' };
    if (JSON.stringify(newAddress) !== JSON.stringify(oldNorm)) payload.address = newAddress;

    const nextEducation = buildEducationPayload(form);
    const currentEducation = buildEducationPayload(mapUserToEducationForm(user));
    if (JSON.stringify(nextEducation ?? null) !== JSON.stringify(currentEducation ?? null)) {
      payload.education = nextEducation ?? null;
    }

    const nextSocioeconomic = buildSocioeconomicPayload(form, { includeNulls: true });
    const currentSocioeconomic = buildSocioeconomicPayload(
      mapUserToSocioeconomicForm(user),
      { includeNulls: true }
    );
    ['financial', 'employment', 'presence', 'health'].forEach((field) => {
      if (
        JSON.stringify(nextSocioeconomic[field] ?? null) !==
        JSON.stringify(currentSocioeconomic[field] ?? null)
      ) {
        payload[field] = nextSocioeconomic[field] ?? null;
      }
    });

    const newCustomDetails = customDetailsRows
      .filter((r) => r.key.trim())
      .reduce((acc, r) => ({ ...acc, [r.key.trim()]: (r.value || '').trim() }), {});
    const oldCustomDetails = user.customDetails && typeof user.customDetails === 'object' ? user.customDetails : {};
    if (JSON.stringify(newCustomDetails) !== JSON.stringify(oldCustomDetails)) payload.customDetails = newCustomDetails;

    const toPayloadMember = (m) => {
      if (!m || (!m.name && !m.relationRole && !m.notes && !m.userId)) return null;
      return { userId: m.userId || undefined, name: (m.name || '').trim() || undefined, relationRole: (m.relationRole || '').trim() || undefined, notes: (m.notes || '').trim() || undefined };
    };
    const unflattenFamily = (familyList) => {
      const result = { father: null, mother: null, spouse: null, siblings: [], children: [], familyMembers: [] };
      (familyList || []).forEach((m) => {
        const member = toPayloadMember(m);
        if (!member) return;
        const role = relationRoles.find((r) => r.label === (m.relationRole || '').trim())?.relation || 'other';
        if (role === 'father') result.father = member;
        else if (role === 'mother') result.mother = member;
        else if (role === 'spouse') result.spouse = member;
        else if (role === 'sibling') result.siblings.push(member);
        else if (role === 'child') result.children.push(member);
        else result.familyMembers.push(member);
      });
      return result;
    };

    const oldFlat = flattenFamily(user);
    const newFlat = (form.family || []).map((m) => ({
      ...m, relationRole: (m.relationRole || '').trim(), name: (m.name || '').trim(), notes: (m.notes || '').trim(),
    }));
    const familyChanged = JSON.stringify(newFlat.map((m) => ({ ...m, targetPhone: '' }))) !== JSON.stringify(oldFlat.map((m) => ({ ...m, targetPhone: '' })));
    const membersToLinkByPhone = (form.family || []).filter((m) => (m.targetPhone || '').trim());

    if (familyChanged || membersToLinkByPhone.length > 0) {
      const forPayload = (form.family || []).filter((m) => !(m.targetPhone || '').trim());
      const unflat = unflattenFamily(forPayload);
      Object.assign(payload, unflat);
    }
    if (membersToLinkByPhone.length > 0) pendingLinkByPhoneRef.current = membersToLinkByPhone;

    if (membersToLinkByPhone.length > 0 && Object.keys(payload).length === 0) {
      (async () => {
        for (const m of membersToLinkByPhone) {
          try {
            const relation = relationRoles.find((r) => r.label === (m.relationRole || '').trim())?.relation || 'other';
            await usersApi.linkFamily(id, { relation, relationRole: (m.relationRole || '').trim(), targetPhone: (m.targetPhone || '').trim(), name: (m.name || '').trim() || undefined, notes: (m.notes || '').trim() || undefined });
          } catch (err) { toast.error(normalizeApiError(err).message); return; }
        }
        toast.success('تم ربط أفراد العائلة بنجاح');
        queryClient.invalidateQueries({ queryKey: ['users', id] });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        navigate(`/dashboard/users/${id}`);
      })();
      return;
    }

    if (Object.keys(payload).length === 0) { toast('لم يتم تغيير أي بيانات'); return; }
    mutation.mutate(payload);
  };

  /* custom details */
  const addCustomDetailRow = () => setCustomDetailsRows((prev) => [...prev, { id: nextCustomDetailId.current++, key: '', value: '' }]);
  const updateCustomDetailRow = (rowId, field, value) => setCustomDetailsRows((prev) => prev.map((r) => r.id === rowId ? { ...r, [field]: value } : r));
  const removeCustomDetailRow = (rowId) => setCustomDetailsRows((prev) => prev.length > 1 ? prev.filter((r) => r.id !== rowId) : prev);

  /* family */
  const addFamilyMember = () => setForm((prev) => ({ ...prev, family: [...(prev.family || []), { userId: null, name: '', relationRole: '', targetPhone: '', notes: '' }] }));
  const updateFamilyMember = (index, field, value) => setForm((prev) => { const arr = [...(prev.family || [])]; arr[index] = { ...arr[index], [field]: value }; return { ...prev, family: arr }; });
  const removeFamilyMember = (index) => setForm((prev) => ({ ...prev, family: (prev.family || []).filter((_, i) => i !== index) }));

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('يرجى اختيار صورة'); return; }
    avatarMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── loading ── */
  if (isLoading || !form) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const initial = String(user?.fullName || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs items={[
        { label: t('shared.dashboard'), href: '/dashboard' },
        { label: t('shared.users'), href: '/dashboard/users' },
        { label: user?.fullName, href: `/dashboard/users/${id}` },
        { label: t('usersForm.edit.title') },
      ]} />

      {/* ══ HEADER ══════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          {user?.avatar?.url ? (
            <img src={user.avatar.url} alt="" className="h-14 w-14 rounded-2xl border-2 border-primary/20 object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-primary/20 bg-primary/10 text-xl font-bold text-primary">
              {initial}
            </div>
          )}
          <PageHeader
            contentOnly
            eyebrow={t('usersForm.edit.title')}
            title={user?.fullName}
            titleClassName="mt-0.5 text-3xl font-bold tracking-tight text-heading"
          />
        </div>
        <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => navigate(-1)}>
          {t('common.actions.back')}
        </Button>
      </div>

      {/* ══ FORM ════════════════════════════════════════════════════════ */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="mx-auto max-w-7xl space-y-8">
          <UserFormSectionTabs
            sections={formSections}
            activeSection={activeSection}
            onChange={setActiveSection}
          />

          {/* ── STEP 1 · البيانات الأساسية ────────────────────────────── */}
          {activeSection === 'basic' && (
            <section className="space-y-4">
              <div className="flex items-center gap-2"><StepBadge n={getSectionStep('basic')} /><SectionLabel>البيانات الأساسية</SectionLabel></div>
              <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">

                {/* avatar */}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted">الصورة الشخصية</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    {user?.avatar?.url ? (
                      <img src={user.avatar.url} alt="" className="h-20 w-20 rounded-2xl border-2 border-primary/20 object-cover shadow-sm" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-alt">
                        <Users className="h-8 w-8 text-muted" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleAvatarChange} disabled={avatarMutation.isPending} className="hidden" />
                      <Button type="button" variant="outline" size="sm" icon={Upload} loading={avatarMutation.isPending} onClick={() => fileInputRef.current?.click()}>
                        {user?.avatar?.url ? 'تغيير الصورة' : 'رفع صورة'}
                      </Button>
                      <span className="text-xs text-muted">JPEG, PNG, GIF أو WEBP — حتى 5 ميجابايت</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="الاسم الكامل" required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} error={errors.fullName} containerClassName="!mb-0" />
                  <Input label="تاريخ الميلاد" type="date" dir="ltr" className="text-left" value={form.birthDate} onChange={(e) => update('birthDate', e.target.value)} error={errors.birthDate} containerClassName="!mb-0" />
                  <Input label="رقم الهاتف الأساسي" dir="ltr" className="text-left" value={form.phonePrimary} onChange={(e) => update('phonePrimary', e.target.value)} error={errors.phonePrimary} containerClassName="!mb-0" />
                  <Select label="الجنس" options={genderOptions} value={form.gender} onChange={(e) => update('gender', e.target.value)} containerClassName="!mb-0" />
                  <Input label="البريد الإلكتروني" type="email" dir="ltr" className="text-left" value={form.email} onChange={(e) => update('email', e.target.value)} error={errors.email} containerClassName="!mb-0" />
                  <Input label="الرقم القومي" dir="ltr" className="text-left" value={form.nationalId} onChange={(e) => update('nationalId', e.target.value)} error={errors.nationalId} containerClassName="!mb-0" />
                </div>
              </div>
            </section>
          )}

          {/* ── STEP 2 · معلومات إضافية ──────────────────────────────── */}
          {activeSection === 'additional' && (
            <section className="space-y-4">
              <div className="flex items-center gap-2"><StepBadge n={getSectionStep('additional')} /><SectionLabel>معلومات إضافية</SectionLabel></div>
              <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                <CreatableTagComboboxInput
                  label={t('userDetails.profile.tagsTitle')}
                  values={form.tags || []}
                  onChange={(next) => update('tags', next)}
                  suggestions={tagSuggestions}
                  placeholder={t('chatPage.broadcast.fields.tagsPlaceholder')}
                  error={errors.tags}
                  containerClassName="!mb-0"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="الهاتف الثانوي" dir="ltr" className="text-left" value={form.phoneSecondary} onChange={(e) => update('phoneSecondary', e.target.value)} containerClassName="!mb-0" />
                  <Input label="رقم الواتساب" dir="ltr" className="text-left" value={form.whatsappNumber} onChange={(e) => update('whatsappNumber', e.target.value)} containerClassName="!mb-0" />
                  <NameCombobox label="اسم العائلة" value={form.familyName} onChange={(v) => update('familyName', v)} options={familyNames} placeholder="ابحث أو اكتب اسم العائلة" />
                  <NameCombobox label="اسم البيت" value={form.houseName} onChange={(v) => update('houseName', v)} options={houseNames} placeholder="ابحث أو اكتب اسم البيت" />
                  <Select label="الدور" options={roleOptionsForEditor} value={form.role} onChange={(e) => update('role', e.target.value)} containerClassName="!mb-0" />
                  <Select
                    label={language === 'ar' ? 'حالة الحساب' : 'Account Status'}
                    options={accountStatusOptions}
                    value={form.accountStatus}
                    onChange={(e) => update('accountStatus', e.target.value)}
                    containerClassName="!mb-0"
                  />
                  <Select
                    label={language === 'ar' ? 'الأب الروحي' : 'Spiritual Father'}
                    value={form.confessionFather?._id || form.confessionFather?.id || ''}
                    onChange={(event) =>
                      update('confessionFather', churchPriestLookup.get(event.target.value) || null)
                    }
                    options={churchPriestOptions}
                    placeholder={language === 'ar' ? 'اختر الأب الروحي' : 'Select Spiritual Father'}
                    containerClassName="!mb-0"
                  />
                  <Input
                    label="كلمة المرور"
                    type="password"
                    dir="ltr"
                    className="text-left"
                    hint={form.hasLogin ? 'اتركها فارغة إذا لا تريد تغييرها' : 'فعّل تسجيل الدخول أولاً لتعيين كلمة مرور'}
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    error={errors.password}
                    disabled={!form.hasLogin}
                    containerClassName="!mb-0"
                  />
                  <div className="sm:col-span-2 rounded-xl border border-border bg-surface-alt/50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-heading">تسجيل الدخول</p>
                        <p className="text-xs text-muted">
                          {form.hasLogin ? 'يمكن للمستخدم تسجيل الدخول للنظام.' : 'تم منع هذا الحساب من تسجيل الدخول.'}
                        </p>
                      </div>
                      <Switch
                        checked={Boolean(form.hasLogin)}
                        onChange={(checked) => update('hasLogin', checked)}
                        label={form.hasLogin ? 'مسموح' : 'ممنوع'}
                      />
                    </div>
                  </div>
                </div>
                <TextArea label="ملاحظات" value={form.notes} onChange={(e) => update('notes', e.target.value)} containerClassName="!mb-0" />
              </div>
            </section>
          )}

          {/* ── STEP 3 · الصلاحيات ───────────────────────────────────── */}
          {activeSection === 'education' && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <StepBadge n={getSectionStep('education')} />
                <SectionLabel>التعليم</SectionLabel>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5">
                <UserEducationSection
                  form={form}
                  errors={errors}
                  onChange={update}
                />
              </div>
            </section>
          )}

          {canManagePermissionOverrides && activeSection === 'permissions' && (
            <section className="space-y-4">
              <div className="flex items-center gap-2"><StepBadge n={getSectionStep('permissions')} /><SectionLabel>إدارة الصلاحيات</SectionLabel></div>
              <PermissionsPanel
                form={form}
                selectedRolePermissions={selectedRolePermissions}
                effectivePermissionsPreview={effectivePermissionsPreview}
                onPermissionChange={setPermissionOverride}
                language={language}
              />
            </section>
          )}

          {/* ── STEP 4 · أفراد العائلة ───────────────────────────────── */}
          {activeSection === 'family' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StepBadge n={getSectionStep('family')} />
                  <SectionLabel count={(form.family || []).length}>أفراد العائلة</SectionLabel>
                </div>
                <Button type="button" variant="outline" size="sm" icon={Plus} onClick={addFamilyMember}>إضافة فرد</Button>
              </div>

              <div className="space-y-3">
                {(form.family || []).length === 0 && (
                  <p className="rounded-2xl border border-dashed border-border px-5 py-6 text-center text-sm text-muted">
                    لا يوجد أفراد عائلة مضافون بعد.
                  </p>
                )}
                {(form.family || []).map((row, i) => {
                  const roleLabels = relationRoles.map((r) => r.label);
                  const relationRoleOptions = [
                    { value: '', label: '— اختر صلة القرابة —' },
                    ...relationRoles.map((r) => ({ value: r.label, label: r.label })),
                    ...(row.relationRole && !roleLabels.includes(row.relationRole) ? [{ value: row.relationRole, label: row.relationRole }] : []),
                  ];
                  const fetched = row.userId ? linkedUsersMap[row.userId] : null;
                  const linkedUser = row.userId ? { _id: row.userId, fullName: fetched?.fullName ?? row.name, phonePrimary: fetched?.phonePrimary ?? row.targetPhone ?? '' } : null;

                  return (
                    <div key={i} className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">فرد {i + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeFamilyMember(i)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-danger/30 hover:bg-danger-light hover:text-danger"
                          aria-label="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Select
                          label="صلة القرابة"
                          options={relationRoleOptions}
                          value={row.relationRole}
                          onChange={(e) => updateFamilyMember(i, 'relationRole', e.target.value)}
                          containerClassName="mb-0"
                        />
                        <UserSearchSelect
                          label="ربط بمستخدم مسجل"
                          value={linkedUser}
                          onChange={(u) => {
                            setForm((prev) => {
                              const arr = [...(prev.family || [])];
                              arr[i] = { ...arr[i], userId: u ? u._id : null, name: u ? u.fullName : '', targetPhone: u ? (u.phonePrimary || '') : '' };
                              return { ...prev, family: arr };
                            });
                          }}
                          excludeUserId={id}
                          className="mb-0"
                        />
                        <Input label="الاسم" value={row.name} onChange={(e) => updateFamilyMember(i, 'name', e.target.value)} containerClassName="mb-0" />
                        <Input label="رقم الهاتف" dir="ltr" className="text-left" value={fetched?.phonePrimary ?? row.targetPhone} onChange={(e) => updateFamilyMember(i, 'targetPhone', e.target.value)} containerClassName="mb-0" />
                      </div>
                      <TextArea label="ملاحظات" value={row.notes} onChange={(e) => updateFamilyMember(i, 'notes', e.target.value)} containerClassName="mb-0" />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── STEP 5 · العنوان ─────────────────────────────────────── */}
          {activeSection === 'address' && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <StepBadge n={getSectionStep('address')} />
                <SectionLabel>العنوان</SectionLabel>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="المحافظة" value={form.governorate} onChange={(e) => update('governorate', e.target.value)} placeholder="المحافظة" containerClassName="!mb-0" />
                  <Input label="المدينة" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="المدينة" containerClassName="!mb-0" />
                  <Input label="الشارع" value={form.street} onChange={(e) => update('street', e.target.value)} placeholder="الشارع" containerClassName="!mb-0" />
                  <Input label="تفاصيل إضافية" value={form.details} onChange={(e) => update('details', e.target.value)} placeholder="اي تفاصيل إضافية" containerClassName="!mb-0" />
                </div>
              </div>
            </section>
          )}

          {/* ── STEP 6 · تفاصيل مخصصة ───────────────────────────────── */}
          {activeSection === 'custom' && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <StepBadge n={getSectionStep('custom')} />
                <SectionLabel>تفاصيل مخصصة</SectionLabel>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                <p className="text-xs text-muted">أضف أو عدّل حقولاً مخصصة. المفاتيح المستخدمة سابقاً تظهر كاقتراحات.</p>
                <div className="space-y-2.5">
                  {customDetailsRows.map((row) => (
                    <div key={row.id} className="flex flex-wrap items-center gap-2">
                      <input
                        list="edit-custom-detail-keys-list"
                        value={row.key}
                        onChange={(e) => updateCustomDetailRow(row.id, 'key', e.target.value)}
                        placeholder="المفتاح"
                        className="input-base flex-1 min-w-[120px]"
                      />
                      <datalist id="edit-custom-detail-keys-list">
                        {savedKeys.map((k) => <option key={k} value={k} />)}
                      </datalist>
                      <input
                        value={row.value}
                        onChange={(e) => updateCustomDetailRow(row.id, 'value', e.target.value)}
                        placeholder="القيمة"
                        className="input-base flex-1 min-w-[120px]"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomDetailRow(row.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition-colors hover:border-danger/30 hover:bg-danger-light hover:text-danger"
                        aria-label="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" icon={Plus} onClick={addCustomDetailRow}>إضافة حقل</Button>
              </div>
            </section>
          )}

          {/* ── ACTIONS ───────────────────────────────────────────────── */}
          {activeSection === 'socioeconomic' && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <StepBadge n={getSectionStep('socioeconomic')} />
                <SectionLabel>الملف الاقتصادي والصحي</SectionLabel>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5">
                <HouseholdSocioeconomicSection
                  form={form}
                  errors={errors}
                  onChange={update}
                />
              </div>
            </section>
          )}

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => previousSection && setActiveSection(previousSection.id)}
                disabled={!previousSection}
              >
                {sectionNavCopy.previous}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => nextSection && setActiveSection(nextSection.id)}
                disabled={!nextSection}
              >
                {sectionNavCopy.next}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" type="button" onClick={() => navigate(-1)}>إلغاء</Button>
              <Button type="submit" icon={Save} loading={mutation.isPending}>حفظ التعديلات</Button>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
} 
