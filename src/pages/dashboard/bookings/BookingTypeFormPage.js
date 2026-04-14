import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Plus, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { bookingsApi } from '../../../api/endpoints';
import { mapFieldErrors, normalizeApiError } from '../../../api/errors';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card, { CardHeader } from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import PageHeader from '../../../components/ui/PageHeader';
import Select from '../../../components/ui/Select';
import TextArea from '../../../components/ui/TextArea';
import { useI18n } from '../../../i18n/i18n';
import {
  AVAILABILITY_MODES,
  FIELD_TYPES,
  WEEK_DAYS,
  availabilityLabel,
  createAdvancedSettings,
  createEmptyTypeForm,
  mapTypeToForm,
  modeUsesAvailabilityRules,
  modeUsesDateRange,
  modeUsesExactTimes,
  modeUsesSpecificDates,
  modeUsesSpecificDays,
  modeUsesTimeRange,
  serializeTypeForm,
} from './bookingTypeForm.utils';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function TimeChipsInput({ label, values = [], onChange, tf }) {
  const [draft, setDraft] = useState('');

  const addDraft = () => {
    const nextValue = draft.trim();
    if (!TIME_PATTERN.test(nextValue)) return;
    if (values.includes(nextValue)) {
      setDraft('');
      return;
    }
    onChange([...values, nextValue].sort());
    setDraft('');
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-base">{label}</label>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-xs font-semibold text-primary"
          >
            {value}
            <button
              type="button"
              className="text-primary/70 transition-colors hover:text-primary"
              onClick={() => onChange(values.filter((item) => item !== value))}
            >
              x
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="time"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addDraft();
            }
          }}
          className="input-base flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addDraft}>
          {tf('bookings.dashboard.addTime', 'Add time')}
        </Button>
      </div>
    </div>
  );
}

export default function BookingTypeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const tf = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [typeForm, setTypeForm] = useState(createEmptyTypeForm);
  const [advancedSettings, setAdvancedSettings] = useState(createAdvancedSettings);
  const [typeErrors, setTypeErrors] = useState({});

  const applyTypeFormState = (nextForm) => {
    setTypeForm(nextForm);
    setAdvancedSettings(createAdvancedSettings(nextForm));
  };

  const typesQuery = useQuery({
    queryKey: ['bookings', 'types'],
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await bookingsApi.admin.listTypes();
      return data;
    },
  });

  const bookingTypes = Array.isArray(typesQuery.data?.data) ? typesQuery.data.data : [];
  const selectedType = isEdit
    ? bookingTypes.find((item) => String(item.id) === String(id)) || null
    : null;

  useEffect(() => {
    if (isEdit) {
      if (!selectedType) return;
      applyTypeFormState(mapTypeToForm(selectedType));
      setTypeErrors({});
      return;
    }

    applyTypeFormState(createEmptyTypeForm());
    setTypeErrors({});
  }, [isEdit, selectedType]);

  const availabilityModeOptions = AVAILABILITY_MODES.map((option) => ({
    value: option.value,
    label: availabilityLabel(option.value, tf),
  }));

  const saveTypeMutation = useMutation({
    mutationFn: ({ bookingTypeId, payload }) =>
      bookingTypeId
        ? bookingsApi.admin.updateType(bookingTypeId, payload)
        : bookingsApi.admin.createType(payload),
    onSuccess: () => {
      toast.success(
        isEdit
          ? tf('bookings.dashboard.typeUpdated', 'Booking type updated successfully.')
          : tf('bookings.dashboard.typeCreated', 'Booking type created successfully.')
      );
      queryClient.invalidateQueries({ queryKey: ['bookings', 'types'] });
      navigate('/dashboard/bookings/types');
    },
    onError: (error) => {
      const normalized = normalizeApiError(error);
      setTypeErrors(mapFieldErrors(normalized.details));
      toast.error(normalized.message);
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    saveTypeMutation.mutate({
      bookingTypeId: typeForm.id,
      payload: serializeTypeForm(typeForm, { advancedSettings }),
    });
  };

  const breadcrumbs = [
    { label: t('shared.dashboard'), href: '/dashboard' },
    { label: tf('bookings.dashboard.typesPage', 'Booking types'), href: '/dashboard/bookings/types' },
    {
      label: isEdit
        ? tf('bookings.dashboard.editTypeTitle', 'Edit booking type')
        : tf('bookings.dashboard.createTypeTitle', 'Create booking type'),
    },
  ];

  const pageTitle = isEdit
    ? tf('bookings.dashboard.editTypeTitle', 'Edit booking type')
    : tf('bookings.dashboard.createTypeTitle', 'Create booking type');
  const pageSubtitle = tf(
    'bookings.dashboard.typeSubtitle',
    'Control public instructions, fields, and slot-generation rules from one place.'
  );

  if (isEdit && typesQuery.isLoading) {
    return (
      <div className="animate-fade-in space-y-8 pb-10">
        <Breadcrumbs items={breadcrumbs} />
        <PageHeader
          eyebrow={tf('bookings.dashboard.typesEyebrow', 'Booking configuration')}
          title={pageTitle}
          subtitle={pageSubtitle}
        />
        <Card className="rounded-3xl">
          <p className="text-sm text-muted">{t('common.loading')}</p>
        </Card>
      </div>
    );
  }

  if (isEdit && !typesQuery.isLoading && !selectedType) {
    return (
      <div className="animate-fade-in space-y-8 pb-10">
        <Breadcrumbs items={breadcrumbs} />
        <PageHeader
          eyebrow={tf('bookings.dashboard.typesEyebrow', 'Booking configuration')}
          title={tf('bookings.dashboard.typeNotFoundTitle', 'Booking type not found')}
          subtitle={tf(
            'bookings.dashboard.typeNotFoundBody',
            'The requested booking type could not be loaded. It may have been removed.'
          )}
          actions={(
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={ArrowRight}
              onClick={() => navigate('/dashboard/bookings/types')}
            >
              {t('common.actions.back')}
            </Button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs items={breadcrumbs} />

      <PageHeader
        eyebrow={tf('bookings.dashboard.typesEyebrow', 'Booking configuration')}
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={(
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={ArrowRight}
            onClick={() => navigate('/dashboard/bookings/types')}
          >
            {t('common.actions.back')}
          </Button>
        )}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader title={pageTitle} subtitle={pageSubtitle} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label={tf('bookings.dashboard.typeName', 'Type name')}
              value={typeForm.name}
              onChange={(event) =>
                setTypeForm((current) => ({ ...current, name: event.target.value }))
              }
              error={typeErrors.name}
              required
              containerClassName="!mb-0"
            />
            <Select
              label={tf('bookings.dashboard.mode', 'Availability mode')}
              value={typeForm.availabilityMode}
              onChange={(event) =>
                setTypeForm((current) => ({
                  ...current,
                  availabilityMode: event.target.value,
                  availabilityConfig: {
                    ...current.availabilityConfig,
                    timeRange: { startTime: '09:00', endTime: '17:00' },
                    dateRange: { startDate: '', endDate: '' },
                    specificDays: [],
                    specificDates: [],
                    exactDateTimes: [],
                  },
                }))
              }
              options={availabilityModeOptions}
              containerClassName="mb-0"
            />
          </div>

          <TextArea
            label={tf('bookings.dashboard.description', 'Short description')}
            value={typeForm.description}
            onChange={(event) =>
              setTypeForm((current) => ({ ...current, description: event.target.value }))
            }
            className="min-h-[90px]"
          />

          <TextArea
            label={tf('bookings.dashboard.instructions', 'Public instructions')}
            value={typeForm.instructions}
            onChange={(event) =>
              setTypeForm((current) => ({ ...current, instructions: event.target.value }))
            }
            className="min-h-[140px]"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              ['durationMinutes', tf('bookings.dashboard.duration', 'Duration')],
              ['slotIntervalMinutes', tf('bookings.dashboard.interval', 'Slot interval')],
              ['capacity', tf('bookings.dashboard.capacity', 'Capacity')],
              ['bookingHorizonDays', tf('bookings.dashboard.horizon', 'Horizon days')],
            ].map(([fieldKey, label]) => (
              <div
                key={fieldKey}
                className="rounded-2xl border border-border bg-surface-alt/35 p-4"
              >
                <label className="flex items-center gap-3 text-sm font-medium text-heading">
                  <input
                    type="checkbox"
                    checked={Boolean(advancedSettings[fieldKey])}
                    onChange={(event) =>
                      setAdvancedSettings((current) => ({
                        ...current,
                        [fieldKey]: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  {label}
                </label>
                {advancedSettings[fieldKey] ? (
                  <Input
                    type="number"
                    value={typeForm[fieldKey]}
                    onChange={(event) =>
                      setTypeForm((current) => ({
                        ...current,
                        [fieldKey]: event.target.value,
                      }))
                    }
                    containerClassName="!mb-0 mt-4"
                  />
                ) : null}
              </div>
            ))}
            <div className="mb-4 flex items-end rounded-2xl border border-border bg-surface-alt/35 px-4 py-3">
              <label className="flex items-center gap-3 text-sm font-medium text-heading">
                <input
                  type="checkbox"
                  checked={typeForm.isActive}
                  onChange={(event) =>
                    setTypeForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                {tf('bookings.dashboard.activeType', 'Type is active')}
              </label>
            </div>
          </div>
        </Card>
        {modeUsesAvailabilityRules(typeForm.availabilityMode) ? (
          <Card className="rounded-3xl border-dashed bg-surface-alt/25">
            <CardHeader
              title={tf('bookings.dashboard.availabilityRules', 'Availability rules')}
              subtitle={tf(
                'bookings.dashboard.availabilityRulesSubtitle',
                'Configure only the parts used by the selected mode.'
              )}
            />

            {modeUsesDateRange(typeForm.availabilityMode) ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label={tf('bookings.dashboard.rangeStart', 'Range start')}
                  type="date"
                  value={typeForm.availabilityConfig.dateRange.startDate}
                  onChange={(event) =>
                    setTypeForm((current) => ({
                      ...current,
                      availabilityConfig: {
                        ...current.availabilityConfig,
                        dateRange: {
                          ...current.availabilityConfig.dateRange,
                          startDate: event.target.value,
                        },
                      },
                    }))
                  }
                  containerClassName="!mb-0"
                />
                <Input
                  label={tf('bookings.dashboard.rangeEnd', 'Range end')}
                  type="date"
                  value={typeForm.availabilityConfig.dateRange.endDate}
                  onChange={(event) =>
                    setTypeForm((current) => ({
                      ...current,
                      availabilityConfig: {
                        ...current.availabilityConfig,
                        dateRange: {
                          ...current.availabilityConfig.dateRange,
                          endDate: event.target.value,
                        },
                      },
                    }))
                  }
                  containerClassName="!mb-0"
                />
              </div>
            ) : null}

            {modeUsesTimeRange(typeForm.availabilityMode) ? (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label={tf('bookings.dashboard.startTime', 'Default start time')}
                  type="time"
                  value={typeForm.availabilityConfig.timeRange.startTime}
                  onChange={(event) =>
                    setTypeForm((current) => ({
                      ...current,
                      availabilityConfig: {
                        ...current.availabilityConfig,
                        timeRange: {
                          ...current.availabilityConfig.timeRange,
                          startTime: event.target.value,
                        },
                      },
                    }))
                  }
                  containerClassName="!mb-0"
                />
                <Input
                  label={tf('bookings.dashboard.endTime', 'Default end time')}
                  type="time"
                  value={typeForm.availabilityConfig.timeRange.endTime}
                  onChange={(event) =>
                    setTypeForm((current) => ({
                      ...current,
                      availabilityConfig: {
                        ...current.availabilityConfig,
                        timeRange: {
                          ...current.availabilityConfig.timeRange,
                          endTime: event.target.value,
                        },
                      },
                    }))
                  }
                  containerClassName="!mb-0"
                />
              </div>
            ) : null}

            {modeUsesSpecificDays(typeForm.availabilityMode) ? (
              <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
                <p className="text-sm font-semibold text-heading">
                  {tf('bookings.dashboard.specificDays', 'Specific weekdays')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => {
                    const active = typeForm.availabilityConfig.specificDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() =>
                          setTypeForm((current) => ({
                            ...current,
                            availabilityConfig: {
                              ...current.availabilityConfig,
                              specificDays: active
                                ? current.availabilityConfig.specificDays.filter(
                                  (value) => value !== day.value
                                )
                                : [...current.availabilityConfig.specificDays, day.value].sort(),
                            },
                          }))
                        }
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-primary text-white'
                            : 'bg-surface-alt text-muted hover:text-heading'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {modeUsesSpecificDates(typeForm.availabilityMode) ? (
              <div className="mt-4 space-y-3 rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-heading">
                    {tf('bookings.dashboard.specificDatesBlock', 'Specific dates')}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Plus}
                    onClick={() =>
                      setTypeForm((current) => ({
                        ...current,
                        availabilityConfig: {
                          ...current.availabilityConfig,
                          specificDates: [
                            ...current.availabilityConfig.specificDates,
                            { date: '', startTime: '', endTime: '', exactTimes: [] },
                          ],
                        },
                      }))
                    }
                  >
                    {tf('bookings.dashboard.addDate', 'Add date')}
                  </Button>
                </div>

                {typeForm.availabilityConfig.specificDates.map((entry, index) => (
                  <div
                    key={`specific-date-${index}`}
                    className="rounded-2xl border border-border bg-surface-alt/35 p-4"
                  >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                      <Input
                        label={tf('bookings.dashboard.date', 'Date')}
                        type="date"
                        value={entry.date}
                        onChange={(event) =>
                          setTypeForm((current) => {
                            const next = [...current.availabilityConfig.specificDates];
                            next[index] = { ...next[index], date: event.target.value };
                            return {
                              ...current,
                              availabilityConfig: {
                                ...current.availabilityConfig,
                                specificDates: next,
                              },
                            };
                          })
                        }
                        containerClassName="!mb-0"
                      />
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setTypeForm((current) => ({
                              ...current,
                              availabilityConfig: {
                                ...current.availabilityConfig,
                                specificDates: current.availabilityConfig.specificDates.filter(
                                  (_, itemIndex) => itemIndex !== index
                                ),
                              },
                            }))
                          }
                        >
                          {tf('bookings.dashboard.remove', 'Remove')}
                        </Button>
                      </div>
                    </div>

                    {modeUsesExactTimes(typeForm.availabilityMode) ? (
                      <div className="mt-4">
                        <TimeChipsInput
                          label={tf('bookings.dashboard.exactTimes', 'Exact times')}
                          values={entry.exactTimes || []}
                          onChange={(nextTimes) =>
                            setTypeForm((current) => {
                              const next = [...current.availabilityConfig.specificDates];
                              next[index] = { ...next[index], exactTimes: nextTimes };
                              return {
                                ...current,
                                availabilityConfig: {
                                  ...current.availabilityConfig,
                                  specificDates: next,
                                },
                              };
                            })
                          }
                          tf={tf}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}
        <Card className="rounded-3xl border-dashed bg-surface-alt/25">
          <CardHeader
            title={tf('bookings.dashboard.dynamicFields', 'Dynamic fields')}
            subtitle={tf(
              'bookings.dashboard.dynamicFieldsSubtitle',
              'Add optional public fields such as text, images, dates, or selects.'
            )}
            action={(
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={() =>
                  setTypeForm((current) => ({
                    ...current,
                    dynamicFields: [
                      ...current.dynamicFields,
                      {
                        key: '',
                        label: '',
                        type: 'text',
                        required: false,
                        placeholder: '',
                        helpText: '',
                        options: [],
                      },
                    ],
                  }))
                }
              >
                {tf('bookings.dashboard.addField', 'Add field')}
              </Button>
            )}
          />

          <div className="space-y-4">
            {typeForm.dynamicFields.map((field, index) => (
              <div key={`field-${index}`} className="rounded-2xl border border-border bg-surface p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label={tf('bookings.dashboard.fieldKey', 'Field key')}
                    value={field.key}
                    onChange={(event) =>
                      setTypeForm((current) => {
                        const next = [...current.dynamicFields];
                        next[index] = { ...next[index], key: event.target.value };
                        return { ...current, dynamicFields: next };
                      })
                    }
                    containerClassName="!mb-0"
                  />
                  <Input
                    label={tf('bookings.dashboard.fieldLabel', 'Field label')}
                    value={field.label}
                    onChange={(event) =>
                      setTypeForm((current) => {
                        const next = [...current.dynamicFields];
                        next[index] = { ...next[index], label: event.target.value };
                        return { ...current, dynamicFields: next };
                      })
                    }
                    containerClassName="!mb-0"
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Select
                    label={tf('bookings.dashboard.fieldType', 'Field type')}
                    value={field.type}
                    onChange={(event) =>
                      setTypeForm((current) => {
                        const next = [...current.dynamicFields];
                        next[index] = { ...next[index], type: event.target.value };
                        if (event.target.value !== 'select') next[index].options = [];
                        return { ...current, dynamicFields: next };
                      })
                    }
                    options={FIELD_TYPES}
                    containerClassName="mb-0"
                  />
                  <div className="mb-4 flex items-end rounded-2xl border border-border bg-surface-alt/35 px-4 py-3">
                    <label className="flex items-center gap-3 text-sm font-medium text-heading">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(event) =>
                          setTypeForm((current) => {
                            const next = [...current.dynamicFields];
                            next[index] = { ...next[index], required: event.target.checked };
                            return { ...current, dynamicFields: next };
                          })
                        }
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      {tf('bookings.dashboard.requiredField', 'Required field')}
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label={tf('bookings.dashboard.placeholder', 'Placeholder')}
                    value={field.placeholder}
                    onChange={(event) =>
                      setTypeForm((current) => {
                        const next = [...current.dynamicFields];
                        next[index] = { ...next[index], placeholder: event.target.value };
                        return { ...current, dynamicFields: next };
                      })
                    }
                    containerClassName="!mb-0"
                  />
                  <Input
                    label={tf('bookings.dashboard.helpText', 'Help text')}
                    value={field.helpText}
                    onChange={(event) =>
                      setTypeForm((current) => {
                        const next = [...current.dynamicFields];
                        next[index] = { ...next[index], helpText: event.target.value };
                        return { ...current, dynamicFields: next };
                      })
                    }
                    containerClassName="!mb-0"
                  />
                </div>

                {field.type === 'select' ? (
                  <div className="mt-4 rounded-2xl border border-border bg-surface-alt/35 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-heading">
                        {tf('bookings.dashboard.selectOptions', 'Select options')}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setTypeForm((current) => {
                            const next = [...current.dynamicFields];
                            next[index] = {
                              ...next[index],
                              options: [...next[index].options, { label: '', value: '' }],
                            };
                            return { ...current, dynamicFields: next };
                          })
                        }
                      >
                        {tf('bookings.dashboard.addOption', 'Add option')}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {field.options.map((option, optionIndex) => (
                        <div
                          key={`option-${index}-${optionIndex}`}
                          className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]"
                        >
                          <Input
                            label={tf('bookings.dashboard.optionLabel', 'Label')}
                            value={option.label}
                            onChange={(event) =>
                              setTypeForm((current) => {
                                const next = [...current.dynamicFields];
                                const nextOptions = [...next[index].options];
                                nextOptions[optionIndex] = {
                                  ...nextOptions[optionIndex],
                                  label: event.target.value,
                                };
                                next[index] = { ...next[index], options: nextOptions };
                                return { ...current, dynamicFields: next };
                              })
                            }
                            containerClassName="!mb-0"
                          />
                          <Input
                            label={tf('bookings.dashboard.optionValue', 'Value')}
                            value={option.value}
                            onChange={(event) =>
                              setTypeForm((current) => {
                                const next = [...current.dynamicFields];
                                const nextOptions = [...next[index].options];
                                nextOptions[optionIndex] = {
                                  ...nextOptions[optionIndex],
                                  value: event.target.value,
                                };
                                next[index] = { ...next[index], options: nextOptions };
                                return { ...current, dynamicFields: next };
                              })
                            }
                            containerClassName="!mb-0"
                          />
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setTypeForm((current) => {
                                  const next = [...current.dynamicFields];
                                  next[index] = {
                                    ...next[index],
                                    options: next[index].options.filter(
                                      (_, itemIndex) => itemIndex !== optionIndex
                                    ),
                                  };
                                  return { ...current, dynamicFields: next };
                                })
                              }
                            >
                              {tf('bookings.dashboard.remove', 'Remove')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setTypeForm((current) => ({
                        ...current,
                        dynamicFields: current.dynamicFields.filter(
                          (_, itemIndex) => itemIndex !== index
                        ),
                      }))
                    }
                  >
                    {tf('bookings.dashboard.removeField', 'Remove field')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/dashboard/bookings/types')}
          >
            {t('common.actions.cancel')}
          </Button>
          <Button type="submit" icon={Save} loading={saveTypeMutation.isPending}>
            {isEdit
              ? tf('bookings.dashboard.saveType', 'Save changes')
              : tf('bookings.dashboard.createTypeAction', 'Create type')}
          </Button>
        </div>
      </form>
    </div>
  );
}
