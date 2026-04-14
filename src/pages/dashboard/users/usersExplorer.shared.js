import {
  PERMISSIONS,
  PERMISSION_LABELS,
  computeEffectivePermissionsForRole,
  filterAssignablePermissions,
} from '../../../constants/permissions';
import { getEducationStageGroup } from '../../../constants/education';
import { formatAgeFromBirthDate } from '../../../utils/formatters';

export const USERS_EXPLORER_PRESET_STORAGE_PREFIX = 'church_users_explorer_presets';

export const USERS_EXPLORER_PAGE_SIZE_OPTIONS = [20, 50, 100];

export const DEFAULT_USERS_EXPLORER_SORT = {
  field: 'updatedAt',
  order: 'desc',
};

export const DEFAULT_USERS_EXPLORER_FILTERS = {
  keyword: '',
  fullName: '',
  phoneQuery: '',
  emailQuery: '',
  nationalIdQuery: '',
  familyName: '',
  houseName: '',
  governorate: '',
  city: '',
  street: '',
  role: '',
  gender: '',
  ageGroup: '',
  ageMin: '',
  ageMax: '',
  birthDateFrom: '',
  birthDateTo: '',
  isLocked: '',
  hasLogin: '',
  loginIdentifierType: '',
  employmentStatus: '',
  jobTitle: '',
  employerName: '',
  presenceStatus: '',
  travelDestination: '',
  travelReason: '',
  educationStage: '',
  educationStageGroup: '',
  fieldOfStudy: '',
  schoolName: '',
  universityName: '',
  facultyName: '',
  monthlyIncomeMin: '',
  monthlyIncomeMax: '',
  tags: [],
  tagsMatchMode: 'any',
  selectedHealthConditions: [],
  healthConditionMatchMode: 'any',
  requiredFlags: [],
  excludedFlags: [],
  effectivePermissions: [],
  permissionMatchMode: 'any',
  customDetailKeys: [],
  customDetailKeyMatchMode: 'any',
  customDetailValue: '',
  createdFrom: '',
  createdTo: '',
  updatedFrom: '',
  updatedTo: '',
  meetingCountMin: '',
  meetingCountMax: '',
  meetingAttendanceMin: '',
  meetingAttendanceMax: '',
  divineAttendanceMin: '',
  divineAttendanceMax: '',
  siblingCountMin: '',
  siblingCountMax: '',
  childrenCountMin: '',
  childrenCountMax: '',
  familyConnectionsMin: '',
  familyConnectionsMax: '',
  customDetailsMin: '',
  customDetailsMax: '',
  notesQuery: '',
  confessionFatherQuery: '',
};

export const USERS_EXPLORER_SORT_FIELDS = [
  'fullName',
  'createdAt',
  'updatedAt',
  'birthDate',
  'age',
  'role',
  'gender',
  'familyName',
  'houseName',
  'city',
  'employmentStatus',
  'monthlyIncome',
  'tagsCount',
  'familyConnections',
  'meetingCount',
  'meetingAttendanceCount',
  'divineAttendanceCount',
  'customDetailsCount',
  'lastMeetingAttendance',
  'lastDivineAttendance',
  'lastLoginAt',
];

export const USERS_EXPLORER_FLAG_DEFINITIONS = [
  { value: 'has_login', labels: { en: 'Login enabled', ar: 'تسجيل الدخول مفعل' } },
  { value: 'locked', labels: { en: 'Locked account', ar: 'حساب مقفول' } },
  { value: 'has_email', labels: { en: 'Has email', ar: 'لديه بريد إلكتروني' } },
  { value: 'has_secondary_phone', labels: { en: 'Has secondary phone', ar: 'لديه هاتف ثانوي' } },
  { value: 'has_whatsapp', labels: { en: 'Has WhatsApp', ar: 'لديه واتساب' } },
  { value: 'has_national_id', labels: { en: 'Has national ID', ar: 'لديه رقم قومي' } },
  { value: 'has_address', labels: { en: 'Has address', ar: 'لديه عنوان' } },
  { value: 'has_notes', labels: { en: 'Has notes', ar: 'لديه ملاحظات' } },
  { value: 'has_avatar', labels: { en: 'Has avatar', ar: 'لديه صورة شخصية' } },
  { value: 'has_tags', labels: { en: 'Has tags', ar: 'لديه وسوم' } },
  { value: 'has_custom_details', labels: { en: 'Has custom details', ar: 'لديه تفاصيل مخصصة' } },
  { value: 'has_family_name', labels: { en: 'Has family name', ar: 'لديه اسم عائلة' } },
  { value: 'has_house_name', labels: { en: 'Has house name', ar: 'لديه اسم بيت' } },
  { value: 'has_father', labels: { en: 'Father linked', ar: 'الأب مربوط' } },
  { value: 'has_mother', labels: { en: 'Mother linked', ar: 'الأم مربوطة' } },
  { value: 'has_spouse', labels: { en: 'Spouse linked', ar: 'الزوج أو الزوجة مربوط' } },
  { value: 'has_siblings', labels: { en: 'Has siblings', ar: 'لديه إخوة' } },
  { value: 'has_children', labels: { en: 'Has children', ar: 'لديه أبناء' } },
  { value: 'has_other_relatives', labels: { en: 'Has extended family', ar: 'لديه عائلة ممتدة' } },
  { value: 'has_meetings', labels: { en: 'Assigned to meetings', ar: 'مربوط باجتماعات' } },
  {
    value: 'has_meeting_attendance',
    labels: { en: 'Has meeting attendance', ar: 'لديه حضور اجتماعات' },
  },
  {
    value: 'has_divine_liturgy_attendance',
    labels: { en: 'Has divine liturgy attendance', ar: 'لديه حضور قداسات' },
  },
  {
    value: 'has_confession_father',
    labels: { en: 'Has confession father', ar: 'لديه أب اعتراف' },
  },
  {
    value: 'has_confession_sessions',
    labels: { en: 'Has confession sessions', ar: 'لديه جلسات اعتراف' },
  },
  { value: 'has_health_conditions', labels: { en: 'Has health conditions', ar: 'لديه حالات صحية' } },
  { value: 'has_income', labels: { en: 'Has income value', ar: 'لديه دخل مسجل' } },
  { value: 'is_traveling', labels: { en: 'Traveling', ar: 'مسافر' } },
  { value: 'is_student', labels: { en: 'Student', ar: 'طالب' } },
  { value: 'is_employed', labels: { en: 'Employed', ar: 'يعمل' } },
  {
    value: 'has_extra_permissions',
    labels: { en: 'Has extra permissions', ar: 'لديه صلاحيات إضافية' },
  },
  {
    value: 'has_denied_permissions',
    labels: { en: 'Has denied permissions', ar: 'لديه صلاحيات مرفوضة' },
  },
];

const collator = new Intl.Collator(undefined, {
  sensitivity: 'base',
  numeric: true,
});

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeStringList(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean))];
}

function toComparableId(value) {
  if (!value) return null;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (value._id != null) return String(value._id);
    if (value.id != null) return String(value.id);
  }
  return String(value);
}

function toTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  const timestamp = date.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function toDateRangeTimestamp(value, mode) {
  if (!value) return null;
  const suffix = mode === 'end' ? 'T23:59:59.999' : 'T00:00:00.000';
  return toTimestamp(`${value}${suffix}`);
}

function toFiniteNumber(value) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function matchesContains(source, query) {
  if (!query) return true;
  return normalizeText(source).includes(query);
}

function matchesRange(value, minValue, maxValue) {
  const min = toFiniteNumber(minValue);
  const max = toFiniteNumber(maxValue);
  if (min == null && max == null) return true;
  if (value == null || !Number.isFinite(value)) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function matchesDateRange(timestamp, fromValue, toValue) {
  const from = toDateRangeTimestamp(fromValue, 'start');
  const to = toDateRangeTimestamp(toValue, 'end');
  if (from == null && to == null) return true;
  if (timestamp == null) return false;
  if (from != null && timestamp < from) return false;
  if (to != null && timestamp > to) return false;
  return true;
}

function matchesSelectionList(sourceValues, selectedValues, mode = 'any') {
  const normalizedSource = new Set(normalizeStringList(sourceValues).map((value) => value.toLowerCase()));
  const normalizedSelected = normalizeStringList(selectedValues).map((value) => value.toLowerCase());

  if (normalizedSelected.length === 0) return true;

  if (mode === 'all') {
    return normalizedSelected.every((value) => normalizedSource.has(value));
  }

  return normalizedSelected.some((value) => normalizedSource.has(value));
}

function buildCountList(values = []) {
  const counts = new Map();

  values.forEach((value) => {
    const key = String(value || '').trim();
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || collator.compare(a.label, b.label));
}

function computeEffectivePermissions(user) {
  if (!user) return [];
  return computeEffectivePermissionsForRole(
    user.role || 'USER',
    user.extraPermissions || [],
    user.deniedPermissions || []
  );
}

function buildSearchBlob(parts = []) {
  return parts
    .flatMap((part) => {
      if (Array.isArray(part)) return part;
      return [part];
    })
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' \n')
    .toLowerCase();
}

function buildFlags(user, derived) {
  const flags = new Set();

  if (user?.hasLogin) flags.add('has_login');
  if (user?.isLocked) flags.add('locked');
  if (user?.email) flags.add('has_email');
  if (user?.phoneSecondary) flags.add('has_secondary_phone');
  if (user?.whatsappNumber) flags.add('has_whatsapp');
  if (user?.nationalId) flags.add('has_national_id');
  if (derived.hasAddress) flags.add('has_address');
  if (derived.notesText) flags.add('has_notes');
  if (user?.avatar?.url) flags.add('has_avatar');
  if (derived.tags.length > 0) flags.add('has_tags');
  if (derived.customDetailsCount > 0) flags.add('has_custom_details');
  if (user?.familyName) flags.add('has_family_name');
  if (user?.houseName) flags.add('has_house_name');
  if (user?.father) flags.add('has_father');
  if (user?.mother) flags.add('has_mother');
  if (user?.spouse) flags.add('has_spouse');
  if (derived.siblingCount > 0) flags.add('has_siblings');
  if (derived.childrenCount > 0) flags.add('has_children');
  if (derived.otherFamilyCount > 0) flags.add('has_other_relatives');
  if (derived.meetingIdsCount > 0) flags.add('has_meetings');
  if (derived.meetingAttendanceCount > 0) flags.add('has_meeting_attendance');
  if (derived.divineAttendanceCount > 0) flags.add('has_divine_liturgy_attendance');
  if (user?.confessionFatherName || user?.confessionFatherUserId) flags.add('has_confession_father');
  if (derived.confessionSessionCount > 0) flags.add('has_confession_sessions');
  if (derived.healthConditions.length > 0) flags.add('has_health_conditions');
  if (derived.monthlyIncome != null) flags.add('has_income');
  if (user?.presence?.status === 'traveling') flags.add('is_traveling');
  if (user?.employment?.status === 'student') flags.add('is_student');
  if (user?.employment?.status === 'employed') flags.add('is_employed');
  if (derived.extraPermissions.length > 0) flags.add('has_extra_permissions');
  if (derived.deniedPermissions.length > 0) flags.add('has_denied_permissions');

  return flags;
}

export function buildDistinctValueList(values = []) {
  return normalizeStringList(values).sort((a, b) => collator.compare(a, b));
}

export function buildUsersExplorerFlagOptions(language = 'en') {
  const locale = language === 'ar' ? 'ar' : 'en';
  return USERS_EXPLORER_FLAG_DEFINITIONS.map((definition) => ({
    value: definition.value,
    label: definition.labels[locale] || definition.labels.en || definition.value,
  }));
}

export function buildUsersExplorerPermissionOptions() {
  return PERMISSIONS.map((permission) => ({
    value: permission,
    label: PERMISSION_LABELS[permission] || permission,
  })).sort((a, b) => collator.compare(a.label, b.label));
}

export function deriveUsersExplorerDataset(users = []) {
  return (Array.isArray(users) ? users : []).map((user) => {
    const healthConditions = normalizeStringList(
      (Array.isArray(user?.health?.conditions) ? user.health.conditions : []).map((condition) => condition?.name)
    );
    const chronicHealthConditionCount = (Array.isArray(user?.health?.conditions) ? user.health.conditions : [])
      .filter((condition) => Boolean(condition?.chronic))
      .length;

    const customDetailEntries = Object.entries(
      user?.customDetails && typeof user.customDetails === 'object' ? user.customDetails : {}
    )
      .map(([key, value]) => [String(key || '').trim(), String(value || '').trim()])
      .filter(([key, value]) => key || value);

    const customDetailKeys = customDetailEntries
      .map(([key]) => key)
      .filter(Boolean);

    const customDetailValues = customDetailEntries
      .map(([, value]) => value)
      .filter(Boolean);

    const tags = normalizeStringList(user?.tags);
    const effectivePermissions = normalizeStringList(computeEffectivePermissions(user));
    const extraPermissions = normalizeStringList(
      filterAssignablePermissions(user?.role || 'USER', user?.extraPermissions)
    );
    const deniedPermissions = normalizeStringList(
      filterAssignablePermissions(user?.role || 'USER', user?.deniedPermissions)
    );
    const siblingCount = Array.isArray(user?.siblings) ? user.siblings.length : 0;
    const childrenCount = Array.isArray(user?.children) ? user.children.length : 0;
    const otherFamilyCount = Array.isArray(user?.familyMembers) ? user.familyMembers.length : 0;
    const familyConnectionsCount =
      (user?.father ? 1 : 0) +
      (user?.mother ? 1 : 0) +
      (user?.spouse ? 1 : 0) +
      siblingCount +
      childrenCount +
      otherFamilyCount;

    const meetingIdsCount = Array.isArray(user?.meetingIds) ? user.meetingIds.length : 0;
    const meetingAttendance = Array.isArray(user?.meetingAttendance) ? user.meetingAttendance : [];
    const divineAttendance = Array.isArray(user?.divineLiturgyAttendance) ? user.divineLiturgyAttendance : [];
    const lastMeetingAttendanceDate = meetingAttendance
      .map((entry) => entry?.attendanceDate)
      .filter(Boolean)
      .sort()
      .slice(-1)[0] || null;
    const lastDivineAttendanceDate = divineAttendance
      .map((entry) => entry?.attendanceDate)
      .filter(Boolean)
      .sort()
      .slice(-1)[0] || null;

    const ageValue = Number(formatAgeFromBirthDate(user?.birthDate));
    const age = Number.isFinite(ageValue) ? ageValue : null;
    const monthlyIncome = toFiniteNumber(user?.financial?.monthlyIncome);
    const hasAddress = Boolean(
      user?.address?.governorate ||
      user?.address?.city ||
      user?.address?.street ||
      user?.address?.details
    );
    const notesText = [
      user?.notes,
      user?.financial?.notes,
      user?.employment?.notes,
      ...(Array.isArray(user?.health?.conditions) ? user.health.conditions.map((condition) => condition?.notes) : []),
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join('\n');

    const derived = {
      id: toComparableId(user?._id || user?.id),
      user,
      fullName: String(user?.fullName || '').trim(),
      fullNameNormalized: normalizeText(user?.fullName),
      gender: String(user?.gender || '').trim(),
      ageGroup: String(user?.ageGroup || '').trim(),
      role: String(user?.role || '').trim(),
      age,
      birthDate: user?.birthDate || null,
      birthDateTs: toTimestamp(user?.birthDate),
      createdAt: user?.createdAt || null,
      createdAtTs: toTimestamp(user?.createdAt),
      updatedAt: user?.updatedAt || null,
      updatedAtTs: toTimestamp(user?.updatedAt),
      lastLoginAt: user?.lastLoginAt || null,
      lastLoginAtTs: toTimestamp(user?.lastLoginAt),
      phonePrimary: String(user?.phonePrimary || '').trim(),
      phoneSecondary: String(user?.phoneSecondary || '').trim(),
      whatsappNumber: String(user?.whatsappNumber || '').trim(),
      email: String(user?.email || '').trim(),
      nationalId: String(user?.nationalId || '').trim(),
      familyName: String(user?.familyName || '').trim(),
      houseName: String(user?.houseName || '').trim(),
      governorate: String(user?.address?.governorate || '').trim(),
      city: String(user?.address?.city || '').trim(),
      street: String(user?.address?.street || '').trim(),
      employmentStatus: String(user?.employment?.status || '').trim(),
      jobTitle: String(user?.employment?.jobTitle || '').trim(),
      employerName: String(user?.employment?.employerName || '').trim(),
      presenceStatus: String(user?.presence?.status || '').trim(),
      travelDestination: String(user?.presence?.travelDestination || '').trim(),
      travelReason: String(user?.presence?.travelReason || '').trim(),
      educationStage: String(user?.education?.stage || '').trim(),
      educationStageGroup: String(getEducationStageGroup(user?.education?.stage) || '').trim(),
      fieldOfStudy: String(user?.education?.fieldOfStudy || '').trim(),
      schoolName: String(user?.education?.schoolName || '').trim(),
      universityName: String(user?.education?.universityName || '').trim(),
      facultyName: String(user?.education?.facultyName || '').trim(),
      monthlyIncome,
      currency: String(user?.financial?.currency || '').trim(),
      healthConditions,
      chronicHealthConditionCount,
      customDetailEntries,
      customDetailKeys,
      customDetailValues,
      customDetailsCount: customDetailEntries.length,
      tags,
      tagsCount: tags.length,
      notesText,
      isLocked: Boolean(user?.isLocked),
      hasLogin: Boolean(user?.hasLogin),
      loginIdentifierType: String(user?.loginIdentifierType || '').trim(),
      extraPermissions,
      deniedPermissions,
      effectivePermissions,
      meetingIdsCount,
      meetingAttendanceCount: meetingAttendance.length,
      divineAttendanceCount: divineAttendance.length,
      confessionSessionCount: Array.isArray(user?.confessionSessionIds) ? user.confessionSessionIds.length : 0,
      siblingCount,
      childrenCount,
      otherFamilyCount,
      familyConnectionsCount,
      lastMeetingAttendanceDate,
      lastMeetingAttendanceTs: toTimestamp(lastMeetingAttendanceDate),
      lastDivineAttendanceDate,
      lastDivineAttendanceTs: toTimestamp(lastDivineAttendanceDate),
      hasAddress,
      customDetailsSearch: buildSearchBlob([customDetailKeys, customDetailValues]),
    };

    const flags = buildFlags(user, derived);

    return {
      ...derived,
      flags,
      searchBlob: buildSearchBlob([
        derived.fullName,
        derived.phonePrimary,
        derived.phoneSecondary,
        derived.whatsappNumber,
        derived.email,
        derived.nationalId,
        derived.familyName,
        derived.houseName,
        derived.governorate,
        derived.city,
        derived.street,
        user?.address?.details,
        derived.role,
        derived.gender,
        derived.ageGroup,
        derived.employmentStatus,
        derived.jobTitle,
        derived.employerName,
        derived.presenceStatus,
        derived.travelDestination,
        derived.travelReason,
        derived.educationStage,
        derived.educationStageGroup,
        derived.fieldOfStudy,
        derived.schoolName,
        derived.universityName,
        derived.facultyName,
        healthConditions,
        tags,
        customDetailKeys,
        customDetailValues,
        effectivePermissions,
        extraPermissions,
        deniedPermissions,
        user?.confessionFatherName,
        notesText,
      ]),
    };
  });
}

export function buildUsersExplorerDynamicOptions(derivedUsers = []) {
  return {
    tags: buildDistinctValueList(derivedUsers.flatMap((user) => user.tags)),
    healthConditions: buildDistinctValueList(derivedUsers.flatMap((user) => user.healthConditions)),
    cities: buildDistinctValueList(derivedUsers.map((user) => user.city)),
    governorates: buildDistinctValueList(derivedUsers.map((user) => user.governorate)),
    jobTitles: buildDistinctValueList(derivedUsers.map((user) => user.jobTitle)),
    employerNames: buildDistinctValueList(derivedUsers.map((user) => user.employerName)),
    travelDestinations: buildDistinctValueList(derivedUsers.map((user) => user.travelDestination)),
    travelReasons: buildDistinctValueList(derivedUsers.map((user) => user.travelReason)),
    fieldOfStudies: buildDistinctValueList(derivedUsers.map((user) => user.fieldOfStudy)),
    schoolNames: buildDistinctValueList(derivedUsers.map((user) => user.schoolName)),
    universityNames: buildDistinctValueList(derivedUsers.map((user) => user.universityName)),
    facultyNames: buildDistinctValueList(derivedUsers.map((user) => user.facultyName)),
    customDetailKeys: buildDistinctValueList(derivedUsers.flatMap((user) => user.customDetailKeys)),
  };
}

export function filterUsersExplorerDataset(derivedUsers = [], filters = DEFAULT_USERS_EXPLORER_FILTERS) {
  const normalizedKeyword = normalizeText(filters.keyword);
  const normalizedFullName = normalizeText(filters.fullName);
  const normalizedPhone = normalizeText(filters.phoneQuery);
  const normalizedEmail = normalizeText(filters.emailQuery);
  const normalizedNationalId = normalizeText(filters.nationalIdQuery);
  const normalizedFamilyName = normalizeText(filters.familyName);
  const normalizedHouseName = normalizeText(filters.houseName);
  const normalizedGovernorate = normalizeText(filters.governorate);
  const normalizedCity = normalizeText(filters.city);
  const normalizedStreet = normalizeText(filters.street);
  const normalizedJobTitle = normalizeText(filters.jobTitle);
  const normalizedEmployerName = normalizeText(filters.employerName);
  const normalizedTravelDestination = normalizeText(filters.travelDestination);
  const normalizedTravelReason = normalizeText(filters.travelReason);
  const normalizedFieldOfStudy = normalizeText(filters.fieldOfStudy);
  const normalizedSchoolName = normalizeText(filters.schoolName);
  const normalizedUniversityName = normalizeText(filters.universityName);
  const normalizedFacultyName = normalizeText(filters.facultyName);
  const normalizedCustomDetailValue = normalizeText(filters.customDetailValue);
  const normalizedNotesQuery = normalizeText(filters.notesQuery);
  const normalizedConfessionFatherQuery = normalizeText(filters.confessionFatherQuery);

  return (Array.isArray(derivedUsers) ? derivedUsers : []).filter((user) => {
    if (normalizedKeyword && !user.searchBlob.includes(normalizedKeyword)) return false;
    if (normalizedFullName && !matchesContains(user.fullName, normalizedFullName)) return false;

    if (normalizedPhone) {
      const phoneBlob = buildSearchBlob([
        user.phonePrimary,
        user.phoneSecondary,
        user.whatsappNumber,
      ]);
      if (!phoneBlob.includes(normalizedPhone)) return false;
    }

    if (normalizedEmail && !matchesContains(user.email, normalizedEmail)) return false;
    if (normalizedNationalId && !matchesContains(user.nationalId, normalizedNationalId)) return false;
    if (normalizedFamilyName && !matchesContains(user.familyName, normalizedFamilyName)) return false;
    if (normalizedHouseName && !matchesContains(user.houseName, normalizedHouseName)) return false;
    if (normalizedGovernorate && !matchesContains(user.governorate, normalizedGovernorate)) return false;
    if (normalizedCity && !matchesContains(user.city, normalizedCity)) return false;
    if (normalizedStreet && !matchesContains(user.street, normalizedStreet)) return false;

    if (filters.role && user.role !== filters.role) return false;
    if (filters.gender && user.gender !== filters.gender) return false;
    if (filters.ageGroup && user.ageGroup !== filters.ageGroup) return false;
    if (!matchesRange(user.age, filters.ageMin, filters.ageMax)) return false;
    if (!matchesDateRange(user.birthDateTs, filters.birthDateFrom, filters.birthDateTo)) return false;

    if (filters.isLocked !== '') {
      const shouldBeLocked = String(filters.isLocked) === 'true';
      if (user.isLocked !== shouldBeLocked) return false;
    }

    if (filters.hasLogin !== '') {
      const shouldHaveLogin = String(filters.hasLogin) === 'true';
      if (user.hasLogin !== shouldHaveLogin) return false;
    }

    if (filters.loginIdentifierType && user.loginIdentifierType !== filters.loginIdentifierType) return false;
    if (filters.employmentStatus && user.employmentStatus !== filters.employmentStatus) return false;
    if (normalizedJobTitle && !matchesContains(user.jobTitle, normalizedJobTitle)) return false;
    if (normalizedEmployerName && !matchesContains(user.employerName, normalizedEmployerName)) return false;
    if (filters.presenceStatus && user.presenceStatus !== filters.presenceStatus) return false;
    if (normalizedTravelDestination && !matchesContains(user.travelDestination, normalizedTravelDestination)) return false;
    if (normalizedTravelReason && !matchesContains(user.travelReason, normalizedTravelReason)) return false;
    if (filters.educationStage && user.educationStage !== filters.educationStage) return false;
    if (filters.educationStageGroup && user.educationStageGroup !== filters.educationStageGroup) return false;
    if (normalizedFieldOfStudy && !matchesContains(user.fieldOfStudy, normalizedFieldOfStudy)) return false;
    if (normalizedSchoolName && !matchesContains(user.schoolName, normalizedSchoolName)) return false;
    if (normalizedUniversityName && !matchesContains(user.universityName, normalizedUniversityName)) return false;
    if (normalizedFacultyName && !matchesContains(user.facultyName, normalizedFacultyName)) return false;
    if (!matchesRange(user.monthlyIncome, filters.monthlyIncomeMin, filters.monthlyIncomeMax)) return false;

    if (!matchesSelectionList(user.tags, filters.tags, filters.tagsMatchMode)) return false;
    if (
      !matchesSelectionList(
        user.healthConditions,
        filters.selectedHealthConditions,
        filters.healthConditionMatchMode
      )
    ) {
      return false;
    }

    if (!matchesSelectionList(user.effectivePermissions, filters.effectivePermissions, filters.permissionMatchMode)) {
      return false;
    }

    if (
      !matchesSelectionList(
        user.customDetailKeys,
        filters.customDetailKeys,
        filters.customDetailKeyMatchMode
      )
    ) {
      return false;
    }

    if (normalizedCustomDetailValue && !user.customDetailsSearch.includes(normalizedCustomDetailValue)) {
      return false;
    }

    const requiredFlags = normalizeStringList(filters.requiredFlags);
    if (requiredFlags.length > 0 && requiredFlags.some((flag) => !user.flags.has(flag))) return false;

    const excludedFlags = normalizeStringList(filters.excludedFlags);
    if (excludedFlags.length > 0 && excludedFlags.some((flag) => user.flags.has(flag))) return false;

    if (!matchesDateRange(user.createdAtTs, filters.createdFrom, filters.createdTo)) return false;
    if (!matchesDateRange(user.updatedAtTs, filters.updatedFrom, filters.updatedTo)) return false;
    if (!matchesRange(user.meetingIdsCount, filters.meetingCountMin, filters.meetingCountMax)) return false;
    if (
      !matchesRange(
        user.meetingAttendanceCount,
        filters.meetingAttendanceMin,
        filters.meetingAttendanceMax
      )
    ) {
      return false;
    }
    if (!matchesRange(user.divineAttendanceCount, filters.divineAttendanceMin, filters.divineAttendanceMax)) {
      return false;
    }
    if (!matchesRange(user.siblingCount, filters.siblingCountMin, filters.siblingCountMax)) return false;
    if (!matchesRange(user.childrenCount, filters.childrenCountMin, filters.childrenCountMax)) return false;
    if (
      !matchesRange(
        user.familyConnectionsCount,
        filters.familyConnectionsMin,
        filters.familyConnectionsMax
      )
    ) {
      return false;
    }
    if (!matchesRange(user.customDetailsCount, filters.customDetailsMin, filters.customDetailsMax)) return false;

    if (normalizedNotesQuery && !matchesContains(user.notesText, normalizedNotesQuery)) return false;
    if (
      normalizedConfessionFatherQuery &&
      !matchesContains(user.user?.confessionFatherName, normalizedConfessionFatherQuery)
    ) {
      return false;
    }

    return true;
  });
}

function getSortAccessor(field) {
  switch (field) {
    case 'createdAt':
      return (user) => user.createdAtTs;
    case 'updatedAt':
      return (user) => user.updatedAtTs;
    case 'birthDate':
      return (user) => user.birthDateTs;
    case 'age':
      return (user) => user.age;
    case 'role':
      return (user) => user.role;
    case 'gender':
      return (user) => user.gender;
    case 'familyName':
      return (user) => user.familyName;
    case 'houseName':
      return (user) => user.houseName;
    case 'city':
      return (user) => user.city;
    case 'employmentStatus':
      return (user) => user.employmentStatus;
    case 'monthlyIncome':
      return (user) => user.monthlyIncome;
    case 'tagsCount':
      return (user) => user.tagsCount;
    case 'familyConnections':
      return (user) => user.familyConnectionsCount;
    case 'meetingCount':
      return (user) => user.meetingIdsCount;
    case 'meetingAttendanceCount':
      return (user) => user.meetingAttendanceCount;
    case 'divineAttendanceCount':
      return (user) => user.divineAttendanceCount;
    case 'customDetailsCount':
      return (user) => user.customDetailsCount;
    case 'lastMeetingAttendance':
      return (user) => user.lastMeetingAttendanceTs;
    case 'lastDivineAttendance':
      return (user) => user.lastDivineAttendanceTs;
    case 'lastLoginAt':
      return (user) => user.lastLoginAtTs;
    case 'fullName':
    default:
      return (user) => user.fullName;
  }
}

function compareSortableValues(left, right) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return collator.compare(String(left), String(right));
}

export function sortUsersExplorerDataset(derivedUsers = [], sortState = DEFAULT_USERS_EXPLORER_SORT) {
  const field = USERS_EXPLORER_SORT_FIELDS.includes(sortState?.field)
    ? sortState.field
    : DEFAULT_USERS_EXPLORER_SORT.field;
  const order = sortState?.order === 'asc' ? 'asc' : 'desc';
  const direction = order === 'asc' ? 1 : -1;
  const accessor = getSortAccessor(field);

  return [...(Array.isArray(derivedUsers) ? derivedUsers : [])].sort((left, right) => {
    const primaryComparison = compareSortableValues(accessor(left), accessor(right));
    if (primaryComparison !== 0) return primaryComparison * direction;

    const nameComparison = collator.compare(left.fullName || '', right.fullName || '');
    if (nameComparison !== 0) return nameComparison;

    return collator.compare(left.id || '', right.id || '');
  });
}

export function buildUsersExplorerAnalytics(totalUsers = [], filteredUsers = []) {
  const totalCount = Array.isArray(totalUsers) ? totalUsers.length : 0;
  const filteredCount = Array.isArray(filteredUsers) ? filteredUsers.length : 0;
  const filteredList = Array.isArray(filteredUsers) ? filteredUsers : [];
  const ages = filteredList.map((user) => user.age).filter((value) => value != null);
  const incomes = filteredList.map((user) => user.monthlyIncome).filter((value) => value != null);

  return {
    totalCount,
    filteredCount,
    coveragePercentage: totalCount > 0 ? Math.round((filteredCount / totalCount) * 100) : 0,
    lockedCount: filteredList.filter((user) => user.isLocked).length,
    loginEnabledCount: filteredList.filter((user) => user.hasLogin).length,
    travelingCount: filteredList.filter((user) => user.presenceStatus === 'traveling').length,
    withHealthConditionsCount: filteredList.filter((user) => user.healthConditions.length > 0).length,
    averageAge: ages.length > 0 ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length) : null,
    averageIncome:
      incomes.length > 0
        ? Math.round(incomes.reduce((sum, income) => sum + income, 0) / incomes.length)
        : null,
    roleCounts: buildCountList(filteredList.map((user) => user.role)),
    genderCounts: buildCountList(filteredList.map((user) => user.gender)),
    ageGroupCounts: buildCountList(filteredList.map((user) => user.ageGroup)),
    employmentCounts: buildCountList(filteredList.map((user) => user.employmentStatus)),
    presenceCounts: buildCountList(filteredList.map((user) => user.presenceStatus)),
    topFamilies: buildCountList(filteredList.map((user) => user.familyName)).slice(0, 8),
    topHouses: buildCountList(filteredList.map((user) => user.houseName)).slice(0, 8),
    topCities: buildCountList(filteredList.map((user) => user.city)).slice(0, 8),
    topTags: buildCountList(filteredList.flatMap((user) => user.tags)).slice(0, 8),
    topHealthConditions: buildCountList(filteredList.flatMap((user) => user.healthConditions)).slice(0, 8),
    topCustomDetailKeys: buildCountList(filteredList.flatMap((user) => user.customDetailKeys)).slice(0, 8),
  };
}

export function countActiveUsersExplorerFilters(filters = DEFAULT_USERS_EXPLORER_FILTERS) {
  return Object.entries(DEFAULT_USERS_EXPLORER_FILTERS).reduce((count, [key, defaultValue]) => {
    const value = filters?.[key];

    if (Array.isArray(defaultValue)) {
      return count + (Array.isArray(value) && value.length > 0 ? 1 : 0);
    }

    if (typeof defaultValue === 'string') {
      return count + (String(value ?? '').trim() !== String(defaultValue).trim() ? 1 : 0);
    }

    return count + (value !== defaultValue ? 1 : 0);
  }, 0);
}

export function buildUsersExplorerPresetStorageKey(userId) {
  return `${USERS_EXPLORER_PRESET_STORAGE_PREFIX}:${String(userId || 'anonymous')}`;
}

export function loadUsersExplorerPresets(userId) {
  if (typeof window === 'undefined' || !userId) return [];

  try {
    const rawValue = window.localStorage.getItem(buildUsersExplorerPresetStorageKey(userId));
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function storeUsersExplorerPresets(userId, presets) {
  if (typeof window === 'undefined' || !userId) return;
  window.localStorage.setItem(
    buildUsersExplorerPresetStorageKey(userId),
    JSON.stringify(Array.isArray(presets) ? presets : [])
  );
}

export function getUsersExplorerPermissionLabel(permission) {
  return PERMISSION_LABELS[permission] || permission;
}
