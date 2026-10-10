import { useState } from 'react';
import Icon from '@mdi/react';
import { mdiMinusCircleOutline, mdiPlus } from '@mdi/js';
import { Alert, Box, Checkbox, FormControlLabel, IconButton, Stack, Typography } from '@mui/material';
import AppDrawer from '../../../components/drawers/AppDrawer';
import AppButton from '../../../components/common/AppButton';
import { LabeledSelectField, LabeledTextField } from '../../../components/common';
import { useNotificationStore } from '../../../store/notificationStore';
import { useCreateLockerEntity, useUpdateLockerEntity } from '../useLocker';
import { emptyField, FIELD_TYPE_OPTIONS, getErrorMessage } from '../locker.utils';
import type {
    CreateLockerEntityInput,
    LockerEntity,
    LockerFieldInput,
    LockerFieldType,
    UpdateLockerEntityInput,
} from '../locker.types';

interface LockerEntityFormDrawerProps {
    entity?: LockerEntity;
    onClose: () => void;
}

export default function LockerEntityFormDrawer({ entity, onClose }: LockerEntityFormDrawerProps) {
    const [label, setLabel] = useState(entity?.label || '');
    const [fields, setFields] = useState<LockerFieldInput[]>(
        entity?.fields.map((field) => ({
            ...field,
            masked: field.type === 'password' ? true : field.masked,
            options: field.options?.map((option) => ({ ...option })),
        })) || [emptyField()],
    );
    const [error, setError] = useState('');
    const createMutation = useCreateLockerEntity();
    const updateMutation = useUpdateLockerEntity();
    const pushNotification = useNotificationStore((state) => state.pushNotification);
    const isSaving = createMutation.isPending || updateMutation.isPending;

    const updateField = (index: number, patch: Partial<LockerFieldInput>) => {
        setFields((current) => current.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...patch } : field)));
    };

    const validate = () => {
        if (!label.trim()) return 'Enter an information type name.';
        if (!fields.length) return 'Add at least one field.';
        const labels = new Set<string>();
        for (const field of fields) {
            const fieldLabel = field.label.trim().toLowerCase();
            if (!fieldLabel) return 'Every field needs a label.';
            if (labels.has(fieldLabel)) return 'Field labels must be unique.';
            labels.add(fieldLabel);
            if (field.type === 'select') {
                if (!field.options?.length) return `Add options for ${field.label}.`;
                const values = new Set<string>();
                for (const option of field.options) {
                    if (!option.label.trim() || !option.value.trim()) return `Complete every option for ${field.label}.`;
                    if (values.has(option.value.trim())) return `Option values must be unique for ${field.label}.`;
                    values.add(option.value.trim());
                }
            }
        }
        return '';
    };

    const save = async () => {
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }
        setError('');
        const payload: CreateLockerEntityInput = {
            label: label.trim(),
            fields: fields.map((field) => ({
                ...field,
                label: field.label.trim(),
                options: field.type === 'select'
                    ? field.options?.map((option) => ({ ...option, label: option.label.trim(), value: option.value.trim() }))
                    : undefined,
            })),
        };
        try {
            if (entity) await updateMutation.mutateAsync({ uid: entity.uid, data: payload as UpdateLockerEntityInput });
            else await createMutation.mutateAsync(payload);
            pushNotification({ type: 'success', message: entity ? 'Information type updated' : 'Information type created' });
            onClose();
        } catch (mutationError) {
            setError(getErrorMessage(mutationError, 'Unable to save this information type.'));
        }
    };

    return (
        <AppDrawer
            open
            title={entity ? 'Edit information type' : 'New information type'}
            subtitle="Define the fields used by each stored information record."
            onClose={onClose}
            width={600}
            footer={
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <AppButton variant="outlined" onClick={onClose}>Cancel</AppButton>
                    <AppButton variant="contained" onClick={save} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save type'}
                    </AppButton>
                </Box>
            }
        >
            <Stack spacing={2}>
                {error ? <Alert severity="error">{error}</Alert> : null}
                <LabeledTextField labelText="Type name" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Bank Details" />
                <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Fields</Typography>
                        <AppButton size="small" variant="outlined" startIcon={<Icon path={mdiPlus} size={0.75} />} onClick={() => setFields((current) => [...current, emptyField()])}>Add field</AppButton>
                    </Box>
                    {fields.map((field, index) => (
                        <Box key={field.uid || `new-field-${index}`} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Stack spacing={1.25}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 150px auto' }, gap: 1, alignItems: 'start' }}>
                                    <LabeledTextField labelText="Field label" value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} placeholder="Account Number" />
                                    <LabeledSelectField labelText="Type" value={field.type} options={FIELD_TYPE_OPTIONS} onChange={(event) => { const type = event.target.value as LockerFieldType; updateField(index, { type, masked: type === 'password' ? true : field.masked, options: type === 'select' ? field.options || [{ label: '', value: '' }] : undefined }); }} />
                                    <IconButton aria-label={`Remove ${field.label || 'field'}`} title="Remove field" onClick={() => setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index))} sx={{ mt: 2.8 }}><Icon path={mdiMinusCircleOutline} size={0.8} /></IconButton>
                                </Box>
                                {field.type === 'password' ? <FormControlLabel control={<Checkbox checked={field.masked} onChange={(event) => updateField(index, { masked: event.target.checked })} />} label="Mask values in records" /> : null}
                                {field.type === 'select' ? <LockerOptionEditor field={field} onChange={(options) => updateField(index, { options })} /> : null}
                            </Stack>
                        </Box>
                    ))}
                </Stack>
            </Stack>
        </AppDrawer>
    );
}

function LockerOptionEditor({ field, onChange }: { field: LockerFieldInput; onChange: (options: NonNullable<LockerFieldInput['options']>) => void }) {
    const options = field.options || [];
    return (
        <Stack spacing={1} sx={{ pl: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">Select options</Typography>
                <IconButton aria-label="Add select option" title="Add option" size="small" onClick={() => onChange([...options, { label: '', value: '' }])}><Icon path={mdiPlus} size={0.7} /></IconButton>
            </Box>
            {options.map((option, index) => (
                <Box key={option.uid || `new-option-${index}`} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1, alignItems: 'start' }}>
                    <LabeledTextField labelText="Label" value={option.label} onChange={(event) => onChange(options.map((current, optionIndex) => optionIndex === index ? { ...current, label: event.target.value } : current))} />
                    <LabeledTextField labelText="Value" value={option.value} onChange={(event) => onChange(options.map((current, optionIndex) => optionIndex === index ? { ...current, value: event.target.value } : current))} />
                    <IconButton aria-label="Remove select option" title="Remove option" onClick={() => onChange(options.filter((_, optionIndex) => optionIndex !== index))} sx={{ mt: 2.8 }}><Icon path={mdiMinusCircleOutline} size={0.8} /></IconButton>
                </Box>
            ))}
        </Stack>
    );
}