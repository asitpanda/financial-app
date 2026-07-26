import React from "react";
import AppButton from "./common/AppButton";

export default function CategoryGrid({ categories = [], onDelete }) {
  return (
    <section className="mt-6 bg-white p-4 rounded shadow">
      <h2 className="text-gray-700 mb-4">Spending Categories</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((c) => (
          <div key={c._id} className="bg-purple-100 p-4 rounded flex items-center justify-between">
            <span className="font-medium">{c.name}</span>
            <AppButton
              variant="text"
              onClick={() => onDelete?.(c._id)}
              sx={{ minWidth: 0, p: 0, textTransform: "none", color: "error.main", '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' } }}
            >
              Delete
            </AppButton>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-6">No categories yet.</div>
        )}
      </div>
    </section>
  );
}

