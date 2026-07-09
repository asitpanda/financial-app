import { Box, TextField, Typography, type TextFieldProps } from '@mui/material';
import { NumericFormat } from 'react-number-format';
import { DEFAULT_CURRENCY_CONFIG } from '../../constants/currency';

type LabelCurrencyFieldProps = Omit<TextFieldProps, 'value' | 'defaultValue' | 'onChange' | 'type'> & {
  labelText: string;
  errorMessage?: string;
  value?: string | number | null;
  onValueChange?: (value: string) => void;
  currencyPrefix?: string;
};

export default function LabelCurrencyField({
  labelText,
  errorMessage,
  helperText = '',
  value,
  onValueChange,
  currencyPrefix = DEFAULT_CURRENCY_CONFIG.inputPrefix,
  variant = 'outlined',
  size = 'small',
  fullWidth = true,
  placeholder,
  sx,
  ...textFieldProps
}: LabelCurrencyFieldProps) {
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
      <NumericFormat
        customInput={TextField}
        value={value ?? ''}
        thousandSeparator
        allowNegative={false}
        decimalScale={2}
        valueIsNumericString
        prefix={`${currencyPrefix} `}
        onValueChange={(values) => {
          onValueChange?.(values.value);
        }}
        size={size}
        variant={variant}
        fullWidth={fullWidth}
        placeholder={placeholder}
        error={Boolean(errorMessage)}
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
        {...textFieldProps}
      />
    </Box>
  );
}