import React from 'react';
/** Canonical table. Every list view in Aurora MUST use this, not a raw <table>. */
export default function DataTable({ columns, rows, onRowClick }) {
  return (
    <table className="w-full font-sans text-aurora-navy">
      <thead className="bg-aurora-cloud">
        <tr>{columns.map(c => <th key={c.key} className="p-gutter text-left">{c.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} onClick={() => onRowClick && onRowClick(r)} className="border-b border-aurora-mist">
            {columns.map(c => <td key={c.key} className="p-gutter">{r[c.key]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
