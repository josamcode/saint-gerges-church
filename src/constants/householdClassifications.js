import {
  getAgeGroupOptions,
  getEmploymentStatusOptions,
  getGenderOptions,
  getPresenceStatusOptions,
} from './householdProfiles';
import {
  getEducationStageGroupOptions,
  normalizeEducationStageGroupValues,
} from './education';

export const HOUSEHOLD_CLASSIFICATION_METRICS = {
  HOUSEHOLD_MEMBER_COUNT: 'household.memberCount',
  HOUSEHOLD_TOTAL_MEMBER_INCOME: 'household.totalMemberIncome',
  HOUSEHOLD_AVERAGE_MEMBER_INCOME: 'household.averageMemberIncome',
  MEMBERS_MATCHING_COUNT: 'members.matchingCount',
  MEMBERS_ANY_MATCH: 'members.anyMatch',
  MEMBERS_ALL_MATCH: 'members.allMatch',
};

export const HOUSEHOLD_CLASSIFICATION_OPERATORS = {
  EQ: 'eq',
  GTE: 'gte',
  LTE: 'lte',
  BETWEEN: 'between',
  IS_TRUE: 'isTrue',
  IS_FALSE: 'isFalse',
};

const TEXT = {
  en: {
    metrics: {
      [HOUSEHOLD_CLASSIFICATION_METRICS.HOUSEHOLD_MEMBER_COUNT]: 'Household member count',
      [HOUSEHOLD_CLASSIFICATION_METRICS.HOUSEHOLD_TOTAL_MEMBER_INCOME]:
        'Total monthly income of household members',
      [HOUSEHOLD_CLASSIFICATION_METRICS.HOUSEHOLD_AVERAGE_MEMBER_INCOME]:
        'Average monthly income of members with income',
      [HOUSEHOLD_CLASSIFICATION_METRICS.MEMBERS_MATCHING_COUNT]:
        'Count members matching filters',
      [HOUSEHOLD_CLASSIFICATION_METRICS.MEMBERS_ANY_MATCH]:
        'Any member matches filters',
      [HOUSEHOLD_CLASSIFICATION_METRICS.MEMBERS_ALL_MATCH]:
        'All members match filters',
    },
    operators: {
      eq: 'Equals',
      gte: 'Greater than or equal',
      lte: 'Less than or equal',
      between: 'Between',
      isTrue: 'Is true',
      isFalse: 'Is false',
    },
  },
  ar: {
    metrics: {
      [HOUSEHOLD_CLASSIFICATION_METRICS.HOUSEHOLD_MEMBER_COUNT]: 'عدد أفراد الأسرة',
      [HOUSEHOLD_CLASSIFICATION_METRICS.HOUSEHOLD_TOTAL_MEMBER_INCOME]:
        'إجمالي دخل أفراد الأسرة الشهري',
      [HOUSEHOLD_CLASSIFICATION_METRICS.HOUSEHOLD_AVERAGE_MEMBER_INCOME]:
        'متوسط دخل الأفراد الذين لديهم دخل',
      [HOUSEHOLD_CLASSIFICATION_METRICS.MEMBERS_MATCHING_COUNT]:
        'عدد الأفراد المطابقين للفلاتر',
      [HOUSEHOLD_CLASSIFICATION_METRICS.MEMBERS_ANY_MATCH]:
        'يوجد فرد واحد على الأقل مطابق للفلاتر',
      [HOUSEHOLD_CLASSIFICATION_METRICS.MEMBERS_ALL_MATCH]:
        'كل الأفراد مطابقون للفلاتر',
    },
    operators: {
      eq: 'يساوي',
      gte: 'أكبر من أو يساوي',
      lte: 'أقل من أو يساوي',
      between: 'بين',
      isTrue: 'صحيح',
      isFalse: 'غير صحيح',
    },
  },
};

function getLocale(language) {
  return language === 'ar' ? 'ar' : 'en';
}

export function getMetricLabel(metric, language = 'en') {
  return TEXT[getLocale(language)].metrics[metric] || metric;
}

export function getOperatorLabel(operator, language = 'en') {
  return TEXT[getLocale(language)].operators[operator] || operator;
}

export function getMetricOptions(language = 'en') {
  return Object.values(HOUSEHOLD_CLASSIFICATION_METRICS).map((value) => ({
    value,
    label: getMetricLabel(value, language),
  }));
}

export function getOperatorOptions(metric, language = 'en') {
  const locale = getLocale(language);
  const numeric = [
    HOUSEHOLD_CLASSIFICATION_OPERATORS.EQ,
    HOUSEHOLD_CLASSIFICATION_OPERATORS.GTE,
    HOUSEHOLD_CLASSIFICATION_OPERATORS.LTE,
    HOUSEHOLD_CLASSIFICATION_OPERATORS.BETWEEN,
  ];
  const boolean = [
    HOUSEHOLD_CLASSIFICATION_OPERATORS.IS_TRUE,
    HOUSEHOLD_CLASSIFICATION_OPERATORS.IS_FALSE,
  ];

  const source =
    metric === HOUSEHOLD_CLASSIFICATION_METRICS.MEMBERS_ANY_MATCH ||
    metric === HOUSEHOLD_CLASSIFICATION_METRICS.MEMBERS_ALL_MATCH
      ? boolean
      : numeric;

  return source.map((value) => ({
    value,
    label: TEXT[locale].operators[value],
  }));
}

export function metricUsesFilters(metric) {
  return typeof metric === 'string' && metric.startsWith('members.');
}

export function metricUsesBooleanOperator(metric) {
  return (
    metric === HOUSEHOLD_CLASSIFICATION_METRICS.MEMBERS_ANY_MATCH ||
    metric === HOUSEHOLD_CLASSIFICATION_METRICS.MEMBERS_ALL_MATCH
  );
}

export function createEmptyCriterion() {
  return {
    id: `criterion-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: '',
    isRequired: true,
    metric: HOUSEHOLD_CLASSIFICATION_METRICS.HOUSEHOLD_MEMBER_COUNT,
    operator: HOUSEHOLD_CLASSIFICATION_OPERATORS.GTE,
    value: '1',
    minValue: '',
    maxValue: '',
    filters: {
      genders: [],
      ageGroups: [],
      educationStages: [],
      employmentStatuses: [],
      presenceStatuses: [],
      diseases: [],
      diseaseMatchMode: 'any',
      travelDestinations: [],
      minMonthlyIncome: '',
      maxMonthlyIncome: '',
    },
  };
}

export function createEmptyCategoryDraft() {
  return {
    id: null,
    name: '',
    description: '',
    color: '#2563eb',
    priority: '100',
    isActive: true,
    isLordsBrethren: false,
    criteria: [createEmptyCriterion()],
  };
}

export function normalizeCategoryToDraft(category) {
  if (!category) return createEmptyCategoryDraft();

  return {
    id: category.id,
    name: category.name || '',
    description: category.description || '',
    color: category.color || '#2563eb',
    priority: String(category.priority ?? 100),
    isActive: category.isActive !== false,
    isLordsBrethren: Boolean(category.isLordsBrethren),
    criteria: Array.isArray(category.criteria) && category.criteria.length > 0
      ? category.criteria.map((criterion) => ({
          id: criterion.id || `criterion-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          label: criterion.label || '',
          isRequired: criterion.isRequired !== false,
          metric: criterion.metric,
          operator: criterion.operator,
          value: criterion.value == null ? '' : String(criterion.value),
          minValue: criterion.minValue == null ? '' : String(criterion.minValue),
          maxValue: criterion.maxValue == null ? '' : String(criterion.maxValue),
          filters: {
            genders: criterion.filters?.genders || [],
            ageGroups: criterion.filters?.ageGroups || [],
            educationStages: normalizeEducationStageGroupValues(criterion.filters?.educationStages),
            employmentStatuses: criterion.filters?.employmentStatuses || [],
            presenceStatuses: criterion.filters?.presenceStatuses || [],
            diseases: criterion.filters?.diseases || [],
            diseaseMatchMode: criterion.filters?.diseaseMatchMode || 'any',
            travelDestinations: criterion.filters?.travelDestinations || [],
            minMonthlyIncome:
              criterion.filters?.minMonthlyIncome == null
                ? ''
                : String(criterion.filters.minMonthlyIncome),
            maxMonthlyIncome:
              criterion.filters?.maxMonthlyIncome == null
                ? ''
                : String(criterion.filters.maxMonthlyIncome),
          },
        }))
      : [createEmptyCriterion()],
  };
}

export function buildCategoryPayload(draft) {
  return {
    name: String(draft.name || '').trim(),
    description: String(draft.description || '').trim(),
    color: String(draft.color || '#2563eb').trim(),
    priority: Number(draft.priority || 0),
    isActive: Boolean(draft.isActive),
    isLordsBrethren: Boolean(draft.isLordsBrethren),
    criteria: (draft.criteria || []).map((criterion) => {
      const payload = {
        label: String(criterion.label || '').trim(),
        isRequired: criterion.isRequired !== false,
        metric: criterion.metric,
        operator: criterion.operator,
      };

      if (criterion.operator === HOUSEHOLD_CLASSIFICATION_OPERATORS.BETWEEN) {
        payload.minValue = Number(criterion.minValue || 0);
        payload.maxValue = Number(criterion.maxValue || 0);
      } else if (!metricUsesBooleanOperator(criterion.metric)) {
        payload.value = Number(criterion.value || 0);
      }

      if (metricUsesFilters(criterion.metric)) {
        const filters = {};
        if ((criterion.filters?.genders || []).length > 0) filters.genders = criterion.filters.genders;
        if ((criterion.filters?.ageGroups || []).length > 0) filters.ageGroups = criterion.filters.ageGroups;
        if ((criterion.filters?.educationStages || []).length > 0) {
          filters.educationStages = normalizeEducationStageGroupValues(
            criterion.filters.educationStages
          );
        }
        if ((criterion.filters?.employmentStatuses || []).length > 0) {
          filters.employmentStatuses = criterion.filters.employmentStatuses;
        }
        if ((criterion.filters?.presenceStatuses || []).length > 0) {
          filters.presenceStatuses = criterion.filters.presenceStatuses;
        }
        if ((criterion.filters?.diseases || []).length > 0) {
          filters.diseases = criterion.filters.diseases;
          filters.diseaseMatchMode = criterion.filters.diseaseMatchMode || 'any';
        }
        if ((criterion.filters?.travelDestinations || []).length > 0) {
          filters.travelDestinations = criterion.filters.travelDestinations;
        }
        if (criterion.filters?.minMonthlyIncome !== '') {
          filters.minMonthlyIncome = Number(criterion.filters.minMonthlyIncome);
        }
        if (criterion.filters?.maxMonthlyIncome !== '') {
          filters.maxMonthlyIncome = Number(criterion.filters.maxMonthlyIncome);
        }
        payload.filters = filters;
      }

      return payload;
    }),
  };
}

export function getCriterionFilterOptionSets(language = 'en') {
  return {
    genderOptions: getGenderOptions(language),
    ageGroupOptions: getAgeGroupOptions(language),
    educationStageOptions: getEducationStageGroupOptions(language),
    employmentStatusOptions: getEmploymentStatusOptions(language),
    presenceStatusOptions: getPresenceStatusOptions(language),
  };
}
