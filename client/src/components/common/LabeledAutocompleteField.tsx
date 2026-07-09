import {
  Autocomplete,
  FormControl,
  FormHelperText,
  TextField,
  Typography,
  type AutocompleteProps,
} from '@mui/material';

type LabeledAutocompleteFieldProps<T> = {
  labelText: string;
  errorMessage?: string;
  helperText?: string;
  placeholder?: string;
} & Omit<
  AutocompleteProps<T, false, boolean | undefined, false>,
  'renderInput'
>;

export default function LabeledAutocompleteField<T>({
  labelText,
  errorMessage,
  helperText = '',
  placeholder,
  size = 'small',
  ...autocompleteProps
}: LabeledAutocompleteFieldProps<T>) {
  return (
    <FormControl
      fullWidth
      size="small"
      error={Boolean(errorMessage)}
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
      <Autocomplete
        {...autocompleteProps}
        size={size}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            variant="outlined"
            error={Boolean(errorMessage)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '5px',
                height: 43,
              },
            }}
          />
        )}
      />
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