import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  BriefcaseBusiness,
  Building2,
  HeartPulse,
  MapPin,
  Phone,
  Plane,
  ShieldPlus,
  UserRound,
} from 'lucide-react';
import { useI18n } from '../../i18n/i18n';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import {
  getEmploymentStatusLabel,
  getPresenceStatusLabel,
} from '../../constants/householdProfiles';
import { getGenderLabel } from '../../utils/formatters';
import {
  buildLookupQuery,
  FAMILY_HOUSE_DETAILS_PATH,
} from '../../pages/dashboard/users/familyHouseLookup.shared';

const EMPTY = '---';

const COPY = {
  en: {
    title: 'Socioeconomic and health details',
    subtitle:
      'Review the real household profile collected from member income, work, travel, health, and notes.',
    membersWithProfiles: 'Members with profile data',
    totalIncome: 'Total known income',
    averageIncome: 'Average known income',
    employedMembers: 'Employed members',
    travelingMembers: 'Traveling members',
    healthMembers: 'Members with health cases',
    familiesInHouse: 'Families in this house',
    housesInFamily: 'Houses in this family',
    incomeSources: 'Income sources',
    employmentBreakdown: 'Employment breakdown',
    presenceBreakdown: 'Presence and travel',
    healthBreakdown: 'Health conditions',
    travelDestinations: 'Travel destinations',
    noRelatedGroups: 'No related names found.',
    noIncomeSources: 'No income sources recorded.',
    noEmploymentData: 'No employment data recorded.',
    noPresenceData: 'No presence or travel data recorded.',
    noHealthData: 'No health conditions recorded.',
    memberProfilesTitle: 'Detailed member profiles',
    memberProfilesSubtitle:
      'Each card shows the member details that affect household classification and follow-up.',
    noMemberProfile: 'No socioeconomic or health details recorded for this member yet.',
    phone: 'Phone',
    address: 'Address',
    familyName: 'Family name',
    houseName: 'House name',
    monthlyIncome: 'Monthly income',
    incomeSource: 'Income source',
    employmentStatus: 'Employment status',
    jobEmployer: 'Job / employer',
    presenceStatus: 'Presence status',
    travelDestination: 'Travel destination',
    travelReason: 'Travel reason',
    healthConditions: 'Health conditions',
    notes: 'Notes',
    viewProfile: 'Open profile',
    familyLabel: 'Family',
    houseLabel: 'House',
    unknownData: 'Unspecified',
  },
  ar: {
    title: 'التفاصيل الاقتصادية والصحية',
    subtitle:
      'راجع صورة الأسرة الفعلية المجمعة من دخل الأفراد والعمل والسفر والحالة الصحية والملاحظات.',
    membersWithProfiles: 'أفراد لديهم بيانات تفصيلية',
    totalIncome: 'إجمالي الدخل المعروف',
    averageIncome: 'متوسط الدخل المعروف',
    employedMembers: 'الأفراد العاملون',
    travelingMembers: 'الأفراد المسافرون',
    healthMembers: 'أفراد لديهم حالات صحية',
    familiesInHouse: 'العائلات داخل هذا البيت',
    housesInFamily: 'البيوت داخل هذه العائلة',
    incomeSources: 'مصادر الدخل',
    employmentBreakdown: 'توزيع حالات العمل',
    presenceBreakdown: 'التواجد والسفر',
    healthBreakdown: 'الحالات الصحية',
    travelDestinations: 'جهات السفر',
    noRelatedGroups: 'لا توجد أسماء مرتبطة.',
    noIncomeSources: 'لا توجد مصادر دخل مسجلة.',
    noEmploymentData: 'لا توجد بيانات عمل مسجلة.',
    noPresenceData: 'لا توجد بيانات تواجد أو سفر مسجلة.',
    noHealthData: 'لا توجد حالات صحية مسجلة.',
    memberProfilesTitle: 'تفاصيل الأفراد',
    memberProfilesSubtitle:
      'كل بطاقة تعرض بيانات العضو التي تؤثر على تصنيف الأسرة والمتابعة.',
    noMemberProfile: 'لا توجد بيانات اقتصادية أو صحية مسجلة لهذا العضو حتى الآن.',
    phone: 'رقم الهاتف',
    address: 'العنوان',
    familyName: 'اسم العائلة',
    houseName: 'اسم البيت',
    monthlyIncome: 'الدخل الشهري',
    incomeSource: 'مصدر الدخل',
    employmentStatus: 'حالة العمل',
    jobEmployer: 'الوظيفة / جهة العمل',
    presenceStatus: 'حالة التواجد',
    travelDestination: 'جهة السفر',
    travelReason: 'سبب السفر',
    healthConditions: 'الحالات الصحية',
    notes: 'الملاحظات',
    viewProfile: 'فتح الملف',
    familyLabel: 'عائلة',
    houseLabel: 'بيت',
    unknownData: 'غير محدد',
  },
};

function trimValue(value) {
  return String(value || '').trim();
}

function getLocale(language) {
  return language === 'ar' ? 'ar' : 'en';
}

function buildCountList(values = []) {
  const map = new Map();

  values.forEach((value) => {
    const name = trimValue(value);
    if (!name) return;

    const key = name.toLocaleLowerCase();
    const current = map.get(key);

    if (current) {
      current.count += 1;
      return;
    }

    map.set(key, { name, count: 1 });
  });

  return [...map.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

function getHealthConditions(member) {
  if (!Array.isArray(member?.health?.conditions)) return [];

  return member.health.conditions
    .map((condition) => trimValue(condition?.name))
    .filter(Boolean);
}

function getCombinedNotes(member) {
  const notes = [
    trimValue(member?.notes),
    trimValue(member?.financial?.notes),
    trimValue(member?.employment?.notes),
  ].filter(Boolean);

  return [...new Set(notes)];
}

function buildAddress(member) {
  return (
    [
      trimValue(member?.address?.governorate),
      trimValue(member?.address?.city),
      trimValue(member?.address?.street),
      trimValue(member?.address?.details),
    ]
      .filter(Boolean)
      .join(', ') || ''
  );
}

function hasDetailedProfile(member) {
  const hasIncome =
    member?.financial?.monthlyIncome != null ||
    trimValue(member?.financial?.source) ||
    trimValue(member?.financial?.notes);
  const hasEmployment =
    trimValue(member?.employment?.status) ||
    trimValue(member?.employment?.jobTitle) ||
    trimValue(member?.employment?.employerName) ||
    trimValue(member?.employment?.notes);
  const hasPresence =
    trimValue(member?.presence?.status) === 'traveling' ||
    trimValue(member?.presence?.travelDestination) ||
    trimValue(member?.presence?.travelReason);

  return Boolean(
    hasIncome ||
    hasEmployment ||
    hasPresence ||
    getHealthConditions(member).length > 0 ||
    getCombinedNotes(member).length > 0
  );
}

function formatCurrencyValue(value, language = 'en') {
  if (value == null || value === '') return EMPTY;

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);

  try {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(numericValue);
  } catch {
    return `${numericValue} EGP`;
  }
}

function getInitial(name) {
  const value = trimValue(name);
  return value ? value.charAt(0).toUpperCase() : 'U';
}

function buildProfileSummary(members, lookupType, language) {
  let totalIncome = 0;
  let membersWithIncome = 0;
  let membersWithProfiles = 0;
  let employedMembers = 0;
  let travelingMembers = 0;
  let healthMembers = 0;

  members.forEach((member) => {
    const monthlyIncome = member?.financial?.monthlyIncome;
    if (monthlyIncome != null && monthlyIncome !== '' && !Number.isNaN(Number(monthlyIncome))) {
      totalIncome += Number(monthlyIncome);
      membersWithIncome += 1;
    }

    if (member?.employment?.status === 'employed') {
      employedMembers += 1;
    }

    if (member?.presence?.status === 'traveling') {
      travelingMembers += 1;
    }

    if (getHealthConditions(member).length > 0) {
      healthMembers += 1;
    }

    if (hasDetailedProfile(member)) {
      membersWithProfiles += 1;
    }
  });

  const relatedField = lookupType === 'houseName' ? 'familyName' : 'houseName';

  return {
    totalIncome,
    membersWithIncome,
    averageIncome: membersWithIncome > 0 ? totalIncome / membersWithIncome : null,
    membersWithProfiles,
    employedMembers,
    travelingMembers,
    healthMembers,
    relatedGroups: buildCountList(members.map((member) => member?.[relatedField])),
    incomeSources: buildCountList(members.map((member) => member?.financial?.source)),
    employmentBreakdown: buildCountList(
      members.map((member) =>
        member?.employment?.status
          ? getEmploymentStatusLabel(member.employment.status, language)
          : ''
      )
    ),
    presenceBreakdown: buildCountList(
      members.map((member) =>
        member?.presence?.status
          ? getPresenceStatusLabel(member.presence.status, language)
          : ''
      )
    ),
    travelDestinations: buildCountList(
      members.map((member) =>
        member?.presence?.status === 'traveling' ? member?.presence?.travelDestination : ''
      )
    ),
    healthConditions: buildCountList(members.flatMap(getHealthConditions)),
  };
}

export default function FamilyHouseProfileInsights({
  members = [],
  lookupType = 'houseName',
  lookupName = '',
  loading = false,
  renderMemberActions,
}) {
  const { language } = useI18n();
  const locale = getLocale(language);
  const copy = COPY[locale];
  const profileSummary = useMemo(
    () => buildProfileSummary(members, lookupType, language),
    [language, lookupType, members]
  );

  if (!trimValue(lookupName)) return null;

  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-heading">{copy.title}</h2>
            <p className="mt-1 text-sm text-muted">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={lookupType === 'houseName' ? 'primary' : 'secondary'}>
              {lookupType === 'houseName' ? copy.houseLabel : copy.familyLabel}
            </Badge>
            <Badge>{lookupName}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          <SummaryStat
            icon={ShieldPlus}
            label={copy.membersWithProfiles}
            value={profileSummary.membersWithProfiles}
          />
          <SummaryStat
            icon={Banknote}
            label={copy.totalIncome}
            value={
              profileSummary.membersWithIncome > 0
                ? formatCurrencyValue(profileSummary.totalIncome, language)
                : EMPTY
            }
          />
          <SummaryStat
            icon={Banknote}
            label={copy.averageIncome}
            value={
              profileSummary.averageIncome != null
                ? formatCurrencyValue(profileSummary.averageIncome, language)
                : EMPTY
            }
          />
          <SummaryStat
            icon={BriefcaseBusiness}
            label={copy.employedMembers}
            value={profileSummary.employedMembers}
          />
          <SummaryStat
            icon={Plane}
            label={copy.travelingMembers}
            value={profileSummary.travelingMembers}
          />
          <SummaryStat
            icon={HeartPulse}
            label={copy.healthMembers}
            value={profileSummary.healthMembers}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <DistributionCard
            icon={Building2}
            title={lookupType === 'houseName' ? copy.familiesInHouse : copy.housesInFamily}
            items={profileSummary.relatedGroups}
            emptyLabel={copy.noRelatedGroups}
            linkType={lookupType === 'houseName' ? 'familyName' : 'houseName'}
          />
          <DistributionCard
            icon={Banknote}
            title={copy.incomeSources}
            items={profileSummary.incomeSources}
            emptyLabel={copy.noIncomeSources}
          />
          <DistributionCard
            icon={BriefcaseBusiness}
            title={copy.employmentBreakdown}
            items={profileSummary.employmentBreakdown}
            emptyLabel={copy.noEmploymentData}
          />
          <DistributionCard
            icon={Plane}
            title={copy.presenceBreakdown}
            items={profileSummary.presenceBreakdown}
            emptyLabel={copy.noPresenceData}
            secondaryTitle={copy.travelDestinations}
            secondaryItems={profileSummary.travelDestinations}
          />
          <DistributionCard
            icon={HeartPulse}
            title={copy.healthBreakdown}
            items={profileSummary.healthConditions}
            emptyLabel={copy.noHealthData}
          />
        </div>
      </Card>

      <Card className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-heading">{copy.memberProfilesTitle}</h2>
          <p className="mt-1 text-sm text-muted">{copy.memberProfilesSubtitle}</p>
        </div>

        {loading && members.length === 0 ? (
          <p className="text-sm text-muted">...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted">{copy.noRelatedGroups}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            {members.map((member) => (
              <MemberProfileCard
                key={member?._id || member?.id || member?.fullName}
                member={member}
                copy={copy}
                language={language}
                actions={renderMemberActions?.(member)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value }) {
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

function DistributionCard({
  icon: Icon,
  title,
  items,
  emptyLabel,
  linkType,
  secondaryTitle,
  secondaryItems = [],
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-alt/30 p-4">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
        <h3 className="text-sm font-semibold text-heading">{title}</h3>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item) =>
            linkType ? (
              <Link
                key={`${linkType}-${item.name}`}
                to={`${FAMILY_HOUSE_DETAILS_PATH}?${buildLookupQuery(linkType, item.name)}`}
              >
                <Badge variant="primary">
                  {item.name} ({item.count})
                </Badge>
              </Link>
            ) : (
              <Badge key={item.name} variant="default">
                {item.name} ({item.count})
              </Badge>
            )
          )}
        </div>
      )}

      {secondaryTitle && secondaryItems.length > 0 ? (
        <div className="mt-4 border-t border-border/70 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {secondaryTitle}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {secondaryItems.map((item) => (
              <Badge key={`${secondaryTitle}-${item.name}`} variant="secondary">
                {item.name} ({item.count})
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MemberProfileCard({ member, copy, language, actions }) {
  const healthConditions = getHealthConditions(member);
  const notes = getCombinedNotes(member);
  const address = buildAddress(member);
  const userId = member?._id || member?.id;
  const detailItems = [
    {
      icon: Phone,
      label: copy.phone,
      value: trimValue(member?.phonePrimary) || trimValue(member?.whatsappNumber) || '',
      ltr: true,
    },
    {
      icon: MapPin,
      label: copy.address,
      value: address,
    },
    {
      icon: Banknote,
      label: copy.monthlyIncome,
      value:
        member?.financial?.monthlyIncome != null
          ? formatCurrencyValue(member.financial.monthlyIncome, language)
          : '',
    },
    {
      icon: Banknote,
      label: copy.incomeSource,
      value: trimValue(member?.financial?.source),
    },
    {
      icon: BriefcaseBusiness,
      label: copy.employmentStatus,
      value: member?.employment?.status
        ? getEmploymentStatusLabel(member.employment.status, language)
        : '',
    },
    {
      icon: BriefcaseBusiness,
      label: copy.jobEmployer,
      value:
        [trimValue(member?.employment?.jobTitle), trimValue(member?.employment?.employerName)]
          .filter(Boolean)
          .join(' / ') || '',
    },
    {
      icon: UserRound,
      label: copy.presenceStatus,
      value: member?.presence?.status
        ? getPresenceStatusLabel(member.presence.status, language)
        : '',
    },
    {
      icon: Plane,
      label: copy.travelDestination,
      value: trimValue(member?.presence?.travelDestination),
    },
    {
      icon: Plane,
      label: copy.travelReason,
      value: trimValue(member?.presence?.travelReason),
    },
  ].filter((item) => trimValue(item.value));

  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {member?.avatar?.url ? (
            <img
              src={member.avatar.url}
              alt=""
              className="h-11 w-11 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
              {getInitial(member?.fullName)}
            </div>
          )}

          <div>
            {userId ? (
              <Link
                to={`/dashboard/users/${userId}`}
                className="font-semibold text-heading hover:text-primary"
              >
                {member?.fullName || EMPTY}
              </Link>
            ) : (
              <p className="font-semibold text-heading">{member?.fullName || EMPTY}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {member?.familyName ? (
                <Badge variant="secondary">
                  {copy.familyName}: {member.familyName}
                </Badge>
              ) : null}
              {member?.houseName ? (
                <Badge variant="primary">
                  {copy.houseName}: {member.houseName}
                </Badge>
              ) : null}
              {member?.ageGroup ? <Badge>{member.ageGroup}</Badge> : null}
              {member?.gender ? <Badge>{getGenderLabel(member.gender)}</Badge> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {userId ? (
            <Link
              to={`/dashboard/users/${userId}`}
              className="text-xs font-semibold text-primary hover:text-primary/80"
            >
              {copy.viewProfile}
            </Link>
          ) : null}
        </div>
      </div>

      {detailItems.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {detailItems.map((item) => (
            <ProfileField
              key={`${member?._id || member?.fullName}-${item.label}`}
              icon={item.icon}
              label={item.label}
              value={item.value}
              ltr={item.ltr}
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">{copy.noMemberProfile}</p>
      )}

      {healthConditions.length > 0 ? (
        <div className="mt-4 border-t border-border/70 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {copy.healthConditions}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {healthConditions.map((condition) => (
              <Badge key={`${member?._id || member?.fullName}-${condition}`} variant="warning">
                {condition}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {notes.length > 0 ? (
        <div className="mt-4 rounded-xl border border-border/70 bg-surface-alt/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {copy.notes}
          </p>
          <div className="mt-2 space-y-1.5 text-sm text-heading">
            {notes.map((note) => (
              <p key={`${member?._id || member?.fullName}-note-${note}`}>{note}</p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProfileField({ icon: Icon, label, value, ltr = false }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon className="h-3.5 w-3.5 text-muted" /> : null}
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</p>
      </div>
      <p className={`mt-1 text-sm font-medium text-heading ${ltr ? 'direction-ltr text-left' : 'direction-rtl text-right'}`}>
        {value || EMPTY}
      </p>
    </div>
  );
}
