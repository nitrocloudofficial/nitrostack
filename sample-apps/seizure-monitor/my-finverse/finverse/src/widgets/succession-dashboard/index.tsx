import React from 'react';

export default function SuccessionDashboardWidget({ data }: { data: any }) {
  return (
    <div className="p-4 border rounded shadow bg-blue-50">
      <h2 className="text-xl font-bold text-blue-600">Succession Dashboard</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
