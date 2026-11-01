import { createTheme } from '@mui/material/styles';
import type { AppThemeMode } from '../store/themeStore';
import { themeColors } from '../colors';

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
          root: {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.textSecondary,
            },
          },
        },
      },
    },
  });
}
