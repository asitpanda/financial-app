import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';
import { createAppTheme } from '../theme/createAppTheme';
import type { AppThemeMode } from '../store/themeStore';

interface TestProviderOptions {
  themeMode?: AppThemeMode;
  router?: MemoryRouterProps;
  queryClient?: QueryClient;
}

type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & TestProviderOptions;

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  {
    themeMode = 'light',
    router,
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: CustomRenderOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={createAppTheme(themeMode)}>
          <CssBaseline />
          <MemoryRouter {...router}>{children}</MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export { screen, waitFor, within } from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';