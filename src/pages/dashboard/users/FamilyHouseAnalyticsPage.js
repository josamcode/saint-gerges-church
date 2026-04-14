import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, BarChart3, Building2, Home, Search, Users as UsersIcon } from 'lucide-react';
import { usersApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useI18n } from '../../../i18n/i18n';
import Badge from '../../../components/ui/Badge';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import PageHeader from '../../../components/ui/PageHeader';
import Select from '../../../components/ui/Select';
import {
  FAMILY_HOUSE_DETAILS_PATH,
  RANK_LIMIT,
  buildLookupQuery,
  buildNamedCountList,
  fetchUsersWithPagination,
  normalizeText,
} from './familyHouseLookup.shared';

export default function FamilyHouseAnalyticsPage() {
  const { t, isRTL } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [lookupType, setLookupType] = useState('familyName');
  const [lookupName, setLookupName] = useState('');
  const [lookupDropdownOpen, setLookupDropdownOpen] = useState(false);
  const lookupInputRef = useRef(null);

  const isFamilyLookup = lookupType === 'familyName';
  const normalizedLookupName = normalizeText(lookupName);
  const trimmedLookupName = lookupName.trim();

  const detailsHref = trimmedLookupName
    ? `${FAMILY_HOUSE_DETAILS_PATH}?${buildLookupQuery(lookupType, trimmedLookupName)}`
    : null;

  const { data: lookupNamesResponse, isLoading: lookupNamesLoading } = useQuery({
    queryKey: ['users', isFamilyLookup ? 'family-names' : 'house-names'],
    queryFn: async () => {
      const { data } = isFamilyLookup
        ? await usersApi.getFamilyNames()
        : await usersApi.getHouseNames();
      return data?.data ?? [];
    },
    staleTime: 60000,
  });

  const {
    data: directoryUsersResponse,
    isLoading: directoryUsersLoading,
    error: directoryUsersError,
  } = useQuery({
    queryKey: ['users', 'family-house-lookup-directory'],
    queryFn: async () => fetchUsersWithPagination(),
    staleTime: 60000,
  });

  const lookupNames = useMemo(
    () => (Array.isArray(lookupNamesResponse) ? lookupNamesResponse : []),
    [lookupNamesResponse]
  );

  const filteredLookupNames = useMemo(() => {
    if (!normalizedLookupName) return lookupNames.slice(0, 20);
    return lookupNames
      .filter((name) => normalizeText(name).includes(normalizedLookupName))
      .slice(0, 20);
  }, [lookupNames, normalizedLookupName]);

  const directoryUsers = useMemo(
    () => (Array.isArray(directoryUsersResponse) ? directoryUsersResponse : []),
    [directoryUsersResponse]
  );

  const directoryFamilyRanks = useMemo(
    () => buildNamedCountList(directoryUsers, 'familyName'),
    [directoryUsers]
  );

  const directoryHouseRanks = useMemo(
    () => buildNamedCountList(directoryUsers, 'houseName'),
    [directoryUsers]
  );

  const directoryLockedMembers = useMemo(
    () => directoryUsers.filter((member) => member.isLocked).length,
    [directoryUsers]
  );

  useEffect(() => {
    const urlLookupType = searchParams.get('lookupType');
    const urlLookupName = String(searchParams.get('lookupName') || '').trim();

    if (urlLookupType === 'houseName' || urlLookupType === 'familyName') {
      setLookupType(urlLookupType);
    }

    if (urlLookupName) {
      setLookupName(urlLookupName);
      setLookupDropdownOpen(false);
    }
  }, [searchParams]);

  const directoryErrorMessage = directoryUsersError
    ? normalizeApiError(directoryUsersError).message
    : null;

  const handleClear = () => {
    setLookupName('');
    setLookupDropdownOpen(false);
  };

  const handleOpenDetails = () => {
    if (!detailsHref) return;
    navigate(detailsHref);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('shared.users'), href: '/dashboard/users' },
          { label: t('familyHouseLookup.analyticsPage.page') },
        ]}
      />

      <PageHeader
        title={t('familyHouseLookup.analyticsPage.title')}
        subtitle={t('familyHouseLookup.analyticsPage.subtitle')}
        className="border-b border-border pb-6"
      />

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-heading">
            {t('familyHouseLookup.analyticsPage.openDetailsTitle')}
          </h2>
          <Badge variant={isFamilyLookup ? 'primary' : 'secondary'}>
            {t(
              isFamilyLookup
                ? 'familyHouseLookup.filters.familyName'
                : 'familyHouseLookup.filters.houseName'
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
          <Select
            label={t('familyHouseLookup.filters.searchType')}
            value={lookupType}
            onChange={(event) => {
              setLookupType(event.target.value);
              setLookupName('');
              setLookupDropdownOpen(false);
            }}
            options={[
              {
                value: 'familyName',
                label: t('familyHouseLookup.filters.familyName'),
              },
              {
                value: 'houseName',
                label: t('familyHouseLookup.filters.houseName'),
              },
            ]}
            containerClassName="!mb-0"
          />

          <div className="relative">
            <label className="block text-sm font-medium text-base mb-1.5">
              {t('familyHouseLookup.filters.lookupName')}
            </label>
            <div className="relative">
              <Search
                className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none ${isRTL ? 'right-3' : 'left-3'
                  }`}
              />
              <input
                ref={lookupInputRef}
                type="text"
                value={lookupName}
                onChange={(event) => {
                  setLookupName(event.target.value);
                  setLookupDropdownOpen(true);
                }}
                onFocus={() => setLookupDropdownOpen(true)}
                onBlur={() => setTimeout(() => setLookupDropdownOpen(false), 150)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleOpenDetails();
                  }
                }}
                placeholder={t(
                  isFamilyLookup
                    ? 'familyHouseLookup.filters.familyNamePlaceholder'
                    : 'familyHouseLookup.filters.houseNamePlaceholder'
                )}
                className={`input-base w-full ${isRTL ? 'pr-10' : 'pl-10'}`}
              />
            </div>
            {lookupDropdownOpen && (
              <ul
                className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border border-border shadow-lg py-1"
                style={{ backgroundColor: 'var(--color-surface, #ffffff)' }}
                role="listbox"
              >
                {lookupNamesLoading ? (
                  <li className="px-3 py-2 text-sm text-muted">
                    {t('familyHouseLookup.filters.loadingNames')}
                  </li>
                ) : filteredLookupNames.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted">{t('common.search.noResults')}</li>
                ) : (
                  filteredLookupNames.map((name) => (
                    <li
                      key={name}
                      role="option"
                      aria-selected={lookupName === name}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-muted focus:bg-muted"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setLookupName(name);
                        setLookupDropdownOpen(false);
                      }}
                    >
                      {name}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          <div className={`flex items-end gap-2 ${isRTL ? 'lg:justify-start' : 'lg:justify-end'}`}>
            {(lookupName || normalizedLookupName) && (
              <Button variant="ghost" onClick={handleClear}>
                {t('familyHouseLookup.filters.clear')}
              </Button>
            )}
            <Button
              onClick={handleOpenDetails}
              icon={ArrowUpRight}
              iconPosition="end"
              disabled={!detailsHref}
            >
              {t('familyHouseLookup.analyticsPage.openDetailsAction')}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-heading">
            {t('familyHouseLookup.analytics.globalTitle')}
          </h2>
          <Badge variant="secondary">{t('familyHouseLookup.analytics.globalBadge')}</Badge>
        </div>

        {directoryErrorMessage ? (
          <EmptyState
            icon={UsersIcon}
            title={t('familyHouseLookup.empty.errorTitle')}
            description={directoryErrorMessage}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <SummaryItem
                icon={UsersIcon}
                label={t('familyHouseLookup.analytics.totalMembers')}
                value={directoryUsers.length}
              />
              <SummaryItem
                icon={Building2}
                label={t('familyHouseLookup.analytics.totalFamilies')}
                value={directoryFamilyRanks.length}
              />
              <SummaryItem
                icon={Home}
                label={t('familyHouseLookup.analytics.totalHouses')}
                value={directoryHouseRanks.length}
              />
              <SummaryItem
                icon={BarChart3}
                label={t('familyHouseLookup.summary.lockedCount')}
                value={directoryLockedMembers}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <RankedBars
                title={t('familyHouseLookup.analytics.biggestFamilies')}
                items={directoryFamilyRanks.slice(0, RANK_LIMIT)}
                loading={directoryUsersLoading}
                emptyLabel={t('familyHouseLookup.analytics.noFamilies')}
                linkType="familyName"
              />
              <RankedBars
                title={t('familyHouseLookup.analytics.biggestHouses')}
                items={directoryHouseRanks.slice(0, RANK_LIMIT)}
                loading={directoryUsersLoading}
                emptyLabel={t('familyHouseLookup.analytics.noHouses')}
                linkType="houseName"
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function SummaryItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-border bg-surface-alt/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        {Icon ? <Icon className="h-3.5 w-3.5 text-muted" /> : null}
      </div>
      <p className="mt-1 text-lg font-semibold text-heading">{value || 0}</p>
    </div>
  );
}

function RankedBars({ title, items, loading, emptyLabel, linkType }) {
  const maxValue = Math.max(...items.map((item) => item.count || 0), 1);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-heading">{title}</h3>
      {loading ? (
        <p className="mt-3 text-sm text-muted">...</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const width = Math.max((item.count / maxValue) * 100, 4);
            return (
              <div key={`${item.name}-${item.count}`}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  {linkType ? (
                    <Link
                      to={`${FAMILY_HOUSE_DETAILS_PATH}?${buildLookupQuery(linkType, item.name)}`}
                      className="truncate text-xs font-semibold text-heading hover:text-primary"
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <span className="truncate text-xs font-semibold text-heading">{item.name}</span>
                  )}
                  <Badge variant="primary">{item.count}</Badge>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
