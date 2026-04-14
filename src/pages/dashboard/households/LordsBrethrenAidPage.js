import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Filter,
  HandCoins,
  Save,
  Users,
} from 'lucide-react';
import { aidsApi, householdClassificationsApi, usersApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useI18n } from '../../../i18n/i18n';
import Badge from '../../../components/ui/Badge';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import MultiSelectChips from '../../../components/ui/MultiSelectChips';
import PageHeader from '../../../components/ui/PageHeader';
import Select from '../../../components/ui/Select';
import Table from '../../../components/ui/Table';
import CreatableComboboxInput from '../../../components/ui/CreatableComboboxInput';
import CreatableTagComboboxInput from '../../../components/ui/CreatableTagComboboxInput';
import TextArea from '../../../components/ui/TextArea';
import { localizeAidOccurrence } from '../../../utils/aidOccurrenceLocalization';
import { getCriterionFilterOptionSets } from '../../../constants/householdClassifications';
import { formatCurrencyEGP, getStatusText } from './householdClassifications.shared';

const DEFAULT_OCCURRENCE_OPTIONS = ['one time', 'weekly', 'monthly', 'yearly'];

const COPY = {
  en: {
    title: 'Disburse Aid',
    subtitle: 'Assign monetary or in-kind aid to selected households.',
    aidSection: 'Aid Details',
    aidCategory: 'Category (e.g., Monetary, Medical)',
    aidOccurrence: 'Occurrence (e.g., Monthly, One-time)',
    aidDescription: 'Description (e.g., School supplies, Rent)',
    aidDate: 'Date',
    aidNotes: 'Additional Notes',
    filterSection: 'Target Households',
    householdsTable: 'Matched Households',
    searchTitle: 'No households match the criteria',
    searchDesc: 'Try adjusting the filters above.',
    columns: {
      check: 'Select',
      householdName: 'Household',
      members: 'Members',
      income: 'Total income',
      status: 'Primary status',
    },
    saveAction: 'Save Aid Records',
    updateAction: 'Update Aid Group',
    successMsg: 'Aid recorded successfully for {count} households.',
    updateSuccessMsg: 'Aid group updated successfully for {count} households.',
    selectAll: 'Select all',
    clearAll: 'Clear selection',
    
    // Filter labels
    filtersTitle: 'Refine Household Selection',
    filterGenders: 'Genders',
    filterAgeGroups: 'Age groups',
    filterEducation: 'Educational stages',
    filterEmployment: 'Employment statuses',
    filterPresence: 'Presence statuses',
    filterDiseases: 'Diseases',
    filterDiseaseMatchMode: 'Disease match mode',
    filterTravel: 'Travel destinations',
    filterMinIncome: 'Min household income',
    filterMaxIncome: 'Max household income',
    filterMinMembers: 'Min household members',
    any: 'Any',
    all: 'All',
  },
  ar: {
    title: 'صرف مساعدات',
    subtitle: 'تسجيل وتوزيع مساعدات مالية أو عينية أو طبية للأسر.',
    aidSection: 'تفاصيل المساعدة',
    aidCategory: 'فئة المساعدة (مثال: مالي، طبي، عيني)',
    aidOccurrence: 'دورية المساعدة (مثال: شهري، مرة واحدة)',
    aidDescription: 'الوصف (مثال: مواد غذائية، مصاريف دراسية)',
    aidDate: 'تاريخ الصرف',
    aidNotes: 'ملاحظات إضافية',
    filterSection: 'الأسر المستهدفة',
    householdsTable: 'الأسر المطابقة',
    searchTitle: 'لا توجد أسر مطابقة',
    searchDesc: 'حاول تعديل شروط البحث في الأعلى.',
    columns: {
      check: 'تحديد',
      householdName: 'الأسرة',
      members: 'عدد الأفراد',
      income: 'إجمالي الدخل',
      status: 'الحالة الأساسية',
    },
    saveAction: 'حفظ سجل المساعدات',
    updateAction: 'تحديث سجل الصرف',
    successMsg: 'تم تسجيل المساعدة بنجاح لعدد {count} من الأسر.',
    updateSuccessMsg: 'تم تحديث المساعدة بنجاح لعدد {count} من الأسر.',
    selectAll: 'تحديد الكل',
    clearAll: 'إلغاء التحديد',

    // Filter labels
    filtersTitle: 'تخصيص بحث الأسر',
    filterGenders: 'النوع',
    filterAgeGroups: 'الفئات العمرية',
    filterEducation: 'المراحل التعليمية',
    filterEmployment: 'حالة العمل',
    filterPresence: 'حالة التواجد',
    filterDiseases: 'الأمراض',
    filterDiseaseMatchMode: 'طريقة مطابقة الأمراض',
    filterTravel: 'جهات السفر',
    filterMinIncome: 'أقل دخل للأسرة',
    filterMaxIncome: 'أعلى دخل للأسرة',
    filterMinMembers: 'أقل عدد لأفراد الأسرة',
    any: 'أي',
    all: 'الكل',
  },
};



function HouseholdStatusBadge({ classification, language }) {
  if (!classification) return <Badge>{getStatusText('unclassified', language)}</Badge>;

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium truncate max-w-[150px]"
      style={{
        color: classification.color || '#2563eb',
        borderColor: `${classification.color || '#2563eb'}33`,
        backgroundColor: `${classification.color || '#2563eb'}12`,
      }}
      title={classification.name}
    >
      {classification.name}
    </span>
  );
}

export default function LordsBrethrenAidPage() {
  const { language, t } = useI18n();
  const copy = COPY[language === 'ar' ? 'ar' : 'en'];
  const navigate = useNavigate();

  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [aidDraft, setAidDraft] = useState({
    category: '',
    occurrence: '',
    description: '',
    notes: '',
  });

  const [memberFilters, setMemberFilters] = useState({});
  const [householdFilters, setHouseholdFilters] = useState({});
  
  const [selectedHouseholds, setSelectedHouseholds] = useState(new Set());

  const optionsQuery = useQuery({
    queryKey: ['aids-options'],
    queryFn: async () => {
      const { data } = await aidsApi.getOptions();
      return data?.data || { categories: [], occurrences: [], descriptions: [] };
    },
    staleTime: 60000,
  });

  const filterOptions = useMemo(() => getCriterionFilterOptionSets(language), [language]);
  const aidOptions = optionsQuery.data || { categories: [], occurrences: [], descriptions: [] };
  const occurrenceOptions = useMemo(
    () =>
      [...new Set([...DEFAULT_OCCURRENCE_OPTIONS, ...(aidOptions.occurrences || [])])].map((value) => ({
        value,
        label: localizeAidOccurrence(value, language),
      })),
    [aidOptions.occurrences, language]
  );

  const profileOptionsQuery = useQuery({
    queryKey: ['users', 'profile-options'],
    queryFn: async () => {
      const { data } = await usersApi.getProfileOptionValues();
      return data?.data || data || {};
    },
    staleTime: 60000,
  });

  const profileOptions = profileOptionsQuery.data || {};

  const searchHouseholdsQuery = useQuery({
    queryKey: ['households-search', memberFilters, householdFilters],
    queryFn: async () => {
      const payload = {
        isLordsBrethren: true,
        memberFilters: Object.keys(memberFilters).length > 0 ? memberFilters : undefined,
        householdFilters: Object.keys(householdFilters).length > 0 ? householdFilters : undefined,
      };
      const { data } = await householdClassificationsApi.searchHouseholds(payload);
      return Array.isArray(data?.data) ? data.data : [];
    },
    keepPreviousData: true,
  });

  const households = useMemo(() => searchHouseholdsQuery.data ?? [], [searchHouseholdsQuery.data]);

  const [searchParams] = useSearchParams();
  const queryDate = searchParams.get('date');
  const queryCategory = searchParams.get('category');
  const queryOccurrence = searchParams.get('occurrence');
  const queryDescription = searchParams.get('description');

  const isEditMode = !!(queryDate && queryCategory && queryOccurrence && queryDescription);

  const payloadParams = useMemo(() => ({
    date: queryDate,
    category: queryCategory,
    occurrence: queryOccurrence,
    description: queryDescription,
  }), [queryDate, queryCategory, queryOccurrence, queryDescription]);

  const existingDetailsQuery = useQuery({
    queryKey: ['aid-details', payloadParams],
    queryFn: async () => {
      if (!isEditMode) return [];
      const resp = await aidsApi.getAidDetails(payloadParams);
      return resp.data?.data || [];
    },
    enabled: isEditMode,
  });

  useEffect(() => {
    if (isEditMode) {
      setDateStr(queryDate ? queryDate.split('T')[0] : new Date().toISOString().slice(0, 10));
      setAidDraft((prev) => ({
        ...prev,
        category: queryCategory || '',
        occurrence: queryOccurrence || '',
        description: queryDescription || '',
      }));
    }
  }, [isEditMode, queryDate, queryCategory, queryOccurrence, queryDescription]);

  useEffect(() => {
    if (isEditMode && existingDetailsQuery.data && existingDetailsQuery.data.length > 0) {
      const houseNamesSet = new Set(existingDetailsQuery.data.map((h) => h.houseName));
      setSelectedHouseholds(houseNamesSet);
      
      // Also grab notes from the first one if we want, assuming all have same notes
      const notes = existingDetailsQuery.data[0]?.notes || '';
      setAidDraft((prev) => ({ ...prev, notes }));
    }
  }, [isEditMode, existingDetailsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload) => isEditMode ? aidsApi.updateBulk(payload) : aidsApi.createBulk(payload),
    onSuccess: (_, variables) => {
      const count = variables.houseNames.length;
      toast.success(isEditMode ? copy.updateSuccessMsg.replace('{count}', count) : copy.successMsg.replace('{count}', count));
      navigate('/dashboard/lords-brethren/aid-history');
    },
    onError: (error) => {
      toast.error(normalizeApiError(error).message);
    },
  });

  const handleSave = () => {
    if (!aidDraft.category.trim() || !aidDraft.occurrence.trim() || !aidDraft.description.trim() || !dateStr) {
      toast.error(language === 'ar' ? 'يرجى استكمال جميع التفاصيل المطلوبة للمساعدة.' : 'Please fill all required aid details.');
      return;
    }
    
    if (selectedHouseholds.size === 0) {
      toast.error(language === 'ar' ? 'يرجى اختيار أسرة واحدة على الأقل.' : 'Please select at least one household.');
      return;
    }

    const formattedDate = new Date(dateStr).toISOString();
    
    const payload = isEditMode
      ? {
          houseNames: Array.from(selectedHouseholds),
          originalGroup: payloadParams,
          updatedData: {
            category: aidDraft.category.trim(),
            occurrence: aidDraft.occurrence.trim(),
            description: aidDraft.description.trim(),
            notes: aidDraft.notes.trim() || undefined,
            date: formattedDate,
          },
        }
      : {
          houseNames: Array.from(selectedHouseholds),
          aid: {
            category: aidDraft.category.trim(),
            occurrence: aidDraft.occurrence.trim(),
            description: aidDraft.description.trim(),
            notes: aidDraft.notes.trim() || undefined,
            date: formattedDate,
          },
        };

    saveMutation.mutate(payload);
  };

  const toggleSelection = (houseName) => {
    setSelectedHouseholds((prev) => {
      const next = new Set(prev);
      if (next.has(houseName)) next.delete(houseName);
      else next.add(houseName);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedHouseholds.size === households.length && households.length > 0) {
      setSelectedHouseholds(new Set());
    } else {
      setSelectedHouseholds(new Set(households.map(h => h.householdName)));
    }
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
        eyebrow={t('dashboardLayout.menu.theLordsBrethren')}
        title={copy.title}
        subtitle={copy.subtitle}
        actions={
          <Button
            icon={Save}
            onClick={handleSave}
            loading={saveMutation.isPending || existingDetailsQuery.isLoading}
            disabled={selectedHouseholds.size === 0 || existingDetailsQuery.isLoading}
          >
            {isEditMode ? copy.updateAction : copy.saveAction}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        
        {/* LEFT COLUMN: Filters & Table */}
        <div className="space-y-6">
          <Card className="space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Filter className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-heading">{copy.filtersTitle}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <MultiSelectChips
                label={copy.filterGenders}
                options={filterOptions.genderOptions}
                values={memberFilters.genders || []}
                onChange={(v) => setMemberFilters({ ...memberFilters, genders: v })}
                containerClassName="!mb-0"
              />
              <MultiSelectChips
                label={copy.filterAgeGroups}
                options={filterOptions.ageGroupOptions}
                values={memberFilters.ageGroups || []}
                onChange={(v) => setMemberFilters({ ...memberFilters, ageGroups: v })}
                containerClassName="!mb-0"
              />
              <MultiSelectChips
                label={copy.filterEducation}
                options={filterOptions.educationStageOptions}
                values={memberFilters.educationStages || []}
                onChange={(v) => setMemberFilters({ ...memberFilters, educationStages: v })}
                containerClassName="!mb-0"
              />
              <MultiSelectChips
                label={copy.filterEmployment}
                options={filterOptions.employmentStatusOptions}
                values={memberFilters.employmentStatuses || []}
                onChange={(v) => setMemberFilters({ ...memberFilters, employmentStatuses: v })}
                containerClassName="!mb-0"
              />
              <MultiSelectChips
                label={copy.filterPresence}
                options={filterOptions.presenceStatusOptions}
                values={memberFilters.presenceStatuses || []}
                onChange={(v) => setMemberFilters({ ...memberFilters, presenceStatuses: v })}
                containerClassName="!mb-0"
              />
              <CreatableTagComboboxInput
                label={copy.filterDiseases}
                values={memberFilters.diseases || []}
                suggestions={profileOptions.healthConditions || []}
                onChange={(v) => setMemberFilters({ ...memberFilters, diseases: v })}
                containerClassName="!mb-0"
              />
              <Select
                label={copy.filterDiseaseMatchMode}
                options={[{ value: 'any', label: copy.any }, { value: 'all', label: copy.all }]}
                value={memberFilters.diseaseMatchMode || 'any'}
                onChange={(e) => setMemberFilters({ ...memberFilters, diseaseMatchMode: e.target.value })}
                containerClassName="!mb-0"
              />
              <div className="grid grid-cols-2 gap-3 lg:col-span-2">
                <Input
                  label={copy.filterMinIncome}
                  type="number"
                  min="0"
                  value={householdFilters.minTotalIncome || ''}
                  onChange={(e) => setHouseholdFilters({ ...householdFilters, minTotalIncome: e.target.value ? Number(e.target.value) : undefined })}
                  containerClassName="!mb-0"
                />
                <Input
                  label={copy.filterMaxIncome}
                  type="number"
                  min="0"
                  value={householdFilters.maxTotalIncome || ''}
                  onChange={(e) => setHouseholdFilters({ ...householdFilters, maxTotalIncome: e.target.value ? Number(e.target.value) : undefined })}
                  containerClassName="!mb-0"
                />
                <Input
                  label={copy.filterMinMembers}
                  type="number"
                  min="1"
                  value={householdFilters.minMemberCount || ''}
                  onChange={(e) => setHouseholdFilters({ ...householdFilters, minMemberCount: e.target.value ? Number(e.target.value) : undefined })}
                  containerClassName="!mb-0"
                />
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-heading">{copy.householdsTable}</p>
                <Badge variant="secondary">{households.length}</Badge>
              </div>
              {households.length > 0 && (
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {selectedHouseholds.size === households.length ? copy.clearAll : copy.selectAll}
                </Button>
              )}
            </div>

            <Table
              columns={[
                {
                  key: 'select',
                  label: '',
                  cellClassName: 'w-10',
                  render: (row) => {
                    const isChecked = selectedHouseholds.has(row.householdName);
                    return (
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                          isChecked
                            ? 'border-primary bg-primary text-white'
                            : 'border-border/60 bg-surface'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </div>
                    );
                  },
                  onClick: (row) => toggleSelection(row.householdName),
                },
                {
                  key: 'householdName',
                  label: copy.columns.householdName,
                  cellClassName: 'font-semibold text-heading',
                  onClick: (row) => toggleSelection(row.householdName),
                },
                {
                  key: 'memberCount',
                  label: copy.columns.members,
                  onClick: (row) => toggleSelection(row.householdName),
                },
                {
                  key: 'totalMemberIncome',
                  label: copy.columns.income,
                  render: (row) => formatCurrencyEGP(row.totalMemberIncome, language),
                  onClick: (row) => toggleSelection(row.householdName),
                },
                {
                  key: 'status',
                  label: copy.columns.status,
                  render: (row) => <HouseholdStatusBadge classification={row.primaryClassification} language={language} />,
                  onClick: (row) => toggleSelection(row.householdName),
                },
              ]}
              data={households}
              loading={searchHouseholdsQuery.isLoading}
              emptyTitle={copy.searchTitle}
              emptyDescription={copy.searchDesc}
              emptyIcon={Building2}
            />
          </Card>
        </div>

        {/* RIGHT COLUMN: Aid Configuration */}
        <div>
          <Card className="sticky top-20 space-y-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <HandCoins className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-heading">{copy.aidSection}</p>
            </div>

            <div className="space-y-4">
              <CreatableComboboxInput
                label={copy.aidCategory}
                value={aidDraft.category}
                options={aidOptions.categories}
                required
                onChange={(v) => setAidDraft({ ...aidDraft, category: v })}
                containerClassName="!mb-0"
              />
              <CreatableComboboxInput
                label={copy.aidOccurrence}
                value={aidDraft.occurrence}
                options={occurrenceOptions}
                required
                onChange={(v) => setAidDraft({ ...aidDraft, occurrence: v })}
                containerClassName="!mb-0"
              />
              <CreatableComboboxInput
                label={copy.aidDescription}
                value={aidDraft.description}
                options={aidOptions.descriptions}
                required
                onChange={(v) => setAidDraft({ ...aidDraft, description: v })}
                containerClassName="!mb-0"
              />
              <Input
                label={copy.aidDate}
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                icon={CalendarDays}
                containerClassName="!mb-0"
              />
              <TextArea
                label={copy.aidNotes}
                value={aidDraft.notes}
                onChange={(e) => setAidDraft({ ...aidDraft, notes: e.target.value })}
                containerClassName="!mb-0"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
