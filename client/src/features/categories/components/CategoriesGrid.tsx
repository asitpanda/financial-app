import { useTheme } from "@mui/material/styles";
import AppButton from "../../../components/common/AppButton";
import type { CategoryRecord } from "../categories.types";

interface CategoriesGridProps {
  categories?: CategoryRecord[];
  onDelete?: (categoryId: string) => void;
}

export default function CategoryGrid({ categories = [], onDelete }: CategoriesGridProps) {
  const theme = useTheme();
  return (
    <section className="mt-6 p-4 rounded" style={{ backgroundColor: theme.palette.background.paper, boxShadow: theme.shadows[1] }}>
      <h2 className="mb-4" style={{ color: theme.palette.text.primary }}>Spending Categories</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((c) => (
          <div key={c._id} className="p-4 rounded flex items-center justify-between" style={{ backgroundColor: theme.palette.action.hover, color: theme.palette.text.primary }}>
            <span className="font-medium">{c.name}</span>
            <AppButton
              variant="text"
              onClick={() => onDelete?.(c._id || c.id)}
              sx={{ minWidth: 0, p: 0, textTransform: "none", color: "error.main", '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' } }}
            >
              Delete
            </AppButton>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-span-full text-center py-6" style={{ color: theme.palette.text.secondary }}>No categories yet.</div>
        )}
      </div>
    </section>
  );
}

