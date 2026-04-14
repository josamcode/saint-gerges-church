const CANONICAL_ALIASES = {
  generalAnnouncement: ['general announcement'],
  event: ['event'],
  congratulations: ['congratulations'],
  aidReminder: ['aid reminder'],
};

const ARABIC_DIACRITICS_REGEX = /[\u064B-\u0652]/g;

function normalizeNotificationTypeName(value) {
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
    aliasToCanonical.set(normalizeNotificationTypeName(alias), canonical);
  });
});

export function localizeNotificationTypeName(name, t) {
  const original = String(name || '').trim();
  if (!original) return t('common.placeholder.empty');

  const canonical = aliasToCanonical.get(normalizeNotificationTypeName(original));
  if (!canonical) return original;

  return t(`notifications.defaultTypeNames.${canonical}`);
}
