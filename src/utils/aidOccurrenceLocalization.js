const OCCURRENCE_LABELS = {
  'one time': {
    en: 'One Time',
    ar: 'مرة واحدة',
  },
  weekly: {
    en: 'Weekly',
    ar: 'أسبوعي',
  },
  monthly: {
    en: 'Monthly',
    ar: 'شهري',
  },
  yearly: {
    en: 'Yearly',
    ar: 'سنوي',
  },
};

export function localizeAidOccurrence(value, language = 'en') {
  const normalizedValue = String(value || '').trim().toLowerCase();
  const locale = language === 'ar' ? 'ar' : 'en';

  return OCCURRENCE_LABELS[normalizedValue]?.[locale] || String(value || '').trim();
}
