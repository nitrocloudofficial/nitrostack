import React from 'react';

export default function RepaymentDashboardWidget({ data }: { data: any }) {
  return (
    <div className="p-4 border rounded shadow bg-green-50">
      <h2 className="text-xl font-bold text-green-600">Repayment Dashboard</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
