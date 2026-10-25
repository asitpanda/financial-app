import { createTheme } from '@mui/material/styles';
import type { AppThemeMode } from '../store/themeStore';
import { themeColors } from '../colors';

export function createAppTheme(mode: AppThemeMode) {
  const isLight = mode === 'light';
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
        selectedOpacity: 1,
        disabled: palette.actionDisabled,
        disabledBackground: palette.actionDisabledBackground,
      },
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily: '"DM Sans", "Avenir Next", "Segoe UI", sans-serif',
      button: {
        textTransform: 'none',
        fontWeight: 700,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isLight ? '#f6f8fc' : '#0b1220',
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
              borderColor: isLight ? '#94a3b8' : '#64748b',
            },
          },
        },
      },
    },
  });
}
