import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bookmark,
  Edit,
  Eye,
  Filter,
  Lock,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  Trash2,
  Users as UsersIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { usersApi } from '../../../api/endpoints';
import { normalizeApiError } from '../../../api/errors';
import { useAuth } from '../../../auth/auth.hooks';
import { useI18n } from '../../../i18n/i18n';
import Badge from '../../../components/ui/Badge';
import Breadcrumbs from '../../../components/ui/Breadcrumbs';
import Button from '../../../components/ui/Button';
import Card, { CardHeader } from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import MultiSelectChips from '../../../components/ui/MultiSelectChips';
import PageHeader from '../../../components/ui/PageHeader';
import SearchInput from '../../../components/ui/SearchInput';
import Select from '../../../components/ui/Select';
import Table, { RowActions } from '../../../components/ui/Table';
import Tabs from '../../../components/ui/Tabs';
import TextArea from '../../../components/ui/TextArea';
import {
  getAgeGroupOptions,
  getEmploymentStatusLabel,
  getEmploymentStatusOptions,
  getPresenceStatusLabel,
  getPresenceStatusOptions,
} from '../../../constants/householdProfiles';
import {
  getEducationStageGroupLabel,
  getEducationStageGroupOptions,
  getEducationStageLabel,
  getEducationStageOptions,
} from '../../../constants/education';
import {
  formatAgeFromBirthDate,
  formatDate,
  formatDateTime,
  getGenderLabel,
  getRoleLabel,
} from '../../../utils/formatters';
import { fetchUsersWithPagination } from './familyHouseLookup.shared';
import {
  buildDistinctValueList,
  buildUsersExplorerAnalytics,
  buildUsersExplorerDynamicOptions,
  buildUsersExplorerFlagOptions,
  buildUsersExplorerPermissionOptions,
  countActiveUsersExplorerFilters,
  DEFAULT_USERS_EXPLORER_FILTERS,
  DEFAULT_USERS_EXPLORER_SORT,
  deriveUsersExplorerDataset,
  filterUsersExplorerDataset,
  loadUsersExplorerPresets,
  sortUsersExplorerDataset,
  storeUsersExplorerPresets,
  USERS_EXPLORER_PAGE_SIZE_OPTIONS,
} from './usersExplorer.shared';

function toOptionList(values = [], getLabel) {
  return values.map((value) => ({
    value,
    label: typeof getLabel === 'function' ? getLabel(value) : value,
  }));
}

function normalizePresetName(value) {
  return String(value || '').trim().toLowerCase();
}

function isFilterValueActive(key, value) {
  const defaultValue = DEFAULT_USERS_EXPLORER_FILTERS[key];

  if (Array.isArray(defaultValue)) {
    return Array.isArray(value) && value.length > 0;
  }

  if (typeof defaultValue === 'string') {
    return String(value ?? '').trim() !== String(defaultValue).trim();
  }

  return value !== defaultValue;
}

function countFiltersForKeys(filters, keys = []) {
  return keys.reduce(
    (count, key) => count + (isFilterValueActive(key, filters?.[key]) ? 1 : 0),
    0
  );
}

function MetricCard({ icon: Icon, label, value, hint, accent = 'default' }) {
  const accentMap = {
    default: 'bg-surface-alt text-muted',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success-light text-success',
    warning: 'bg-warning-light text-warning',
    danger: 'bg-danger-light text-danger',
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentMap[accent]}`}>
          {Icon ? <Icon className="h-4 w-4" /> : null}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-heading">{value ?? '---'}</p>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function InsightListCard({ title, subtitle, items = [], renderLabel, emptyText }) {
  return (
    <Card className="h-full">
      <CardHeader title={title} subtitle={subtitle} className="mb-3" />
      {items.length === 0 ? (
        <p className="text-sm text-muted">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={`${item.label}-${item.count}`}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-heading">
                  {renderLabel ? renderLabel(item.label) : item.label}
                </p>
                <Badge variant="primary">{item.count}</Badge>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max((item.count / Math.max(items[0]?.count || 1, 1)) * 100, 6)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function RangeField({
  label,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  type = 'number',
  fromPlaceholder,
  toPlaceholder,
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          type={type}
          value={fromValue}
          onChange={(event) => onFromChange(event.target.value)}
          placeholder={fromPlaceholder}
          containerClassName="!mb-0"
        />
        <Input
          type={type}
          value={toValue}
          onChange={(event) => onToChange(event.target.value)}
          placeholder={toPlaceholder}
          containerClassName="!mb-0"
        />
      </div>
    </div>
  );
}

function PresetCard({ preset, isActive, onApply, onEdit, onDelete, labels }) {
  return (
    <div className={`rounded-2xl border p-4 ${isActive ? 'border-primary/35 bg-primary/6' : 'border-border bg-surface-alt/30'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-heading">{preset.name}</p>
            {isActive ? <Badge variant="primary">{labels.active}</Badge> : null}
          </div>
          {preset.description ? (
            <p className="mt-1 text-xs text-muted">{preset.description}</p>
          ) : null}
        </div>
        <Badge variant="secondary">{formatDateTime(preset.updatedAt)}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant={isActive ? 'primary' : 'outline'} icon={Bookmark} onClick={onApply}>
          {labels.apply}
        </Button>
        <Button size="sm" variant="ghost" icon={Edit} onClick={onEdit}>
          {labels.edit}
        </Button>
        <Button size="sm" variant="ghost" icon={Trash2} onClick={onDelete}>
          {labels.delete}
        </Button>
      </div>
    </div>
  );
}

function Pager({ page, pageCount, onPageChange, summaryLabel, previousLabel, nextLabel }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-sm text-muted">{summaryLabel}</p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          {previousLabel}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

export default function UsersExplorerPage() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { t, language } = useI18n();
  const tx = useCallback((key, values) => t(`usersExplorerPage.${key}`, values), [t]);
  const [filters, setFilters] = useState(DEFAULT_USERS_EXPLORER_FILTERS);
  const deferredFilters = useDeferredValue(filters);
  const [sortState, setSortState] = useState(DEFAULT_USERS_EXPLORER_SORT);
  const [pageSize, setPageSize] = useState(USERS_EXPLORER_PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [presets, setPresets] = useState([]);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [presetDraft, setPresetDraft] = useState({ id: null, name: '', description: '' });
  const [appliedPresetId, setAppliedPresetId] = useState(null);
  const [isFilterPending, startFilterTransition] = useTransition();

  const currentUserId = user?._id || user?.id || null;

  useEffect(() => {
    setPresets(loadUsersExplorerPresets(currentUserId));
  }, [currentUserId]);

  useEffect(() => {
    storeUsersExplorerPresets(currentUserId, presets);
  }, [currentUserId, presets]);

  const usersQuery = useQuery({
    queryKey: ['users', 'explorer', 'dataset'],
    queryFn: async () => fetchUsersWithPagination(),
    staleTime: 60000,
  });

  const familyNamesQuery = useQuery({
    queryKey: ['users', 'family-names', 'explorer'],
    queryFn: async () => {
      const { data } = await usersApi.getFamilyNames();
      return Array.isArray(data?.data) ? data.data : [];
    },
    staleTime: 60000,
  });

  const houseNamesQuery = useQuery({
    queryKey: ['users', 'house-names', 'explorer'],
    queryFn: async () => {
      const { data } = await usersApi.getHouseNames();
      return Array.isArray(data?.data) ? data.data : [];
    },
    staleTime: 60000,
  });

  const profileOptionsQuery = useQuery({
    queryKey: ['users', 'profile-option-values', 'explorer'],
    queryFn: async () => {
      const { data } = await usersApi.getProfileOptionValues();
      return data?.data || {};
    },
    staleTime: 60000,
  });

  const customDetailKeysQuery = useQuery({
    queryKey: ['users', 'custom-detail-keys', 'explorer'],
    queryFn: async () => {
      const { data } = await usersApi.getCustomDetailKeys();
      return Array.isArray(data?.data) ? data.data : [];
    },
    staleTime: 60000,
  });

  const rawUsers = useMemo(
    () => (Array.isArray(usersQuery.data) ? usersQuery.data : []),
    [usersQuery.data]
  );

  const derivedUsers = useMemo(
    () => deriveUsersExplorerDataset(rawUsers),
    [rawUsers]
  );

  const dynamicOptions = useMemo(
    () => buildUsersExplorerDynamicOptions(derivedUsers),
    [derivedUsers]
  );

  const familyNameSuggestions = useMemo(
    () => buildDistinctValueList(familyNamesQuery.data?.length ? familyNamesQuery.data : rawUsers.map((entry) => entry?.familyName)),
    [familyNamesQuery.data, rawUsers]
  );

  const houseNameSuggestions = useMemo(
    () => buildDistinctValueList(houseNamesQuery.data?.length ? houseNamesQuery.data : rawUsers.map((entry) => entry?.houseName)),
    [houseNamesQuery.data, rawUsers]
  );

  const profileOptionValues = profileOptionsQuery.data || {};

  const deferredFilteredUsers = useMemo(
    () => filterUsersExplorerDataset(derivedUsers, deferredFilters),
    [derivedUsers, deferredFilters]
  );

  const sortedUsers = useMemo(
    () => sortUsersExplorerDataset(deferredFilteredUsers, sortState),
    [deferredFilteredUsers, sortState]
  );

  const analytics = useMemo(
    () => buildUsersExplorerAnalytics(derivedUsers, deferredFilteredUsers),
    [derivedUsers, deferredFilteredUsers]
  );

  const activeFilterCount = useMemo(
    () => countActiveUsersExplorerFilters(filters),
    [filters]
  );

  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === appliedPresetId) || null,
    [appliedPresetId, presets]
  );

  const workspaceCopy = useMemo(() => (
    language === 'ar'
      ? {
        overviewTitle: 'مستكشف مركز',
        overviewSubtitle:
          'ابدأ بعدد قليل من الحقول المهمة، ثم افتح ورشة التصفية الجانبية للفلاتر الأعمق بدون ازدحام الصفحة.',
        overviewPending: 'جار تحديث النتائج',
        overviewActiveFilters: 'الفلاتر النشطة',
        overviewNoFilters: 'لا توجد فلاتر نشطة حتى الآن.',
        overviewMoreFilters: (count) => `+${count} أخرى`,
        workspaceTitle: 'ورشة التصفية',
        workspaceSubtitle: 'اعرض مجموعة فلاتر واحدة في كل مرة ليبقى الدليل واضحا.',
        workspaceTabs: {
          search: 'بحث',
          household: 'الأسرة',
          profile: 'الملف',
          system: 'النظام',
        },
        supportTitle: 'لوحات المستكشف',
        supportSubtitle: 'احتفظ بالملخصات والإعدادات والرؤى قريبة من الجدول بدون ازدحام.',
        supportTabs: {
          summary: 'ملخص',
          presets: 'إعدادات',
          insights: 'رؤى',
        },
      }
      : {
        overviewTitle: 'Focused explorer',
        overviewSubtitle:
          'Start with a few high-signal fields, then open the side workspace for deeper filtering without overwhelming the page.',
        overviewPending: 'Refreshing results',
        overviewActiveFilters: 'Active filters',
        overviewNoFilters: 'No filters applied yet.',
        overviewMoreFilters: (count) => `+${count} more`,
        workspaceTitle: 'Filter workspace',
        workspaceSubtitle: 'Show one advanced filter group at a time so the directory stays readable.',
        workspaceTabs: {
          search: 'Search',
          household: 'Household',
          profile: 'Profile',
          system: 'System',
        },
        supportTitle: 'Explorer panels',
        supportSubtitle: 'Keep summaries, presets, and insights nearby without crowding the table.',
        supportTabs: {
          summary: 'Summary',
          presets: 'Presets',
          insights: 'Insights',
        },
      }
  ), [language]);

  const totalPageCount = Math.max(1, Math.ceil(sortedUsers.length / pageSize));

  useEffect(() => {
    if (page > totalPageCount) {
      setPage(totalPageCount);
    }
  }, [page, totalPageCount]);

  const pageStart = (page - 1) * pageSize;
  const pagedUsers = sortedUsers.slice(pageStart, pageStart + pageSize);

  const yesNoOptions = useMemo(() => ([
    { value: 'true', label: tx('options.yes') },
    { value: 'false', label: tx('options.no') },
  ]), [tx]);

  const loginIdentifierOptions = useMemo(() => ([
    { value: 'phone', label: tx('options.phoneLogin') },
    { value: 'email', label: tx('options.emailLogin') },
  ]), [tx]);

  const matchModeOptions = useMemo(() => ([
    { value: 'any', label: tx('options.matchAny') },
    { value: 'all', label: tx('options.matchAll') },
  ]), [tx]);

  const sortOptions = useMemo(() => ([
    { value: 'updatedAt', label: tx('sortFields.updatedAt') },
    { value: 'createdAt', label: tx('sortFields.createdAt') },
    { value: 'fullName', label: tx('sortFields.fullName') },
    { value: 'age', label: tx('sortFields.age') },
    { value: 'birthDate', label: tx('sortFields.birthDate') },
    { value: 'role', label: tx('sortFields.role') },
    { value: 'gender', label: tx('sortFields.gender') },
    { value: 'familyName', label: tx('sortFields.familyName') },
    { value: 'houseName', label: tx('sortFields.houseName') },
    { value: 'city', label: tx('sortFields.city') },
    { value: 'employmentStatus', label: tx('sortFields.employmentStatus') },
    { value: 'monthlyIncome', label: tx('sortFields.monthlyIncome') },
    { value: 'tagsCount', label: tx('sortFields.tagsCount') },
    { value: 'familyConnections', label: tx('sortFields.familyConnections') },
    { value: 'meetingCount', label: tx('sortFields.meetingCount') },
    { value: 'meetingAttendanceCount', label: tx('sortFields.meetingAttendanceCount') },
    { value: 'divineAttendanceCount', label: tx('sortFields.divineAttendanceCount') },
    { value: 'customDetailsCount', label: tx('sortFields.customDetailsCount') },
    { value: 'lastMeetingAttendance', label: tx('sortFields.lastMeetingAttendance') },
    { value: 'lastDivineAttendance', label: tx('sortFields.lastDivineAttendance') },
    { value: 'lastLoginAt', label: tx('sortFields.lastLoginAt') },
  ]), [tx]);

  const roleOptions = useMemo(
    () => ['SUPER_ADMIN', 'ADMIN', 'USER'].map((value) => ({ value, label: getRoleLabel(value) })),
    []
  );

  const genderOptions = useMemo(
    () => ['male', 'female', 'other'].map((value) => ({ value, label: getGenderLabel(value) })),
    []
  );

  const ageGroupOptions = useMemo(
    () => getAgeGroupOptions(language),
    [language]
  );

  const employmentOptions = useMemo(
    () => getEmploymentStatusOptions(language),
    [language]
  );

  const presenceOptions = useMemo(
    () => getPresenceStatusOptions(language),
    [language]
  );

  const educationStageOptions = useMemo(
    () => getEducationStageOptions(language).filter((option) => !option.disabled),
    [language]
  );

  const educationStageGroupOptions = useMemo(
    () => getEducationStageGroupOptions(language),
    [language]
  );

  const permissionOptions = useMemo(
    () => buildUsersExplorerPermissionOptions(),
    []
  );

  const flagOptions = useMemo(
    () => buildUsersExplorerFlagOptions(language),
    [language]
  );

  const tagOptions = useMemo(
    () => toOptionList(dynamicOptions.tags),
    [dynamicOptions.tags]
  );

  const healthConditionOptions = useMemo(() => {
    const source = profileOptionValues.healthConditions?.length
      ? profileOptionValues.healthConditions
      : dynamicOptions.healthConditions;
    return toOptionList(source);
  }, [dynamicOptions.healthConditions, profileOptionValues.healthConditions]);

  const customDetailKeyOptions = useMemo(() => {
    const source = customDetailKeysQuery.data?.length
      ? customDetailKeysQuery.data
      : dynamicOptions.customDetailKeys;
    return toOptionList(source);
  }, [customDetailKeysQuery.data, dynamicOptions.customDetailKeys]);

  const currentSnapshot = useMemo(
    () => JSON.stringify({ filters, sortState, pageSize }),
    [filters, sortState, pageSize]
  );

  useEffect(() => {
    if (!appliedPresetId) return;

    const appliedPreset = presets.find((preset) => preset.id === appliedPresetId);
    if (!appliedPreset) {
      setAppliedPresetId(null);
      return;
    }

    if (JSON.stringify(appliedPreset.state) !== currentSnapshot) {
      setAppliedPresetId(null);
    }
  }, [appliedPresetId, currentSnapshot, presets]);

  const updateFilter = (key, value) => {
    startFilterTransition(() => {
      setFilters((current) => ({ ...current, [key]: value }));
      setPage(1);
    });
  };

  const clearFilters = () => {
    startFilterTransition(() => {
      setFilters(DEFAULT_USERS_EXPLORER_FILTERS);
      setSortState(DEFAULT_USERS_EXPLORER_SORT);
      setPageSize(USERS_EXPLORER_PAGE_SIZE_OPTIONS[0]);
      setPage(1);
      setAppliedPresetId(null);
    });
  };

  const applyPreset = (preset) => {
    if (!preset?.state) return;
    startFilterTransition(() => {
      setFilters({ ...DEFAULT_USERS_EXPLORER_FILTERS, ...(preset.state.filters || {}) });
      setSortState({ ...DEFAULT_USERS_EXPLORER_SORT, ...(preset.state.sortState || {}) });
      setPageSize(Number(preset.state.pageSize) || USERS_EXPLORER_PAGE_SIZE_OPTIONS[0]);
      setPage(1);
      setAppliedPresetId(preset.id);
    });
  };

  const openNewPresetDialog = () => {
    setPresetDraft({ id: null, name: '', description: '' });
    setPresetDialogOpen(true);
  };

  const openEditPresetDialog = (preset) => {
    setPresetDraft({
      id: preset.id,
      name: preset.name || '',
      description: preset.description || '',
    });
    setPresetDialogOpen(true);
  };

  const savePreset = () => {
    const name = String(presetDraft.name || '').trim();
    if (!name) {
      toast.error(tx('messages.presetNameRequired'));
      return;
    }

    const snapshot = {
      filters,
      sortState,
      pageSize,
    };

    const existingPreset = presets.find((preset) => (
      preset.id === presetDraft.id ||
      (!presetDraft.id && normalizePresetName(preset.name) === normalizePresetName(name))
    ));
    const nextPresetId = presetDraft.id || existingPreset?.id || `preset-${Date.now()}`;

    setPresets((current) => {
      const existingIndex = current.findIndex((preset) => (
        preset.id === presetDraft.id ||
        (!presetDraft.id && normalizePresetName(preset.name) === normalizePresetName(name))
      ));

      const nextPreset = {
        id: nextPresetId,
        name,
        description: String(presetDraft.description || '').trim(),
        state: snapshot,
        createdAt: current[existingIndex]?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const nextPresets = [...current];

      if (existingIndex >= 0) {
        nextPresets[existingIndex] = nextPreset;
      } else {
        nextPresets.unshift(nextPreset);
      }

      return nextPresets.sort((left, right) => (
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      ));
    });

    setAppliedPresetId(nextPresetId);
    setPresetDialogOpen(false);
    toast.success(tx('messages.presetSaved'));
  };

  const deletePreset = (preset) => {
    const shouldDelete = window.confirm(tx('messages.deletePresetConfirm', { name: preset.name }));
    if (!shouldDelete) return;

    setPresets((current) => current.filter((entry) => entry.id !== preset.id));
    if (appliedPresetId === preset.id) {
      setAppliedPresetId(null);
    }
    toast.success(tx('messages.presetDeleted'));
  };

  const handleTableSort = (field) => {
    setSortState((current) => {
      if (current.field === field) {
        return {
          field,
          order: current.order === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        field,
        order: 'asc',
      };
    });
  };

  const activeFilterBadges = useMemo(() => {
    const badges = [];

    if (filters.keyword.trim()) badges.push(tx('badges.keyword', { value: filters.keyword.trim() }));
    if (filters.fullName.trim()) badges.push(tx('badges.fullName', { value: filters.fullName.trim() }));
    if (filters.phoneQuery.trim()) badges.push(tx('badges.phone', { value: filters.phoneQuery.trim() }));
    if (filters.role) badges.push(tx('badges.role', { value: getRoleLabel(filters.role) }));
    if (filters.gender) badges.push(tx('badges.gender', { value: getGenderLabel(filters.gender) }));
    if (filters.ageGroup) badges.push(tx('badges.ageGroup', { value: filters.ageGroup }));
    if (filters.familyName.trim()) badges.push(tx('badges.familyName', { value: filters.familyName.trim() }));
    if (filters.houseName.trim()) badges.push(tx('badges.houseName', { value: filters.houseName.trim() }));
    if (filters.city.trim()) badges.push(tx('badges.city', { value: filters.city.trim() }));
    if (filters.governorate.trim()) badges.push(tx('badges.governorate', { value: filters.governorate.trim() }));
    if (filters.employmentStatus) {
      badges.push(tx('badges.employmentStatus', {
        value: getEmploymentStatusLabel(filters.employmentStatus, language),
      }));
    }
    if (filters.presenceStatus) {
      badges.push(tx('badges.presenceStatus', {
        value: getPresenceStatusLabel(filters.presenceStatus, language),
      }));
    }
    if (filters.educationStage) {
      badges.push(tx('badges.educationStage', {
        value: getEducationStageLabel(filters.educationStage, language),
      }));
    }
    if (filters.educationStageGroup) {
      badges.push(tx('badges.educationStageGroup', {
        value: getEducationStageGroupLabel(filters.educationStageGroup, language),
      }));
    }
    if (filters.tags.length > 0) badges.push(tx('badges.tags', { value: filters.tags.join(', ') }));
    if (filters.selectedHealthConditions.length > 0) {
      badges.push(tx('badges.healthConditions', { value: filters.selectedHealthConditions.join(', ') }));
    }
    if (filters.requiredFlags.length > 0) badges.push(tx('badges.requiredFlags', { count: filters.requiredFlags.length }));
    if (filters.excludedFlags.length > 0) badges.push(tx('badges.excludedFlags', { count: filters.excludedFlags.length }));
    if (filters.effectivePermissions.length > 0) {
      badges.push(tx('badges.permissions', { count: filters.effectivePermissions.length }));
    }
    if (filters.customDetailKeys.length > 0) {
      badges.push(tx('badges.customDetailKeys', { value: filters.customDetailKeys.join(', ') }));
    }
    if (filters.customDetailValue.trim()) badges.push(tx('badges.customDetailValue', { value: filters.customDetailValue.trim() }));
    if (filters.notesQuery.trim()) badges.push(tx('badges.notes', { value: filters.notesQuery.trim() }));
    if (filters.confessionFatherQuery.trim()) {
      badges.push(tx('badges.confessionFather', { value: filters.confessionFatherQuery.trim() }));
    }

    return badges;
  }, [filters, language, tx]);

  const filterTabCounts = useMemo(() => ({
    search: countFiltersForKeys(filters, [
      'keyword',
      'fullName',
      'phoneQuery',
      'emailQuery',
      'nationalIdQuery',
      'familyName',
      'houseName',
      'notesQuery',
      'confessionFatherQuery',
    ]),
    household: countFiltersForKeys(filters, [
      'role',
      'gender',
      'ageGroup',
      'ageMin',
      'ageMax',
      'birthDateFrom',
      'birthDateTo',
      'governorate',
      'city',
      'street',
    ]),
    profile: countFiltersForKeys(filters, [
      'employmentStatus',
      'jobTitle',
      'employerName',
      'presenceStatus',
      'travelDestination',
      'travelReason',
      'educationStage',
      'educationStageGroup',
      'fieldOfStudy',
      'schoolName',
      'universityName',
      'facultyName',
      'monthlyIncomeMin',
      'monthlyIncomeMax',
      'selectedHealthConditions',
      'healthConditionMatchMode',
    ]),
    system: countFiltersForKeys(filters, [
      'isLocked',
      'hasLogin',
      'loginIdentifierType',
      'tags',
      'tagsMatchMode',
      'effectivePermissions',
      'permissionMatchMode',
      'customDetailKeys',
      'customDetailKeyMatchMode',
      'customDetailValue',
      'requiredFlags',
      'excludedFlags',
      'createdFrom',
      'createdTo',
      'updatedFrom',
      'updatedTo',
      'meetingCountMin',
      'meetingCountMax',
      'meetingAttendanceMin',
      'meetingAttendanceMax',
      'divineAttendanceMin',
      'divineAttendanceMax',
      'customDetailsMin',
      'customDetailsMax',
      'familyConnectionsMin',
      'familyConnectionsMax',
      'siblingCountMin',
      'siblingCountMax',
      'childrenCountMin',
      'childrenCountMax',
    ]),
  }), [filters]);

  const activeFilterPreview = activeFilterBadges.slice(0, 6);
  const hiddenActiveFilterCount = Math.max(activeFilterBadges.length - activeFilterPreview.length, 0);

  const columns = useMemo(() => ([
    {
      key: 'fullName',
      label: tx('table.columns.user'),
      sortable: true,
      cellClassName: 'cursor-pointer',
      onClick: (row) => navigate(`/dashboard/users/${row.id}`),
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.user?.avatar?.url ? (
            <img
              src={row.user.avatar.url}
              alt=""
              className="h-10 w-10 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {String(row.fullName || 'U').trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-heading">{row.fullName || '---'}</p>
            <p className="truncate text-xs text-muted direction-ltr text-left">
              {row.phonePrimary || row.email || '---'}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="primary">{getRoleLabel(row.role)}</Badge>
              <Badge variant={row.isLocked ? 'danger' : 'success'}>
                {row.isLocked ? t('common.status.locked') : t('common.status.active')}
              </Badge>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'age',
      label: tx('table.columns.demographics'),
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <p className="text-sm font-medium text-heading">
            {formatAgeFromBirthDate(row.birthDate)} {row.ageGroup ? ` | ${row.ageGroup}` : ''}
          </p>
          <p className="text-xs text-muted">{getGenderLabel(row.gender)}</p>
        </div>
      ),
    },
    {
      key: 'familyName',
      label: tx('table.columns.household'),
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <p className="text-sm font-medium text-heading">
            {row.familyName || '---'} {row.houseName ? `· ${row.houseName}` : ''}
          </p>
          <p className="text-xs text-muted">{row.city || row.governorate || '---'}</p>
        </div>
      ),
    },
    {
      key: 'employmentStatus',
      label: tx('table.columns.profile'),
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <p className="text-sm font-medium text-heading">
            {row.employmentStatus
              ? getEmploymentStatusLabel(row.employmentStatus, language)
              : '---'}
          </p>
          <p className="text-xs text-muted">
            {row.presenceStatus
              ? getPresenceStatusLabel(row.presenceStatus, language)
              : row.educationStage
                ? getEducationStageLabel(row.educationStage, language)
                : '---'}
          </p>
        </div>
      ),
    },
    {
      key: 'meetingAttendanceCount',
      label: tx('table.columns.activity'),
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">{tx('table.meetingsBadge', { count: row.meetingIdsCount })}</Badge>
            <Badge variant="secondary">{tx('table.attendanceBadge', { count: row.meetingAttendanceCount })}</Badge>
            <Badge variant="secondary">{tx('table.liturgiesBadge', { count: row.divineAttendanceCount })}</Badge>
          </div>
          <p className="text-xs text-muted">
            {tx('table.activityMeta', { familyLinks: row.familyConnectionsCount, customFields: row.customDetailsCount })}
          </p>
        </div>
      ),
    },
    {
      key: 'updatedAt',
      label: tx('table.columns.updated'),
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <p className="text-sm font-medium text-heading">{formatDateTime(row.updatedAt)}</p>
          <p className="text-xs text-muted">
            {row.user?.lastLoginAt
              ? tx('table.lastLogin', { date: formatDate(row.user.lastLoginAt) })
              : tx('table.noLoginActivity')}
          </p>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      cellClassName: 'w-10',
      render: (row) => (
        <RowActions
          actions={[
            {
              label: t('common.actions.view'),
              icon: Eye,
              onClick: () => navigate(`/dashboard/users/${row.id}`),
            },
            ...(hasPermission('USERS_UPDATE')
              ? [{
                label: t('common.actions.edit'),
                icon: Edit,
                onClick: () => navigate(`/dashboard/users/${row.id}/edit`),
              }]
              : []),
          ]}
        />
      ),
    },
  ]), [hasPermission, language, navigate, t, tx]);

  const filterTabs = [
    {
      label: `${workspaceCopy.workspaceTabs.search}${filterTabCounts.search ? ` (${filterTabCounts.search})` : ''}`,
      content: (
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-heading">{tx('sections.globalQuery.title')}</h3>
            <p className="mt-1 text-sm text-muted">{tx('sections.globalQuery.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <Input
              label={tx('fields.emailQuery.label')}
              value={filters.emailQuery}
              onChange={(event) => updateFilter('emailQuery', event.target.value)}
              placeholder={tx('fields.emailQuery.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.nationalIdQuery.label')}
              value={filters.nationalIdQuery}
              onChange={(event) => updateFilter('nationalIdQuery', event.target.value)}
              placeholder={tx('fields.nationalIdQuery.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.notesQuery.label')}
              value={filters.notesQuery}
              onChange={(event) => updateFilter('notesQuery', event.target.value)}
              placeholder={tx('fields.notesQuery.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.confessionFatherQuery.label')}
              value={filters.confessionFatherQuery}
              onChange={(event) => updateFilter('confessionFatherQuery', event.target.value)}
              placeholder={tx('fields.confessionFatherQuery.placeholder')}
              containerClassName="!mb-0"
            />
          </div>
        </div>
      ),
    },
    {
      label: `${workspaceCopy.workspaceTabs.household}${filterTabCounts.household ? ` (${filterTabCounts.household})` : ''}`,
      content: (
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-heading">{tx('sections.identity.title')}</h3>
            <p className="mt-1 text-sm text-muted">{tx('sections.identity.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label={tx('fields.role.label')}
              value={filters.role}
              onChange={(event) => updateFilter('role', event.target.value)}
              options={roleOptions}
              placeholder={tx('fields.role.placeholder')}
              containerClassName="!mb-0"
            />
            <Select
              label={tx('fields.gender.label')}
              value={filters.gender}
              onChange={(event) => updateFilter('gender', event.target.value)}
              options={genderOptions}
              placeholder={tx('fields.gender.placeholder')}
              containerClassName="!mb-0"
            />
            <Select
              label={tx('fields.ageGroup.label')}
              value={filters.ageGroup}
              onChange={(event) => updateFilter('ageGroup', event.target.value)}
              options={ageGroupOptions}
              placeholder={tx('fields.ageGroup.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.governorate.label')}
              value={filters.governorate}
              onChange={(event) => updateFilter('governorate', event.target.value)}
              placeholder={tx('fields.governorate.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.city.label')}
              value={filters.city}
              onChange={(event) => updateFilter('city', event.target.value)}
              placeholder={tx('fields.city.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.street.label')}
              value={filters.street}
              onChange={(event) => updateFilter('street', event.target.value)}
              placeholder={tx('fields.street.placeholder')}
              containerClassName="!mb-0"
            />
          </div>
          <RangeField
            label={tx('ranges.age')}
            fromValue={filters.ageMin}
            toValue={filters.ageMax}
            onFromChange={(value) => updateFilter('ageMin', value)}
            onToChange={(value) => updateFilter('ageMax', value)}
            fromPlaceholder={tx('ranges.min')}
            toPlaceholder={tx('ranges.max')}
          />
          <RangeField
            type="date"
            label={tx('ranges.birthDate')}
            fromValue={filters.birthDateFrom}
            toValue={filters.birthDateTo}
            onFromChange={(value) => updateFilter('birthDateFrom', value)}
            onToChange={(value) => updateFilter('birthDateTo', value)}
            fromPlaceholder={tx('ranges.fromDate')}
            toPlaceholder={tx('ranges.toDate')}
          />
        </div>
      ),
    },
    {
      label: `${workspaceCopy.workspaceTabs.profile}${filterTabCounts.profile ? ` (${filterTabCounts.profile})` : ''}`,
      content: (
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-heading">{tx('sections.socioeconomic.title')}</h3>
            <p className="mt-1 text-sm text-muted">{tx('sections.socioeconomic.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label={tx('fields.employmentStatus.label')}
              value={filters.employmentStatus}
              onChange={(event) => updateFilter('employmentStatus', event.target.value)}
              options={employmentOptions}
              placeholder={tx('fields.employmentStatus.placeholder')}
              containerClassName="!mb-0"
            />
            <Select
              label={tx('fields.presenceStatus.label')}
              value={filters.presenceStatus}
              onChange={(event) => updateFilter('presenceStatus', event.target.value)}
              options={presenceOptions}
              placeholder={tx('fields.presenceStatus.placeholder')}
              containerClassName="!mb-0"
            />
            <Select
              label={tx('fields.educationStageGroup.label')}
              value={filters.educationStageGroup}
              onChange={(event) => updateFilter('educationStageGroup', event.target.value)}
              options={educationStageGroupOptions}
              placeholder={tx('fields.educationStageGroup.placeholder')}
              containerClassName="!mb-0"
            />
            <Select
              label={tx('fields.educationStage.label')}
              value={filters.educationStage}
              onChange={(event) => updateFilter('educationStage', event.target.value)}
              options={educationStageOptions}
              placeholder={tx('fields.educationStage.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.jobTitle.label')}
              value={filters.jobTitle}
              onChange={(event) => updateFilter('jobTitle', event.target.value)}
              placeholder={tx('fields.jobTitle.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.employerName.label')}
              value={filters.employerName}
              onChange={(event) => updateFilter('employerName', event.target.value)}
              placeholder={tx('fields.employerName.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.travelDestination.label')}
              value={filters.travelDestination}
              onChange={(event) => updateFilter('travelDestination', event.target.value)}
              placeholder={tx('fields.travelDestination.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.travelReason.label')}
              value={filters.travelReason}
              onChange={(event) => updateFilter('travelReason', event.target.value)}
              placeholder={tx('fields.travelReason.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.fieldOfStudy.label')}
              value={filters.fieldOfStudy}
              onChange={(event) => updateFilter('fieldOfStudy', event.target.value)}
              placeholder={tx('fields.fieldOfStudy.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.schoolName.label')}
              value={filters.schoolName}
              onChange={(event) => updateFilter('schoolName', event.target.value)}
              placeholder={tx('fields.schoolName.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.universityName.label')}
              value={filters.universityName}
              onChange={(event) => updateFilter('universityName', event.target.value)}
              placeholder={tx('fields.universityName.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.facultyName.label')}
              value={filters.facultyName}
              onChange={(event) => updateFilter('facultyName', event.target.value)}
              placeholder={tx('fields.facultyName.placeholder')}
              containerClassName="!mb-0"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
            <MultiSelectChips
              label={tx('fields.healthConditions.label')}
              values={filters.selectedHealthConditions}
              onChange={(value) => updateFilter('selectedHealthConditions', value)}
              options={healthConditionOptions}
              placeholder={tx('fields.healthConditions.placeholder')}
              containerClassName="!mb-0"
            />
            <Select
              label={tx('fields.healthConditionMatchMode.label')}
              value={filters.healthConditionMatchMode}
              onChange={(event) => updateFilter('healthConditionMatchMode', event.target.value)}
              options={matchModeOptions}
              placeholder={tx('fields.healthConditionMatchMode.placeholder')}
              containerClassName="!mb-0"
            />
          </div>
          <RangeField
            label={tx('ranges.monthlyIncome')}
            fromValue={filters.monthlyIncomeMin}
            toValue={filters.monthlyIncomeMax}
            onFromChange={(value) => updateFilter('monthlyIncomeMin', value)}
            onToChange={(value) => updateFilter('monthlyIncomeMax', value)}
            fromPlaceholder={tx('ranges.min')}
            toPlaceholder={tx('ranges.max')}
          />
        </div>
      ),
    },
    {
      label: `${workspaceCopy.workspaceTabs.system}${filterTabCounts.system ? ` (${filterTabCounts.system})` : ''}`,
      content: (
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-heading">{tx('sections.system.title')}</h3>
            <p className="mt-1 text-sm text-muted">{tx('sections.system.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Select
              label={tx('fields.isLocked.label')}
              value={filters.isLocked}
              onChange={(event) => updateFilter('isLocked', event.target.value)}
              options={yesNoOptions}
              placeholder={tx('options.either')}
              containerClassName="!mb-0"
            />
            <Select
              label={tx('fields.hasLogin.label')}
              value={filters.hasLogin}
              onChange={(event) => updateFilter('hasLogin', event.target.value)}
              options={yesNoOptions}
              placeholder={tx('options.either')}
              containerClassName="!mb-0"
            />
            <Select
              label={tx('fields.loginIdentifierType.label')}
              value={filters.loginIdentifierType}
              onChange={(event) => updateFilter('loginIdentifierType', event.target.value)}
              options={loginIdentifierOptions}
              placeholder={tx('fields.loginIdentifierType.placeholder')}
              containerClassName="!mb-0"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
            <MultiSelectChips
              label={tx('fields.tags.label')}
              values={filters.tags}
              onChange={(value) => updateFilter('tags', value)}
              options={tagOptions}
              placeholder={tx('fields.tags.placeholder')}
              containerClassName="!mb-0"
            />
            <Select
              label={tx('fields.tagsMatchMode.label')}
              value={filters.tagsMatchMode}
              onChange={(event) => updateFilter('tagsMatchMode', event.target.value)}
              options={matchModeOptions}
              placeholder={tx('fields.tagsMatchMode.placeholder')}
              containerClassName="!mb-0"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
            <MultiSelectChips
              label={tx('fields.effectivePermissions.label')}
              values={filters.effectivePermissions}
              onChange={(value) => updateFilter('effectivePermissions', value)}
              options={permissionOptions}
              placeholder={tx('fields.effectivePermissions.placeholder')}
              containerClassName="!mb-0"
            />
            <Select
              label={tx('fields.permissionMatchMode.label')}
              value={filters.permissionMatchMode}
              onChange={(event) => updateFilter('permissionMatchMode', event.target.value)}
              options={matchModeOptions}
              placeholder={tx('fields.permissionMatchMode.placeholder')}
              containerClassName="!mb-0"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
            <MultiSelectChips
              label={tx('fields.customDetailKeys.label')}
              values={filters.customDetailKeys}
              onChange={(value) => updateFilter('customDetailKeys', value)}
              options={customDetailKeyOptions}
              placeholder={tx('fields.customDetailKeys.placeholder')}
              containerClassName="!mb-0"
            />
            <Select
              label={tx('fields.customDetailKeyMatchMode.label')}
              value={filters.customDetailKeyMatchMode}
              onChange={(event) => updateFilter('customDetailKeyMatchMode', event.target.value)}
              options={matchModeOptions}
              placeholder={tx('fields.customDetailKeyMatchMode.placeholder')}
              containerClassName="!mb-0"
            />
            <Input
              label={tx('fields.customDetailValue.label')}
              value={filters.customDetailValue}
              onChange={(event) => updateFilter('customDetailValue', event.target.value)}
              placeholder={tx('fields.customDetailValue.placeholder')}
              containerClassName="!mb-0 xl:col-span-2"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <MultiSelectChips
              label={tx('fields.requiredFlags.label')}
              values={filters.requiredFlags}
              onChange={(value) => updateFilter('requiredFlags', value)}
              options={flagOptions}
              placeholder={tx('fields.requiredFlags.placeholder')}
              containerClassName="!mb-0"
            />
            <MultiSelectChips
              label={tx('fields.excludedFlags.label')}
              values={filters.excludedFlags}
              onChange={(value) => updateFilter('excludedFlags', value)}
              options={flagOptions}
              placeholder={tx('fields.excludedFlags.placeholder')}
              containerClassName="!mb-0"
            />
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <RangeField
              type="date"
              label={tx('ranges.createdDate')}
              fromValue={filters.createdFrom}
              toValue={filters.createdTo}
              onFromChange={(value) => updateFilter('createdFrom', value)}
              onToChange={(value) => updateFilter('createdTo', value)}
              fromPlaceholder={tx('ranges.createdFrom')}
              toPlaceholder={tx('ranges.createdTo')}
            />
            <RangeField
              type="date"
              label={tx('ranges.updatedDate')}
              fromValue={filters.updatedFrom}
              toValue={filters.updatedTo}
              onFromChange={(value) => updateFilter('updatedFrom', value)}
              onToChange={(value) => updateFilter('updatedTo', value)}
              fromPlaceholder={tx('ranges.updatedFrom')}
              toPlaceholder={tx('ranges.updatedTo')}
            />
            <RangeField
              label={tx('ranges.meetingCount')}
              fromValue={filters.meetingCountMin}
              toValue={filters.meetingCountMax}
              onFromChange={(value) => updateFilter('meetingCountMin', value)}
              onToChange={(value) => updateFilter('meetingCountMax', value)}
              fromPlaceholder={tx('ranges.min')}
              toPlaceholder={tx('ranges.max')}
            />
            <RangeField
              label={tx('ranges.meetingAttendance')}
              fromValue={filters.meetingAttendanceMin}
              toValue={filters.meetingAttendanceMax}
              onFromChange={(value) => updateFilter('meetingAttendanceMin', value)}
              onToChange={(value) => updateFilter('meetingAttendanceMax', value)}
              fromPlaceholder={tx('ranges.min')}
              toPlaceholder={tx('ranges.max')}
            />
            <RangeField
              label={tx('ranges.divineAttendance')}
              fromValue={filters.divineAttendanceMin}
              toValue={filters.divineAttendanceMax}
              onFromChange={(value) => updateFilter('divineAttendanceMin', value)}
              onToChange={(value) => updateFilter('divineAttendanceMax', value)}
              fromPlaceholder={tx('ranges.min')}
              toPlaceholder={tx('ranges.max')}
            />
            <RangeField
              label={tx('ranges.customDetails')}
              fromValue={filters.customDetailsMin}
              toValue={filters.customDetailsMax}
              onFromChange={(value) => updateFilter('customDetailsMin', value)}
              onToChange={(value) => updateFilter('customDetailsMax', value)}
              fromPlaceholder={tx('ranges.min')}
              toPlaceholder={tx('ranges.max')}
            />
            <RangeField
              label={tx('ranges.familyConnections')}
              fromValue={filters.familyConnectionsMin}
              toValue={filters.familyConnectionsMax}
              onFromChange={(value) => updateFilter('familyConnectionsMin', value)}
              onToChange={(value) => updateFilter('familyConnectionsMax', value)}
              fromPlaceholder={tx('ranges.min')}
              toPlaceholder={tx('ranges.max')}
            />
            <RangeField
              label={tx('ranges.siblingCount')}
              fromValue={filters.siblingCountMin}
              toValue={filters.siblingCountMax}
              onFromChange={(value) => updateFilter('siblingCountMin', value)}
              onToChange={(value) => updateFilter('siblingCountMax', value)}
              fromPlaceholder={tx('ranges.min')}
              toPlaceholder={tx('ranges.max')}
            />
            <RangeField
              label={tx('ranges.childrenCount')}
              fromValue={filters.childrenCountMin}
              toValue={filters.childrenCountMax}
              onFromChange={(value) => updateFilter('childrenCountMin', value)}
              onToChange={(value) => updateFilter('childrenCountMax', value)}
              fromPlaceholder={tx('ranges.min')}
              toPlaceholder={tx('ranges.max')}
            />
          </div>
        </div>
      ),
    },
  ];

  const supportTabs = [
    {
      label: workspaceCopy.supportTabs.summary,
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricCard
              icon={UsersIcon}
              label={tx('metrics.filteredUsers')}
              value={analytics.filteredCount}
              hint={tx('metrics.filteredUsersHint', { count: analytics.totalCount })}
              accent="primary"
            />
            <MetricCard
              icon={Filter}
              label={tx('metrics.coverage')}
              value={`${analytics.coveragePercentage}%`}
              hint={tx('metrics.coverageHint', { count: activeFilterCount })}
              accent="warning"
            />
            <MetricCard
              icon={Shield}
              label={tx('metrics.loginEnabled')}
              value={analytics.loginEnabledCount}
              hint={tx('metrics.loginEnabledHint')}
              accent="success"
            />
            <MetricCard
              icon={Lock}
              label={tx('metrics.locked')}
              value={analytics.lockedCount}
              hint={tx('metrics.lockedHint')}
              accent={analytics.lockedCount > 0 ? 'danger' : 'success'}
            />
            <MetricCard
              icon={Sparkles}
              label={tx('metrics.averageAge')}
              value={analytics.averageAge ?? '---'}
              hint={tx('metrics.averageAgeHint')}
            />
            <MetricCard
              icon={BarChart3}
              label={tx('metrics.averageIncome')}
              value={analytics.averageIncome != null ? tx('metrics.averageIncomeValue', { value: analytics.averageIncome }) : '---'}
              hint={tx('metrics.averageIncomeHint')}
            />
          </div>
          <div className="rounded-2xl border border-border bg-surface-alt/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-heading">{tx('summary.title')}</p>
                <p className="mt-1 text-sm text-muted">{tx('summary.subtitle', { count: activeFilterCount })}</p>
              </div>
              {activePreset ? <Badge variant="primary">{activePreset.name}</Badge> : null}
            </div>
            {activeFilterBadges.length === 0 ? (
              <p className="mt-4 text-sm text-muted">{tx('summary.empty')}</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeFilterBadges.map((badge) => (
                  <Badge key={badge} variant="secondary">
                    {badge}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      label: workspaceCopy.supportTabs.presets,
      content: (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-heading">{tx('presets.title')}</h3>
              <p className="mt-1 text-sm text-muted">{tx('presets.subtitle')}</p>
            </div>
            <Button size="sm" variant="outline" icon={Save} onClick={openNewPresetDialog}>
              {t('common.actions.save')}
            </Button>
          </div>
          {presets.length === 0 ? (
            <p className="text-sm text-muted">{tx('presets.empty')}</p>
          ) : (
            <div className="space-y-3">
              {presets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isActive={appliedPresetId === preset.id}
                  onApply={() => applyPreset(preset)}
                  onEdit={() => openEditPresetDialog(preset)}
                  onDelete={() => deletePreset(preset)}
                  labels={{
                    active: tx('presets.active'),
                    apply: tx('actions.apply'),
                    edit: t('common.actions.edit'),
                    delete: t('common.actions.delete'),
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      label: workspaceCopy.supportTabs.insights,
      content: (
        <div className="grid grid-cols-1 gap-4">
          <InsightListCard
            title={tx('insights.roleBreakdown')}
            items={analytics.roleCounts.slice(0, 6)}
            renderLabel={(value) => getRoleLabel(value)}
            emptyText={tx('insights.empty')}
          />
          <InsightListCard
            title={tx('insights.genderBreakdown')}
            items={analytics.genderCounts.slice(0, 6)}
            renderLabel={(value) => getGenderLabel(value)}
            emptyText={tx('insights.empty')}
          />
          <InsightListCard
            title={tx('insights.employmentBreakdown')}
            items={analytics.employmentCounts.slice(0, 6)}
            renderLabel={(value) => getEmploymentStatusLabel(value, language)}
            emptyText={tx('insights.empty')}
          />
          <InsightListCard
            title={tx('insights.presenceBreakdown')}
            items={analytics.presenceCounts.slice(0, 6)}
            renderLabel={(value) => getPresenceStatusLabel(value, language)}
            emptyText={tx('insights.empty')}
          />
          <InsightListCard title={tx('insights.topFamilies')} items={analytics.topFamilies} emptyText={tx('insights.empty')} />
          <InsightListCard title={tx('insights.topHouses')} items={analytics.topHouses} emptyText={tx('insights.empty')} />
          <InsightListCard title={tx('insights.topCities')} items={analytics.topCities} emptyText={tx('insights.empty')} />
          <InsightListCard title={tx('insights.topTags')} items={analytics.topTags} emptyText={tx('insights.empty')} />
          <InsightListCard title={tx('insights.topHealthConditions')} items={analytics.topHealthConditions} emptyText={tx('insights.empty')} />
          <InsightListCard title={tx('insights.topCustomDetailKeys')} items={analytics.topCustomDetailKeys} emptyText={tx('insights.empty')} />
        </div>
      ),
    },
  ];

  if (usersQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: t('shared.dashboard'), href: '/dashboard' },
            { label: t('shared.users'), href: '/dashboard/users' },
            { label: tx('page') },
          ]}
        />
        <Card>
          <div className="flex items-center gap-3 text-sm text-muted">
            <RefreshCw className="h-4 w-4 animate-spin" />
            {tx('states.loading')}
          </div>
        </Card>
      </div>
    );
  }

  if (usersQuery.error) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: t('shared.dashboard'), href: '/dashboard' },
            { label: t('shared.users'), href: '/dashboard/users' },
            { label: tx('page') },
          ]}
        />
        <EmptyState
          icon={UsersIcon}
          title={tx('states.loadErrorTitle')}
          description={normalizeApiError(usersQuery.error).message}
          action={(
            <Button icon={RefreshCw} onClick={() => usersQuery.refetch()}>
              {tx('actions.reload')}
            </Button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <Breadcrumbs
        items={[
          { label: t('shared.dashboard'), href: '/dashboard' },
          { label: t('shared.users'), href: '/dashboard/users' },
          { label: tx('page') },
        ]}
      />

      <PageHeader
        className="border-b border-border pb-6"
        title={tx('title')}
        subtitle={tx('subtitle')}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/users">
              <Button variant="outline">{tx('actions.directory')}</Button>
            </Link>
            {hasPermission('USERS_CREATE') ? (
              <Link to="/dashboard/users/new">
                <Button>{tx('actions.createUser')}</Button>
              </Link>
            ) : null}
          </div>
        )}
      />

      <Card
        padding={false}
        className="overflow-hidden rounded-[28px] border-border/70 bg-gradient-to-br from-surface via-surface to-primary/5 shadow-card"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.45fr)_360px]">
          <div className="space-y-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
                  {workspaceCopy.overviewTitle}
                </p>
                <p className="mt-2 max-w-2xl text-sm text-muted">{workspaceCopy.overviewSubtitle}</p>
              </div>
              {isFilterPending ? (
                <Badge variant="warning">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  {workspaceCopy.overviewPending}
                </Badge>
              ) : null}
            </div>
            <SearchInput
              value={filters.keyword}
              onChange={(value) => updateFilter('keyword', value)}
              placeholder={tx('fields.keyword.placeholder')}
              className="max-w-3xl"
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input
                value={filters.fullName}
                onChange={(event) => updateFilter('fullName', event.target.value)}
                placeholder={tx('fields.fullName.placeholder')}
                label={tx('fields.fullName.label')}
                containerClassName="!mb-0"
              />
              <Input
                value={filters.phoneQuery}
                onChange={(event) => updateFilter('phoneQuery', event.target.value)}
                placeholder={tx('fields.phoneQuery.placeholder')}
                label={tx('fields.phoneQuery.label')}
                containerClassName="!mb-0"
              />
              <Input
                label={tx('fields.familyName.label')}
                value={filters.familyName}
                onChange={(event) => updateFilter('familyName', event.target.value)}
                placeholder={familyNameSuggestions[0] || tx('fields.familyName.placeholder')}
                containerClassName="!mb-0"
              />
              <Input
                label={tx('fields.houseName.label')}
                value={filters.houseName}
                onChange={(event) => updateFilter('houseName', event.target.value)}
                placeholder={houseNameSuggestions[0] || tx('fields.houseName.placeholder')}
                containerClassName="!mb-0"
              />
            </div>
          </div>

          <div className="border-t border-border/70 bg-surface-alt/30 p-6 lg:border-l lg:border-t-0">
            <div className="space-y-4 rounded-3xl border border-border/80 bg-surface/90 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
                    {workspaceCopy.overviewActiveFilters}
                  </p>
                  <p className="mt-3 text-4xl font-bold tracking-tight text-heading">
                    {activeFilterCount}
                  </p>
                </div>
                {activePreset ? <Badge variant="primary">{activePreset.name}</Badge> : null}
              </div>
              {activeFilterPreview.length === 0 ? (
                <p className="text-sm text-muted">{workspaceCopy.overviewNoFilters}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeFilterPreview.map((badge) => (
                    <Badge key={badge} variant="secondary">
                      {badge}
                    </Badge>
                  ))}
                  {hiddenActiveFilterCount > 0 ? (
                    <Badge variant="default">
                      {workspaceCopy.overviewMoreFilters(hiddenActiveFilterCount)}
                    </Badge>
                  ) : null}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/70 bg-surface-alt/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {tx('metrics.filteredUsers')}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-heading">{analytics.filteredCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface-alt/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {tx('metrics.coverage')}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-heading">
                    {analytics.coveragePercentage}%
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" icon={Save} onClick={openNewPresetDialog}>
                  {tx('actions.savePreset')}
                </Button>
                <Button variant="ghost" onClick={clearFilters}>
                  {tx('actions.resetAll')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.95fr)]">
        <Card className="space-y-5">
          <CardHeader
            title={tx('sections.results.title')}
            subtitle={tx('sections.results.subtitle')}
            action={(
              <div className="flex flex-wrap items-center gap-2">
                {activeFilterCount > 0 ? (
                  <Badge variant="secondary">{tx('summary.subtitle', { count: activeFilterCount })}</Badge>
                ) : null}
                <Badge variant="primary">
                  {tx('table.showingRange', {
                    from: sortedUsers.length === 0 ? 0 : pageStart + 1,
                    to: Math.min(pageStart + pageSize, sortedUsers.length),
                    total: sortedUsers.length,
                  })}
                </Badge>
              </div>
            )}
          />
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <Select
              label={tx('fields.sortField.label')}
              value={sortState.field}
              onChange={(event) => setSortState((current) => ({ ...current, field: event.target.value }))}
              options={sortOptions}
              placeholder={tx('fields.sortField.placeholder')}
              containerClassName="!mb-0"
            />
            <Select
              label={tx('fields.sortOrder.label')}
              value={sortState.order}
              onChange={(event) => setSortState((current) => ({ ...current, order: event.target.value }))}
              options={[
                { value: 'asc', label: tx('fields.sortOrder.ascending') },
                { value: 'desc', label: tx('fields.sortOrder.descending') },
              ]}
              placeholder={tx('fields.sortOrder.placeholder')}
              containerClassName="!mb-0"
            />
            <Select
              label={tx('fields.pageSize.label')}
              value={String(pageSize)}
              onChange={(event) => {
                setPageSize(Number(event.target.value) || USERS_EXPLORER_PAGE_SIZE_OPTIONS[0]);
                setPage(1);
              }}
              options={USERS_EXPLORER_PAGE_SIZE_OPTIONS.map((value) => ({
                value: String(value),
                label: tx('fields.pageSize.option', { count: value }),
              }))}
              placeholder={tx('fields.pageSize.placeholder')}
              containerClassName="!mb-0"
            />
          </div>
          <div className="rounded-2xl border border-border bg-surface-alt/20 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-heading">{tx('table.matchingUsers')}</p>
                <p className="mt-1 text-sm text-muted">
                  {tx('pagination.summary', { page, total: totalPageCount })}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted">
                {isFilterPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                <span>
                  {tx('table.showingRange', {
                    from: sortedUsers.length === 0 ? 0 : pageStart + 1,
                    to: Math.min(pageStart + pageSize, sortedUsers.length),
                    total: sortedUsers.length,
                  })}
                </span>
              </div>
            </div>
            <Table
              columns={columns}
              data={pagedUsers}
              loading={isFilterPending}
              emptyTitle={tx('table.emptyTitle')}
              emptyDescription={tx('table.emptyDescription')}
              emptyIcon={UsersIcon}
              sortField={sortState.field}
              sortOrder={sortState.order}
              onSort={handleTableSort}
            />
            <Pager
              page={page}
              pageCount={totalPageCount}
              onPageChange={setPage}
              summaryLabel={tx('pagination.summary', { page, total: totalPageCount })}
              previousLabel={t('common.pagination.previous')}
              nextLabel={t('common.pagination.next')}
            />
          </div>
        </Card>

        <div className="self-start space-y-6 xl:sticky xl:top-6">
          <Card className="space-y-5">
            <CardHeader title={workspaceCopy.workspaceTitle} subtitle={workspaceCopy.workspaceSubtitle} />
            <Tabs tabs={filterTabs} />
          </Card>

          <Card className="space-y-5">
            <CardHeader title={workspaceCopy.supportTitle} subtitle={workspaceCopy.supportSubtitle} />
            <Tabs tabs={supportTabs} />
          </Card>
        </div>
      </div>

      <Modal
        isOpen={presetDialogOpen}
        onClose={() => setPresetDialogOpen(false)}
        title={presetDraft.id ? tx('presets.editTitle') : tx('presets.saveTitle')}
        size="md"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setPresetDialogOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button icon={Save} onClick={savePreset}>
              {tx('actions.savePreset')}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <Input
            label={tx('presets.nameLabel')}
            value={presetDraft.name}
            onChange={(event) => setPresetDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder={tx('presets.namePlaceholder')}
            containerClassName="!mb-0"
          />
          <TextArea
            label={tx('presets.descriptionLabel')}
            value={presetDraft.description}
            onChange={(event) => setPresetDraft((current) => ({ ...current, description: event.target.value }))}
            placeholder={tx('presets.descriptionPlaceholder')}
            containerClassName="!mb-0"
          />
          <div className="rounded-2xl border border-border bg-surface-alt/30 p-4 text-sm text-muted">
            {tx('presets.helperText')}
          </div>
        </div>
      </Modal>
    </div>
  );
}
