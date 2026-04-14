import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usersApi } from '../../api/endpoints';
import { mapFieldErrors, normalizeApiError } from '../../api/errors';
import { useI18n } from '../../i18n/i18n';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import TextArea from '../ui/TextArea';
import HouseholdSocioeconomicSection, {
  buildSocioeconomicPayload,
  mapUserToSocioeconomicForm,
} from './HouseholdSocioeconomicSection';

const COPY = {
  en: {
    title: 'Edit household member',
    subtitle:
      'Update the member fields that define this house record. Use the full profile editor for permissions, family links, or unrelated fields.',
    identityTitle: 'Identity and contact',
    addressTitle: 'Address',
    notesTitle: 'Household notes',
    fullName: 'Full name',
    primaryPhone: 'Primary phone',
    secondaryPhone: 'Secondary phone',
    whatsappNumber: 'WhatsApp number',
    familyName: 'Family name',
    houseName: 'House name',
    governorate: 'Governorate',
    city: 'City',
    street: 'Street',
    addressDetails: 'Address details',
    notes: 'Notes',
    cancel: 'Cancel',
    save: 'Save changes',
    saveSuccess: 'Household member updated successfully.',
    fullNameRequired: 'Full name is required.',
    primaryPhoneRequired: 'Primary phone is required.',
  },
  ar: {
    title: 'تعديل بيانات فرد داخل الأسرة',
    subtitle:
      'حدّث الحقول التي تؤثر على سجل البيت من هنا. استخدم صفحة التعديل الكاملة للصلاحيات أو الروابط العائلية أو أي تفاصيل أخرى.',
    identityTitle: 'البيانات الأساسية ووسائل التواصل',
    addressTitle: 'العنوان',
    notesTitle: 'ملاحظات الأسرة',
    fullName: 'الاسم الكامل',
    primaryPhone: 'رقم الهاتف الأساسي',
    secondaryPhone: 'رقم الهاتف الثانوي',
    whatsappNumber: 'رقم واتساب',
    familyName: 'اسم العائلة',
    houseName: 'اسم البيت',
    governorate: 'المحافظة',
    city: 'المدينة',
    street: 'الشارع',
    addressDetails: 'تفاصيل العنوان',
    notes: 'ملاحظات',
    cancel: 'إلغاء',
    save: 'حفظ التعديلات',
    saveSuccess: 'تم تحديث بيانات الفرد بنجاح.',
    fullNameRequired: 'الاسم الكامل مطلوب.',
    primaryPhoneRequired: 'رقم الهاتف الأساسي مطلوب.',
  },
};

function cleanString(value) {
  const trimmed = String(value || '').trim();
  return trimmed || '';
}

function buildInitialForm(member = {}) {
  return {
    fullName: member?.fullName || '',
    phonePrimary: member?.phonePrimary || '',
    phoneSecondary: member?.phoneSecondary || '',
    whatsappNumber: member?.whatsappNumber || '',
    familyName: member?.familyName || '',
    houseName: member?.houseName || '',
    governorate: member?.address?.governorate || '',
    city: member?.address?.city || '',
    street: member?.address?.street || '',
    addressDetails: member?.address?.details || '',
    notes: member?.notes || '',
    ...mapUserToSocioeconomicForm(member),
  };
}

function buildAddressPayload(form) {
  const address = {};
  if (cleanString(form.governorate)) address.governorate = cleanString(form.governorate);
  if (cleanString(form.city)) address.city = cleanString(form.city);
  if (cleanString(form.street)) address.street = cleanString(form.street);
  if (cleanString(form.addressDetails)) address.details = cleanString(form.addressDetails);
  return Object.keys(address).length > 0 ? address : null;
}

export default function HouseholdMemberQuickEditModal({
  member,
  isOpen,
  onClose,
  onSaved,
}) {
  const { language } = useI18n();
  const copy = COPY[language === 'ar' ? 'ar' : 'en'];
  const memberId = member?._id || member?.id;
  const initialForm = useMemo(() => buildInitialForm(member), [member]);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    setForm(initialForm);
    setErrors({});
  }, [initialForm, isOpen]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await usersApi.update(memberId, payload);
      return data?.data ?? data;
    },
    onSuccess: (updatedMember) => {
      toast.success(copy.saveSuccess);
      onSaved?.(updatedMember);
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
    const nextErrors = {};
    const fullName = cleanString(form.fullName);
    const phonePrimary = cleanString(form.phonePrimary);

    if (!fullName) nextErrors.fullName = copy.fullNameRequired;
    if (!phonePrimary) nextErrors.phonePrimary = copy.primaryPhoneRequired;

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    mutation.mutate({
      fullName,
      phonePrimary,
      phoneSecondary: cleanString(form.phoneSecondary) || null,
      whatsappNumber: cleanString(form.whatsappNumber) || null,
      familyName: cleanString(form.familyName) || null,
      houseName: cleanString(form.houseName) || null,
      address: buildAddressPayload(form),
      notes: cleanString(form.notes) || null,
      ...buildSocioeconomicPayload(form, { includeNulls: true }),
    });
  };

  if (!memberId) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={copy.title}
      size="xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button
            type="submit"
            form="household-member-quick-edit-form"
            loading={mutation.isPending}
          >
            {copy.save}
          </Button>
        </>
      }
    >
      <form id="household-member-quick-edit-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
          <p className="text-sm font-semibold text-heading">{member?.fullName || copy.title}</p>
          <p className="mt-1 text-xs text-muted">{copy.subtitle}</p>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              {copy.identityTitle}
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label={copy.fullName}
              value={form.fullName}
              onChange={(event) => update('fullName', event.target.value)}
              error={errors.fullName}
              containerClassName="!mb-0"
            />
            <Input
              label={copy.primaryPhone}
              value={form.phonePrimary}
              onChange={(event) => update('phonePrimary', event.target.value)}
              error={errors.phonePrimary}
              containerClassName="!mb-0"
            />
            <Input
              label={copy.secondaryPhone}
              value={form.phoneSecondary}
              onChange={(event) => update('phoneSecondary', event.target.value)}
              error={errors.phoneSecondary}
              containerClassName="!mb-0"
            />
            <Input
              label={copy.whatsappNumber}
              value={form.whatsappNumber}
              onChange={(event) => update('whatsappNumber', event.target.value)}
              error={errors.whatsappNumber}
              containerClassName="!mb-0"
            />
            <Input
              label={copy.familyName}
              value={form.familyName}
              onChange={(event) => update('familyName', event.target.value)}
              error={errors.familyName}
              containerClassName="!mb-0"
            />
            <Input
              label={copy.houseName}
              value={form.houseName}
              onChange={(event) => update('houseName', event.target.value)}
              error={errors.houseName}
              containerClassName="!mb-0"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              {copy.addressTitle}
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label={copy.governorate}
              value={form.governorate}
              onChange={(event) => update('governorate', event.target.value)}
              error={errors['address.governorate']}
              containerClassName="!mb-0"
            />
            <Input
              label={copy.city}
              value={form.city}
              onChange={(event) => update('city', event.target.value)}
              error={errors['address.city']}
              containerClassName="!mb-0"
            />
            <Input
              label={copy.street}
              value={form.street}
              onChange={(event) => update('street', event.target.value)}
              error={errors['address.street']}
              containerClassName="!mb-0"
            />
            <Input
              label={copy.addressDetails}
              value={form.addressDetails}
              onChange={(event) => update('addressDetails', event.target.value)}
              error={errors['address.details']}
              containerClassName="!mb-0"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              {copy.notesTitle}
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <TextArea
            label={copy.notes}
            value={form.notes}
            onChange={(event) => update('notes', event.target.value)}
            error={errors.notes}
          />
        </section>

        <HouseholdSocioeconomicSection form={form} errors={errors} onChange={update} />
      </form>
    </Modal>
  );
}
