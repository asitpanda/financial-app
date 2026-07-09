import React from "react";

export default function Card({ title, value, className = "" }) {
  return (
    <div className={`bg-white p-4 rounded shadow ${className}`}>
      <h2 className="text-gray-500">{title}</h2>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

