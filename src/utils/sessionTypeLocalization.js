const CANONICAL_ALIASES = {
  followUp: [
    'follow-up session',
    'follow up session',
    'جلسة متابعة',
  ],
  counseling: [
    'counseling session',
    'counselling session',
    'جلسة ارشاد روحي',
    'جلسة إرشاد روحي',
    'جلسة إرشاد',
  ],
  fullConfession: [
    'full confession',
    'اعتراف كامل',
  ],
  shortPrayer: [
    'short prayer',
    'صلاة قصيرة',
  ],
};

const ARABIC_DIACRITICS_REGEX = /[\u064B-\u0652]/g;

function normalizeSessionTypeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(ARABIC_DIACRITICS_REGEX, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

const aliasToCanonical = new Map();
Object.entries(CANONICAL_ALIASES).forEach(([canonical, aliases]) => {
  aliases.forEach((alias) => {
    aliasToCanonical.set(normalizeSessionTypeName(alias), canonical);
  });
});

export function localizeSessionTypeName(name, t) {
  const original = (name || '').trim();
  if (!original) return t('common.placeholder.empty');

  const canonical = aliasToCanonical.get(normalizeSessionTypeName(original));
  if (!canonical) return original;

  return t(`confessions.sessionTypeNames.${canonical}`);
}
