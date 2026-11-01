import { QueryClient } from "@tanstack/react-query";
import { act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent, waitFor } from "../../test/test-utils";
import { usePreferencesStore } from "../../store/preferencesStore";
import { useCurrencyFormatter } from "../../utils/currency";
import { preferencesApi } from "./preferences.api";
import type { UserPreferences } from "./preferences.types";
import Settings from "./Settings";

vi.mock("./preferences.api", () => ({
  preferencesApi: { get: vi.fn(), update: vi.fn() },
}));

function Balance() {
  const formatCurrency = useCurrencyFormatter();
  return <output aria-label="Balance">{formatCurrency(1250, "USD")}</output>;
}

describe("Settings", () => {
  let queryClient: QueryClient;
  let savedPreferences: UserPreferences;

  beforeEach(() => {
    vi.resetAllMocks();
    savedPreferences = { currencyDisplay: "symbol" };
    usePreferencesStore.setState({ preferences: { ...savedPreferences }, sessionId: 1, isSaving: false });
    queryClient = new QueryClient({ defaultOptions: {
      queries: { retry: false }, mutations: { retry: false },
    } });
    vi.mocked(preferencesApi.get).mockImplementation(async () => ({ ...savedPreferences }));
    vi.mocked(preferencesApi.update).mockImplementation(async (patch) => {
      savedPreferences = { ...savedPreferences, ...patch };
      return { ...savedPreferences };
    });
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    usePreferencesStore.setState({ preferences: null, sessionId: 0, isSaving: false });
  });

  const renderSettings = () => renderWithProviders(<><Settings /><Balance /></>, { queryClient });

  async function chooseCode() {
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Currency display" })).not.toHaveAttribute("aria-disabled", "true"));
    await user.click(screen.getByRole("combobox", { name: "Currency display" }));
    await user.click(screen.getByRole("option", { name: "Currency code" }));
    return user;
  }

  it("keeps preview changes local until Save and applies the saved display to monetary content", async () => {
    renderSettings();
    const user = await chooseCode();
    expect(screen.getByLabelText("Balance")).not.toHaveTextContent("USD");
    expect(preferencesApi.update).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByLabelText("Balance")).toHaveTextContent("USD"));
    expect(preferencesApi.update).toHaveBeenCalledExactlyOnceWith({ currencyDisplay: "code" });
    expect(await screen.findByText("Preferences saved.")).toBeInTheDocument();
  });

  it("discards unsaved edits on Cancel without writing to the server", async () => {
    renderSettings();
    const user = await chooseCode();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("combobox", { name: "Currency display" })).toHaveTextContent("Symbol");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(preferencesApi.update).not.toHaveBeenCalled();
  });

  it("preserves saved formatting on save failure and allows retry", async () => {
    vi.mocked(preferencesApi.update).mockRejectedValueOnce(new Error("Offline"));
    renderSettings();
    const user = await chooseCode();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Unable to save/)).toBeInTheDocument();
    expect(screen.getByLabelText("Balance")).not.toHaveTextContent("USD");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByLabelText("Balance")).toHaveTextContent("USD"));
  });

  it("blocks saving until a failed refresh has been retried successfully", async () => {
    vi.mocked(preferencesApi.get).mockRejectedValueOnce(new Error("Offline"));
    renderSettings();
    expect(await screen.findByText("Unable to refresh your preferences.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Currency display" })).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Currency display" })).not.toHaveAttribute("aria-disabled", "true"));
  });

  it("prevents duplicate submissions and ignores a save response after account switching", async () => {
    let resolveSave!: (preferences: UserPreferences) => void;
    vi.mocked(preferencesApi.update).mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
    const view = renderSettings();
    const user = await chooseCode();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(preferencesApi.update).toHaveBeenCalledTimes(1);
    view.unmount();
    act(() => usePreferencesStore.getState().beginSession({ currencyDisplay: "symbol" }));
    await act(async () => { resolveSave({ currencyDisplay: "code" }); });
    expect(usePreferencesStore.getState().preferences).toEqual({ currencyDisplay: "symbol" });
  });
});