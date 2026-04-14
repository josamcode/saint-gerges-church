import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { landingContentApi } from '../api/endpoints';
import { useI18n } from '../i18n/i18n';
import { deepMerge, getByPath, getDefaultLandingTextState } from '../utils/landingContent';

function interpolateTemplate(template, values = {}) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = values[key];
    return value == null ? `{${key}}` : String(value);
  });
}

export function useLandingPublicContent() {
  const { language, t } = useI18n();
  const defaultTexts = useMemo(() => getDefaultLandingTextState(), []);

  const query = useQuery({
    queryKey: ['landing-content', 'public'],
    queryFn: async () => {
      const { data } = await landingContentApi.getPublic();
      return data?.data || null;
    },
    staleTime: 60000,
  });

  const texts = useMemo(() => {
    const remoteTexts = query.data?.texts || {};
    return {
      en: deepMerge(defaultTexts.en, remoteTexts.en || {}),
      ar: deepMerge(defaultTexts.ar, remoteTexts.ar || {}),
    };
  }, [defaultTexts, query.data?.texts]);

  const text = useCallback(
    (path, values = {}) => {
      const localized = getByPath(texts?.[language], path);
      const fallback = getByPath(texts?.en, path);
      const template = localized ?? fallback;
      if (typeof template === 'string') {
        return interpolateTemplate(template, values);
      }
      return t(path, values);
    },
    [language, t, texts]
  );

  const getOptionalText = useCallback(
    (path, fallback = '') => {
      const localized = getByPath(texts?.[language], path);
      const fallbackValue = getByPath(texts?.en, path);
      return typeof localized === 'string'
        ? localized
        : typeof fallbackValue === 'string'
          ? fallbackValue
          : fallback;
    },
    [language, texts]
  );

  return {
    query,
    content: query.data,
    texts,
    text,
    getOptionalText,
    heroImage: query.data?.heroImage || null,
    heroImageUrl: query.data?.heroImage?.url || '',
    priests: Array.isArray(query.data?.priests) ? query.data.priests : [],
    stats: Array.isArray(query.data?.stats?.items) ? query.data.stats.items : [],
    location: query.data?.location || {},
    socialLinks: Array.isArray(query.data?.socialLinks) ? query.data.socialLinks : [],
  };
}
