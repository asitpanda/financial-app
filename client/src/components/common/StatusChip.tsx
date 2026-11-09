import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { getChipColors } from '../../colors';

type StatusTone = 'success' | 'error' | 'warning' | 'info' | 'default' | 'transfer' | 'investment';

interface StatusChipProps {
  label: string;
  tone?: StatusTone;
}

export default function StatusChip({ label, tone = 'default' }: StatusChipProps) {
  const theme = useTheme();

  return (
    <Chip
      size="small"
      label={label}
      variant="outlined"
      color={tone === 'transfer' || tone === 'investment' ? 'default' : tone}
      sx={{
        textTransform: 'capitalize',
        fontWeight: 600,
        ...getChipColors(theme.palette.mode, tone),
        borderColor: getChipColors(theme.palette.mode, tone).color,
      }}
    />
  );
}
