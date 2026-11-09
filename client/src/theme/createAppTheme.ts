import { createTheme } from '@mui/material/styles';
import type {} from '@mui/x-date-pickers/themeAugmentation';
import type { AppThemeMode } from '../store/themeStore';
import { getChipColors, themeColors } from '../colors';

declare module '@mui/material/styles' {
  interface Palette {
    movement: { transfer: string; investment: string };
  }

  interface PaletteOptions {
    movement?: { transfer: string; investment: string };
  }
}

export function createAppTheme(mode: AppThemeMode) {
  const palette = themeColors[mode];
  const outlinedFieldStateStyles = {
    '&:hover fieldset': {
      borderColor: palette.textSecondary,
    },
    '&.Mui-readOnly:not(.Mui-disabled)': {
      backgroundColor: palette.actionHover,
      '& input, & textarea': { caretColor: 'transparent' },
      '&:not(.Mui-error) fieldset': {
        borderColor: palette.divider,
        borderWidth: 1,
      },
      '&.Mui-focused': {
        outline: `2px solid ${palette.primary}`,
        outlineOffset: 2,
      },
    },
    '&.Mui-disabled': {
      backgroundColor: palette.actionDisabledBackground,
      color: palette.textDisabled,
      '& input, & textarea': { WebkitTextFillColor: palette.textDisabled },
      '& fieldset': { borderColor: palette.actionDisabled },
    },
  };

  return createTheme({
    palette: {
      mode,
      primary: {
        main: palette.primary,
      },
      secondary: {
        main: palette.secondary,
      },
      error: {
        main: palette.error,
      },
      warning: {
        main: palette.warning,
      },
      success: {
        main: palette.success,
      },
      info: {
        main: palette.info,
      },
      movement: {
        transfer: palette.movementTransfer,
        investment: palette.movementInvestment,
      },
      background: {
        default: palette.background,
        paper: palette.surface,
      },
      text: {
        primary: palette.textPrimary,
        secondary: palette.textSecondary,
        disabled: palette.textDisabled,
      },
      divider: palette.divider,
      action: {
        active: palette.actionActive,
        hover: palette.actionHover,
        selected: palette.actionSelected,
        selectedOpacity: palette.actionSelectedOpacity,
        disabled: palette.actionDisabled,
        disabledBackground: palette.actionDisabledBackground,
      },
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily: '"Source Sans 3", "Segoe UI", sans-serif',
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      allVariants: {
        fontVariantNumeric: 'tabular-nums',
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    components: {
      MuiChip: {
        styleOverrides: {
          root: ({ ownerState }) => {
            const chip = getChipColors(mode, ownerState.color ?? 'default');
            return {
              ...chip,
              borderColor: chip.color,
              fontWeight: 600,
              '& .MuiChip-icon, & .MuiChip-deleteIcon': {
                color: 'inherit',
              },
              '& .MuiChip-deleteIcon:hover': {
                color: 'inherit',
              },
              '&.MuiChip-clickable:hover, &.MuiChip-clickable.Mui-focusVisible': {
                backgroundColor: chip.backgroundColor,
              },
              '&.Mui-focusVisible': {
                outline: `2px solid ${chip.color}`,
                outlineOffset: 2,
              },
            };
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            '--app-primary': palette.primary,
            '--app-surface': palette.surface,
            '--app-text': palette.textPrimary,
          },
          body: {
            backgroundColor: palette.background,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderColor: palette.divider,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: outlinedFieldStateStyles,
        },
      },
      MuiPickersOutlinedInput: {
        styleOverrides: {
          root: outlinedFieldStateStyles,
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            '&.Mui-disabled, &.Mui-selected.Mui-disabled': {
              backgroundColor: palette.actionDisabledBackground,
              color: palette.textDisabled,
            },
          },
        },
      },
    },
  });
}
