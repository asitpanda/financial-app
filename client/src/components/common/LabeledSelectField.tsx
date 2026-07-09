import {
  FormControl,
  FormHelperText,
  MenuItem,
  Select,
  Typography,
  type SelectProps,
} from '@mui/material';

type SelectOption = {
  value: string;
  label: string;
};

type LabeledSelectFieldProps = Omit<SelectProps<string>, 'children'> & {
  labelText: string;
  errorMessage?: string;
  helperText?: string;
  options: SelectOption[];
};

export default function LabeledSelectField({
  labelText,
  errorMessage,
  helperText = '',
  options,
  size = 'small',
  sx,
  ...selectProps
}: LabeledSelectFieldProps) {
  return (
    <FormControl
      fullWidth
      size={size}
      error={Boolean(errorMessage) || selectProps.error}
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
      <Select
        {...selectProps}
        size={size}
        sx={{
          borderRadius: '5px',
          height: 43,
          ...sx,
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText
        sx={{
          height: 20,
          lineHeight: '20px',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {errorMessage || helperText}
      </FormHelperText>
    </FormControl>
  );
}