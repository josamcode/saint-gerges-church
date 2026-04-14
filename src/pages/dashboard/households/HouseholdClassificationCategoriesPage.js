import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  Save,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { householdClassificationsApi } from '../../../api/endpoints';
import { mapFieldErrors, normalizeApiError } from '../../../api/errors';
import { useI18n } from '../../../i18n/i18n';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import MultiSelectChips from '../../../components/ui/MultiSelectChips';
import PageHeader from '../../../components/ui/PageHeader';
import Select from '../../../components/ui/Select';
import Switch from '../../../components/ui/Switch';
import TagInput from '../../../components/ui/TagInput';
import TextArea from '../../../components/ui/TextArea';
import Badge from '../../../components/ui/Badge';
import {
  buildCategoryPayload,
  createEmptyCategoryDraft,
  createEmptyCriterion,
  getCriterionFilterOptionSets,
  getMetricOptions,
  getOperatorOptions,
  metricUsesBooleanOperator,
  metricUsesFilters,
  normalizeCategoryToDraft,
} from '../../../constants/householdClassifications';

const COPY = {
  en: {
    title: 'Household classification rules',
    subtitle:
      'Define the categories and criteria used to classify households automatically.',
    categoriesTitle: 'Categories',
    newCategory: 'New category',
    editorTitle: 'Rule editor',
    manageResults: 'View results',
    emptyCategories: 'No categories loaded yet.',
    name: 'Category name',
    description: 'Description',
    color: 'Color',
    priority: 'Priority',
    active: 'Active',
    isLordsBrethren: 'Is The Lords Brethren',
    criteriaTitle: 'Criteria',
    addCriterion: 'Add criterion',
    label: 'Internal label',
    metric: 'Metric',
    operator: 'Operator',
    value: 'Value',
    minValue: 'Min value',
    maxValue: 'Max value',
    required: 'Required',
    filtersTitle: 'Member filters',
    genders: 'Genders',
    ageGroups: 'Age groups',
    educationStages: 'Educational stages',
    employmentStatuses: 'Employment statuses',
    presenceStatuses: 'Presence statuses',
    diseases: 'Diseases',
    diseaseMatchMode: 'Disease match mode',
    travelDestinations: 'Travel destinations',
    minIncome: 'Min member income',
    maxIncome: 'Max member income',
    any: 'Any',
    all: 'All',
    save: 'Save classification',
    delete: 'Delete category',
    deleteConfirm: 'Delete this category?',
    deleteSuccess: 'Household classification deleted successfully.',
    saveSuccess: 'Household classification saved successfully.',
    criteriaHint:
      'Use required criteria for mandatory conditions and optional criteria for soft indicators.',
  },
  ar: {
    title: 'قواعد تصنيف الأسر',
    subtitle:
      'عرّف الفئات والشروط التي سيستخدمها النظام في تصنيف الأسر تلقائيًا.',
    categoriesTitle: 'الفئات',
    newCategory: 'فئة جديدة',
    editorTitle: 'محرر القواعد',
    manageResults: 'عرض النتائج',
    emptyCategories: 'لا توجد فئات محملة بعد.',
    name: 'اسم الفئة',
    description: 'الوصف',
    color: 'اللون',
    priority: 'الأولوية',
    active: 'نشطة',
    isLordsBrethren: 'تابعة لإخوة الرب',
    criteriaTitle: 'الشروط',
    addCriterion: 'إضافة شرط',
    label: 'اسم داخلي للشرط',
    metric: 'المقياس',
    operator: 'المعامل',
    value: 'القيمة',
    minValue: 'الحد الأدنى',
    maxValue: 'الحد الأعلى',
    required: 'إلزامي',
    filtersTitle: 'فلاتر الأفراد',
    genders: 'النوع',
    ageGroups: 'الفئات العمرية',
    educationStages: 'المراحل التعليمية',
    employmentStatuses: 'حالة العمل',
    presenceStatuses: 'حالة التواجد',
    diseases: 'الأمراض',
    diseaseMatchMode: 'طريقة مطابقة الأمراض',
    travelDestinations: 'جهات السفر',
    minIncome: 'أقل دخل للفرد',
    maxIncome: 'أعلى دخل للفرد',
    any: 'أي',
    all: 'الكل',
    save: 'حفظ التصنيف',
    delete: 'حذف الفئة',
    deleteConfirm: 'هل تريد حذف هذه الفئة؟',
    deleteSuccess: 'تم حذف تصنيف الأسرة بنجاح.',
    saveSuccess: 'تم حفظ تصنيف الأسرة بنجاح.',
    criteriaHint:
      'استخدم الشروط الإلزامية للحالات التي لا يمكن تجاوزها، والاختيارية للمؤشرات المرنة.',
  },
};

function CategoryBadge({ category, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-start transition-all ${selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-surface hover:border-primary/30'
        }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-heading">{category.name}</p>
        <span
          className="h-3 w-3 rounded-full border"
          style={{ backgroundColor: category.color, borderColor: `${category.color}66` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant={category.isActive ? 'success' : 'warning'}>
          {category.isActive ? 'Active' : 'Inactive'}
        </Badge>
        {category.isLordsBrethren && (
          <Badge variant="primary" className="bg-primary/10 text-primary border-primary/20">
            Lords Brethren
          </Badge>
        )}
        <Badge>{category.priority}</Badge>
        <Badge variant="secondary">{category.criteriaCount}</Badge>
      </div>
    </button>
  );
}

export default function HouseholdClassificationCategoriesPage() {
  const { language, t } = useI18n();
  const copy = COPY[language === 'ar' ? 'ar' : 'en'];
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [draft, setDraft] = useState(createEmptyCategoryDraft());
  const [errors, setErrors] = useState({});

  const categoriesQuery = useQuery({
    queryKey: ['household-classifications', 'categories'],
    queryFn: async () => {
      const { data } = await householdClassificationsApi.listCategories();
      return Array.isArray(data?.data) ? data.data : [];
    },
    staleTime: 30000,
  });

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  useEffect(() => {
    if (isCreatingNew) {
      setDraft(createEmptyCategoryDraft());
      setErrors({});
      return;
    }

    if (!categories.length) {
      setSelectedCategoryId(null);
      setDraft(createEmptyCategoryDraft());
      setErrors({});
      return;
    }

    const selected = selectedCategoryId
      ? categories.find((category) => category.id === selectedCategoryId)
      : categories[0];

    if (!selected) {
      const firstCategory = categories[0];
      setSelectedCategoryId(firstCategory.id);
      setDraft(normalizeCategoryToDraft(firstCategory));
      setErrors({});
      return;
    }

    setSelectedCategoryId(selected.id);
    setDraft(normalizeCategoryToDraft(selected));
    setErrors({});
  }, [categories, isCreatingNew, selectedCategoryId]);

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (draft.id) {
        return householdClassificationsApi.updateCategory(draft.id, payload);
      }
      return householdClassificationsApi.createCategory(payload);
    },
    onSuccess: (response) => {
      const savedCategory = response?.data?.data || null;
      setIsCreatingNew(false);
      if (savedCategory?.id) {
        setSelectedCategoryId(savedCategory.id);
        setDraft(normalizeCategoryToDraft(savedCategory));
      }
      toast.success(copy.saveSuccess);
      queryClient.invalidateQueries({ queryKey: ['household-classifications'] });
      setErrors({});
    },
    onError: (error) => {
      const normalized = normalizeApiError(error);
      if (normalized.code === 'VALIDATION_ERROR') {
        setErrors(mapFieldErrors(normalized.details));
      }
      toast.error(normalized.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId) => householdClassificationsApi.deleteCategory(categoryId),
    onSuccess: () => {
      setIsCreatingNew(false);
      toast.success(copy.deleteSuccess);
      setSelectedCategoryId(null);
      setDraft(createEmptyCategoryDraft());
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ['household-classifications'] });
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const metricOptions = useMemo(() => getMetricOptions(language), [language]);
  const filterOptions = useMemo(
    () => getCriterionFilterOptionSets(language),
    [language]
  );

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const selectCategory = (category) => {
    setIsCreatingNew(false);
    setSelectedCategoryId(category.id);
    setDraft(normalizeCategoryToDraft(category));
    setErrors({});
  };

  const startNewCategory = () => {
    setIsCreatingNew(true);
    setSelectedCategoryId(null);
    setDraft(createEmptyCategoryDraft());
    setErrors({});
  };

  const updateCriterion = (criterionId, updater) => {
    setDraft((current) => ({
      ...current,
      criteria: current.criteria.map((criterion) =>
        criterion.id === criterionId
          ? typeof updater === 'function'
            ? updater(criterion)
            : { ...criterion, ...updater }
          : criterion
      ),
    }));
  };

  const removeCriterion = (criterionId) => {
    setDraft((current) => ({
      ...current,
      criteria:
        current.criteria.length > 1
          ? current.criteria.filter((criterion) => criterion.id !== criterionId)
          : current.criteria,
    }));
  };

  const addCriterion = () => {
    setDraft((current) => ({
      ...current,
      criteria: [...current.criteria, createEmptyCriterion()],
    }));
  };

  const handleSave = () => {
    setErrors({});
    if (!String(draft.name || '').trim()) {
      setErrors({ name: copy.name });
      return;
    }
    saveMutation.mutate(buildCategoryPayload(draft));
  };

  const handleDelete = () => {
    if (!draft.id) return;
    if (!window.confirm(copy.deleteConfirm)) return;
    deleteMutation.mutate(draft.id);
  };

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: copy.title },
        ]}
      />

      <PageHeader
        className="border-b border-border pb-6"
        eyebrow={copy.categoriesTitle}
        title={copy.title}
        subtitle={copy.subtitle}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/households/results">
              <Button variant="outline" icon={SlidersHorizontal}>
                {copy.manageResults}
              </Button>
            </Link>
            <Button icon={Plus} onClick={startNewCategory}>
              {copy.newCategory}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted" />
            <p className="text-sm font-semibold text-heading">{copy.categoriesTitle}</p>
          </div>
          {categories.length === 0 ? (
            <EmptyCategoryState copy={copy} onCreate={startNewCategory} />
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <CategoryBadge
                  key={category.id}
                  category={category}
                  selected={category.id === selectedCategoryId}
                  onClick={() => selectCategory(category)}
                />
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-6">
          <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
            <p className="text-sm font-semibold text-heading">{copy.editorTitle}</p>
            <p className="mt-1 text-xs text-muted">{copy.criteriaHint}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label={copy.name}
              value={draft.name}
              onChange={(event) => updateDraft('name', event.target.value)}
              error={errors.name}
              containerClassName="!mb-0"
            />
            <Input
              label={copy.color}
              type="color"
              value={draft.color}
              onChange={(event) => updateDraft('color', event.target.value)}
              containerClassName="!mb-0"
            />
            <Input
              label={copy.priority}
              type="number"
              min="0"
              value={draft.priority}
              onChange={(event) => updateDraft('priority', event.target.value)}
              containerClassName="!mb-0"
            />
            <div className="rounded-xl flex flex-col gap-2 border border-border bg-surface-alt/40 px-4 py-3">
              <Switch
                checked={draft.isActive}
                onChange={(checked) => updateDraft('isActive', checked)}
                label={copy.active}
              />
              <Switch
                checked={draft.isLordsBrethren}
                onChange={(checked) => updateDraft('isLordsBrethren', checked)}
                label={copy.isLordsBrethren}
              />
            </div>
            <div className="md:col-span-2">
              <TextArea
                label={copy.description}
                value={draft.description}
                onChange={(event) => updateDraft('description', event.target.value)}
                containerClassName="!mb-0"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-heading">{copy.criteriaTitle}</p>
              <Button type="button" variant="outline" size="sm" icon={Plus} onClick={addCriterion}>
                {copy.addCriterion}
              </Button>
            </div>

            <div className="space-y-4">
              {draft.criteria.map((criterion, index) => {
                const operatorOptions = getOperatorOptions(criterion.metric, language);
                const showFilters = metricUsesFilters(criterion.metric);
                const isBooleanMetric = metricUsesBooleanOperator(criterion.metric);

                return (
                  <div key={criterion.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-heading">
                        {copy.criteriaTitle} #{index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeCriterion(criterion.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted transition-colors hover:border-danger/30 hover:bg-danger-light hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <Input
                        label={copy.label}
                        value={criterion.label}
                        onChange={(event) =>
                          updateCriterion(criterion.id, { label: event.target.value })
                        }
                        containerClassName="!mb-0"
                      />
                      <div className="rounded-xl border border-border bg-surface-alt/40 px-4 py-3">
                        <Switch
                          checked={criterion.isRequired}
                          onChange={(checked) =>
                            updateCriterion(criterion.id, { isRequired: checked })
                          }
                          label={copy.required}
                        />
                      </div>
                      <Select
                        label={copy.metric}
                        options={metricOptions}
                        value={criterion.metric}
                        onChange={(event) =>
                          updateCriterion(criterion.id, (current) => ({
                            ...current,
                            metric: event.target.value,
                            operator: getOperatorOptions(event.target.value, language)[0]?.value,
                          }))
                        }
                        containerClassName="!mb-0"
                      />
                      <Select
                        label={copy.operator}
                        options={operatorOptions}
                        value={criterion.operator}
                        onChange={(event) =>
                          updateCriterion(criterion.id, { operator: event.target.value })
                        }
                        containerClassName="!mb-0"
                      />

                      {criterion.operator === 'between' ? (
                        <>
                          <Input
                            label={copy.minValue}
                            type="number"
                            min="0"
                            value={criterion.minValue}
                            onChange={(event) =>
                              updateCriterion(criterion.id, { minValue: event.target.value })
                            }
                            containerClassName="!mb-0"
                          />
                          <Input
                            label={copy.maxValue}
                            type="number"
                            min="0"
                            value={criterion.maxValue}
                            onChange={(event) =>
                              updateCriterion(criterion.id, { maxValue: event.target.value })
                            }
                            containerClassName="!mb-0"
                          />
                        </>
                      ) : !isBooleanMetric ? (
                        <Input
                          label={copy.value}
                          type="number"
                          min="0"
                          value={criterion.value}
                          onChange={(event) =>
                            updateCriterion(criterion.id, { value: event.target.value })
                          }
                          containerClassName="!mb-0 lg:col-span-2"
                        />
                      ) : null}
                    </div>

                    {showFilters ? (
                      <div className="mt-5 space-y-4 rounded-2xl border border-border bg-surface-alt/30 p-4">
                        <p className="text-sm font-semibold text-heading">{copy.filtersTitle}</p>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <MultiSelectChips
                            label={copy.genders}
                            options={filterOptions.genderOptions}
                            values={criterion.filters.genders}
                            onChange={(next) =>
                              updateCriterion(criterion.id, (current) => ({
                                ...current,
                                filters: { ...current.filters, genders: next },
                              }))
                            }
                            containerClassName="!mb-0"
                          />
                          <MultiSelectChips
                            label={copy.ageGroups}
                            options={filterOptions.ageGroupOptions}
                            values={criterion.filters.ageGroups}
                            onChange={(next) =>
                              updateCriterion(criterion.id, (current) => ({
                                ...current,
                                filters: { ...current.filters, ageGroups: next },
                              }))
                            }
                            containerClassName="!mb-0"
                          />
                          <MultiSelectChips
                            label={copy.educationStages}
                            options={filterOptions.educationStageOptions}
                            values={criterion.filters.educationStages}
                            onChange={(next) =>
                              updateCriterion(criterion.id, (current) => ({
                                ...current,
                                filters: { ...current.filters, educationStages: next },
                              }))
                            }
                            containerClassName="!mb-0"
                          />
                          <MultiSelectChips
                            label={copy.employmentStatuses}
                            options={filterOptions.employmentStatusOptions}
                            values={criterion.filters.employmentStatuses}
                            onChange={(next) =>
                              updateCriterion(criterion.id, (current) => ({
                                ...current,
                                filters: { ...current.filters, employmentStatuses: next },
                              }))
                            }
                            containerClassName="!mb-0"
                          />
                          <MultiSelectChips
                            label={copy.presenceStatuses}
                            options={filterOptions.presenceStatusOptions}
                            values={criterion.filters.presenceStatuses}
                            onChange={(next) =>
                              updateCriterion(criterion.id, (current) => ({
                                ...current,
                                filters: { ...current.filters, presenceStatuses: next },
                              }))
                            }
                            containerClassName="!mb-0"
                          />
                          <TagInput
                            label={copy.diseases}
                            values={criterion.filters.diseases}
                            onChange={(next) =>
                              updateCriterion(criterion.id, (current) => ({
                                ...current,
                                filters: { ...current.filters, diseases: next },
                              }))
                            }
                            containerClassName="!mb-0"
                          />
                          <Select
                            label={copy.diseaseMatchMode}
                            options={[
                              { value: 'any', label: copy.any },
                              { value: 'all', label: copy.all },
                            ]}
                            value={criterion.filters.diseaseMatchMode}
                            onChange={(event) =>
                              updateCriterion(criterion.id, (current) => ({
                                ...current,
                                filters: {
                                  ...current.filters,
                                  diseaseMatchMode: event.target.value,
                                },
                              }))
                            }
                            containerClassName="!mb-0"
                          />
                          <TagInput
                            label={copy.travelDestinations}
                            values={criterion.filters.travelDestinations}
                            onChange={(next) =>
                              updateCriterion(criterion.id, (current) => ({
                                ...current,
                                filters: { ...current.filters, travelDestinations: next },
                              }))
                            }
                            containerClassName="!mb-0"
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <Input
                              label={copy.minIncome}
                              type="number"
                              min="0"
                              value={criterion.filters.minMonthlyIncome}
                              onChange={(event) =>
                                updateCriterion(criterion.id, (current) => ({
                                  ...current,
                                  filters: {
                                    ...current.filters,
                                    minMonthlyIncome: event.target.value,
                                  },
                                }))
                              }
                              containerClassName="!mb-0"
                            />
                            <Input
                              label={copy.maxIncome}
                              type="number"
                              min="0"
                              value={criterion.filters.maxMonthlyIncome}
                              onChange={(event) =>
                                updateCriterion(criterion.id, (current) => ({
                                  ...current,
                                  filters: {
                                    ...current.filters,
                                    maxMonthlyIncome: event.target.value,
                                  },
                                }))
                              }
                              containerClassName="!mb-0"
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <div>
              {draft.id ? (
                <Button
                  variant="destructive"
                  icon={Trash2}
                  onClick={handleDelete}
                  loading={deleteMutation.isPending}
                >
                  {copy.delete}
                </Button>
              ) : null}
            </div>
            <Button icon={Save} onClick={handleSave} loading={saveMutation.isPending}>
              {copy.save}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function EmptyCategoryState({ copy, onCreate }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center">
      <p className="text-sm text-muted">{copy.emptyCategories}</p>
      <div className="mt-4">
        <Button icon={Plus} onClick={onCreate}>
          {copy.newCategory}
        </Button>
      </div>
    </div>
  );
}
