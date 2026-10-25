import { describe, expect, it } from "vitest";
import { createCategorySchema, toCategoryFormState } from "./categories.schema";

describe("category schema", () => {
  const schema = createCategorySchema();
  const validCategory = {
    name: "Groceries",
    type: "expense",
    icon: "cart",
    color: "#22c55e",
  };

  it("trims valid values and accepts optional color and icon", () => {
    expect(
      schema.parse({
        ...validCategory,
        name: "  Groceries  ",
        color: "  22c55e ",
      }),
    ).toEqual({ ...validCategory, name: "Groceries", color: "22c55e" });
    expect(schema.parse({ ...validCategory, icon: "", color: "" })).toEqual({
      ...validCategory,
      icon: "",
      color: "",
    });
  });

  it.each([
    ["", "Category name is required"],
    ["AB", "Category name must be at least 3 characters"],
  ])("rejects invalid name %j", (name, message) => {
    expect(schema.safeParse({ ...validCategory, name }).error?.issues[0].message).toBe(
      message,
    );
  });

  it("rejects duplicate names case-insensitively while allowing the current name", () => {
    const uniqueSchema = createCategorySchema({
      existingNames: [" Groceries "],
    });
    expect(
      uniqueSchema.safeParse({ ...validCategory, name: "groceries" }).error?.issues,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Category name already exists" }),
      ]),
    );

    const editSchema = createCategorySchema({
      existingNames: ["Groceries"],
      currentName: "groceries",
    });
    expect(editSchema.safeParse(validCategory).success).toBe(true);
  });

  it("rejects invalid type, icon, and malformed colors", () => {
    expect(schema.safeParse({ ...validCategory, type: "transfer" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...validCategory, icon: "not-an-icon" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...validCategory, color: "#12345g" }).success).toBe(
      false,
    );
  });

  it("converts absent and existing categories to form state", () => {
    expect(toCategoryFormState(null)).toEqual({
      name: "",
      type: "expense",
      icon: "",
      color: "",
    });
    expect(
      toCategoryFormState({
        name: "Salary",
        type: "income",
        icon: "cash",
        color: "#22c55e",
      }),
    ).toEqual({
      name: "Salary",
      type: "income",
      icon: "cash",
      color: "#22c55e",
    });
  });
});
