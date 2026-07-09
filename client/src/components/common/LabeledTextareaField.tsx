import { Box, TextField, Typography, type TextFieldProps } from '@mui/material';

type LabeledTextareaFieldProps = TextFieldProps & {
  labelText: string;
  errorMessage?: string;
};

export default function LabeledTextareaField({
  labelText,
  errorMessage,
  helperText = '',
  variant = 'outlined',
  fullWidth = true,
  minRows = 3,
  sx,
  ...textFieldProps
}: LabeledTextareaFieldProps) {
  const helperSlotProps = {
    sx: {
      minHeight: 20,
      lineHeight: '20px',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
    },
  };

  return (
    <Box
      className="drawer-form-field"
      sx={{
        display: 'grid',
        gridTemplateRows: '20px auto 20px',
        alignItems: 'stretch',
        alignContent: 'start',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 400, minHeight: 20, lineHeight: '20px', display: 'flex', alignItems: 'center' }}
      >
        {labelText}
      </Typography>
      <TextField
        {...textFieldProps}
        multiline
        minRows={minRows}
        variant={variant}
        fullWidth={fullWidth}
        error={Boolean(errorMessage) || textFieldProps.error}
        helperText={errorMessage || helperText}
        slotProps={{
          ...textFieldProps.slotProps,
          formHelperText: {
            ...textFieldProps.slotProps?.formHelperText,
            ...helperSlotProps,
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '5px',
            alignItems: 'flex-start',
          },
          ...sx,
        }}
      />
    </Box>
  );
}