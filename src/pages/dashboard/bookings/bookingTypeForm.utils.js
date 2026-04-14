export const WEEK_DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const AVAILABILITY_MODES = [
  { value: 'NONE' },
  { value: 'ALWAYS' },
  { value: 'DATE_RANGE' },
  { value: 'DATE_TIME_RANGE' },
  { value: 'SPECIFIC_DAYS' },
  { value: 'SPECIFIC_DAYS_TIME' },
  { value: 'SPECIFIC_DATES' },
  { value: 'SPECIFIC_DATES_TIME' },
];

export const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Select' },
  { value: 'image', label: 'Image' },
];

export function createEmptyTypeForm() {
  return {
    id: null,
    name: '',
    description: '',
    instructions: '',
    isActive: true,
    availabilityMode: 'NONE',
    durationMinutes: 30,
    slotIntervalMinutes: 30,
    capacity: 1,
    bookingHorizonDays: 60,
    availabilityConfig: {
      timezone: 'Africa/Cairo',
      timeRange: { startTime: '09:00', endTime: '17:00' },
      dateRange: { startDate: '', endDate: '' },
      specificDays: [],
      specificDates: [],
      exactDateTimes: [],
    },
    dynamicFields: [],
  };
}

export function createAdvancedSettings(form = createEmptyTypeForm()) {
  return {
    durationMinutes: Number(form.durationMinutes) !== 30,
    slotIntervalMinutes: Number(form.slotIntervalMinutes) !== 30,
    capacity: Number(form.capacity) !== 1,
    bookingHorizonDays: Number(form.bookingHorizonDays) !== 60,
  };
}

export function modeUsesAvailabilityRules(mode) {
  return !['NONE', 'ALWAYS'].includes(mode);
}

export function modeUsesTimeRange(mode) {
  return ['DATE_TIME_RANGE', 'SPECIFIC_DAYS_TIME'].includes(mode);
}

export function modeUsesDateRange(mode) {
  return ['DATE_RANGE', 'DATE_TIME_RANGE'].includes(mode);
}

export function modeUsesSpecificDays(mode) {
  return ['SPECIFIC_DAYS', 'SPECIFIC_DAYS_TIME'].includes(mode);
}

export function modeUsesSpecificDates(mode) {
  return ['SPECIFIC_DATES', 'SPECIFIC_DATES_TIME'].includes(mode);
}

export function modeUsesExactTimes(mode) {
  return ['SPECIFIC_DATES_TIME', 'DATE_TIME'].includes(mode);
}

export function availabilityLabel(mode, tf) {
  switch (mode) {
    case 'NONE':
      return tf('bookings.public.modes.none', 'No availability');
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
    default:
      return mode;
  }
}

export function mapTypeToForm(type) {
  const exactDatesFromLegacy = Array.isArray(type.availabilityConfig?.exactDateTimes)
    ? type.availabilityConfig.exactDateTimes.reduce((acc, entry) => {
      const existing = acc.find((item) => item.date === entry.date);
      if (existing) {
        existing.exactTimes = [
          ...new Set([...(existing.exactTimes || []), entry.time || '']),
        ]
          .filter(Boolean)
          .sort();
        return acc;
      }

      acc.push({
        date: entry.date || '',
        startTime: '',
        endTime: '',
        exactTimes: entry.time ? [entry.time] : [],
      });
      return acc;
    }, [])
    : [];

  const specificDates = Array.isArray(type.availabilityConfig?.specificDates)
    ? type.availabilityConfig.specificDates.map((entry) => ({
      date: entry.date || '',
      startTime: entry.startTime || '',
      endTime: entry.endTime || '',
      exactTimes: Array.isArray(entry.exactTimes) ? entry.exactTimes : [],
    }))
    : [];

  const mergedSpecificDates = [...specificDates];
  exactDatesFromLegacy.forEach((entry) => {
    if (mergedSpecificDates.some((item) => item.date === entry.date)) return;
    mergedSpecificDates.push(entry);
  });

  return {
    id: type.id,
    name: type.name || '',
    description: type.description || '',
    instructions: type.instructions || '',
    isActive: type.isActive !== false,
    availabilityMode:
      type.availabilityMode === 'DATE_TIME'
        ? 'SPECIFIC_DATES_TIME'
        : (type.availabilityMode || 'NONE'),
    durationMinutes: type.durationMinutes || 30,
    slotIntervalMinutes: type.slotIntervalMinutes || 30,
    capacity: type.capacity || 1,
    bookingHorizonDays: type.bookingHorizonDays || 60,
    availabilityConfig: {
      timezone: type.availabilityConfig?.timezone || 'Africa/Cairo',
      timeRange: {
        startTime: type.availabilityConfig?.timeRange?.startTime || '09:00',
        endTime: type.availabilityConfig?.timeRange?.endTime || '17:00',
      },
      dateRange: {
        startDate: type.availabilityConfig?.dateRange?.startDate || '',
        endDate: type.availabilityConfig?.dateRange?.endDate || '',
      },
      specificDays: Array.isArray(type.availabilityConfig?.specificDays)
        ? type.availabilityConfig.specificDays
        : [],
      specificDates: mergedSpecificDates,
      exactDateTimes: [],
    },
    dynamicFields: Array.isArray(type.dynamicFields)
      ? type.dynamicFields.map((field) => ({
        key: field.key || '',
        label: field.label || '',
        type: field.type || 'text',
        required: Boolean(field.required),
        placeholder: field.placeholder || '',
        helpText: field.helpText || '',
        options: Array.isArray(field.options)
          ? field.options.map((option) => ({
            label: option.label || '',
            value: option.value || '',
          }))
          : [],
      }))
      : [],
  };
}

export function serializeTypeForm(form, options = {}) {
  const advancedSettings = options.advancedSettings || {};
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    instructions: form.instructions.trim() || null,
    isActive: Boolean(form.isActive),
    availabilityMode: form.availabilityMode,
    durationMinutes: advancedSettings.durationMinutes
      ? (Number(form.durationMinutes) || 30)
      : 30,
    slotIntervalMinutes: advancedSettings.slotIntervalMinutes
      ? (Number(form.slotIntervalMinutes) || 30)
      : 30,
    capacity: advancedSettings.capacity
      ? (Number(form.capacity) || 1)
      : 1,
    bookingHorizonDays: advancedSettings.bookingHorizonDays
      ? (Number(form.bookingHorizonDays) || 60)
      : 60,
    availabilityConfig: {
      timezone: form.availabilityConfig.timezone || 'Africa/Cairo',
      timeRange: {
        startTime: modeUsesTimeRange(form.availabilityMode)
          ? (form.availabilityConfig.timeRange.startTime || null)
          : null,
        endTime: modeUsesTimeRange(form.availabilityMode)
          ? (form.availabilityConfig.timeRange.endTime || null)
          : null,
      },
      dateRange: {
        startDate: modeUsesDateRange(form.availabilityMode)
          ? (form.availabilityConfig.dateRange.startDate || null)
          : null,
        endDate: modeUsesDateRange(form.availabilityMode)
          ? (form.availabilityConfig.dateRange.endDate || null)
          : null,
      },
      specificDays: modeUsesSpecificDays(form.availabilityMode)
        ? form.availabilityConfig.specificDays
        : [],
      specificDates: form.availabilityConfig.specificDates
        .filter((entry) => entry.date)
        .map((entry) => ({
          date: entry.date,
          startTime: null,
          endTime: null,
          exactTimes: modeUsesExactTimes(form.availabilityMode)
            ? (entry.exactTimes || []).filter(Boolean)
            : [],
        })),
      exactDateTimes: [],
    },
    dynamicFields: form.dynamicFields.map((field) => ({
      key: field.key.trim(),
      label: field.label.trim(),
      type: field.type,
      required: Boolean(field.required),
      placeholder: field.placeholder.trim() || null,
      helpText: field.helpText.trim() || null,
      options: field.type === 'select'
        ? field.options
          .filter((option) => option.label.trim() && option.value.trim())
          .map((option) => ({
            label: option.label.trim(),
            value: option.value.trim(),
          }))
        : [],
    })),
  };
}
