import { useLayoutEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import SiteAnalyticsBridge from '../analytics/SiteAnalyticsBridge';
import { useI18n } from '../i18n/i18n';
import { buildDocumentTitle, resolveRoutePageTitle } from './routeTitles';

export default function AppRouteEffects() {
  const location = useLocation();
  const { language, t } = useI18n();

  const pageTitle = useMemo(
    () => resolveRoutePageTitle(location.pathname, t, language),
    [location.pathname, t, language]
  );

  const documentTitle = useMemo(
    () => buildDocumentTitle(pageTitle, t, language),
    [pageTitle, t, language]
  );

  useLayoutEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  return <SiteAnalyticsBridge title={pageTitle} />;
}
