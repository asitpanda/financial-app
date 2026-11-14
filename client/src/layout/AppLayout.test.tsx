import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, userEvent } from "../test/test-utils";
import AppLayout from "./AppLayout";

describe("AppLayout", () => {
  it("shows the active screen and content and forwards sidebar navigation", async () => {
    const onNavigate = vi.fn();
    renderWithProviders(
      <AppLayout activeScreen="transactions" onNavigate={onNavigate}>
        <div>Transaction content</div>
      </AppLayout>,
    );

    expect(screen.getByText("You are on - Transactions")).toBeInTheDocument();
    expect(screen.getByText("Transaction content")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Goals" }));

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("goals");
  });
});