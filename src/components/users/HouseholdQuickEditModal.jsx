import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { householdClassificationsApi, usersApi } from '../../api/endpoints';
import { mapFieldErrors, normalizeApiError } from '../../api/errors';
import { useI18n } from '../../i18n/i18n';
import Button from '../ui/Button';
import CreatableTagComboboxInput from '../ui/CreatableTagComboboxInput';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Select from '../ui/Select';

const COPY = {
  en: {
    title: 'Edit house',
    subtitle:
      'This edits the house as one record. Renaming updates all house members, and total income is redistributed across members to keep the totals consistent.',
    houseName: 'House name',
    primaryClassification: 'Primary classification',
    clearClassification: 'No manual override',
    totalIncome: 'Total income',
    incomeSources: 'House income sources',
    incomeSourcesHint:
      'These sources belong to the house record and can be edited without opening member profiles.',
    structureSection: 'House structure',
    structureHint:
      'House name and total income update the member records that belong to this house.',
    classificationSection: 'House profile',
    classificationHint:
      'Manual classification and house income sources are stored on the household profile.',
    membersPermissionHint:
      'You need user update permission to change the house name or total income.',
    classificationPermissionHint:
      'You need household classification management permission to change these fields.',
    cancel: 'Cancel',
    save: 'Save house',
    saveSuccess: 'House updated successfully.',
  },
  ar: {
    title: 'تعديل البيت',
    subtitle:
      'هذا التعديل يتم على مستوى البيت كله. تغيير اسم البيت يحدّث كل الأفراد، وتعديل إجمالي الدخل يعيد توزيعه على الأفراد للحفاظ على اتساق الإجمالي.',
    houseName: 'اسم البيت',
    primaryClassification: 'التصنيف الأساسي',
    clearClassification: 'بدون تعيين يدوي',
    totalIncome: 'إجمالي الدخل',
    incomeSources: 'مصادر دخل البيت',
    incomeSourcesHint:
      'هذه المصادر تخص سجل البيت نفسه ويمكن تعديلها بدون الدخول إلى ملفات الأفراد.',
    structureSection: 'بيانات البيت الأساسية',
    structureHint: 'اسم البيت وإجمالي الدخل يتم تحديثهما على أعضاء هذا البيت مباشرة.',
    classificationSection: 'ملف البيت',
    classificationHint: 'التصنيف اليدوي ومصادر دخل البيت يتم حفظها على سجل البيت.',
    membersPermissionHint: 'تحتاج إلى صلاحية تعديل المستخدمين لتغيير اسم البيت أو إجمالي الدخل.',
    classificationPermissionHint:
      'تحتاج إلى صلاحية إدارة تصنيفات البيوت لتغيير هذه الحقول.',
    cancel: 'إلغاء',
    save: 'حفظ البيت',
    saveSuccess: 'تم تحديث بيانات البيت بنجاح.',
  },
};

function cleanString(value) {
  const trimmed = String(value || '').trim();
  return trimmed || '';
}

function uniqueTokens(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map(cleanString).filter(Boolean))];
}

function buildInitialForm(household) {
  return {
    houseName: household?.householdName || '',
    manualPrimaryClassificationId:
      household?.profile?.manualPrimaryClassificationId || '',
    totalIncome:
      household?.totalMemberIncome == null ? '' : String(household.totalMemberIncome),
    incomeSources: uniqueTokens(household?.incomeSources),
  };
}

export default function HouseholdQuickEditModal({
  household,
  isOpen,
  onClose,
  onSaved,
  canEditMembers = false,
  canManageHouseholdClassifications = false,
}) {
  const { language } = useI18n();
  const copy = COPY[language === 'ar' ? 'ar' : 'en'];
  const initialForm = useMemo(() => buildInitialForm(household), [household]);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setForm(initialForm);
    setErrors({});
  }, [initialForm, isOpen]);

  const categoriesQuery = useQuery({
    queryKey: ['household-classifications', 'categories', 'edit-modal'],
    queryFn: async () => {
      const { data } = await householdClassificationsApi.listCategories();
      return Array.isArray(data?.data) ? data.data : [];
    },
    enabled: isOpen,
    staleTime: 60000,
  });

  const profileValuesQuery = useQuery({
    queryKey: ['users', 'profile-option-values', 'household-edit-modal'],
    queryFn: async () => {
      const { data } = await usersApi.getProfileOptionValues();
      return data?.data ?? {};
    },
    enabled: isOpen,
    staleTime: 60000,
  });

  const categoryOptions = useMemo(
    () => [
      { value: '', label: copy.clearClassification },
      ...(categoriesQuery.data || [])
        .filter((category) => category?.isActive !== false)
        .map((category) => ({
          value: category.id,
          label: category.name,
        })),
    ],
    [categoriesQuery.data, copy.clearClassification]
  );

  const incomeSourceSuggestions = useMemo(
    () =>
      uniqueTokens([
        ...(profileValuesQuery.data?.incomeSources || []),
        ...(household?.incomeSources || []),
      ]),
    [profileValuesQuery.data?.incomeSources, household?.incomeSources]
  );

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await householdClassificationsApi.updateHousehold(payload);
      return data?.data ?? data;
    },
    onSuccess: (updatedHousehold) => {
      toast.success(copy.saveSuccess);
      onSaved?.(updatedHousehold);
    },
    onError: (error) => {
      const normalized = normalizeApiError(error);
      setErrors(mapFieldErrors(normalized.details));
      toast.error(normalized.message);
    },
  });

  const update = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setErrors({});

    const payload = {
      currentHouseName: household?.householdName,
    };

    if (canEditMembers) {
      payload.houseName = cleanString(form.houseName);
      payload.totalIncome = Number(form.totalIncome || 0);
    }

    if (canManageHouseholdClassifications) {
      payload.manualPrimaryClassificationId =
        cleanString(form.manualPrimaryClassificationId) || null;
      payload.incomeSources = uniqueTokens(form.incomeSources);
    }

    mutation.mutate(payload);
  };

  if (!household?.householdName) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={copy.title}
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button type="submit" form="household-quick-edit-form" loading={mutation.isPending}>
            {copy.save}
          </Button>
        </>
      }
    >
      <form id="household-quick-edit-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
          <p className="text-sm font-semibold text-heading">{household.householdName}</p>
          <p className="mt-1 text-xs text-muted">{copy.subtitle}</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-surface-alt/30 p-4">
          <div>
            <p className="text-sm font-semibold text-heading">{copy.structureSection}</p>
            <p className="mt-1 text-xs text-muted">
              {canEditMembers ? copy.structureHint : copy.membersPermissionHint}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label={copy.houseName}
              value={form.houseName}
              onChange={(event) => update('houseName', event.target.value)}
              error={errors.houseName}
              disabled={!canEditMembers}
              containerClassName="!mb-0"
            />
            <Input
              label={copy.totalIncome}
              type="number"
              min="0"
              value={form.totalIncome}
              onChange={(event) => update('totalIncome', event.target.value)}
              error={errors.totalIncome}
              disabled={!canEditMembers}
              containerClassName="!mb-0"
            />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-surface-alt/30 p-4">
          <div>
            <p className="text-sm font-semibold text-heading">{copy.classificationSection}</p>
            <p className="mt-1 text-xs text-muted">
              {canManageHouseholdClassifications
                ? copy.classificationHint
                : copy.classificationPermissionHint}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label={copy.primaryClassification}
              value={form.manualPrimaryClassificationId}
              onChange={(event) => update('manualPrimaryClassificationId', event.target.value)}
              options={categoryOptions}
              disabled={!canManageHouseholdClassifications}
              containerClassName="!mb-0"
            />
          </div>

          <CreatableTagComboboxInput
            label={copy.incomeSources}
            values={form.incomeSources}
            onChange={(next) => update('incomeSources', next)}
            hint={copy.incomeSourcesHint}
            suggestions={incomeSourceSuggestions}
            error={errors.incomeSources}
            disabled={!canManageHouseholdClassifications}
            containerClassName="!mb-0"
          />
        </div>
      </form>
    </Modal>
  );
}
