import {
  getAgeGroupLabel,
  getEmploymentStatusLabel,
  getPresenceStatusLabel,
} from '../../../constants/householdProfiles';

const TEXT = {
  en: {
    sourceField: {
      houseName: 'House name',
      familyName: 'Family name',
      singleMember: 'Single member',
    },
    unclassified: 'Unclassified',
    required: 'Required',
    optional: 'Optional',
    passed: 'Passed',
    failed: 'Failed',
  },
  ar: {
    sourceField: {
      houseName: 'اسم البيت',
      familyName: 'اسم العائلة',
      singleMember: 'فرد منفرد',
    },
    unclassified: 'غير مصنفة',
    required: 'إلزامي',
    optional: 'اختياري',
    passed: 'متحقق',
    failed: 'غير متحقق',
  },
};

function getLocale(language) {
  return language === 'ar' ? 'ar' : 'en';
}

export function getHouseholdSourceLabel(value, language = 'en') {
  const locale = getLocale(language);
  if (value === 'familyName' || value === 'singleMember') {
    return TEXT[locale].sourceField.houseName;
  }
  return TEXT[locale].sourceField[value] || TEXT[locale].sourceField.houseName;
}

export function formatCurrencyEGP(value, language = 'en') {
  const amount = Number(value || 0);
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getStatusText(key, language = 'en') {
  const locale = getLocale(language);
  return TEXT[locale][key] || key;
}

export function describeCriterionActualValue(criterion, language = 'en') {
  if (typeof criterion.actualValue === 'boolean') {
    return criterion.actualValue
      ? getStatusText('passed', language)
      : getStatusText('failed', language);
  }

  return String(criterion.actualValue ?? 0);
}

export function describeMemberFacts(member, language = 'en') {
  const parts = [];
  if (member.ageGroup) parts.push(getAgeGroupLabel(member.ageGroup, language));
  if (member.employmentStatus) {
    parts.push(getEmploymentStatusLabel(member.employmentStatus, language));
  }
  if (member.presenceStatus) {
    parts.push(getPresenceStatusLabel(member.presenceStatus, language));
  }
  return parts;
}
