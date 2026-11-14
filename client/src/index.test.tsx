import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import ReactDOM from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePreferencesStore } from "./store/preferencesStore";

vi.mock("./App", async () => {
  const React = await import("react");
  const { useQueryClient } = await import("@tanstack/react-query");
  const { useTheme } = await import("@mui/material/styles");
  const { useLocation } = await import("react-router-dom");

  return {
    default: function ProviderProbe() {
      const queryClient = useQueryClient();
      const theme = useTheme();
      const location = useLocation();

      return React.createElement(
        "div",
        { "data-testid": "provider-context" },
        `${theme.palette.mode}:${location.pathname}:${Boolean(queryClient)}`,
      );
    },
  };
});

const renderRoot = vi.fn();
const createRoot = vi.spyOn(ReactDOM, "createRoot").mockReturnValue({
  render: renderRoot,
  unmount: vi.fn(),
} as unknown as ReturnType<typeof ReactDOM.createRoot>);

describe("index.tsx", () => {
  afterEach(() => {
    createRoot.mockClear();
    renderRoot.mockClear();
    vi.restoreAllMocks();
  });

  it("mounts the app with query, theme, and browser-router providers", async () => {
    const rootElement = document.createElement("div");
    rootElement.id = "root";
    document.body.append(rootElement);
    usePreferencesStore.setState({
      preferences: { currencyDisplay: "symbol", themeMode: "dark" },
    });

    await import("./index");

    expect(createRoot).toHaveBeenCalledWith(rootElement);
    expect(renderRoot).toHaveBeenCalledOnce();
    render(renderRoot.mock.calls[0][0] as ReactElement);

    expect(screen.getByTestId("provider-context")).toHaveTextContent("dark:/:");
    expect(screen.getByTestId("provider-context")).toHaveTextContent("true");
  });
});