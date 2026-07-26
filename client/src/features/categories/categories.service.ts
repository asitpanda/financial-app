import categoryApi from "./categories.api";
import type {
  CategoryRecord,
  CategorySavePayload,
  CreateCategoryDto,
} from "./categories.types";

interface SaveCategoryArgs {
  payload: CategorySavePayload;
  selectedCategory?: CategoryRecord | null;
}

const getCategoryId = (category: CategoryRecord): string =>
  String(category._id || category.id);

const toRequestCategoryDto = (
  payload: CategorySavePayload,
): CreateCategoryDto => ({
  name: String(payload.name || "").trim(),
  type: (payload.type === "income" ? "income" : "expense") as
    | "income"
    | "expense",
  icon: payload.icon,
  color: payload.color,
});

export const saveCategory = async ({
  payload,
  selectedCategory,
}: SaveCategoryArgs) => {
  const requestDto = toRequestCategoryDto(payload);

  if (selectedCategory) {
    return categoryApi.update(getCategoryId(selectedCategory), requestDto);
  }

  return categoryApi.create(requestDto);
};

export const removeCategory = async (id: string) => {
  await categoryApi.delete(id);
};

