import React from 'react';

export default function IncidentDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Incident Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow border border-gray-200">
          <h2 className="font-semibold text-gray-700">Active Incidents</h2>
          <p className="text-3xl font-bold mt-2">1</p>
        </div>
        <div className="bg-white p-4 rounded shadow border border-gray-200">
          <h2 className="font-semibold text-gray-700">Critical Alerts</h2>
          <p className="text-3xl font-bold text-red-600 mt-2">2</p>
        </div>
        <div className="bg-white p-4 rounded shadow border border-gray-200">
          <h2 className="font-semibold text-gray-700">Avg MTTR</h2>
          <p className="text-3xl font-bold mt-2">45m</p>
        </div>
      </div>
    </div>
  );
}
