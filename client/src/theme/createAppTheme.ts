import { createTheme } from '@mui/material/styles';
import type { AppThemeMode } from '../store/themeStore';

export function createAppTheme(mode: AppThemeMode) {
  const isLight = mode === 'light';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#f50057',
      },
      background: {
        default: isLight ? '#f4f7fb' : '#0f172a',
        paper: isLight ? '#ffffff' : '#111827',
      },
    },
    shape: {
      borderRadius: 10,
    },
  });
}
