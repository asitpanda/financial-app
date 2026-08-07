import {
  FormControl,
  FormHelperText,
  MenuItem,
  Select,
  Typography,
  type SxProps,
  type Theme,
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

const DEFAULT_MENU_PAPER_SX: SxProps<Theme> = {
  maxHeight: 320,
  overflowY: 'auto',
};

const DEFAULT_MENU_PAPER_STYLE = {
  maxHeight: 320,
  overflowY: 'auto' as const,
};

const DEFAULT_MENU_LIST_SX: SxProps<Theme> = {
  py: 0.5,
  maxHeight: 320,
  overflowY: 'auto',
};

export default function LabeledSelectField({
  labelText,
  errorMessage,
  helperText = '',
  options,
  size = 'small',
  sx,
  MenuProps,
  ...selectProps
}: LabeledSelectFieldProps) {
  const mergedMenuProps = {
    ...MenuProps,
    slotProps: {
      ...MenuProps?.slotProps,
      paper: {
        style: DEFAULT_MENU_PAPER_STYLE,
        sx: DEFAULT_MENU_PAPER_SX,
      },
      list: {
        dense: true,
        sx: DEFAULT_MENU_LIST_SX,
      },
    },
  };

  return (
    <FormControl
      fullWidth
      size={size}
      error={Boolean(errorMessage) || selectProps.error}
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
      <Select
        {...selectProps}
        size={size}
        MenuProps={mergedMenuProps}
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
          minHeight: 20,
          lineHeight: '20px',
          margin: 0,
          display: 'flex',
          alignItems: 'flex-start',
          pt: 0.5,
          whiteSpace: 'normal',
        }}
      >
        {errorMessage || helperText}
      </FormHelperText>
    </FormControl>
  );
}