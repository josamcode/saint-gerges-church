import { getCurrentLanguage, getCurrentLocale } from '../i18n/i18n';

const GENDER_LABELS_BY_LANG = {
  en: {
    male: 'Male',
    female: 'Female',
    other: 'Other',
  },
  ar: {
    male: 'ذكر',
    female: 'أنثى',
    other: 'آخر',
  },
};

const ROLE_LABELS_BY_LANG = {
  en: {
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    USER: 'User',
  },
  ar: {
    SUPER_ADMIN: 'مدير النظام',
    ADMIN: 'مسؤول',
    USER: 'مستخدم',
  },
};

const ACCOUNT_STATUS_LABELS_BY_LANG = {
  en: {
    pending: 'Pending approval',
    approved: 'Approved',
    rejected: 'Rejected',
  },
  ar: {
    pending: 'قيد المراجعة',
    approved: 'معتمد',
    rejected: 'مرفوض',
  },
};

const AGE_GROUPS_BY_LANG = {
  en: ['Child', 'Teen', 'Youth', 'Middle-aged', 'Senior'],
  ar: ['طفل', 'مراهق', 'شاب', 'متوسط العمر', 'كبير سن'],
};

const LOCK_REASONS_BY_LANG = {
  en: [
    'Administrative decision',
    'Security breach',
    'Inappropriate behavior',
    'Inactive account',
    'Multiple failed login attempts',
    'Data integrity issues',
    'Other reason',
  ],
  ar: [
    'قرار إداري',
    'اختراق أمني',
    'سلوك غير لائق',
    'عدم نشاط',
    'محاولات دخول فاشلة متعددة',
    'مشاكل في سلامة البيانات',
    'سبب آخر',
  ],
};

const RELATION_LABELS_BY_LANG = {
  en: {
    father: 'Father',
    mother: 'Mother',
    spouse: 'Spouse',
    sibling: 'Sibling',
    child: 'Child',
    other: 'Other',
  },
  ar: {
    father: 'الأب',
    mother: 'الأم',
    spouse: 'الزوج',
    sibling: 'الأخ',
    child: 'الابن',
    other: 'آخر',
  },
};

const EMPTY_VALUE = '---';

function parseCalendarDateParts(value) {
  if (!value) return null;

  const rawValue = String(value).trim();
  const matchedDateParts = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (matchedDateParts) {
    const [, year, month, day] = matchedDateParts;
    return {
      year: Number(year),
      month: Number(month),
      day: Number(day),
    };
  }

  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return {
    year: parsedDate.getUTCFullYear(),
    month: parsedDate.getUTCMonth() + 1,
    day: parsedDate.getUTCDate(),
  };
}

function getLanguageObject(mapByLanguage) {
  const language = getCurrentLanguage();
  return mapByLanguage[language] || mapByLanguage.ar || mapByLanguage.en || {};
}

function createObjectProxy(mapByLanguage) {
  return new Proxy(
    {},
    {
      get(_, property) {
        if (typeof property !== 'string') return undefined;
        return getLanguageObject(mapByLanguage)[property];
      },
      ownKeys() {
        return Reflect.ownKeys(getLanguageObject(mapByLanguage));
      },
      getOwnPropertyDescriptor() {
        return { enumerable: true, configurable: true };
      },
    }
  );
}

function createArrayProxy(mapByLanguage) {
  return new Proxy(
    [],
    {
      get(_, property) {
        const list = getLanguageObject(mapByLanguage);
        if (property === Symbol.iterator) return list[Symbol.iterator].bind(list);
        const value = list[property];
        return typeof value === 'function' ? value.bind(list) : value;
      },
      ownKeys() {
        return Reflect.ownKeys(getLanguageObject(mapByLanguage));
      },
      getOwnPropertyDescriptor() {
        return { enumerable: true, configurable: true };
      },
    }
  );
}

export function formatDate(dateStr) {
  if (!dateStr) return EMPTY_VALUE;
  try {
    return new Date(dateStr).toLocaleDateString(getCurrentLocale(), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return EMPTY_VALUE;
  try {
    return new Date(dateStr).toLocaleDateString(getCurrentLocale(), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatAgeFromBirthDate(birthDate) {
  const birthDateParts = parseCalendarDateParts(birthDate);
  if (!birthDateParts) return EMPTY_VALUE;

  const today = new Date();
  let age = today.getFullYear() - birthDateParts.year;
  const hasHadBirthdayThisYear =
    today.getMonth() + 1 > birthDateParts.month ||
    (today.getMonth() + 1 === birthDateParts.month && today.getDate() >= birthDateParts.day);

  if (!hasHadBirthdayThisYear) age -= 1;

  return age >= 0 ? age : EMPTY_VALUE;
}

export function formatPhone(phone) {
  if (!phone) return EMPTY_VALUE;
  return phone;
}

export function getGenderLabel(gender) {
  if (!gender) return EMPTY_VALUE;
  return getLanguageObject(GENDER_LABELS_BY_LANG)[gender] || gender;
}

export function getRoleLabel(role) {
  if (!role) return EMPTY_VALUE;
  return getLanguageObject(ROLE_LABELS_BY_LANG)[role] || role;
}

export function getAccountStatusLabel(accountStatus) {
  if (!accountStatus) return EMPTY_VALUE;
  return getLanguageObject(ACCOUNT_STATUS_LABELS_BY_LANG)[accountStatus] || accountStatus;
}

export function getAccountStatusVariant(accountStatus) {
  if (accountStatus === 'approved') return 'success';
  if (accountStatus === 'rejected') return 'danger';
  return 'warning';
}

export function getRelationLabel(relation) {
  if (!relation) return EMPTY_VALUE;
  return getLanguageObject(RELATION_LABELS_BY_LANG)[relation] || relation;
}

export const GENDER_LABELS = createObjectProxy(GENDER_LABELS_BY_LANG);
export const ROLE_LABELS = createObjectProxy(ROLE_LABELS_BY_LANG);
export const ACCOUNT_STATUS_LABELS = createObjectProxy(ACCOUNT_STATUS_LABELS_BY_LANG);
export const RELATION_LABELS = createObjectProxy(RELATION_LABELS_BY_LANG);
export const AGE_GROUPS = createArrayProxy(AGE_GROUPS_BY_LANG);
export const LOCK_REASONS = createArrayProxy(LOCK_REASONS_BY_LANG);

export const ROLE_COLORS = {
  SUPER_ADMIN: 'bg-primary text-white',
  ADMIN: 'bg-accent text-white',
  USER: 'bg-surface-alt text-base',
};
