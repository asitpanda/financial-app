import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@mdi/react';
import { mdiAlertCircleOutline, mdiCheckCircleOutline, mdiGold } from '@mdi/js';
import { alpha, Box, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Typography } from '@mui/material';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import AppDrawer from './drawers/AppDrawer';
import AppButton from './common/AppButton';
import {
  LabelCurrencyField,
  LabeledDateField,
  LabeledSelectField,
  LabeledTextField,
  LabeledTextareaField,
  SectionCard,
} from './common';
import {
  buildFormFromInvestment,
  createEmptyInvestmentForm,
  getInvestmentTypeDisplayLabel,
  getInvestmentTypeMeta,
  getInvestmentTypeTreeItems,
  STATUS_OPTIONS,
  validateInvestmentForm,
} from '../utils/investmentHelpers';

export default function InvestmentFormDrawer({
  open,
  onClose,
  onSubmit,
  initialValues = null,
  taxonomyNodes = [],
  title = 'Add Investment',
  submitLabel = 'Add',
}) {
  const [form, setForm] = useState(() => createEmptyInvestmentForm());
  const [errors, setErrors] = useState({});
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [typePickerExpandedItems, setTypePickerExpandedItems] = useState([]);
  const [pendingTypeNodeId, setPendingTypeNodeId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm(initialValues ? buildFormFromInvestment(initialValues, taxonomyNodes) : createEmptyInvestmentForm());
    setErrors({});
  }, [initialValues, open, taxonomyNodes]);

  useEffect(() => {
    if (!open) return;
    setForm((current) => {
      if (current.assetTaxonomyId || current.type) return current;
      const firstType = taxonomyNodes
        .filter((node) => node?.isActive !== false && Number(node.level) > 1)
        .sort((left, right) => {
          if (Number(left.level || 0) !== Number(right.level || 0)) return Number(left.level || 0) - Number(right.level || 0);
          if (Number(left.sortOrder || 0) !== Number(right.sortOrder || 0)) return Number(left.sortOrder || 0) - Number(right.sortOrder || 0);
          return left.label.localeCompare(right.label);
        })[0];
      if (!firstType) return current;
      const firstTypeMeta = getInvestmentTypeMeta(firstType.id, taxonomyNodes);
      return {
        ...current,
        type: firstTypeMeta.type,
        category: firstTypeMeta.category,
        assetTaxonomyId: firstTypeMeta.id,
      };
    });
  }, [open, taxonomyNodes]);

  const investmentTypeTreeItems = useMemo(
    () => getInvestmentTypeTreeItems(taxonomyNodes),
    [taxonomyNodes]
  );
  const investmentTypeRootIds = useMemo(
    () => investmentTypeTreeItems.map((item) => item.id),
    [investmentTypeTreeItems]
  );

  useEffect(() => {
    if (!typePickerOpen) return;
    setTypePickerExpandedItems(investmentTypeRootIds);
    setPendingTypeNodeId(form.assetTaxonomyId ? String(form.assetTaxonomyId) : null);
  }, [form.assetTaxonomyId, investmentTypeRootIds, typePickerOpen]);

  const handleFormChange = (field, value) => {
    setForm((current) => {
      const nextForm = { ...current, [field]: value };
      if (field === 'assetTaxonomyId' || field === 'type') {
        const nextTypeMeta = getInvestmentTypeMeta(value, taxonomyNodes);
        nextForm.type = nextTypeMeta.type;
        nextForm.category = nextTypeMeta.category;
        nextForm.assetTaxonomyId = nextTypeMeta.id;
      }
      return nextForm;
    });

    setErrors((current) => {
      if (!current[field]) return current;
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleSubmit = () => {
    const validationErrors = validateInvestmentForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit?.(form);
  };

  const handleSelectInvestmentType = (_, itemId) => {
    const nextItemId = Array.isArray(itemId) ? itemId[0] : itemId;
    if (!nextItemId) return;

    const selectedNode = taxonomyNodes.find((node) => String(node.id) === String(nextItemId));
    if (!selectedNode || Number(selectedNode.level) === 1) return;

    setPendingTypeNodeId(String(nextItemId));
  };

  const handleConfirmInvestmentType = () => {
    if (!pendingTypeNodeId) return;

    const nextTypeMeta = getInvestmentTypeMeta(pendingTypeNodeId, taxonomyNodes);
    if (!nextTypeMeta.id) return;

    setForm((current) => ({
      ...current,
      type: nextTypeMeta.type,
      category: nextTypeMeta.category,
      assetTaxonomyId: nextTypeMeta.id,
    }));

    setErrors((current) => {
      if (!current.type) return current;
      const nextErrors = { ...current };
      delete nextErrors.type;
      return nextErrors;
    });

    setTypePickerOpen(false);
    setPendingTypeNodeId(null);
  };

  const currentTypeMeta = getInvestmentTypeMeta(form.assetTaxonomyId || form.type, taxonomyNodes);
  const currentTypeDisplayLabel = getInvestmentTypeDisplayLabel(form.assetTaxonomyId || form.type, taxonomyNodes);
  const isInsurance = currentTypeMeta.category === 'insurance';
  const referenceLabel = isInsurance
    ? 'Policy Number'
    : currentTypeMeta.type === 'Mutual Fund'
      ? 'Folio Number'
      : currentTypeMeta.type === 'Stocks'
        ? 'Demat / ISIN Reference'
        : 'Account / Certificate Reference';

  const footer = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
      <AppButton variant="outlined" onClick={onClose} sx={{ minWidth: 120 }}>
        Cancel
      </AppButton>
      <AppButton variant="contained" onClick={handleSubmit} sx={{ minWidth: 160 }}>
        {submitLabel}
      </AppButton>
    </Box>
  );

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Capture the operational details needed to manage this investment end-to-end."
      width={760}
      footer={footer}
    >
      <Stack spacing={2.25}>
        <SectionCard title="Investment Type" subtitle="Choose the product family first so the drawer can adapt the operational fields.">
          <Stack spacing={2}>
            {investmentTypeTreeItems.length ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  borderColor: errors.type ? 'error.main' : 'divider',
                  background: (theme) =>
                    currentTypeDisplayLabel
                      ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.07)} 0%, ${theme.palette.background.paper} 100%)`
                      : theme.palette.background.paper,
                }}
              >
                <Stack spacing={1.25}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary">
                        Investment Type
                      </Typography>
                      <Typography sx={{ fontWeight: 700, mt: 0.35 }}>
                        {currentTypeDisplayLabel || 'Choose an asset node'}
                      </Typography>
                    </Box>
                    <AppButton variant="outlined" onClick={() => setTypePickerOpen(true)}>
                      Select From Tree
                    </AppButton>
                  </Box>
                  <Typography variant="body2" color={errors.type ? 'error.main' : 'text.secondary'}>
                    {errors.type || 'Pick a node from the asset taxonomy tree instead of a flat dropdown.'}
                  </Typography>
                </Stack>
              </Paper>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No asset taxonomy is available yet. Add taxonomy records from the asset tab first.
              </Typography>
            )}
          </Stack>
        </SectionCard>

        <SectionCard title="Basic Information">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            <LabeledTextField labelText="Investment Name" value={form.name} onChange={(event) => handleFormChange('name', event.target.value)} errorMessage={errors.name} />
            <LabeledTextField labelText="Institution" value={form.institution} onChange={(event) => handleFormChange('institution', event.target.value)} errorMessage={errors.institution} />
            <LabelCurrencyField labelText="Total Invested" value={form.totalInvested} onValueChange={(value) => handleFormChange('totalInvested', value)} errorMessage={errors.totalInvested} />
            <LabelCurrencyField labelText="Current Value (Optional)" value={form.currentValue} onValueChange={(value) => handleFormChange('currentValue', value)} />
            <LabeledDateField labelText="Start Date" value={form.startDate} onChange={(value) => handleFormChange('startDate', value)} errorMessage={errors.startDate} />
            <LabeledSelectField
              labelText="Status"
              value={form.status}
              onChange={(event) => handleFormChange('status', event.target.value)}
              options={STATUS_OPTIONS.filter((option) => option.value !== 'all')}
            />
            <LabeledTextField labelText={referenceLabel} value={form.referenceNumber} onChange={(event) => handleFormChange('referenceNumber', event.target.value)} />
          </Box>
        </SectionCard>

        <SectionCard title="Lifecycle Details" subtitle="Capture dates and protection details that belong to the agreed investment record.">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            <LabeledDateField labelText="Maturity Date (Optional)" value={form.maturityDate} onChange={(value) => handleFormChange('maturityDate', value)} />
            {isInsurance ? (
              <LabelCurrencyField labelText="Insurance Cover" value={form.insuranceCover} onValueChange={(value) => handleFormChange('insuranceCover', value)} />
            ) : null}
          </Box>
        </SectionCard>

        <SectionCard title="Investment Details" subtitle="Store operational details that matter later, not just the amount.">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            {isInsurance ? (
              <LabelCurrencyField labelText="Insurance Cover" value={form.insuranceCover} onValueChange={(value) => handleFormChange('insuranceCover', value)} />
            ) : (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Icon path={form.type === 'Gold' ? mdiGold : mdiAlertCircleOutline} size={1} />
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>Context-aware details</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, lineHeight: 1.6 }}>
                    Use notes and documents to store folio references, bond certificates, locker details, or operational instructions specific to this asset.
                  </Typography>
                </Box>
              </Paper>
            )}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Icon path={mdiCheckCircleOutline} size={1} />
              <Box>
                <Typography sx={{ fontWeight: 700 }}>Reminder-ready structure</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35, lineHeight: 1.6 }}>
                  The dashboard and calendar views use stored value and maturity information captured in this drawer.
                </Typography>
              </Box>
            </Paper>
          </Box>
        </SectionCard>

        <SectionCard title="Documents">
          <LabeledTextareaField
            labelText="Document References"
            value={form.documents}
            onChange={(event) => handleFormChange('documents', event.target.value)}
            helperText="Paste document names, folder paths, locker notes, or reference URLs for this investment."
          />
        </SectionCard>

        <SectionCard title="Notes">
          <LabeledTextareaField
            labelText="Internal Notes"
            value={form.notes}
            onChange={(event) => handleFormChange('notes', event.target.value)}
            helperText="Use this for action reminders, nominee context, or maturity instructions."
          />
        </SectionCard>
      </Stack>

      <Dialog
        open={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle>Select Investment Type</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ px: 3, py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose any non-root node from the asset taxonomy hierarchy.
            </Typography>
            <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
              <RichTreeView
                items={investmentTypeTreeItems}
                getItemId={(item) => item.id}
                getItemLabel={(item) => item.label}
                getItemChildren={(item) => item.children || []}
                selectedItems={pendingTypeNodeId || undefined}
                expandedItems={typePickerExpandedItems}
                onSelectedItemsChange={handleSelectInvestmentType}
                onExpandedItemsChange={(_, itemIds) => setTypePickerExpandedItems(itemIds)}
                expansionTrigger="iconContainer"
                sx={{
                  px: 1,
                  py: 1,
                  minHeight: 360,
                  maxHeight: 440,
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
                }}
              />
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <AppButton variant="outlined" onClick={() => setTypePickerOpen(false)}>
            Cancel
          </AppButton>
          <AppButton variant="contained" onClick={handleConfirmInvestmentType} disabled={!pendingTypeNodeId}>
            Use Selected Type
          </AppButton>
        </DialogActions>
      </Dialog>
    </AppDrawer>
  );
}