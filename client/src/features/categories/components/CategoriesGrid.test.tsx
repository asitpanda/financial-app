import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoryGrid from "./CategoriesGrid";
import type { CategoryRecord } from "../categories.types";

const category: CategoryRecord = {
  id: "category-1",
  name: "Groceries",
  type: "expense",
  userId: "user-1",
  createdAt: "",
  updatedAt: "",
};

describe("CategoriesGrid", () => {
  it("shows the empty state when categories are missing", () => {
    render(<CategoryGrid />);
    expect(screen.getByText("No categories yet.")).toBeInTheDocument();
  });

  it("shows categories and sends the right ID when delete is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<CategoryGrid categories={[category]} onDelete={onDelete} />);

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("category-1");
  });

  it("prefers the server _id and safely handles an omitted callback", async () => {
    const user = userEvent.setup();
    render(
      <CategoryGrid categories={[{ ...category, _id: "mongo-category-1" }]} />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Groceries")).toBeInTheDocument();
  });
});
