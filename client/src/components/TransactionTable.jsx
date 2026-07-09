import React from "react";
import AppButton from "./common/AppButton";

export default function TransactionTable({
  items = [],
  onDelete,
  title = "Recent Transactions",
  actionLabel,
  onActionClick,
}) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-gray-700">{title}</h2>
        {actionLabel && onActionClick && (
          <AppButton
            type="button"
            onClick={onActionClick}
            className="text-blue-600 text-sm font-medium hover:underline"
            variant="text"
            sx={{ minWidth: 0, p: 0, textTransform: "none", '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' } }}
          >
            {actionLabel}
          </AppButton>
        )}
      </div>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="py-2">Date</th>
            <th className="py-2">Category</th>
            <th className="py-2">Type</th>
            <th className="py-2">Amount</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t._id} className="border-t">
              <td className="py-2">{new Date(t.date).toLocaleDateString()}</td>
              <td className="py-2">{t.category}</td>
              <td className="py-2 capitalize">{t.type}</td>
              <td className={`py-2 ${t.type === "expense" ? "text-red-600" : "text-green-600"}`}>
                {t.type === "expense" ? "-" : "+"} ₹{t.amount}
              </td>
              <td className="py-2 text-right">
                <AppButton
                  onClick={() => onDelete?.(t._id)}
                  className="text-red-600 hover:underline"
                  variant="text"
                  sx={{ minWidth: 0, p: 0, textTransform: "none", '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' } }}
                >
                  Delete
                </AppButton>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan="5" className="py-6 text-center text-gray-500">
                No transactions yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

