import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../features/auth/useAuth";
import { renderWithProviders, userEvent } from "../test/test-utils";
import Sidebar from "./Sidebar";

describe("Sidebar", () => {
  beforeEach(() => {
    useAuth.setState({ user: null, logout: vi.fn() });
  });

  it("navigates to the selected screen requested by the user", async () => {
    const onNavigate = vi.fn();
    renderWithProviders(
      <Sidebar activeRoute="dashboard" onNavigate={onNavigate}>
        <div>Current screen</div>
      </Sidebar>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Investments" }));

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("investments");
  });

  it("calls the authentication logout action", async () => {
    const logout = vi.fn();
    useAuth.setState({ logout });
    renderWithProviders(
      <Sidebar activeRoute="dashboard">
        <div>Current screen</div>
      </Sidebar>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(logout).toHaveBeenCalledExactlyOnceWith();
  });

  it("collapses the navigation labels when the menu control is activated", () => {
    const { container } = renderWithProviders(
      <Sidebar activeRoute="dashboard">
        <div>Current screen</div>
      </Sidebar>,
    );

    expect(screen.getByText("FinanceApp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
    const menuIcon = container.querySelector("svg");
    expect(menuIcon).not.toBeNull();

    fireEvent.click(menuIcon!);

    expect(screen.queryByText("FinanceApp")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dashboard" })).not.toBeInTheDocument();
  });
});