import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { queryClient } from "./api/queryClient";
import { useThemeStore } from "./store/themeStore";
import { createAppTheme } from "./theme/createAppTheme";

function RootProviders() {
  const mode = useThemeStore((state) => state.mode);
  const theme = React.useMemo(() => createAppTheme(mode), [mode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(
  <React.StrictMode>
    <RootProviders />
  </React.StrictMode>,
);

reportWebVitals();
