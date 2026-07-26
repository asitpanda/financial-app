export type CategoryType = "income" | "expense" | "goal";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  type: "income" | "expense";
  icon?: string;
  color?: string;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

export interface CategoryRecord extends Category {
  _id?: string;
}

export interface CategorySavePayload {
  name?: string;
  type?: CategoryType;
  icon?: string;
  color?: string;
}

export type CategoryTableDrilldown =
  | { kind: "all" }
  | { kind: "type"; value: "income" | "expense" }
  | { kind: "colored" }
  | { kind: "category"; value: string };
