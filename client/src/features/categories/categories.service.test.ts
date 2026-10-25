import { afterEach, describe, expect, it, vi } from "vitest";
import categoryApi from "./categories.api";
import { removeCategory, saveCategory } from "./categories.service";

afterEach(() => vi.restoreAllMocks());

describe("category service", () => {
  it("trims create data and uses default expense type for an incomplete payload", async () => {
    const create = vi.spyOn(categoryApi, "create").mockResolvedValue({} as never);

    await saveCategory({
      payload: { name: "  Food  ", icon: "cart", color: "#123456" },
    });

    expect(create).toHaveBeenCalledWith({
      name: "Food",
      type: "expense",
      icon: "cart",
      color: "#123456",
    });
  });

  it("updates the selected category using its preferred _id", async () => {
    const update = vi.spyOn(categoryApi, "update").mockResolvedValue({} as never);

    await saveCategory({
      payload: { name: "Salary", type: "income" },
      selectedCategory: {
        _id: "mongo-id",
        id: "legacy-id",
        name: "Income",
        type: "income",
        userId: "user-1",
        createdAt: "",
        updatedAt: "",
      },
    });

    expect(update).toHaveBeenCalledWith("mongo-id", {
      name: "Salary",
      type: "income",
      icon: undefined,
      color: undefined,
    });
  });

  it("falls back to id and propagates API errors", async () => {
    const failure = new Error("Update failed");
    const update = vi.spyOn(categoryApi, "update").mockRejectedValue(failure);

    await expect(
      saveCategory({
        payload: { name: "Salary", type: "income" },
        selectedCategory: {
          id: "legacy-id",
          name: "Income",
          type: "income",
          userId: "user-1",
          createdAt: "",
          updatedAt: "",
        },
      }),
    ).rejects.toBe(failure);
    expect(update).toHaveBeenCalledWith("legacy-id", expect.any(Object));
  });

  it("deletes by id and preserves API failures", async () => {
    const remove = vi.spyOn(categoryApi, "delete").mockResolvedValue();
    await expect(removeCategory("category-1")).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith("category-1");

    const failure = new Error("Delete failed");
    remove.mockRejectedValueOnce(failure);
    await expect(removeCategory("category-1")).rejects.toBe(failure);
  });
});
