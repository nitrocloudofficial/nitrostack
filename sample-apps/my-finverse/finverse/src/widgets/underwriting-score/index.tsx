import React from 'react';

export default function UnderwritingScoreWidget({ data }: { data: any }) {
  return (
    <div className="p-4 border rounded shadow">
      <h2 className="text-xl font-bold">Underwriting Score</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
