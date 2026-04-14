import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/endpoints';
import CreatableComboboxInput from '../ui/CreatableComboboxInput';
import Select from '../ui/Select';
import { useI18n } from '../../i18n/i18n';
import {
  getEducationStageMeta,
  getEducationStageOptions,
} from '../../constants/education';

export const EDUCATION_DEFAULTS = {
  educationStage: '',
  fieldOfStudy: '',
  kindergartenName: '',
  schoolName: '',
  universityName: '',
  facultyName: '',
};

const COPY = {
  en: {
    title: 'Education',
    subtitle:
      'Track the current educational stage and save schools, universities, faculties, and study fields so they can be reused later.',
    stage: 'Educational stage',
    stagePlaceholder: 'Select educational stage',
    fieldOfStudy: 'Field of study',
    kindergartenName: 'Kindergarten name',
    schoolName: 'School name',
    universityName: 'University name',
    facultyName: 'Faculty name',
  },
  ar: {
    title: 'التعليم',
    subtitle:
      'سجل المرحلة التعليمية الحالية واحفظ المدارس والجامعات والكليات والتخصصات لتظهر لاحقًا بدون تكرار.',
    stage: 'المرحلة التعليمية',
    stagePlaceholder: 'اختر المرحلة التعليمية',
    fieldOfStudy: 'مجال الدراسة',
    kindergartenName: 'اسم الحضانة',
    schoolName: 'اسم المدرسة',
    universityName: 'اسم الجامعة',
    facultyName: 'اسم الكلية',
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

export function getEducationInitialValues() {
  return { ...EDUCATION_DEFAULTS };
}

export function mapUserToEducationForm(user = {}) {
  return {
    educationStage: user?.education?.stage || '',
    fieldOfStudy: user?.education?.fieldOfStudy || '',
    kindergartenName: user?.education?.kindergartenName || '',
    schoolName: user?.education?.schoolName || '',
    universityName: user?.education?.universityName || '',
    facultyName: user?.education?.facultyName || '',
  };
}

export function buildEducationPayload(form) {
  const stage = cleanString(form.educationStage);
  const fieldOfStudy = cleanString(form.fieldOfStudy);
  const kindergartenName = cleanString(form.kindergartenName);
  const schoolName = cleanString(form.schoolName);
  const universityName = cleanString(form.universityName);
  const facultyName = cleanString(form.facultyName);
  const stageMeta = getEducationStageMeta(stage);

  const payload = {};

  if (stage) payload.stage = stage;
  if (fieldOfStudy) payload.fieldOfStudy = fieldOfStudy;
  if (stageMeta.isKindergarten && kindergartenName) payload.kindergartenName = kindergartenName;
  if (stageMeta.isSchool && schoolName) payload.schoolName = schoolName;
  if (stageMeta.isUniversity) {
    if (universityName) payload.universityName = universityName;
    if (facultyName) payload.facultyName = facultyName;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

export default function UserEducationSection({ form, errors = {}, onChange }) {
  const { language } = useI18n();
  const copy = COPY[language === 'ar' ? 'ar' : 'en'];
  const stageOptions = useMemo(() => getEducationStageOptions(language), [language]);
  const stageMeta = useMemo(() => getEducationStageMeta(form.educationStage), [form.educationStage]);
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
      fieldOfStudies: normalizeOptionValues(profileOptionValuesResponse?.fieldOfStudies),
      kindergartenNames: normalizeOptionValues(profileOptionValuesResponse?.kindergartenNames),
      schoolNames: normalizeOptionValues(profileOptionValuesResponse?.schoolNames),
      universityNames: normalizeOptionValues(profileOptionValuesResponse?.universityNames),
      facultyNames: normalizeOptionValues(profileOptionValuesResponse?.facultyNames),
    }),
    [profileOptionValuesResponse]
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
        <p className="text-sm font-semibold text-heading">{copy.title}</p>
        <p className="mt-1 text-xs text-muted">{copy.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label={copy.stage}
          options={stageOptions}
          placeholder={copy.stagePlaceholder}
          value={form.educationStage}
          onChange={(event) => onChange('educationStage', event.target.value)}
          error={errors['education.stage']}
          containerClassName="!mb-0"
        />
        <CreatableComboboxInput
          label={copy.fieldOfStudy}
          options={profileOptionValues.fieldOfStudies}
          value={form.fieldOfStudy}
          onChange={(value) => onChange('fieldOfStudy', value)}
          error={errors['education.fieldOfStudy']}
          containerClassName="!mb-0"
        />

        {stageMeta.isKindergarten ? (
          <CreatableComboboxInput
            label={copy.kindergartenName}
            options={profileOptionValues.kindergartenNames}
            value={form.kindergartenName}
            onChange={(value) => onChange('kindergartenName', value)}
            error={errors['education.kindergartenName']}
            containerClassName="!mb-0"
          />
        ) : null}

        {stageMeta.isSchool ? (
          <CreatableComboboxInput
            label={copy.schoolName}
            options={profileOptionValues.schoolNames}
            value={form.schoolName}
            onChange={(value) => onChange('schoolName', value)}
            error={errors['education.schoolName']}
            containerClassName="!mb-0"
          />
        ) : null}

        {stageMeta.isUniversity ? (
          <>
            <CreatableComboboxInput
              label={copy.universityName}
              options={profileOptionValues.universityNames}
              value={form.universityName}
              onChange={(value) => onChange('universityName', value)}
              error={errors['education.universityName']}
              containerClassName="!mb-0"
            />
            <CreatableComboboxInput
              label={copy.facultyName}
              options={profileOptionValues.facultyNames}
              value={form.facultyName}
              onChange={(value) => onChange('facultyName', value)}
              error={errors['education.facultyName']}
              containerClassName="!mb-0"
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
