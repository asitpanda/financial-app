// @ts-nocheck
import dayjs from 'dayjs';

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'matured', label: 'Matured' },
  { value: 'closed', label: 'Closed' },
];

export const createEmptyInvestmentForm = () => ({
  accountId: '',
  name: '',
  type: '',
  category: 'other',
  assetTaxonomyId: null,
  institution: '',
  totalInvested: '',
  currentValue: '',
  startDate: dayjs(),
  status: 'active',
  maturityDate: null,
  referenceNumber: '',
  insuranceCover: '',
  documents: '',
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
  return getInvestmentCategoryOptions(taxonomyNodes).find((option) => option.value === categoryKey)?.label || 'Other';
};

const getDocumentsValue = (documentsMeta) => {
  if (!documentsMeta) return '';
  const documents = Array.isArray(documentsMeta.documents) ? documentsMeta.documents : [];
  return documents.join(', ');
};

const buildDocumentsMeta = (documents) => {
  const parsedDocuments = String(documents || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return parsedDocuments.length > 0 ? { documents: parsedDocuments } : null;
};

export const normalizeInvestmentForUi = (investment, taxonomyNodes = []) => {
  const taxonomyById = getTaxonomyById(taxonomyNodes);
  const taxonomyNode = investment.assetTaxonomyId ? taxonomyById[investment.assetTaxonomyId] : null;
  const lineage = buildTaxonomyLineage(taxonomyNode, taxonomyById);
  const categoryNode = lineage[0] || null;
  const type = taxonomyNode?.label || investment.assetType || investment.type || '';
  const typeMeta = getInvestmentTypeMeta(investment.assetTaxonomyId || type, taxonomyNodes);

  return {
    ...investment,
    accountId: investment.accountId ?? null,
    type,
    assetTaxonomyId: investment.assetTaxonomyId || taxonomyNode?.id || null,
    category: (categoryNode ? slugifyLabel(categoryNode.label) : null) || investment.assetCategory || investment.category || typeMeta.category,
    institution: investment.institutionName || investment.institution || '',
    documents: investment.documents || getDocumentsValue(investment.documentsMeta),
  };
};

export const buildFormFromInvestment = (investment, taxonomyNodes = []) => {
  const typeMeta = getInvestmentTypeMeta(investment.assetTaxonomyId || investment.type, taxonomyNodes);

  return {
    accountId: investment.accountId != null ? String(investment.accountId) : '',
    name: investment.name || '',
    type: typeMeta.type || investment.type || '',
    category: investment.category || typeMeta.category,
    assetTaxonomyId: investment.assetTaxonomyId || typeMeta.id || null,
    institution: investment.institution || '',
    totalInvested: investment.totalInvested ? String(investment.totalInvested) : '',
    currentValue: investment.currentValue ? String(investment.currentValue) : '',
    startDate: investment.startDate ? dayjs(investment.startDate) : dayjs(),
    status: investment.status || 'active',
    maturityDate: investment.maturityDate ? dayjs(investment.maturityDate) : null,
    referenceNumber: investment.referenceNumber || '',
    insuranceCover: investment.insuranceCover ? String(investment.insuranceCover) : '',
    documents: investment.documents || '',
    notes: investment.notes || '',
  };
};

export const buildInvestmentFromForm = (form, existingId, taxonomyNodes = []) => {
  const typeMeta = getInvestmentTypeMeta(form.assetTaxonomyId || form.type, taxonomyNodes);
  const parsedAccountId = form.accountId !== '' && form.accountId != null ? Number(form.accountId) : null;

  return {
    ...(existingId ? { id: existingId } : {}),
    accountId: Number.isFinite(parsedAccountId) ? parsedAccountId : null,
    assetTaxonomyId: form.assetTaxonomyId || typeMeta.id || null,
    name: form.name.trim(),
    assetType: typeMeta.type || form.type,
    assetCategory: typeMeta.category,
    institutionName: form.institution.trim() || null,
    totalInvested: Number(form.totalInvested || 0),
    currentValue: form.currentValue ? Number(form.currentValue) : Number(form.totalInvested || 0),
    startDate: normalizeDateValue(form.startDate),
    status: form.status,
    maturityDate: normalizeDateValue(form.maturityDate),
    currency: 'INR',
    holdingMode: null,
    currentValueSource: 'manual',
    lastValuationAt: normalizeDateValue(form.startDate),
    insuranceCover: form.insuranceCover ? Number(form.insuranceCover) : 0,
    referenceNumber: form.referenceNumber.trim() || null,
    documentsMeta: buildDocumentsMeta(form.documents),
    notes: form.notes.trim() || null,
  };
};
