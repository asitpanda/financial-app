import { Box, TextField, Typography, type TextFieldProps } from '@mui/material';

type LabeledTextFieldProps = TextFieldProps & {
  labelText: string;
  errorMessage?: string;
};

export default function LabeledTextField({
  labelText,
  errorMessage,
  helperText = '',
  variant = 'outlined',
  size = 'small',
  fullWidth = true,
  sx,
  ...textFieldProps
}: LabeledTextFieldProps) {
  const helperSlotProps = {
    sx: {
      height: 20,
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
      <TextField
        {...textFieldProps}
        size={size}
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
            height: 43,
            alignItems: 'center',
          },
          ...sx,
        }}
      />
    </Box>
  );
}