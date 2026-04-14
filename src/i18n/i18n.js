import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations';

export const LANGUAGE_STORAGE_KEY = 'app_language';
export const DEFAULT_LANGUAGE = 'ar';
export const SUPPORTED_LANGUAGES = ['en', 'ar'];

function normalizeLanguage(language) {
  if (!language) return DEFAULT_LANGUAGE;
  const short = String(language).toLowerCase().slice(0, 2);
  return SUPPORTED_LANGUAGES.includes(short) ? short : DEFAULT_LANGUAGE;
}

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function interpolate(template, values = {}) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = values[key];
    return value == null ? `{${key}}` : String(value);
  });
}

export function isRtlLanguage(language) {
  return normalizeLanguage(language) === 'ar';
}

export function getLanguageLocale(language) {
  return normalizeLanguage(language) === 'ar' ? 'ar-EG' : 'en-US';
}

export function getStoredLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored) return normalizeLanguage(stored);
  return DEFAULT_LANGUAGE;
}

export function applyDocumentLanguage(language) {
  if (typeof document === 'undefined') return;
  const normalized = normalizeLanguage(language);
  document.documentElement.setAttribute('lang', normalized);
  document.documentElement.setAttribute('dir', isRtlLanguage(normalized) ? 'rtl' : 'ltr');
}

export function getCurrentLanguage() {
  if (typeof document === 'undefined') return DEFAULT_LANGUAGE;
  return normalizeLanguage(document.documentElement.getAttribute('lang'));
}

export function getCurrentLocale() {
  return getLanguageLocale(getCurrentLanguage());
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getStoredLanguage);

  useEffect(() => {
    applyDocumentLanguage(language);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  }, [language]);

  const setLanguage = useCallback((nextLanguage) => {
    setLanguageState(normalizeLanguage(nextLanguage));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => (current === 'ar' ? 'en' : 'ar'));
  }, []);

  const t = useCallback(
    (key, values) => {
      const localizedValue = getByPath(translations[language], key);
      const fallbackValue = getByPath(translations.en, key);
      const template = localizedValue ?? fallbackValue ?? key;
      return interpolate(template, values);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      dir: isRtlLanguage(language) ? 'rtl' : 'ltr',
      isRTL: isRtlLanguage(language),
      t,
    }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
