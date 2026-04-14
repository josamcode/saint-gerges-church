export const AGE_GROUP_VALUES = ['طفل', 'مراهق', 'شاب', 'متوسط العمر', 'كبير سن'];

export const EMPLOYMENT_STATUS_VALUES = [
  'employed',
  'unemployed',
  'student',
  'retired',
  'homemaker',
  'unable_to_work',
];

export const PRESENCE_STATUS_VALUES = ['present', 'traveling'];

const LABELS = {
  en: {
    genders: {
      male: 'Male',
      female: 'Female',
      other: 'Other',
    },
    ageGroups: {
      'طفل': 'Child',
      'مراهق': 'Teen',
      'شاب': 'Youth',
      'متوسط العمر': 'Middle-aged',
      'كبير سن': 'Senior',
    },
    employmentStatuses: {
      employed: 'Employed',
      unemployed: 'Unemployed',
      student: 'Student',
      retired: 'Retired',
      homemaker: 'Homemaker',
      unable_to_work: 'Unable to work',
    },
    presenceStatuses: {
      present: 'Present',
      traveling: 'Traveling',
    },
  },
  ar: {
    genders: {
      male: 'ذكر',
      female: 'أنثى',
      other: 'آخر',
    },
    ageGroups: {
      'طفل': 'طفل',
      'مراهق': 'مراهق',
      'شاب': 'شاب',
      'متوسط العمر': 'متوسط العمر',
      'كبير سن': 'كبير سن',
    },
    employmentStatuses: {
      employed: 'يعمل',
      unemployed: 'بدون عمل',
      student: 'طالب',
      retired: 'متقاعد',
      homemaker: 'ربة منزل',
      unable_to_work: 'غير قادر على العمل',
    },
    presenceStatuses: {
      present: 'موجود',
      traveling: 'مسافر',
    },
  },
};

function getLocale(language) {
  return language === 'ar' ? 'ar' : 'en';
}

export function getGenderLabel(value, language = 'en') {
  return LABELS[getLocale(language)].genders[value] || value;
}

export function getAgeGroupLabel(value, language = 'en') {
  return LABELS[getLocale(language)].ageGroups[value] || value;
}

export function getEmploymentStatusLabel(value, language = 'en') {
  return LABELS[getLocale(language)].employmentStatuses[value] || value;
}

export function getPresenceStatusLabel(value, language = 'en') {
  return LABELS[getLocale(language)].presenceStatuses[value] || value;
}

export function getGenderOptions(language = 'en') {
  return ['male', 'female', 'other'].map((value) => ({
    value,
    label: getGenderLabel(value, language),
  }));
}

export function getAgeGroupOptions(language = 'en') {
  return AGE_GROUP_VALUES.map((value) => ({
    value,
    label: getAgeGroupLabel(value, language),
  }));
}

export function getEmploymentStatusOptions(language = 'en') {
  return EMPLOYMENT_STATUS_VALUES.map((value) => ({
    value,
    label: getEmploymentStatusLabel(value, language),
  }));
}

export function getPresenceStatusOptions(language = 'en') {
  return PRESENCE_STATUS_VALUES.map((value) => ({
    value,
    label: getPresenceStatusLabel(value, language),
  }));
}
