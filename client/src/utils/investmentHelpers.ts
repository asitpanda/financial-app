// @ts-nocheck
import dayjs from 'dayjs';
import type {
  FrequencyCadenceOption,
  InvestmentAssetTypeConfig,
  InvestmentFrequency,
} from '../features/investments/types/investment.types';

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'matured', label: 'Matured' },
  { value: 'closed', label: 'Closed' },
];

// Single source of truth for recurring-plan frequency <-> {cadenceUnit, cadenceInterval} mapping.
// Add/remove a frequency by editing this table only - every consumer derives from it.
export const FREQUENCY_CADENCE_OPTIONS: FrequencyCadenceOption[] = [
  { frequency: 'weekly', label: 'Weekly', cadenceUnit: 'week', cadenceInterval: 1 },
  { frequency: 'monthly', label: 'Monthly', cadenceUnit: 'month', cadenceInterval: 1 },
  { frequency: 'quarterly', label: 'Quarterly', cadenceUnit: 'quarter', cadenceInterval: 1 },
  { frequency: 'halfyearly', label: 'Half-yearly', cadenceUnit: 'month', cadenceInterval: 6 },
  { frequency: 'yearly', label: 'Yearly', cadenceUnit: 'year', cadenceInterval: 1 },
];

export const DEFAULT_FREQUENCY: InvestmentFrequency = 'monthly';

export const FREQUENCY_SELECT_OPTIONS = FREQUENCY_CADENCE_OPTIONS.map(
  ({ frequency, label }) => ({ value: frequency, label }),
);

const getDefaultCadenceOption = () =>
  FREQUENCY_CADENCE_OPTIONS.find((option) => option.frequency === DEFAULT_FREQUENCY)!;

/** frequency -> { cadenceUnit, cadenceInterval } for building API payloads. */
export const frequencyToCadence = (frequency?: string | null) => {
  const match =
    FREQUENCY_CADENCE_OPTIONS.find((option) => option.frequency === frequency) ??
    getDefaultCadenceOption();
  return { cadenceUnit: match.cadenceUnit, cadenceInterval: match.cadenceInterval };
};

/** { cadenceUnit, cadenceInterval } -> frequency for seeding the edit form from a saved plan. */
export const cadenceToFrequency = (
  cadenceUnit?: string | null,
  cadenceInterval?: number | string | null,
): InvestmentFrequency => {
  const interval = Number(cadenceInterval) || 1;
  const match = FREQUENCY_CADENCE_OPTIONS.find(
    (option) => option.cadenceUnit === cadenceUnit && option.cadenceInterval === interval,
  );
  return match ? match.frequency : DEFAULT_FREQUENCY;
};

/** { cadenceUnit, cadenceInterval } -> display label, with a generic fallback for unmapped combinations. */
export const getCadenceLabel = (
  cadenceUnit?: string | null,
  cadenceInterval?: number | string | null,
): string => {
  if (!cadenceUnit) return '—';
  const interval = Math.max(Number(cadenceInterval) || 1, 1);
  const match = FREQUENCY_CADENCE_OPTIONS.find(
    (option) => option.cadenceUnit === cadenceUnit && option.cadenceInterval === interval,
  );
  if (match) return match.label;
  return `Every ${interval} ${cadenceUnit}${interval === 1 ? '' : 's'}`;
};

export const createEmptyInvestmentForm = () => ({
  accountId: '',
  name: '',
  type: '',
  category: '',
  assetTaxonomyId: null,
  institution: '',
  totalInvested: '',
  currentValue: '',
  startDate: dayjs(),
  status: 'active',
  maturityDate: null,
  referenceNumber: '',
  insuranceCover: '',
  notes: '',
});

export const formatInvestmentCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export const formatInvestmentDate = (value) => {
  if (!value) return 'Not set';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD MMM YYYY') : 'Not set';
};

export const getInvestmentStatusTone = (status) => {
  if (status === 'active') return 'success';
  if (status === 'matured') return 'warning';
  if (status === 'closed') return 'default';
  return 'default';
};

const normalizeDateValue = (value) => (value && dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD') : null);

const normalizeKey = (value) => String(value || '').trim().toLowerCase();
const slugifyLabel = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const formatCodeLabel = (value) =>
  String(value || '')
    .trim()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const getActiveNodes = (taxonomyNodes = []) => taxonomyNodes.filter((node) => node?.isActive !== false);

const buildTaxonomyLineage = (node, taxonomyById) => {
  if (!node) return [];

  const lineage = [];
  let current = node;
  while (current) {
    lineage.unshift(current);
    current = current.parentId ? taxonomyById[current.parentId] || null : null;
  }

  return lineage;
};

export const getTaxonomyById = (taxonomyNodes = []) =>
  getActiveNodes(taxonomyNodes).reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {});

export const getInvestmentCategoryOptions = (taxonomyNodes = []) => {
  const categories = getActiveNodes(taxonomyNodes)
    .filter((node) => Number(node.level) === 1)
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0) || left.label.localeCompare(right.label))
    .map((node) => ({ value: slugifyLabel(node.label), label: node.label }));

  return [{ value: 'all', label: 'All Categories' }, ...categories];
};

export const getInvestmentTypeGroups = (taxonomyNodes = []) => {
  const categories = getActiveNodes(taxonomyNodes)
    .filter((node) => Number(node.level) === 1)
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0) || left.label.localeCompare(right.label));

  return categories.map((category) => ({
    key: slugifyLabel(category.label),
    label: category.label,
    types: getActiveNodes(taxonomyNodes)
      .filter((node) => node.parentId === category.id)
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0) || left.label.localeCompare(right.label))
      .map((node) => ({
        id: node.id,
        type: node.label,
        category: slugifyLabel(category.label),
        categoryLabel: category.label,
      })),
  }));
};

export const getInvestmentTypeOptions = (taxonomyNodes = []) => {
  const activeNodes = getActiveNodes(taxonomyNodes);
  const taxonomyById = getTaxonomyById(taxonomyNodes);

  return activeNodes
    .filter((node) => Number(node.level) > 1)
    .sort((left, right) => {
      if (left.level !== right.level) return left.level - right.level;
      if (Number(left.sortOrder || 0) !== Number(right.sortOrder || 0)) {
        return Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
      }
      return left.label.localeCompare(right.label);
    })
    .map((node) => {
      const lineage = buildTaxonomyLineage(node, taxonomyById);
      return {
        value: String(node.id),
        label: lineage.map((item) => item.label).join(' / '),
      };
    });
};

export const getInvestmentTypeTreeItems = (taxonomyNodes = []) => {
  const activeNodes = getActiveNodes(taxonomyNodes)
    .slice()
    .sort((left, right) => {
      if (Number(left.sortOrder || 0) !== Number(right.sortOrder || 0)) {
        return Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
      }
      return left.label.localeCompare(right.label);
    });

  const buildChildren = (parentId = null) =>
    activeNodes
      .filter((node) => (node.parentId ?? null) === parentId)
      .map((node) => ({
        id: String(node.id),
        label: node.label,
        level: Number(node.level || 1),
        children: buildChildren(node.id),
      }));

  return buildChildren(null);
};

export const getInvestmentTypeDisplayLabel = (typeOrId, taxonomyNodes = []) => {
  const taxonomyById = getTaxonomyById(taxonomyNodes);
  const directMatch = taxonomyById[typeOrId];

  if (directMatch) {
    return buildTaxonomyLineage(directMatch, taxonomyById)
      .map((node) => node.label)
      .join(' / ');
  }

  const fallbackNode = getActiveNodes(taxonomyNodes).find((node) => normalizeKey(node.label) === normalizeKey(typeOrId));
  if (!fallbackNode) return '';

  return buildTaxonomyLineage(fallbackNode, taxonomyById)
    .map((node) => node.label)
    .join(' / ');
};

export const getInvestmentTypeMeta = (typeOrId, taxonomyNodes = []) => {
  const taxonomyById = getTaxonomyById(taxonomyNodes);
  const directMatch = taxonomyById[typeOrId];

  if (directMatch) {
    const lineage = buildTaxonomyLineage(directMatch, taxonomyById);
    const categoryNode = lineage[0] || null;
    return {
      id: directMatch.id,
      type: directMatch.label,
      category: categoryNode ? slugifyLabel(categoryNode.label) : 'other',
      categoryLabel: categoryNode?.label || 'Other',
    };
  }

  const fallbackNode = getActiveNodes(taxonomyNodes).find((node) => normalizeKey(node.label) === normalizeKey(typeOrId));
  if (fallbackNode) {
    const lineage = buildTaxonomyLineage(fallbackNode, taxonomyById);
    const categoryNode = lineage[0] || null;
    return {
      id: fallbackNode.id,
      type: fallbackNode.label,
      category: categoryNode ? slugifyLabel(categoryNode.label) : 'other',
      categoryLabel: categoryNode?.label || 'Other',
    };
  }

  return { id: null, type: typeOrId || 'Other Investment', category: 'other', categoryLabel: 'Other' };
};

export const getInvestmentCategoryLabel = (categoryKey, taxonomyNodes = []) => {
  return getInvestmentCategoryOptions(taxonomyNodes).find((option) => option.value === categoryKey)?.label || formatCodeLabel(categoryKey) || 'Other';
};

export const getInvestmentTypeLabel = (assetType) => formatCodeLabel(assetType) || 'Other';

export const buildAssetTypeLabelMap = (assetTypeConfigs: InvestmentAssetTypeConfig[] = []) =>
  assetTypeConfigs.reduce<Record<string, string>>((acc, item) => {
    acc[String(item.code)] = item.label;
    return acc;
  }, {});

export const buildAssetCategoryLabelMap = (assetTypeConfigs: InvestmentAssetTypeConfig[] = []) =>
  assetTypeConfigs.reduce<Record<string, string>>((acc, item) => {
    item.categories.forEach((cat) => {
      acc[String(cat.code)] = cat.label;
    });
    return acc;
  }, {});

export const normalizeInvestmentForUi = (investment, taxonomyNodes = []) => {
  const taxonomyById = getTaxonomyById(taxonomyNodes);
  const taxonomyNode = investment.assetTaxonomyId ? taxonomyById[investment.assetTaxonomyId] : null;
  const lineage = buildTaxonomyLineage(taxonomyNode, taxonomyById);
  const categoryNode = lineage[0] || null;
  const type = investment.assetType || investment.type || taxonomyNode?.label || '';
  const typeMeta = getInvestmentTypeMeta(investment.assetTaxonomyId || taxonomyNode?.label || '', taxonomyNodes);

  return {
    ...investment,
    accountId: investment.accountId ?? null,
    type,
    assetTaxonomyId: investment.assetTaxonomyId || taxonomyNode?.id || null,
    category: investment.assetCategory || investment.category || (categoryNode ? slugifyLabel(categoryNode.label) : null) || typeMeta.category,
    institution: investment.institutionName || investment.institution || '',
  };
};

export const buildFormFromInvestment = (investment, taxonomyNodes = []) => {
  const typeMeta = getInvestmentTypeMeta(investment.assetTaxonomyId || investment.type, taxonomyNodes);

  return {
    accountId: investment.accountId != null ? String(investment.accountId) : '',
    name: investment.name || '',
    type: investment.assetType || investment.type || typeMeta.type || '',
    category: investment.assetCategory || investment.category || '',
    assetTaxonomyId: investment.assetTaxonomyId || null,
    institution: investment.institutionName || investment.institution || '',
    totalInvested: investment.totalInvested ? String(investment.totalInvested) : '',
    currentValue: investment.currentValue ? String(investment.currentValue) : '',
    startDate: investment.startDate ? dayjs(investment.startDate) : dayjs(),
    status: investment.status || 'active',
    maturityDate: investment.maturityDate ? dayjs(investment.maturityDate) : null,
    referenceNumber: investment.referenceNumber || '',
    insuranceCover: investment.insuranceCover ? String(investment.insuranceCover) : '',
    notes: investment.notes || '',
  };
};

export const buildInvestmentFromForm = (form, existingId, taxonomyNodes = []) => {
  const parsedAccountId = form.accountId !== '' && form.accountId != null ? Number(form.accountId) : null;

  return {
    accountId: Number.isFinite(parsedAccountId) ? parsedAccountId : null,
    assetTaxonomyId: form.assetTaxonomyId || null,
    name: form.name.trim(),
    assetType: String(form.type || '').trim(),
    assetCategory: String(form.category || '').trim(),
    institutionName: form.institution.trim() || null,
    totalInvested: Number(form.totalInvested || 0),
    currentValue: form.currentValue ? Number(form.currentValue) : Number(form.totalInvested || 0),
    startDate: normalizeDateValue(form.startDate),
    status: form.status,
    maturityDate: normalizeDateValue(form.maturityDate),
    currency: 'INR',
    currentValueSource: 'manual',
    lastValuationAt: normalizeDateValue(form.startDate),
    insuranceCover: form.insuranceCover ? Number(form.insuranceCover) : 0,
    contributionMode: form.contributionType === 'recurring' ? 'RECURRING' : 'ONE_TIME',
    referenceNumber: form.referenceNumber.trim() || null,
    notes: form.notes.trim() || null,
  };
};
