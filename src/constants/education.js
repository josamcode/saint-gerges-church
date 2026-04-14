const EDUCATION_STAGE_DEFINITIONS = [
  {
    value: 'kindergarten_kg1',
    group: 'kindergarten',
    context: 'kindergarten',
    labels: { en: 'KG1', ar: 'KG1' },
  },
  {
    value: 'kindergarten_kg2',
    group: 'kindergarten',
    context: 'kindergarten',
    labels: { en: 'KG2', ar: 'KG2' },
  },
  {
    value: 'primary_grade_1',
    group: 'primary',
    context: 'school',
    labels: { en: 'Grade 1 Primary', ar: 'الصف الأول الابتدائي' },
  },
  {
    value: 'primary_grade_2',
    group: 'primary',
    context: 'school',
    labels: { en: 'Grade 2 Primary', ar: 'الصف الثاني الابتدائي' },
  },
  {
    value: 'primary_grade_3',
    group: 'primary',
    context: 'school',
    labels: { en: 'Grade 3 Primary', ar: 'الصف الثالث الابتدائي' },
  },
  {
    value: 'primary_grade_4',
    group: 'primary',
    context: 'school',
    labels: { en: 'Grade 4 Primary', ar: 'الصف الرابع الابتدائي' },
  },
  {
    value: 'primary_grade_5',
    group: 'primary',
    context: 'school',
    labels: { en: 'Grade 5 Primary', ar: 'الصف الخامس الابتدائي' },
  },
  {
    value: 'primary_grade_6',
    group: 'primary',
    context: 'school',
    labels: { en: 'Grade 6 Primary', ar: 'الصف السادس الابتدائي' },
  },
  {
    value: 'preparatory_grade_1',
    group: 'preparatory',
    context: 'school',
    labels: { en: 'Grade 1 Preparatory', ar: 'الصف الأول الإعدادي' },
  },
  {
    value: 'preparatory_grade_2',
    group: 'preparatory',
    context: 'school',
    labels: { en: 'Grade 2 Preparatory', ar: 'الصف الثاني الإعدادي' },
  },
  {
    value: 'preparatory_grade_3',
    group: 'preparatory',
    context: 'school',
    labels: { en: 'Grade 3 Preparatory', ar: 'الصف الثالث الإعدادي' },
  },
  {
    value: 'secondary_general_year_1',
    group: 'secondary_general',
    context: 'school',
    labels: { en: 'General Secondary Year 1', ar: 'الثانوي العام - السنة الأولى' },
  },
  {
    value: 'secondary_general_year_2',
    group: 'secondary_general',
    context: 'school',
    labels: { en: 'General Secondary Year 2', ar: 'الثانوي العام - السنة الثانية' },
  },
  {
    value: 'secondary_general_year_3',
    group: 'secondary_general',
    context: 'school',
    labels: { en: 'General Secondary Year 3', ar: 'الثانوي العام - السنة الثالثة' },
  },
  {
    value: 'secondary_technical_agriculture_year_1',
    group: 'secondary_technical',
    context: 'school',
    labels: { en: 'Agriculture Technical Year 1', ar: 'الثانوي الفني الزراعي - السنة الأولى' },
  },
  {
    value: 'secondary_technical_agriculture_year_2',
    group: 'secondary_technical',
    context: 'school',
    labels: { en: 'Agriculture Technical Year 2', ar: 'الثانوي الفني الزراعي - السنة الثانية' },
  },
  {
    value: 'secondary_technical_agriculture_year_3',
    group: 'secondary_technical',
    context: 'school',
    labels: { en: 'Agriculture Technical Year 3', ar: 'الثانوي الفني الزراعي - السنة الثالثة' },
  },
  {
    value: 'secondary_technical_industrial_year_1',
    group: 'secondary_technical',
    context: 'school',
    labels: { en: 'Industrial Technical Year 1', ar: 'الثانوي الفني الصناعي - السنة الأولى' },
  },
  {
    value: 'secondary_technical_industrial_year_2',
    group: 'secondary_technical',
    context: 'school',
    labels: { en: 'Industrial Technical Year 2', ar: 'الثانوي الفني الصناعي - السنة الثانية' },
  },
  {
    value: 'secondary_technical_industrial_year_3',
    group: 'secondary_technical',
    context: 'school',
    labels: { en: 'Industrial Technical Year 3', ar: 'الثانوي الفني الصناعي - السنة الثالثة' },
  },
  {
    value: 'secondary_technical_commercial_year_1',
    group: 'secondary_technical',
    context: 'school',
    labels: { en: 'Commercial Technical Year 1', ar: 'الثانوي الفني التجاري - السنة الأولى' },
  },
  {
    value: 'secondary_technical_commercial_year_2',
    group: 'secondary_technical',
    context: 'school',
    labels: { en: 'Commercial Technical Year 2', ar: 'الثانوي الفني التجاري - السنة الثانية' },
  },
  {
    value: 'secondary_technical_commercial_year_3',
    group: 'secondary_technical',
    context: 'school',
    labels: { en: 'Commercial Technical Year 3', ar: 'الثانوي الفني التجاري - السنة الثالثة' },
  },
  {
    value: 'secondary_technical_technical_arts_year_1',
    group: 'secondary_technical',
    context: 'school',
    labels: { en: 'Technical Arts Year 1', ar: 'الثانوي الفني للفنون الصناعية - السنة الأولى' },
  },
  {
    value: 'secondary_technical_technical_arts_year_2',
    group: 'secondary_technical',
    context: 'school',
    labels: { en: 'Technical Arts Year 2', ar: 'الثانوي الفني للفنون الصناعية - السنة الثانية' },
  },
  {
    value: 'secondary_technical_technical_arts_year_3',
    group: 'secondary_technical',
    context: 'school',
    labels: { en: 'Technical Arts Year 3', ar: 'الثانوي الفني للفنون الصناعية - السنة الثالثة' },
  },
  {
    value: 'finished_education',
    group: 'finished',
    context: 'finished',
    labels: { en: 'Finished Education', ar: 'منتهي التعليم' },
  },
  {
    value: 'university_year_1',
    group: 'university',
    context: 'university',
    labels: { en: 'University Year 1', ar: 'الجامعة - السنة الأولى' },
  },
  {
    value: 'university_year_2',
    group: 'university',
    context: 'university',
    labels: { en: 'University Year 2', ar: 'الجامعة - السنة الثانية' },
  },
  {
    value: 'university_year_3',
    group: 'university',
    context: 'university',
    labels: { en: 'University Year 3', ar: 'الجامعة - السنة الثالثة' },
  },
  {
    value: 'university_year_4',
    group: 'university',
    context: 'university',
    labels: { en: 'University Year 4', ar: 'الجامعة - السنة الرابعة' },
  },
  {
    value: 'university_year_5',
    group: 'university',
    context: 'university',
    labels: { en: 'University Year 5', ar: 'الجامعة - السنة الخامسة' },
  },
  {
    value: 'university_graduate',
    group: 'university',
    context: 'university',
    labels: { en: 'Graduate', ar: 'خريج' },
  },
];

const GROUP_ORDER = [
  'kindergarten',
  'primary',
  'preparatory',
  'secondary_general',
  'secondary_technical',
  'finished',
  'university',
];

const GROUP_LABELS = {
  en: {
    kindergarten: 'Kindergarten',
    primary: 'Primary Stage',
    preparatory: 'Preparatory Stage',
    secondary_general: 'General Secondary',
    secondary_technical: 'Technical Secondary',
    finished: 'Finished Education',
    university: 'University Stage',
  },
  ar: {
    kindergarten: 'رياض الأطفال',
    primary: 'المرحلة الابتدائية',
    preparatory: 'المرحلة الإعدادية',
    secondary_general: 'الثانوي العام',
    secondary_technical: 'الثانوي الفني',
    finished: 'منتهي التعليم',
    university: 'المرحلة الجامعية',
  },
};

function getLocale(language) {
  return language === 'ar' ? 'ar' : 'en';
}

function getEducationStageDefinition(stage) {
  return EDUCATION_STAGE_DEFINITIONS.find((definition) => definition.value === stage) || null;
}

export const EDUCATION_STAGE_GROUP_VALUES = [...GROUP_ORDER];

export function getEducationStageGroup(stageOrGroup) {
  if (GROUP_ORDER.includes(stageOrGroup)) return stageOrGroup;
  return getEducationStageDefinition(stageOrGroup)?.group || null;
}

export function normalizeEducationStageGroupValues(values = []) {
  const normalized = [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => getEducationStageGroup(String(value || '').trim()))
      .filter(Boolean)
  )];

  return GROUP_ORDER.filter((group) => normalized.includes(group));
}

export function getEducationStageLabel(stage, language = 'en') {
  const locale = getLocale(language);
  return getEducationStageDefinition(stage)?.labels?.[locale] || stage || '';
}

export function getEducationStageGroupLabel(group, language = 'en') {
  const locale = getLocale(language);
  return GROUP_LABELS[locale]?.[group] || group || '';
}

export function getEducationStageMeta(stage) {
  const definition = getEducationStageDefinition(stage);
  const context = definition?.context || null;
  return {
    definition,
    context,
    isKindergarten: context === 'kindergarten',
    isSchool: context === 'school',
    isUniversity: context === 'university',
    isFinished: context === 'finished',
  };
}

export function getEducationStageOptions(language = 'en') {
  const locale = getLocale(language);

  return GROUP_ORDER.flatMap((group) => {
    const options = EDUCATION_STAGE_DEFINITIONS
      .filter((definition) => definition.group === group)
      .map((definition) => ({
        value: definition.value,
        label: definition.labels[locale],
      }));

    return options.length > 0
      ? [
          {
            value: `__group_${group}`,
            label: GROUP_LABELS[locale][group],
            disabled: true,
          },
          ...options,
        ]
      : [];
  });
}

export function getEducationStageGroupOptions(language = 'en') {
  const locale = getLocale(language);
  return GROUP_ORDER.map((group) => ({
    value: group,
    label: GROUP_LABELS[locale][group],
  }));
}
