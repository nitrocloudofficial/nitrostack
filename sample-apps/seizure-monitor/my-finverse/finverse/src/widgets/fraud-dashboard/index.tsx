import React from 'react';

export default function FraudDashboardWidget({ data }: { data: any }) {
  return (
    <div className="p-4 border rounded shadow bg-red-50">
      <h2 className="text-xl font-bold text-red-600">Fraud Dashboard</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
