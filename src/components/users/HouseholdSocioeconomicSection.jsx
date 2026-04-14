import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/endpoints';
import Input from '../ui/Input';
import CreatableComboboxInput from '../ui/CreatableComboboxInput';
import CreatableTagComboboxInput from '../ui/CreatableTagComboboxInput';
import Select from '../ui/Select';
import TextArea from '../ui/TextArea';
import { useI18n } from '../../i18n/i18n';
import {
  getEmploymentStatusOptions,
  getPresenceStatusOptions,
} from '../../constants/householdProfiles';

export const SOCIOECONOMIC_DEFAULTS = {
  monthlyIncome: '',
  incomeSource: '',
  incomeNotes: '',
  employmentStatus: '',
  jobTitle: '',
  employerName: '',
  employmentNotes: '',
  presenceStatus: 'present',
  travelDestination: '',
  travelReason: '',
  healthConditions: [],
};

const COPY = {
  en: {
    title: 'Socioeconomic and health profile',
    subtitle:
      'Capture income, work, travel, and health details so household rules can evaluate real conditions.',
    financialTitle: 'Income',
    employmentTitle: 'Employment',
    presenceTitle: 'Presence and travel',
    healthTitle: 'Health conditions',
    monthlyIncome: 'Monthly income',
    monthlyIncomeHint: 'Use the individual member income in EGP.',
    incomeSource: 'Income source',
    incomeNotes: 'Income notes',
    employmentStatus: 'Employment status',
    jobTitle: 'Job title',
    employerName: 'Employer name',
    employmentNotes: 'Employment notes',
    presenceStatus: 'Presence status',
    travelDestination: 'Travel destination',
    travelReason: 'Travel reason',
    healthConditions: 'Diseases and health conditions',
    healthConditionsHint:
      'Add one disease or condition at a time. These values can be used in household classification rules.',
  },
  ar: {
    title: 'الملف الاقتصادي والصحي',
    subtitle:
      'سجل بيانات الدخل والعمل والسفر والحالة الصحية حتى تعتمد عليها قواعد تصنيف الأسر بشكل صحيح.',
    financialTitle: 'الدخل',
    employmentTitle: 'العمل',
    presenceTitle: 'التواجد والسفر',
    healthTitle: 'الحالة الصحية',
    monthlyIncome: 'الدخل الشهري',
    monthlyIncomeHint: 'استخدم دخل الفرد الشهري بالجنيه المصري.',
    incomeSource: 'مصدر الدخل',
    incomeNotes: 'ملاحظات عن الدخل',
    employmentStatus: 'حالة العمل',
    jobTitle: 'المهنة',
    employerName: 'جهة العمل',
    employmentNotes: 'ملاحظات عن العمل',
    presenceStatus: 'حالة التواجد',
    travelDestination: 'جهة السفر',
    travelReason: 'سبب السفر',
    healthConditions: 'الأمراض والحالات الصحية',
    healthConditionsHint:
      'أضف كل مرض أو حالة على حدة. يمكن استخدام هذه القيم داخل قواعد تصنيف الأسر.',
  },
};

function cleanString(value) {
  const trimmed = String(value || '').trim();
  return trimmed || '';
}

function normalizeOptionValues(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(cleanString)
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function buildSectionLabel(label) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

export function getSocioeconomicInitialValues() {
  return { ...SOCIOECONOMIC_DEFAULTS };
}

export function mapUserToSocioeconomicForm(user = {}) {
  return {
    monthlyIncome:
      user?.financial?.monthlyIncome == null ? '' : String(user.financial.monthlyIncome),
    incomeSource: user?.financial?.source || '',
    incomeNotes: user?.financial?.notes || '',
    employmentStatus: user?.employment?.status || '',
    jobTitle: user?.employment?.jobTitle || '',
    employerName: user?.employment?.employerName || '',
    employmentNotes: user?.employment?.notes || '',
    presenceStatus: user?.presence?.status || 'present',
    travelDestination: user?.presence?.travelDestination || '',
    travelReason: user?.presence?.travelReason || '',
    healthConditions: Array.isArray(user?.health?.conditions)
      ? user.health.conditions
          .map((condition) => cleanString(condition?.name))
          .filter(Boolean)
      : [],
  };
}

export function buildSocioeconomicPayload(form, { includeNulls = false } = {}) {
  const payload = {};
  const hasFinancialData =
    cleanString(form.monthlyIncome) ||
    cleanString(form.incomeSource) ||
    cleanString(form.incomeNotes);

  if (hasFinancialData) {
    payload.financial = {
      currency: 'EGP',
    };
    if (cleanString(form.monthlyIncome)) {
      payload.financial.monthlyIncome = Number(form.monthlyIncome);
    }
    if (cleanString(form.incomeSource)) payload.financial.source = cleanString(form.incomeSource);
    if (cleanString(form.incomeNotes)) payload.financial.notes = cleanString(form.incomeNotes);
  } else if (includeNulls) {
    payload.financial = null;
  }

  const hasEmploymentData =
    cleanString(form.employmentStatus) ||
    cleanString(form.jobTitle) ||
    cleanString(form.employerName) ||
    cleanString(form.employmentNotes);

  if (hasEmploymentData) {
    payload.employment = {};
    if (cleanString(form.employmentStatus)) {
      payload.employment.status = cleanString(form.employmentStatus);
    }
    if (cleanString(form.jobTitle)) payload.employment.jobTitle = cleanString(form.jobTitle);
    if (cleanString(form.employerName)) {
      payload.employment.employerName = cleanString(form.employerName);
    }
    if (cleanString(form.employmentNotes)) {
      payload.employment.notes = cleanString(form.employmentNotes);
    }
  } else if (includeNulls) {
    payload.employment = null;
  }

  const isTraveling = cleanString(form.presenceStatus) === 'traveling';
  const hasPresenceData =
    isTraveling ||
    cleanString(form.travelDestination) ||
    cleanString(form.travelReason);

  if (hasPresenceData) {
    payload.presence = {
      status: isTraveling ? 'traveling' : 'present',
    };
    if (isTraveling && cleanString(form.travelDestination)) {
      payload.presence.travelDestination = cleanString(form.travelDestination);
    }
    if (isTraveling && cleanString(form.travelReason)) {
      payload.presence.travelReason = cleanString(form.travelReason);
    }
  } else if (includeNulls) {
    payload.presence = null;
  }

  const healthConditions = [...new Set((form.healthConditions || []).map(cleanString).filter(Boolean))];
  if (healthConditions.length > 0) {
    payload.health = {
      conditions: healthConditions.map((name) => ({
        name,
      })),
    };
  } else if (includeNulls) {
    payload.health = null;
  }

  return payload;
}

export default function HouseholdSocioeconomicSection({ form, errors = {}, onChange }) {
  const { language } = useI18n();
  const copy = COPY[language === 'ar' ? 'ar' : 'en'];
  const employmentStatusOptions = getEmploymentStatusOptions(language);
  const presenceStatusOptions = getPresenceStatusOptions(language);
  const isTraveling = form.presenceStatus === 'traveling';
  const { data: profileOptionValuesResponse } = useQuery({
    queryKey: ['users', 'profile-option-values'],
    queryFn: async () => {
      const { data } = await usersApi.getProfileOptionValues();
      return data?.data ?? {};
    },
    staleTime: 60000,
  });
  const profileOptionValues = useMemo(
    () => ({
      incomeSources: normalizeOptionValues(profileOptionValuesResponse?.incomeSources),
      jobTitles: normalizeOptionValues(profileOptionValuesResponse?.jobTitles),
      employerNames: normalizeOptionValues(profileOptionValuesResponse?.employerNames),
      travelDestinations: normalizeOptionValues(profileOptionValuesResponse?.travelDestinations),
      travelReasons: normalizeOptionValues(profileOptionValuesResponse?.travelReasons),
      healthConditions: normalizeOptionValues(profileOptionValuesResponse?.healthConditions),
    }),
    [profileOptionValuesResponse]
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
        <p className="text-sm font-semibold text-heading">{copy.title}</p>
        <p className="mt-1 text-xs text-muted">{copy.subtitle}</p>
      </div>

      <div className="space-y-3">
        {buildSectionLabel(copy.financialTitle)}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={copy.monthlyIncome}
            type="number"
            min="0"
            value={form.monthlyIncome}
            onChange={(event) => onChange('monthlyIncome', event.target.value)}
            error={errors['financial.monthlyIncome']}
            hint={copy.monthlyIncomeHint}
            containerClassName="!mb-0"
          />
          <CreatableComboboxInput
            label={copy.incomeSource}
            options={profileOptionValues.incomeSources}
            value={form.incomeSource}
            onChange={(value) => onChange('incomeSource', value)}
            error={errors['financial.source']}
            containerClassName="!mb-0"
          />
          <div className="sm:col-span-2">
            <TextArea
              label={copy.incomeNotes}
              value={form.incomeNotes}
              onChange={(event) => onChange('incomeNotes', event.target.value)}
              error={errors['financial.notes']}
              containerClassName="!mb-0"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {buildSectionLabel(copy.employmentTitle)}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label={copy.employmentStatus}
            options={employmentStatusOptions}
            value={form.employmentStatus}
            onChange={(event) => onChange('employmentStatus', event.target.value)}
            error={errors['employment.status']}
            containerClassName="!mb-0"
          />
          <CreatableComboboxInput
            label={copy.jobTitle}
            options={profileOptionValues.jobTitles}
            value={form.jobTitle}
            onChange={(value) => onChange('jobTitle', value)}
            error={errors['employment.jobTitle']}
            containerClassName="!mb-0"
          />
          <CreatableComboboxInput
            label={copy.employerName}
            options={profileOptionValues.employerNames}
            value={form.employerName}
            onChange={(value) => onChange('employerName', value)}
            error={errors['employment.employerName']}
            containerClassName="!mb-0"
          />
          <div className="sm:col-span-2">
            <TextArea
              label={copy.employmentNotes}
              value={form.employmentNotes}
              onChange={(event) => onChange('employmentNotes', event.target.value)}
              error={errors['employment.notes']}
              containerClassName="!mb-0"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {buildSectionLabel(copy.presenceTitle)}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label={copy.presenceStatus}
            options={presenceStatusOptions}
            value={form.presenceStatus}
            onChange={(event) => onChange('presenceStatus', event.target.value)}
            error={errors['presence.status']}
            containerClassName="!mb-0"
          />
          {isTraveling ? (
            <>
              <CreatableComboboxInput
                label={copy.travelDestination}
                options={profileOptionValues.travelDestinations}
                value={form.travelDestination}
                onChange={(value) => onChange('travelDestination', value)}
                error={errors['presence.travelDestination']}
                containerClassName="!mb-0"
              />
              <CreatableComboboxInput
                label={copy.travelReason}
                options={profileOptionValues.travelReasons}
                value={form.travelReason}
                onChange={(value) => onChange('travelReason', value)}
                error={errors['presence.travelReason']}
                containerClassName="!mb-0"
              />
            </>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {buildSectionLabel(copy.healthTitle)}
        <CreatableTagComboboxInput
          label={copy.healthConditions}
          values={form.healthConditions}
          onChange={(next) => onChange('healthConditions', next)}
          error={errors['health.conditions']}
          hint={copy.healthConditionsHint}
          suggestions={profileOptionValues.healthConditions}
          containerClassName="!mb-0"
        />
      </div>
    </div>
  );
}
