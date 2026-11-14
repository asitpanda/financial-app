import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../features/auth/useAuth";
import { preferencesApi } from "../features/settings/preferences.api";
import { useHeaderActionStore } from "../store/headerActionStore";
import { useNotificationStore } from "../store/notificationStore";
import { usePreferencesStore } from "../store/preferencesStore";
import { renderWithProviders, screen, userEvent } from "../test/test-utils";
import Header from "./Header";

describe("Header", () => {
  beforeEach(() => {
    useAuth.setState({ user: { id: "user-1", email: "user@example.com" } });
    useHeaderActionStore.setState({ actions: {} });
    useNotificationStore.setState({ notifications: [] });
    usePreferencesStore.setState({
      preferences: { currencyDisplay: "symbol", themeMode: "light" },
      sessionId: 1,
      isSaving: false,
    });
    vi.restoreAllMocks();
  });

  it("shows the signed-in user's email when no display name is available", () => {
    renderWithProviders(<Header activeScreen="settings" />);

    expect(screen.getByText("Welcome user@example.com")).toBeInTheDocument();
    expect(screen.getByText("You are on - Settings")).toBeInTheDocument();
  });

  it("runs the registered header action and disables it when unavailable", async () => {
    const onClick = vi.fn();
    useHeaderActionStore.getState().setAction("dashboard", {
      label: "Add item",
      onClick,
    });
    const { rerender } = renderWithProviders(<Header activeScreen="dashboard" />);

    await userEvent.click(screen.getByRole("button", { name: "Add item" }));
    expect(onClick).toHaveBeenCalledOnce();

    useHeaderActionStore.getState().setAction("dashboard", {
      label: "Add item",
      onClick,
      disabled: true,
    });
    rerender(<Header activeScreen="dashboard" />);

    expect(screen.getByRole("button", { name: "Add item" })).toBeDisabled();
  });

  it("saves the opposite theme mode and updates the active preference", async () => {
    vi.spyOn(preferencesApi, "update").mockResolvedValue({
      currencyDisplay: "symbol",
      themeMode: "dark",
    });
    renderWithProviders(<Header activeScreen="dashboard" />);

    await userEvent.click(screen.getByRole("button", { name: "Toggle theme mode" }));

    await waitFor(() => {
      expect(preferencesApi.update).toHaveBeenCalledExactlyOnceWith({ themeMode: "dark" });
      expect(usePreferencesStore.getState().preferences?.themeMode).toBe("dark");
    });
  });

  it("keeps the previous theme and notifies the user when saving fails", async () => {
    vi.spyOn(preferencesApi, "update").mockRejectedValue(new Error("Offline"));
    renderWithProviders(<Header activeScreen="dashboard" />);

    await userEvent.click(screen.getByRole("button", { name: "Toggle theme mode" }));

    await waitFor(() => {
      expect(useNotificationStore.getState().notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "error",
            message: "Unable to save theme. Your previous theme is unchanged.",
          }),
        ]),
      );
    });
    expect(usePreferencesStore.getState().preferences?.themeMode).toBe("light");
  });
});