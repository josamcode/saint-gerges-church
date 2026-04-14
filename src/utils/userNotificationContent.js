function normalizeLanguage(language) {
  return String(language || '').trim().toLowerCase() === 'en' ? 'en' : 'ar';
}

function pickLocalizedValue(localizedValue, language, fallback = '') {
  const normalizedLanguage = normalizeLanguage(language);

  return String(
    localizedValue?.[normalizedLanguage]
      || localizedValue?.ar
      || localizedValue?.en
      || fallback
      || ''
  );
}

export function getLocalizedUserNotificationContent(notification, language = 'ar') {
  const localizedContent = notification?.metadata?.localizedContent || {};

  return {
    title: pickLocalizedValue(localizedContent.title, language, notification?.title),
    message: pickLocalizedValue(localizedContent.message, language, notification?.message),
  };
}
