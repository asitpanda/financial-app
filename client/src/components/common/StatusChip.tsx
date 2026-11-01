import { Chip } from '@mui/material';

type StatusTone = 'success' | 'error' | 'warning' | 'info' | 'default' | 'transfer' | 'investment';

interface StatusChipProps {
  label: string;
  tone?: StatusTone;
}

export default function StatusChip({ label, tone = 'default' }: StatusChipProps) {
  const movementTone = tone === 'transfer' || tone === 'investment' ? tone : undefined;

  return (
    <Chip
      size="small"
      label={label}
      variant="outlined"
      color={tone === 'transfer' || tone === 'investment' ? 'default' : tone}
      sx={{
        textTransform: 'capitalize',
        fontWeight: 600,
        ...(movementTone ? { color: `movement.${movementTone}`, borderColor: `movement.${movementTone}` } : {}),
      }}
    />
  );
}
