import { Box, TextField, Typography, type TextFieldProps } from '@mui/material';
import { NumericFormat } from 'react-number-format';
import { DEFAULT_CURRENCY_CONFIG } from '../../constants/currency';
import { usePreferencesStore } from '../../store/preferencesStore';

type LabelCurrencyFieldProps = Omit<TextFieldProps, 'value' | 'defaultValue' | 'onChange' | 'type'> & {
  labelText: string;
  errorMessage?: string;
  value?: string | number | null;
  onValueChange?: (value: string) => void;
  currencyPrefix?: string;
  currencyCode?: string;
};

export default function LabelCurrencyField({
  labelText,
  errorMessage,
  helperText = '',
  value,
  onValueChange,
  currencyPrefix,
  currencyCode = DEFAULT_CURRENCY_CONFIG.code,
  variant = 'outlined',
  size = 'small',
  fullWidth = true,
  placeholder,
  sx,
  ...textFieldProps
}: LabelCurrencyFieldProps) {
  const currencyDisplay = usePreferencesStore((state) => state.preferences?.currencyDisplay ?? 'symbol');
  const currencyMarker = new Intl.NumberFormat(DEFAULT_CURRENCY_CONFIG.locale, {
    style: 'currency', currency: currencyCode, currencyDisplay,
  }).formatToParts(0).find((part) => part.type === 'currency')?.value ?? currencyCode;
  const helperSlotProps = {
    sx: {
      minHeight: 20,
      lineHeight: '20px',
      margin: 0,
      display: 'flex',
      alignItems: 'flex-start',
      pt: 0.5,
      whiteSpace: 'normal',
    },
  };

  return (
    <Box
      className="drawer-form-field"
      sx={{
        display: 'grid',
        gridTemplateRows: '20px 43px auto',
        minHeight: 83,
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
        {...textFieldProps}
        customInput={TextField}
        value={value ?? ''}
        thousandSeparator
        allowNegative={false}
        decimalScale={2}
        valueIsNumericString
        prefix={`${currencyPrefix ?? currencyMarker} `}
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
          htmlInput: {
            'aria-label': labelText,
            ...textFieldProps.slotProps?.htmlInput,
          },
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