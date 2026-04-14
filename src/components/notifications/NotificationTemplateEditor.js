import { useMemo, useRef, useState } from 'react';
import { MousePointerClick } from 'lucide-react';

import Card, { CardHeader } from '../ui/Card';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import { getLanguageLocale } from '../../i18n/i18n';

function SettingsCard({ children, className = '', ...props }) {
  return (
    <Card
      padding={false}
      className={['min-w-0 rounded-2xl p-4 sm:p-6', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </Card>
  );
}

function extractTokenKey(token = '') {
  return String(token || '')
    .replace(/[{}]/g, '')
    .trim();
}

function getLocalizedValue(localizedValue, language, fallback = '') {
  return String(
    localizedValue?.[language]
      || localizedValue?.ar
      || localizedValue?.en
      || fallback
      || ''
  );
}

function formatSampleDateTime(language) {
  const locale = getLanguageLocale(language);
  const sampleDate = new Date('2026-04-08T18:30:00');

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(sampleDate);
}

function resolveFallbackSampleValue({ tokenKey, tokenLabel, language, t }) {
  const normalizedKey = String(tokenKey || '').trim().toLowerCase();

  if (!normalizedKey) {
    return t('platformSettingsPage.notifications.preview.sampleValues.generic');
  }

  if (
    normalizedKey.includes('date')
    || normalizedKey.includes('time')
    || normalizedKey.endsWith('at')
  ) {
    return formatSampleDateTime(language);
  }

  if (normalizedKey.includes('name')) {
    return t('platformSettingsPage.notifications.preview.sampleValues.personName');
  }

  if (
    normalizedKey.includes('type')
    || normalizedKey.includes('category')
    || normalizedKey.includes('service')
  ) {
    return t('platformSettingsPage.notifications.preview.sampleValues.sessionType');
  }

  if (
    normalizedKey.includes('count')
    || normalizedKey.includes('number')
    || normalizedKey.includes('total')
  ) {
    return '3';
  }

  if (normalizedKey.includes('link') || normalizedKey.includes('url')) {
    return 'https://church.example';
  }

  return tokenLabel || t('platformSettingsPage.notifications.preview.sampleValues.generic');
}

function renderPreviewText(value, language, tokenList, t) {
  return String(value || '').replace(/\{([^{}]+)\}/g, (_match, rawToken) => {
    const tokenKey = extractTokenKey(rawToken);
    const matchedToken = tokenList.find((tokenEntry) => extractTokenKey(tokenEntry?.token) === tokenKey);
    const label = getLocalizedValue(matchedToken?.label, language, tokenKey);
    const configuredSample = getLocalizedValue(matchedToken?.sampleValue, language, '');

    return configuredSample || resolveFallbackSampleValue({
      tokenKey,
      tokenLabel: label,
      language,
      t,
    });
  });
}

function insertValueAtSelection(currentValue, insertValue, targetElement) {
  const normalizedValue = String(currentValue || '');
  const start = typeof targetElement?.selectionStart === 'number'
    ? targetElement.selectionStart
    : normalizedValue.length;
  const end = typeof targetElement?.selectionEnd === 'number'
    ? targetElement.selectionEnd
    : normalizedValue.length;

  return {
    nextValue: `${normalizedValue.slice(0, start)}${insertValue}${normalizedValue.slice(end)}`,
    nextCaretPosition: start + insertValue.length,
  };
}

export default function NotificationTemplateEditor({
  t,
  language,
  sectionTitle,
  sectionSubtitle,
  template,
  tokenList = [],
  onFieldChange,
}) {
  const titleInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const [activeField, setActiveField] = useState('message');

  const previewTitle = useMemo(
    () => renderPreviewText(template?.title?.[language] || '', language, tokenList, t),
    [language, t, template?.title, tokenList]
  );
  const previewMessage = useMemo(
    () => renderPreviewText(template?.message?.[language] || '', language, tokenList, t),
    [language, t, template?.message, tokenList]
  );

  const handleInsertToken = (tokenValue) => {
    const safeTokenValue = String(tokenValue || '').trim();
    if (!safeTokenValue) return;

    const targetField = activeField === 'title' ? 'title' : 'message';
    const targetRef = targetField === 'title' ? titleInputRef : messageInputRef;
    const targetElement = targetRef.current;
    const currentValue = String(template?.[targetField]?.[language] || '');
    const { nextValue, nextCaretPosition } = insertValueAtSelection(
      currentValue,
      safeTokenValue,
      targetElement
    );

    onFieldChange(targetField, language, nextValue);

    requestAnimationFrame(() => {
      const refreshedTarget = targetRef.current;
      if (!refreshedTarget) return;
      refreshedTarget.focus();
      if (typeof refreshedTarget.setSelectionRange === 'function') {
        refreshedTarget.setSelectionRange(nextCaretPosition, nextCaretPosition);
      }
    });
  };

  const activeFieldLabel = activeField === 'title'
    ? t('platformSettingsPage.notifications.fields.title')
    : t('platformSettingsPage.notifications.fields.message');

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <SettingsCard>
        <CardHeader title={sectionTitle} subtitle={sectionSubtitle} />

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface-alt/40 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MousePointerClick className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {t('platformSettingsPage.notifications.availableTokens')}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {t('platformSettingsPage.notifications.tokenInsertHint')}
                </p>
                <p className="mt-2 text-xs font-medium text-heading">
                  {t('platformSettingsPage.notifications.insertingInto', {
                    field: activeFieldLabel,
                  })}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {tokenList.map((tokenEntry) => {
                const tokenLabel = getLocalizedValue(
                  tokenEntry?.label,
                  language,
                  tokenEntry?.token || ''
                );

                return (
                  <button
                    key={tokenEntry.key || tokenEntry.token}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleInsertToken(tokenEntry.token)}
                    className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs text-heading transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <code className="font-semibold">{tokenEntry.token}</code>
                    <span className="ms-2 text-muted">{tokenLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            ref={titleInputRef}
            label={t('platformSettingsPage.notifications.fields.title')}
            value={template?.title?.[language] || ''}
            onChange={(event) => onFieldChange('title', language, event.target.value)}
            onFocus={() => setActiveField('title')}
            containerClassName="!mb-0"
          />

          <TextArea
            ref={messageInputRef}
            label={t('platformSettingsPage.notifications.fields.message')}
            value={template?.message?.[language] || ''}
            onChange={(event) => onFieldChange('message', language, event.target.value)}
            onFocus={() => setActiveField('message')}
            rows={5}
            hint={
              language === 'en'
                ? t('platformSettingsPage.notifications.fields.englishSyncHint')
                : t('platformSettingsPage.notifications.fields.templateHint')
            }
            containerClassName="!mb-0"
          />
        </div>
      </SettingsCard>

      <SettingsCard className="xl:sticky xl:top-24">
        <CardHeader
          title={t('platformSettingsPage.notifications.preview.title')}
          subtitle={t('platformSettingsPage.notifications.preview.subtitle')}
        />

          <div className="mt-4 rounded-[24px] border border-border/70 bg-surface/95 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-alt shadow-sm">
                <img
                  src="/logo192.png"
                  alt=""
                  className="h-7 w-7 rounded-xl object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-muted">{t('common.appName')}</span>
                </div>

                <h3 className="mt-2 text-sm font-semibold text-heading">
                  {previewTitle || t('platformSettingsPage.notifications.fields.title')}
                </h3>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                  {previewMessage || t('platformSettingsPage.notifications.fields.message')}
                </p>
              </div>
            </div>
          </div>
      </SettingsCard>
    </div>
  );
}
