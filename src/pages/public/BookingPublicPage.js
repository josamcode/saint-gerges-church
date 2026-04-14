import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, ImagePlus, Loader2, NotebookPen, Phone, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { bookingsApi } from '../../api/endpoints';
import { mapFieldErrors, normalizeApiError } from '../../api/errors';
import { useAuth } from '../../auth/auth.hooks';
import Button from '../../components/ui/Button';
import Card, { CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import TextArea from '../../components/ui/TextArea';
import { getLanguageLocale, useI18n } from '../../i18n/i18n';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function emptyForm() {
  return {
    bookingTypeId: '',
    requesterName: '',
    requesterPhone: '',
    requesterEmail: '',
    scheduledDate: '',
    scheduledTime: '',
    notes: '',
    dynamicFields: {},
  };
}

function availabilityModeLabel(mode, tf) {
  switch (mode) {
    case 'ALWAYS':
      return tf('bookings.public.modes.always', 'Always available');
    case 'DATE_RANGE':
      return tf('bookings.public.modes.dateRange', 'Within a date range');
    case 'DATE_TIME_RANGE':
      return tf('bookings.public.modes.dateTimeRange', 'Within a date and time range');
    case 'SPECIFIC_DAYS':
      return tf('bookings.public.modes.specificDays', 'Specific days');
    case 'SPECIFIC_DAYS_TIME':
      return tf('bookings.public.modes.specificDaysTime', 'Specific days and times');
    case 'SPECIFIC_DATES':
      return tf('bookings.public.modes.specificDates', 'Specific dates');
    case 'SPECIFIC_DATES_TIME':
    case 'DATE_TIME':
      return tf('bookings.public.modes.specificDatesTime', 'Specific dates and times');
    case 'NONE':
      return tf('bookings.public.modes.none', 'No availability');
    default:
      return mode;
  }
}

function isExactTimeMode(mode) {
  return mode === 'SPECIFIC_DATES_TIME' || mode === 'DATE_TIME';
}

function hasTimeScope(mode) {
  return mode === 'DATE_TIME_RANGE' || mode === 'SPECIFIC_DAYS_TIME' || isExactTimeMode(mode);
}

function getSpecificDates(type) {
  if (!type) return [];

  const datesFromSpecificDates = (Array.isArray(type.availabilityConfig?.specificDates)
    ? type.availabilityConfig.specificDates
    : [])
    .map((entry) => entry.date)
    .filter(Boolean);

  const datesFromLegacyDateTimes = (Array.isArray(type.availabilityConfig?.exactDateTimes)
    ? type.availabilityConfig.exactDateTimes
    : [])
    .map((entry) => entry.date)
    .filter(Boolean);

  return [...new Set([...datesFromSpecificDates, ...datesFromLegacyDateTimes])].sort();
}

function parseDateString(dateStr) {
  if (!DATE_PATTERN.test(String(dateStr || ''))) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateString(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayDateString() {
  return formatDateString(new Date());
}

function addDays(dateStr, days) {
  const date = parseDateString(dateStr);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return formatDateString(date);
}

function buildDateRange(startDate, endDate) {
  if (!DATE_PATTERN.test(String(startDate || '')) || !DATE_PATTERN.test(String(endDate || ''))) return [];
  if (startDate > endDate) return [];

  const result = [];
  let current = parseDateString(startDate);
  const last = parseDateString(endDate);
  if (!current || !last) return [];

  while (current <= last) {
    result.push(formatDateString(current));
    current = new Date(current);
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return result;
}

function formatDateOptionLabel(dateStr, locale) {
  const date = parseDateString(dateStr);
  if (!date) return dateStr;
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getBookingWindow(type) {
  const min = getTodayDateString();
  const horizonDays = Math.max(Number(type?.bookingHorizonDays) || 60, 1);
  return {
    min,
    max: addDays(min, horizonDays - 1) || min,
  };
}

function isWithinDateBounds(dateStr, bounds) {
  if (!DATE_PATTERN.test(String(dateStr || ''))) return false;
  if (bounds?.min && dateStr < bounds.min) return false;
  if (bounds?.max && dateStr > bounds.max) return false;
  return true;
}

function getDateInputConstraints(type) {
  const mode = type?.availabilityMode;
  if (!type || !mode) return {};

  const bookingWindow = getBookingWindow(type);

  if (
    mode === 'ALWAYS' ||
    mode === 'SPECIFIC_DAYS' ||
    mode === 'SPECIFIC_DAYS_TIME'
  ) {
    return bookingWindow;
  }

  if (mode === 'DATE_RANGE' || mode === 'DATE_TIME_RANGE') {
    const configuredStart = type.availabilityConfig?.dateRange?.startDate || bookingWindow.min;
    const configuredEnd = type.availabilityConfig?.dateRange?.endDate || bookingWindow.max;
    return {
      min: configuredStart > bookingWindow.min ? configuredStart : bookingWindow.min,
      max: configuredEnd < bookingWindow.max ? configuredEnd : bookingWindow.max,
    };
  }

  return {};
}

function getTimeInputConstraints(type) {
  const mode = type?.availabilityMode;
  if (!type || !mode) return {};

  if (mode === 'DATE_TIME_RANGE' || mode === 'SPECIFIC_DAYS_TIME') {
    return {
      min: type.availabilityConfig?.timeRange?.startTime || undefined,
      max: type.availabilityConfig?.timeRange?.endTime || undefined,
    };
  }

  return {};
}

function getVisibleSpecificDates(type) {
  if (!type) return [];
  const bookingWindow = getBookingWindow(type);
  return getSpecificDates(type).filter((date) => isWithinDateBounds(date, bookingWindow));
}

function getSelectableDates(type) {
  if (!type) return [];

  switch (type.availabilityMode) {
    case 'SPECIFIC_DAYS':
    case 'SPECIFIC_DAYS_TIME': {
      const bookingWindow = getBookingWindow(type);
      const allowedDays = new Set(
        Array.isArray(type.availabilityConfig?.specificDays)
          ? type.availabilityConfig.specificDays.map(Number)
          : []
      );
      return buildDateRange(bookingWindow.min, bookingWindow.max).filter((dateStr) => {
        const date = parseDateString(dateStr);
        return date && allowedDays.has(date.getDay());
      });
    }
    case 'SPECIFIC_DATES':
      return getVisibleSpecificDates(type);
    default:
      return [];
  }
}

function isDateAllowedForType(type, scheduledDate) {
  if (!type || !DATE_PATTERN.test(String(scheduledDate || ''))) return false;

  const bookingWindow = getBookingWindow(type);
  if (!isWithinDateBounds(scheduledDate, bookingWindow)) return false;

  switch (type.availabilityMode) {
    case 'ALWAYS':
      return true;
    case 'DATE_RANGE':
    case 'DATE_TIME_RANGE': {
      const bounds = getDateInputConstraints(type);
      return isWithinDateBounds(scheduledDate, bounds);
    }
    case 'SPECIFIC_DAYS':
    case 'SPECIFIC_DAYS_TIME': {
      const allowedDays = new Set(
        Array.isArray(type.availabilityConfig?.specificDays)
          ? type.availabilityConfig.specificDays.map(Number)
          : []
      );
      const date = parseDateString(scheduledDate);
      return Boolean(date) && allowedDays.has(date.getDay());
    }
    case 'SPECIFIC_DATES':
    case 'SPECIFIC_DATES_TIME':
    case 'DATE_TIME':
      return getVisibleSpecificDates(type).includes(scheduledDate);
    case 'NONE':
    default:
      return false;
  }
}

function hasBookableAvailability(type, { exactTimeMode, dateGroups, selectableDates, dateConstraints }) {
  if (!type || type.availabilityMode === 'NONE') return false;
  if (exactTimeMode) return dateGroups.length > 0;
  if (['SPECIFIC_DAYS', 'SPECIFIC_DAYS_TIME', 'SPECIFIC_DATES'].includes(type.availabilityMode)) {
    return selectableDates.length > 0;
  }
  if (dateConstraints?.min && dateConstraints?.max && dateConstraints.min > dateConstraints.max) {
    return false;
  }
  return true;
}

function DynamicFieldInput({
  field,
  value,
  onChange,
  uploadImage,
  uploading,
  tf,
}) {
  const fileInputRef = useRef(null);

  if (field.type === 'textarea') {
    return (
      <TextArea
        label={field.label}
        value={value || ''}
        required={field.required}
        hint={field.helpText || undefined}
        placeholder={field.placeholder || undefined}
        onChange={(event) => onChange(field.key, event.target.value)}
        className="min-h-[110px]"
      />
    );
  }

  if (field.type === 'select') {
    return (
      <Select
        label={field.label}
        value={value || ''}
        required={field.required}
        hint={field.helpText || undefined}
        onChange={(event) => onChange(field.key, event.target.value)}
        options={[
          { value: '', label: tf('bookings.public.chooseOption', 'Choose an option') },
          ...(field.options || []).map((option) => ({
            value: option.value,
            label: option.label,
          })),
        ]}
      />
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(field.key, event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span>
            <span className="block text-sm font-medium text-heading">{field.label}</span>
            {field.helpText ? <span className="mt-1 block text-xs text-muted">{field.helpText}</span> : null}
          </span>
        </label>
      </div>
    );
  }

  if (field.type === 'image') {
    return (
      <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-heading">
              {field.label}
              {field.required ? <span className="ms-1 text-danger">*</span> : null}
            </p>
            {field.helpText ? <p className="mt-1 text-xs text-muted">{field.helpText}</p> : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(event) => uploadImage(field.key, event)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={ImagePlus}
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {tf('bookings.public.uploadImage', 'Upload image')}
          </Button>
        </div>

        {value?.url ? (
          <div className="space-y-3">
            <img src={value.url} alt={field.label} className="max-h-56 rounded-xl border border-border object-contain" />
            <a href={value.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">
              {tf('bookings.public.openImage', 'Open uploaded image')}
            </a>
          </div>
        ) : (
          <p className="text-xs text-muted">{tf('bookings.public.noImage', 'No image uploaded yet.')}</p>
        )}
      </div>
    );
  }

  const type =
    field.type === 'number'
      ? 'number'
      : field.type === 'email'
        ? 'email'
        : field.type === 'phone'
          ? 'tel'
          : field.type === 'date'
            ? 'date'
            : 'text';

  return (
    <Input
      label={field.label}
      type={type}
      value={value ?? ''}
      required={field.required}
      hint={field.helpText || undefined}
      placeholder={field.placeholder || undefined}
      onChange={(event) => onChange(field.key, type === 'number' ? event.target.value : event.target.value)}
    />
  );
}

export default function BookingPublicPage() {
  const { t, language } = useI18n();
  const { user, isAuthenticated } = useAuth();
  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const locale = getLanguageLocale(language);

  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [lastCreatedBooking, setLastCreatedBooking] = useState(null);
  const [uploadingFields, setUploadingFields] = useState({});

  const typesQuery = useQuery({
    queryKey: ['bookings', 'public', 'types'],
    queryFn: async () => {
      const { data } = await bookingsApi.public.listTypes();
      return data;
    },
    staleTime: 60000,
  });

  const bookingTypes = useMemo(
    () => (Array.isArray(typesQuery.data?.data) ? typesQuery.data.data : []),
    [typesQuery.data]
  );
  const selectedType = bookingTypes.find((type) => type.id === form.bookingTypeId) || null;
  const timeScopedMode = hasTimeScope(selectedType?.availabilityMode);
  const selectableDateOptions = getSelectableDates(selectedType).map((date) => ({
    value: date,
    label: formatDateOptionLabel(date, locale),
  }));
  const dateInputConstraints = getDateInputConstraints(selectedType);
  const timeInputConstraints = getTimeInputConstraints(selectedType);

  useEffect(() => {
    if (!bookingTypes.length || form.bookingTypeId) return;
    setForm((current) => ({ ...current, bookingTypeId: bookingTypes[0].id }));
  }, [bookingTypes, form.bookingTypeId]);

  useEffect(() => {
    if (!user) return;

    setForm((current) => ({
      ...current,
      requesterName: current.requesterName || user.fullName || '',
      requesterPhone: current.requesterPhone || user.phonePrimary || '',
      requesterEmail: current.requesterEmail || user.email || '',
    }));
  }, [user]);

  const slotsQuery = useQuery({
    queryKey: ['bookings', 'public', 'slots', form.bookingTypeId],
    enabled: Boolean(form.bookingTypeId && timeScopedMode),
    queryFn: async () => {
      const { data } = await bookingsApi.public.getSlots(form.bookingTypeId, {
        days: Number(selectedType?.bookingHorizonDays) || 60,
      });
      return data;
    },
    staleTime: 30000,
  });

  const dateGroups = useMemo(
    () => (Array.isArray(slotsQuery.data?.data?.dates) ? slotsQuery.data.data.dates : []),
    [slotsQuery.data]
  );
  const dateOptions = dateGroups.map((entry) => ({
    value: entry.date,
    label: formatDateOptionLabel(entry.date, locale),
  }));
  const selectedDateGroup = dateGroups.find((entry) => entry.date === form.scheduledDate) || null;
  const timeOptions = (selectedDateGroup?.slots || []).map((slot) => ({
    value: slot.time,
    label: `${slot.time} • ${tf('bookings.public.remaining', 'Remaining')} ${slot.remaining}`,
  }));
  const canBookSelectedType = hasBookableAvailability(selectedType, {
    exactTimeMode: timeScopedMode,
    dateGroups,
    selectableDates: selectableDateOptions,
    dateConstraints: dateInputConstraints,
  });

  useEffect(() => {
    if (!timeScopedMode) return;

    if (!dateGroups.length) {
      setForm((current) => ({ ...current, scheduledDate: '', scheduledTime: '' }));
      return;
    }

    const firstDate = dateGroups[0];
    const hasCurrentDate = dateGroups.some((entry) => entry.date === form.scheduledDate);
    const nextDate = hasCurrentDate ? form.scheduledDate : firstDate.date;
    const matchingDate = dateGroups.find((entry) => entry.date === nextDate) || firstDate;
    const hasCurrentTime = matchingDate.slots.some((slot) => slot.time === form.scheduledTime);
    const nextTime = hasCurrentTime ? form.scheduledTime : matchingDate.slots[0]?.time || '';

    if (nextDate !== form.scheduledDate || nextTime !== form.scheduledTime) {
      setForm((current) => ({
        ...current,
        scheduledDate: nextDate,
        scheduledTime: nextTime,
      }));
    }
  }, [dateGroups, timeScopedMode, form.scheduledDate, form.scheduledTime]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      scheduledDate: '',
      scheduledTime: '',
      dynamicFields: {},
    }));
  }, [form.bookingTypeId]);

  useEffect(() => {
    if (timeScopedMode || !selectedType) return;

    if (
      ['SPECIFIC_DAYS', 'SPECIFIC_DAYS_TIME', 'SPECIFIC_DATES'].includes(selectedType.availabilityMode) &&
      selectableDateOptions.length > 0 &&
      !form.scheduledDate
    ) {
      setForm((current) => ({
        ...current,
        scheduledDate: selectableDateOptions[0].value,
      }));
    }
  }, [timeScopedMode, selectedType, selectableDateOptions, form.scheduledDate]);

  useEffect(() => {
    if (!selectedType || timeScopedMode) return;

    setForm((current) => {
      let nextDate = current.scheduledDate;
      let nextTime = current.scheduledTime;
      let changed = false;

      if (['SPECIFIC_DAYS', 'SPECIFIC_DAYS_TIME', 'SPECIFIC_DATES'].includes(selectedType.availabilityMode)) {
        const allowedDates = selectableDateOptions.map((option) => option.value);
        if (!allowedDates.length) {
          if (nextDate || nextTime) {
            nextDate = '';
            nextTime = '';
            changed = true;
          }
        } else if (!allowedDates.includes(nextDate)) {
          nextDate = allowedDates[0];
          changed = true;
        }
      } else if (nextDate && !isDateAllowedForType(selectedType, nextDate)) {
        nextDate = '';
        changed = true;
      }

      if (nextTime && timeInputConstraints.min && nextTime < timeInputConstraints.min) {
        nextTime = '';
        changed = true;
      }

      if (nextTime && timeInputConstraints.max && nextTime > timeInputConstraints.max) {
        nextTime = '';
        changed = true;
      }

      if (!changed) return current;
      return {
        ...current,
        scheduledDate: nextDate,
        scheduledTime: nextTime,
      };
    });
  }, [
    timeScopedMode,
    selectedType,
    selectableDateOptions,
    timeInputConstraints.max,
    timeInputConstraints.min,
  ]);

  const createBookingMutation = useMutation({
    mutationFn: (payload) => bookingsApi.public.create(payload),
    onSuccess: (response) => {
      const booking = response?.data?.data ?? response?.data ?? null;
      setLastCreatedBooking(booking);
      setForm((current) => ({
        ...emptyForm(),
        bookingTypeId: current.bookingTypeId,
        requesterName: current.requesterName,
        requesterPhone: current.requesterPhone,
        requesterEmail: current.requesterEmail,
      }));
      setFormErrors({});
      toast.success(tf('bookings.public.created', 'Your booking has been submitted.'));
      slotsQuery.refetch();
    },
    onError: (error) => {
      const normalized = normalizeApiError(error);
      setFormErrors(mapFieldErrors(normalized.details));
      toast.error(normalized.message);
    },
  });

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  };

  const updateDynamicField = (key, value) => {
    setForm((current) => ({
      ...current,
      dynamicFields: {
        ...current.dynamicFields,
        [key]: value,
      },
    }));
  };

  const handleImageUpload = async (fieldKey, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!form.bookingTypeId) {
      toast.error(tf('bookings.public.typeRequired', 'Please choose a booking type.'));
      return;
    }

    setUploadingFields((current) => ({ ...current, [fieldKey]: true }));
    try {
      const response = await bookingsApi.public.uploadImage(file, {
        bookingTypeId: form.bookingTypeId,
        fieldKey,
      });
      const payload = response?.data?.data ?? response?.data ?? null;
      if (!payload?.url) {
        throw new Error(tf('bookings.public.uploadFailed', 'Failed to upload image.'));
      }
      updateDynamicField(fieldKey, payload);
      toast.success(tf('bookings.public.imageUploaded', 'Image uploaded successfully.'));
    } catch (error) {
      toast.error(normalizeApiError(error).message || tf('bookings.public.uploadFailed', 'Failed to upload image.'));
    } finally {
      setUploadingFields((current) => ({ ...current, [fieldKey]: false }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!form.bookingTypeId) nextErrors.bookingTypeId = tf('bookings.public.typeRequired', 'Please choose a booking type.');
    if (!form.requesterName.trim()) nextErrors.requesterName = tf('bookings.public.nameRequired', 'Your name is required.');
    if (!form.requesterPhone.trim()) nextErrors.requesterPhone = tf('bookings.public.phoneRequired', 'A phone number is required.');
    if (selectedType && !canBookSelectedType) {
      nextErrors.bookingTypeId = tf(
        'bookings.public.noAvailability',
        'There are no available slots for this booking type right now.'
      );
    }
    if (!form.scheduledDate) nextErrors.scheduledDate = tf('bookings.public.dateRequired', 'Please choose a date.');
    if (timeScopedMode && !form.scheduledTime) {
      nextErrors.scheduledTime = tf('bookings.public.timeRequired', 'Please choose a time.');
    }
    if (form.scheduledDate && selectedType && !isDateAllowedForType(selectedType, form.scheduledDate)) {
      nextErrors.scheduledDate = tf(
        'bookings.public.invalidDate',
        'The selected date is not available for this booking type.'
      );
    }
    if (
      timeScopedMode &&
      form.scheduledTime &&
      timeInputConstraints.min &&
      form.scheduledTime < timeInputConstraints.min
    ) {
      nextErrors.scheduledTime = tf(
        'bookings.public.invalidTime',
        'The selected time is not available for this booking type.'
      );
    }
    if (
      timeScopedMode &&
      form.scheduledTime &&
      timeInputConstraints.max &&
      form.scheduledTime > timeInputConstraints.max
    ) {
      nextErrors.scheduledTime = tf(
        'bookings.public.invalidTime',
        'The selected time is not available for this booking type.'
      );
    }

    for (const field of selectedType?.dynamicFields || []) {
      const value = form.dynamicFields[field.key];
      if (!field.required) continue;

      const isEmpty =
        value === null ||
        value === undefined ||
        value === '' ||
        (typeof value === 'object' && !Array.isArray(value) && !value?.url) ||
        (Array.isArray(value) && value.length === 0);

      if (isEmpty) {
        nextErrors[`dynamicFields.${field.key}`] = tf('bookings.public.dynamicRequired', `${field.label} is required.`);
      }
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    createBookingMutation.mutate({
      bookingTypeId: form.bookingTypeId,
      requesterName: form.requesterName.trim(),
      requesterPhone: form.requesterPhone.trim(),
      requesterEmail: form.requesterEmail.trim() || null,
      scheduledDate: form.scheduledDate,
      scheduledTime: timeScopedMode ? form.scheduledTime : null,
      notes: form.notes.trim() || null,
      dynamicFields: Object.entries(form.dynamicFields).map(([key, value]) => ({ key, value })),
    });
  };

  const usesDateSelect =
    timeScopedMode ||
    ['SPECIFIC_DAYS', 'SPECIFIC_DATES'].includes(selectedType?.availabilityMode);
  const isTypeUnavailable = Boolean(selectedType) && !canBookSelectedType;
  const isTimeDisabled = !selectedType || isTypeUnavailable || !timeScopedMode || !form.scheduledDate;

  return (
    <div className="relative overflow-hidden bg-page">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-[90px]" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-accent/10 blur-[80px]" />
      </div>

      <section className="page-container relative py-28">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              <CalendarClock className="h-3.5 w-3.5" />
              {tf('bookings.public.eyebrow', 'Book an appointment')}
            </span>
            <h1 className="text-4xl font-black tracking-tight text-heading sm:text-5xl">
              {tf('bookings.public.title', 'Choose the service, date, and time that fit you best.')}
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted">
              {tf(
                'bookings.public.subtitle',
                'Pick a booking type, review its instructions, choose an available date and time, then submit your details and any required information.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="rounded-[28px] border-white/50 bg-surface/90 backdrop-blur">
              <CardHeader
                title={tf('bookings.public.formTitle', 'Appointment request')}
                subtitle={tf('bookings.public.formSubtitle', 'Only available slots are shown below.')}
              />

              <form onSubmit={handleSubmit} className="space-y-4">
                <Select
                  label={tf('bookings.public.type', 'Booking type')}
                  value={form.bookingTypeId}
                  onChange={(event) => updateField('bookingTypeId', event.target.value)}
                  error={formErrors.bookingTypeId}
                  options={bookingTypes.map((type) => ({
                    value: type.id,
                    label: type.name,
                  }))}
                  placeholder={tf('bookings.public.typePlaceholder', 'Choose a booking type')}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label={tf('bookings.public.requesterName', 'Full name')}
                    value={form.requesterName}
                    onChange={(event) => updateField('requesterName', event.target.value)}
                    error={formErrors.requesterName}
                    icon={UserRound}
                    required
                    containerClassName="!mb-0"
                  />
                  <Input
                    label={tf('bookings.public.requesterPhone', 'Phone')}
                    value={form.requesterPhone}
                    onChange={(event) => updateField('requesterPhone', event.target.value)}
                    error={formErrors.requesterPhone}
                    icon={Phone}
                    required
                    containerClassName="!mb-0"
                  />
                </div>

                {/* <Input
                  label={tf('bookings.public.requesterEmail', 'Email')}
                  type="email"
                  value={form.requesterEmail}
                  onChange={(event) => updateField('requesterEmail', event.target.value)}
                  containerClassName="!mb-0"
                /> */}

                <div className={`grid grid-cols-1 gap-4 ${timeScopedMode ? 'md:grid-cols-2' : ''}`}>
                  {usesDateSelect ? (
                    <Select
                      label={tf('bookings.public.date', 'Date')}
                      value={form.scheduledDate}
                      onChange={(event) => updateField('scheduledDate', event.target.value)}
                      error={formErrors.scheduledDate}
                      options={timeScopedMode ? dateOptions : selectableDateOptions}
                      placeholder={tf('bookings.public.datePlaceholder', 'Choose a date')}
                      disabled={!selectedType || isTypeUnavailable}
                    />
                  ) : (
                    <Input
                      label={tf('bookings.public.date', 'Date')}
                      type="date"
                      value={form.scheduledDate}
                      onChange={(event) => updateField('scheduledDate', event.target.value)}
                      error={formErrors.scheduledDate}
                      min={dateInputConstraints.min}
                      max={dateInputConstraints.max}
                      disabled={!selectedType || isTypeUnavailable}
                      containerClassName="!mb-0"
                    />
                  )}

                  {timeScopedMode ? (
                    <Select
                      label={tf('bookings.public.time', 'Time')}
                      value={form.scheduledTime}
                      onChange={(event) => updateField('scheduledTime', event.target.value)}
                      error={formErrors.scheduledTime}
                      options={timeOptions}
                      placeholder={tf('bookings.public.timePlaceholder', 'Choose a time')}
                      disabled={isTimeDisabled}
                    />
                  ) : null}
                </div>

                <TextArea
                  label={tf('bookings.public.notes', 'Notes')}
                  value={form.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                  placeholder={tf('bookings.public.notesPlaceholder', 'Add any details that would help the administrator prepare.')}
                  className="min-h-[120px]"
                  containerClassName="!mb-0"
                />

                {selectedType?.dynamicFields?.length ? (
                  <div className="space-y-2 rounded-[24px] border border-border bg-surface-alt/35 p-4">
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-heading">{tf('bookings.public.additionalFields', 'Additional information')}</p>
                      <p className="text-xs text-muted">
                        {tf('bookings.public.additionalFieldsHint', 'These fields depend on the booking type you selected.')}
                      </p>
                    </div>

                    {selectedType.dynamicFields.map((field) => (
                      <div key={field.key}>
                        <DynamicFieldInput
                          field={field}
                          value={form.dynamicFields[field.key]}
                          onChange={updateDynamicField}
                          uploadImage={handleImageUpload}
                          uploading={Boolean(uploadingFields[field.key])}
                          tf={tf}
                        />
                        {formErrors[`dynamicFields.${field.key}`] ? (
                          <p className="-mt-2 mb-3 text-xs text-danger">{formErrors[`dynamicFields.${field.key}`]}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  loading={createBookingMutation.isPending}
                  disabled={!selectedType || isTypeUnavailable}
                  className="w-full rounded-2xl !py-4 text-sm font-bold"
                  icon={NotebookPen}
                >
                  {tf('bookings.public.submit', 'Submit booking')}
                </Button>
              </form>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-[28px] border-white/50 bg-surface/90 backdrop-blur">
                <CardHeader
                  title={selectedType?.name || tf('bookings.public.typePreview', 'Booking details')}
                  subtitle={
                    selectedType
                      ? availabilityModeLabel(selectedType.availabilityMode, tf)
                      : tf('bookings.public.pickType', 'Choose a booking type to see instructions and fields.')
                  }
                />

                {typesQuery.isLoading || (timeScopedMode && slotsQuery.isLoading) ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-alt/40 p-4 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tf('bookings.public.loading', 'Loading availability...')}
                  </div>
                ) : null}

                {selectedType?.instructions ? (
                  <div className="rounded-2xl border border-border bg-surface-alt/35 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {tf('bookings.public.instructions', 'Instructions')}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{selectedType.instructions}</p>
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {timeScopedMode && dateGroups.length > 0 ? (
                    dateGroups.slice(0, 4).map((group) => (
                      <div key={group.date} className="rounded-2xl border border-border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-heading">{group.date}</span>
                          <span className="text-xs text-muted">{group.slots.length} {tf('bookings.public.times', 'times')}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.slots.slice(0, 6).map((slot) => (
                            <span key={`${group.date}-${slot.time}`} className="rounded-full bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                              {slot.time}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : selectedType ? (
                    <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted">
                      {selectedType.availabilityMode === 'NONE'
                        ? tf('bookings.public.noAvailability', 'There are no available slots for this booking type right now.')
                        : selectedType.availabilityMode === 'ALWAYS'
                          ? tf('bookings.public.alwaysHint', 'The requester can choose any date and time.')
                          : selectedType.availabilityMode === 'DATE_RANGE'
                            ? tf('bookings.public.dateRangeHint', 'Choose any date inside the configured date range and any time you want.')
                            : selectedType.availabilityMode === 'DATE_TIME_RANGE'
                              ? tf('bookings.public.dateTimeRangeHint', 'Choose any date inside the configured range and any time inside the allowed time range.')
                              : selectedType.availabilityMode === 'SPECIFIC_DAYS'
                                ? tf('bookings.public.specificDaysHint', 'Choose a date that matches one of the allowed weekdays, then choose any time you want.')
                                : selectedType.availabilityMode === 'SPECIFIC_DAYS_TIME'
                                  ? tf('bookings.public.specificDaysTimeHint', 'Choose a date that matches one of the allowed weekdays and a time inside the allowed time range.')
                                  : selectedType.availabilityMode === 'SPECIFIC_DATES'
                                    ? tf('bookings.public.specificDatesHint', 'Choose one of the configured dates, then choose any time you want.')
                                    : tf('bookings.public.noAvailability', 'There are no available slots for this booking type right now.')}
                    </div>
                  ) : null}
                </div>
              </Card>

              {lastCreatedBooking ? (
                <Card className="rounded-[28px] border-success/20 bg-success-light/50">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-success/15 p-3 text-success">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-heading">{tf('bookings.public.successTitle', 'Booking submitted')}</p>
                      <p className="mt-1 text-sm text-muted">
                        {lastCreatedBooking.bookingType?.name} • {lastCreatedBooking.scheduledDate}
                        {lastCreatedBooking.scheduledTime ? ` • ${lastCreatedBooking.scheduledTime}` : ''}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        {tf('bookings.public.successBody', 'An administrator can now review and manage your booking from the dashboard.')}
                      </p>
                      {isAuthenticated ? (
                        <Link
                          to="/dashboard/bookings/mine"
                          className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline"
                        >
                          {tf('bookings.public.viewMyBookings', 'View my bookings')}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
