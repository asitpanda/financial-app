import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@mdi/react';
import { mdiDeleteOutline, mdiPencilOutline, mdiPlus } from '@mdi/js';
import { alpha, Box, Chip, IconButton, Paper, Stack, Typography } from '@mui/material';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { useTreeItemModel } from '@mui/x-tree-view/hooks';
import AppDrawer from './drawers/AppDrawer';
import AppButton from './common/AppButton';
import { LabeledSelectField, LabeledTextField, SectionCard } from './common';
import ConfirmDialog from './dialogs/ConfirmDialog';

const LEVEL_OPTIONS = [1, 2, 3, 4, 5].map((level) => ({ value: String(level), label: `Level ${level}` }));
const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];
const DEFAULT_NODE_TYPE_BY_LEVEL = {
  1: 'category',
  2: 'type',
  3: 'subtype',
  4: 'segment',
  5: 'detail',
};

const createEmptyForm = () => ({
  label: '',
  nodeType: 'category',
  level: '1',
  parentId: '',
  sortOrder: '0',
  isActive: 'true',
});

const createFormFromNode = (node) => ({
  label: node.label || '',
  nodeType: node.nodeType || 'category',
  level: String(node.level || 1),
  parentId: node.parentId ? String(node.parentId) : '',
  sortOrder: String(node.sortOrder ?? 0),
  isActive: String(node.isActive !== false),
});

const createChildFormFromNode = (node) => {
  const nextLevel = Math.min(Number(node.level || 1) + 1, 5);
  return {
    label: '',
    nodeType: DEFAULT_NODE_TYPE_BY_LEVEL[nextLevel] || 'node',
    level: String(nextLevel),
    parentId: String(node.id),
    sortOrder: '0',
    isActive: 'true',
  };
};

const buildTaxonomyTree = (nodes, parentId = null) => {
  return nodes
    .filter((node) => (node.parentId ?? null) === parentId)
    .map((node) => ({
      ...node,
      id: String(node.id),
      children: buildTaxonomyTree(nodes, node.id),
    }));
};

const collectRootExpansionIds = (nodes) =>
  nodes.filter((node) => node.parentId == null).map((node) => String(node.id));

const buildLineage = (node, nodesById) => {
  if (!node) return [];

  const lineage = [];
  let current = node;
  while (current) {
    lineage.unshift(current);
    current = current.parentId ? nodesById[current.parentId] || null : null;
  }

  return lineage;
};

function TaxonomyTreeItemLabel({ children, node, isSelected, onEditNode, onAddChildNode, onDeleteNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        width: '100%',
        minWidth: 0,
      }}
    >
      <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
        <Typography
          component="div"
          sx={{
            fontWeight: isSelected ? 800 : 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {children}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.15 }}>
          Level {node.level} • {node.nodeType}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          opacity: isSelected ? 1 : 0.72,
          transition: 'opacity 160ms ease',
          flexShrink: 0,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {Number(node.level) < 5 ? (
          <IconButton size="small" onClick={() => onAddChildNode(node)} aria-label={`Add child to ${node.label}`}>
            <Icon path={mdiPlus} size={0.72} />
          </IconButton>
        ) : null}
        <IconButton size="small" onClick={() => onEditNode(node)} aria-label={`Edit ${node.label}`}>
          <Icon path={mdiPencilOutline} size={0.72} />
        </IconButton>
        <IconButton size="small" color="error" onClick={() => onDeleteNode(node)} aria-label={`Delete ${node.label}`}>
          <Icon path={mdiDeleteOutline} size={0.72} />
        </IconButton>
      </Box>
    </Box>
  );
}

const TaxonomyTreeItem = React.forwardRef(function TaxonomyTreeItem(props, ref) {
  const {
    onEditNode,
    onAddChildNode,
    onDeleteNode,
    selectedNodeId,
    ...other
  } = props;
  const node = useTreeItemModel(props.itemId);

  return (
    <TreeItem
      {...other}
      ref={ref}
      slotProps={{
        ...other.slotProps,
        label: {
          ...other.slotProps?.label,
          node,
          isSelected: String(selectedNodeId) === String(props.itemId),
          onEditNode,
          onAddChildNode,
          onDeleteNode,
        },
      }}
      slots={{
        ...other.slots,
        label: TaxonomyTreeItemLabel,
      }}
    />
  );
});

const validateForm = (form, taxonomyNodes, parentOptions, editingNodeId = null) => {
  const errors = {};
  const normalizedLabel = String(form.label || '').trim().toLowerCase();
  const level = Number(form.level || 0);
  const sortOrder = Number(form.sortOrder || 0);
  const selectedParent = taxonomyNodes.find((node) => String(node.id) === String(form.parentId));

  if (!form.label.trim()) {
    errors.label = 'Label is required';
  }

  if (!form.nodeType.trim()) {
    errors.nodeType = 'Node type is required';
  }

  if (!level || level < 1 || level > 5) {
    errors.level = 'Level must be between 1 and 5';
  }

  if (level > 1 && !form.parentId) {
    errors.parentId = 'Parent is required for nested nodes';
  }

  if (form.parentId && !parentOptions.some((option) => option.value === String(form.parentId))) {
    errors.parentId = 'Parent must come from the previous level';
  }

  if (Number.isNaN(sortOrder)) {
    errors.sortOrder = 'Sort order must be a number';
  }

  const duplicateAtLevel = taxonomyNodes.find(
    (node) =>
      node.id !== editingNodeId &&
      String(node.parentId ?? '') === String(selectedParent?.id ?? '') &&
      String(node.label || '').trim().toLowerCase() === normalizedLabel
  );

  if (duplicateAtLevel) {
    errors.label = 'Label already exists under the selected parent';
  }

  return errors;
};

export default function InvestmentAssetTaxonomyFormDrawer({
  open,
  onClose,
  onSubmit,
  onDelete,
  taxonomyNodes = [],
}) {
  const [form, setForm] = useState(() => createEmptyForm());
  const [errors, setErrors] = useState({});
  const [editorMode, setEditorMode] = useState('browse');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [expandedItems, setExpandedItems] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const wasOpenRef = useRef(false);

  const sortedTaxonomyNodes = useMemo(
    () =>
      [...taxonomyNodes].sort((left, right) => {
        if (left.level !== right.level) return left.level - right.level;
        if ((left.sortOrder || 0) !== (right.sortOrder || 0)) return (left.sortOrder || 0) - (right.sortOrder || 0);
        return left.label.localeCompare(right.label);
      }),
    [taxonomyNodes]
  );

  const taxonomyNodesById = useMemo(
    () =>
      taxonomyNodes.reduce((acc, node) => {
        acc[node.id] = node;
        return acc;
      }, {}),
    [taxonomyNodes]
  );

  const selectedNode = useMemo(
    () => taxonomyNodes.find((node) => String(node.id) === String(selectedNodeId)) || null,
    [selectedNodeId, taxonomyNodes]
  );

  const selectedLineage = useMemo(() => buildLineage(selectedNode, taxonomyNodesById), [selectedNode, taxonomyNodesById]);

  const parentOptions = useMemo(() => {
    const parentLevel = Number(form.level) - 1;
    if (parentLevel < 1) return [];

    return selectedLineage
      .filter((node) => Number(node.level) === parentLevel)
      .map((node) => ({
        value: String(node.id),
        label: node.label,
      }));
  }, [form.level, selectedLineage]);

  const taxonomyTree = useMemo(() => buildTaxonomyTree(sortedTaxonomyNodes), [sortedTaxonomyNodes]);
  const taxonomyTreeVersion = useMemo(
    () => sortedTaxonomyNodes.map((node) => `${node.id}:${node.parentId ?? 'root'}:${node.level}`).join('|'),
    [sortedTaxonomyNodes]
  );

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    if (wasOpenRef.current) return;

    wasOpenRef.current = true;
    const firstNodeId = sortedTaxonomyNodes[0] ? String(sortedTaxonomyNodes[0].id) : null;
    setForm(createEmptyForm());
    setErrors({});
    setEditorMode(firstNodeId ? 'browse' : 'create-root');
    setSelectedNodeId(firstNodeId);
    setExpandedItems(collectRootExpansionIds(sortedTaxonomyNodes));
    setDeleteTarget(null);
  }, [open, sortedTaxonomyNodes]);

  useEffect(() => {
    if (!open) return;

    if (!selectedNodeId && sortedTaxonomyNodes[0]) {
      setSelectedNodeId(String(sortedTaxonomyNodes[0].id));
      setEditorMode('browse');
    }

    setExpandedItems((current) => Array.from(new Set([...current, ...collectRootExpansionIds(sortedTaxonomyNodes)])));
  }, [open, selectedNodeId, sortedTaxonomyNodes]);

  useEffect(() => {
    if (!open) return;

    const validNodeIds = new Set(taxonomyNodes.map((node) => String(node.id)));

    setExpandedItems((current) => current.filter((itemId) => validNodeIds.has(String(itemId))));

    if (selectedNodeId && validNodeIds.has(String(selectedNodeId))) {
      return;
    }

    const firstNodeId = sortedTaxonomyNodes[0] ? String(sortedTaxonomyNodes[0].id) : null;
    setSelectedNodeId(firstNodeId);
    setEditorMode(firstNodeId ? 'browse' : 'create-root');
  }, [open, selectedNodeId, sortedTaxonomyNodes, taxonomyNodes]);

  const isEditing = editorMode === 'edit';
  const isBrowse = editorMode === 'browse';

  const editorTitle = isEditing
    ? `Edit ${selectedNode?.label || 'Taxonomy Node'}`
    : editorMode === 'create-child'
      ? `Add Child under ${selectedNode?.label || 'Selected Node'}`
      : editorMode === 'create-sibling'
        ? `Add Sibling near ${selectedNode?.label || 'Selected Node'}`
        : editorMode === 'create-root'
          ? 'Add Root Category'
          : selectedNode?.label || 'Asset Taxonomy';

  const editorSubtitle = isBrowse
    ? 'Select a single action for the highlighted node. Expansion and navigation stay on the left.'
    : isEditing
      ? 'Update the selected node without losing its position in the hierarchy.'
      : 'The hierarchy context is prefilled from the selected node.';

  const handleFormChange = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === 'level') {
        const nextLevel = Number(value);
        next.nodeType = DEFAULT_NODE_TYPE_BY_LEVEL[nextLevel] || 'node';
        if (nextLevel === 1) {
          next.parentId = '';
        } else if (next.parentId) {
          const allowedParentIds = new Set(
            selectedLineage
              .filter((node) => Number(node.level) === nextLevel - 1)
              .map((node) => String(node.id))
          );

          if (!allowedParentIds.has(String(next.parentId))) {
            next.parentId = '';
          }
        }
      }

      return next;
    });

    setErrors((current) => {
      if (!current[field]) return current;
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleSubmit = () => {
    const validationErrors = validateForm(form, taxonomyNodes, parentOptions, isEditing && selectedNode ? selectedNode.id : null);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const submitResult = onSubmit?.({
      ...(isEditing && selectedNode ? { id: selectedNode.id } : {}),
      label: form.label.trim(),
      nodeType: form.nodeType.trim(),
      level: Number(form.level),
      parentId: form.parentId ? Number(form.parentId) : undefined,
      sortOrder: Number(form.sortOrder || 0),
      isActive: form.isActive === 'true',
    });

    Promise.resolve(submitResult).then((savedNode) => {
      if (!savedNode) return;

      setSelectedNodeId(String(savedNode.id));
      setEditorMode('browse');
      setErrors({});
      setExpandedItems((current) => {
        const nextExpanded = new Set(current);
        if (savedNode.parentId) {
          nextExpanded.add(String(savedNode.parentId));
        }
        return Array.from(nextExpanded);
      });
    });
  };

  const handleStartCreateRoot = () => {
    setEditorMode('create-root');
    setForm(createEmptyForm());
    setErrors({});
  };

  const handleSelectNode = (_, itemId) => {
    if (!itemId) return;
    setSelectedNodeId(Array.isArray(itemId) ? itemId[0] : itemId);
    setEditorMode('browse');
    setErrors({});
  };

  const handleDeleteNode = () => {
    if (!deleteTarget) return;
    onDelete?.(deleteTarget);
    if (String(selectedNodeId) === String(deleteTarget.id)) {
      setSelectedNodeId(deleteTarget.parentId ? String(deleteTarget.parentId) : null);
      setEditorMode(deleteTarget.parentId ? 'browse' : 'create-root');
    }
    setDeleteTarget(null);
  };

  const footer = (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
      <AppButton variant="contained" onClick={onClose} sx={{ minWidth: 120 }}>
        Done
      </AppButton>
    </Box>
  );

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title="Manage Asset Taxonomy"
      subtitle={selectedNode ? `Focused on ${selectedNode.label}` : 'Create and maintain the asset hierarchy used by the investment drawer.'}
      width={1040}
      footer={footer}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '360px minmax(0, 1fr)' }, gap: 2 }}>
        <SectionCard
          title="Asset Hierarchy"
          subtitle="Use expand and collapse to navigate the taxonomy, then work from the selected node on the right."
          action={
            <AppButton variant="outlined" onClick={handleStartCreateRoot}>
              <Icon path={mdiPlus} size={0.8} style={{ marginRight: 8 }} />
              Add Root
            </AppButton>
          }
        >
          {taxonomyTree.length ? (
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 1,
                overflow: 'hidden',
                background: (theme) => `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${theme.palette.background.paper} 100%)`,
              }}
            >
              <RichTreeView
                key={taxonomyTreeVersion}
                items={taxonomyTree}
                slots={{ item: TaxonomyTreeItem }}
                slotProps={{
                  item: {
                    onEditNode: (node) => {
                      setSelectedNodeId(String(node.id));
                      setEditorMode('edit');
                      setForm(createFormFromNode(node));
                      setErrors({});
                    },
                    onAddChildNode: (node) => {
                      if (Number(node.level) >= 5) return;
                      setSelectedNodeId(String(node.id));
                      setEditorMode('create-child');
                      setForm(createChildFormFromNode(node));
                      setErrors({});
                      setExpandedItems((current) => Array.from(new Set([...current, String(node.id)])));
                    },
                    onDeleteNode: (node) => {
                      setSelectedNodeId(String(node.id));
                      setDeleteTarget(node);
                    },
                    selectedNodeId,
                  },
                }}
                getItemId={(item) => item.id}
                getItemLabel={(item) => item.label}
                getItemChildren={(item) => item.children || []}
                selectedItems={selectedNodeId || undefined}
                expandedItems={expandedItems}
                onSelectedItemsChange={handleSelectNode}
                onExpandedItemsChange={(_, itemIds) => setExpandedItems(itemIds)}
                expansionTrigger="iconContainer"
                sx={{
                  py: 1,
                  px: 0.5,
                  minHeight: 420,
                  maxHeight: 560,
                  overflowY: 'auto',
                  '& .MuiTreeItem-content': {
                    borderRadius: 1,
                    mx: 0.5,
                    my: 0.25,
                    py: 0.5,
                  },
                  '& .MuiTreeItem-content.Mui-selected': {
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  },
                  '& .MuiTreeItem-content.Mui-selected:hover': {
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.16),
                  },
                  '& .MuiTreeItem-label': {
                    fontWeight: 600,
                  },
                }}
              />
            </Paper>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No asset taxonomy exists yet. Start with a root category from the workspace on the right.
            </Typography>
          )}
        </SectionCard>

        <SectionCard
          title={editorTitle}
          subtitle={editorSubtitle}
          action={
            !isBrowse ? (
              <AppButton variant="contained" onClick={handleSubmit}>
                {isEditing ? 'Update Node' : 'Save Node'}
              </AppButton>
            ) : null
          }
        >
          {isBrowse ? (
            <Stack spacing={2}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1,
                  background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.07)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                }}
              >
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
                  {selectedNode ? (
                    <>
                      <Chip size="small" label={`Level ${selectedNode.level}`} />
                      <Chip size="small" variant="outlined" label={selectedNode.nodeType} />
                      <Chip size="small" color={selectedNode.isActive ? 'success' : 'default'} label={selectedNode.isActive ? 'Active' : 'Inactive'} />
                    </>
                  ) : null}
                </Box>
                {selectedLineage.length ? (
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.25 }}>
                    {selectedLineage.map((node) => (
                      <Chip key={node.id} size="small" variant="outlined" label={node.label} />
                    ))}
                  </Box>
                ) : null}
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  {selectedNode
                    ? 'Use the icons on the selected tree item to edit, add a child, or delete. Use the root action on the left for new top-level categories.'
                    : 'Select a node from the left, or create a root category to begin the hierarchy.'}
                </Typography>
              </Paper>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
                  <Chip size="small" label={`Level ${form.level}`} />
                  <Chip size="small" variant="outlined" label={form.nodeType || 'node'} />
                  <Chip size="small" color={form.isActive === 'true' ? 'success' : 'default'} label={form.isActive === 'true' ? 'Active' : 'Inactive'} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {Number(form.level) === 1
                    ? 'This node will be created at the root of the hierarchy.'
                    : `Parent: ${parentOptions.find((option) => option.value === form.parentId)?.label || selectedNode?.label || 'Selected node'}`}
                </Typography>
              </Paper>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                <LabeledTextField
                  labelText="Label"
                  value={form.label}
                  onChange={(event) => handleFormChange('label', event.target.value)}
                  errorMessage={errors.label}
                  placeholder="Mutual Fund"
                />
                <LabeledSelectField
                  labelText="Level"
                  value={form.level}
                  onChange={(event) => handleFormChange('level', event.target.value)}
                  options={LEVEL_OPTIONS}
                  errorMessage={errors.level}
                />
                <LabeledTextField
                  labelText="Node Type"
                  value={form.nodeType}
                  onChange={(event) => handleFormChange('nodeType', event.target.value)}
                  errorMessage={errors.nodeType}
                  helperText="Examples: category, type, subtype"
                />
                <LabeledSelectField
                  labelText="Parent Node"
                  value={form.parentId}
                  onChange={(event) => handleFormChange('parentId', event.target.value)}
                  options={parentOptions}
                  errorMessage={errors.parentId}
                  helperText={
                    Number(form.level) === 1
                      ? 'Level 1 nodes do not need a parent'
                      : 'Only nodes from the selected hierarchy path are available'
                  }
                  disabled={Number(form.level) === 1}
                />
                <LabeledTextField
                  labelText="Sort Order"
                  value={form.sortOrder}
                  onChange={(event) => handleFormChange('sortOrder', event.target.value)}
                  errorMessage={errors.sortOrder}
                  placeholder="0"
                />
                <LabeledSelectField
                  labelText="Status"
                  value={form.isActive}
                  onChange={(event) => handleFormChange('isActive', event.target.value)}
                  options={ACTIVE_OPTIONS}
                />
              </Box>
            </Stack>
          )}
        </SectionCard>
      </Box>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete asset taxonomy"
        description={deleteTarget ? `Remove ${deleteTarget.label} from the asset taxonomy? Child nodes under this branch will also be removed.` : ''}
        confirmLabel="Delete"
        confirmColor="error"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteNode}
      />
    </AppDrawer>
  );
}