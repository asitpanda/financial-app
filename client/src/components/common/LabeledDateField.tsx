import { Box, Typography } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Dayjs } from 'dayjs';

type LabeledDateFieldProps = {
  labelText: string;
  value: Dayjs | null;
  onChange: (value: Dayjs | null) => void;
  errorMessage?: string;
  helperText?: string;
};

export default function LabeledDateField({
  labelText,
  value,
  onChange,
  errorMessage,
  helperText = '',
}: LabeledDateFieldProps) {
  return (
    <Box
      className="drawer-form-field"
      sx={{
        display: 'grid',
        gridTemplateRows: '20px 43px 20px',
        height: 83,
        alignItems: 'stretch',
        alignContent: 'start',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 400, height: 20, lineHeight: '20px', display: 'flex', alignItems: 'center' }}
      >
        {labelText}
      </Typography>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          value={value}
          onChange={onChange}
          slotProps={{
            desktopPaper: {
              sx: {
                borderRadius: '5px',
              },
            },
            mobilePaper: {
              sx: {
                borderRadius: '5px',
              },
            },
            textField: {
              size: 'small',
              variant: 'outlined',
              fullWidth: true,
              error: Boolean(errorMessage),
              helperText: errorMessage || helperText,
              slotProps: {
                formHelperText: {
                  sx: {
                    height: 20,
                    lineHeight: '20px',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                  },
                },
              },
              sx: {
                '& .MuiPickersOutlinedInput-root': {
                  borderRadius: '5px',
                  height: 43,
                },
              },
            },
          }}
        />
      </LocalizationProvider>
    </Box>
  );
}