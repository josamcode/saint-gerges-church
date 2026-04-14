import { translations } from '../i18n/translations';

export const LANDING_STAT_ITEM_IDS = ['families', 'members', 'services', 'servants'];
export const LANDING_SOCIAL_PLATFORMS = ['facebook', 'instagram', 'youtube', 'twitter'];

const EXCLUDED_TEXT_PREFIXES = [
  'landing.hero.churchImage',
  'landing.priests.imageHint',
  'landing.priests.items',
];

function isStatsValuePath(path = '') {
  return /^landing\.stats\.items\.[^.]+\.value$/.test(path);
}

function shouldExcludePath(path = '') {
  if (isStatsValuePath(path)) return true;
  return EXCLUDED_TEXT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}.`));
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function setByPath(obj, path, value) {
  const next = deepClone(obj || {});
  const keys = String(path || '').split('.').filter(Boolean);
  if (!keys.length) return next;

  let cursor = next;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }

    if (!isPlainObject(cursor[key])) {
      cursor[key] = {};
    }

    cursor = cursor[key];
  });

  return next;
}

export function deepMerge(base, override) {
  if (Array.isArray(base)) return Array.isArray(override) ? override : base;
  if (isPlainObject(base) && isPlainObject(override)) {
    const next = { ...base };
    Object.keys(override).forEach((key) => {
      next[key] = deepMerge(base[key], override[key]);
    });
    return next;
  }
  return override === undefined ? base : override;
}

function filterEditableTree(node, path = '') {
  if (shouldExcludePath(path)) return undefined;
  if (typeof node === 'string') return node;
  if (!isPlainObject(node)) return undefined;

  const next = {};
  Object.entries(node).forEach(([key, value]) => {
    const childPath = path ? `${path}.${key}` : key;
    const filtered = filterEditableTree(value, childPath);
    if (typeof filtered === 'string') {
      next[key] = filtered;
      return;
    }
    if (isPlainObject(filtered) && Object.keys(filtered).length > 0) {
      next[key] = filtered;
    }
  });

  return Object.keys(next).length > 0 ? next : undefined;
}

export function getDefaultLandingTextState() {
  const build = (language) => {
    const tree = {};
    ['landing', 'publicLayout'].forEach((rootKey) => {
      const filtered = filterEditableTree(translations?.[language]?.[rootKey], rootKey);
      if (filtered) {
        tree[rootKey] = filtered;
      }
    });
    return tree;
  };

  return {
    en: build('en'),
    ar: build('ar'),
  };
}

export function flattenStringLeafPaths(node, basePath = '') {
  if (typeof node === 'string') {
    return [{ path: basePath, value: node }];
  }

  if (!isPlainObject(node)) return [];

  return Object.entries(node).flatMap(([key, value]) =>
    flattenStringLeafPaths(value, basePath ? `${basePath}.${key}` : key)
  );
}

export function humanizeKey(value = '') {
  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function formatFieldLabel(path, sectionPath = '') {
  const relative = sectionPath && path.startsWith(`${sectionPath}.`)
    ? path.slice(sectionPath.length + 1)
    : path;
  return relative
    .split('.')
    .filter(Boolean)
    .map((segment) => humanizeKey(segment))
    .join(' / ');
}

export function getFieldInputKind(path, value = '') {
  const normalized = String(path || '').toLowerCase();
  const text = String(value || '');

  if (
    text.includes('\n') ||
    text.length > 120 ||
    /(description|subtitle|bio|text|content|desc|address|vision|mission)/.test(normalized)
  ) {
    return 'textarea';
  }

  return 'input';
}

export function buildLandingTextSections(languageTree = {}) {
  const sections = [];

  Object.entries(languageTree?.landing || {}).forEach(([key, value]) => {
    const path = `landing.${key}`;
    const fields = flattenStringLeafPaths(value, path);
    if (fields.length) {
      sections.push({
        id: path,
        title: humanizeKey(key),
        fields,
      });
    }
  });

  if (languageTree?.publicLayout) {
    sections.push({
      id: 'publicLayout',
      title: 'Public Layout',
      fields: flattenStringLeafPaths(languageTree.publicLayout, 'publicLayout'),
    });
  }

  return sections;
}

export function buildDefaultStatSettings() {
  return {
    families: { sourceType: 'system', sourceKey: 'families_total', manualValue: '' },
    members: { sourceType: 'system', sourceKey: 'members_total', manualValue: '' },
    services: { sourceType: 'system', sourceKey: 'services_total', manualValue: '' },
    servants: { sourceType: 'system', sourceKey: 'servants_total', manualValue: '' },
  };
}

export function buildDefaultSocialLinks() {
  return LANDING_SOCIAL_PLATFORMS.map((platform) => ({
    platform,
    enabled: false,
    url: '',
    handle: '',
  }));
}

export function getLocalizedValue(value, language, fallbackLanguage = 'en', fallback = '') {
  if (isPlainObject(value)) {
    const preferred = value?.[language];
    if (typeof preferred === 'string' && preferred.trim()) return preferred;
    const fallbackValue = value?.[fallbackLanguage];
    if (typeof fallbackValue === 'string' && fallbackValue.trim()) return fallbackValue;
    return fallback;
  }

  return typeof value === 'string' ? value : fallback;
}

export function buildDefaultLandingEditorState() {
  return {
    texts: getDefaultLandingTextState(),
    stats: buildDefaultStatSettings(),
    priests: [],
    location: {
      placeName: '',
      plusCode: '',
      addressLine: '',
      mapEmbedUrl: '',
      directionsUrl: '',
    },
    socialLinks: buildDefaultSocialLinks(),
    heroImage: null,
    updatedAt: null,
  };
}

