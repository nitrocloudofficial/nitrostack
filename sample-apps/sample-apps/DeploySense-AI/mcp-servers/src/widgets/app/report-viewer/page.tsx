import React from 'react';

export default function ReportViewer() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 border-b pb-2">Incident Report</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-800">Summary</h2>
          <p className="text-gray-600 mt-1">Incident INC-1024 caused by recent deployment.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800">Root Cause Analysis</h2>
          <p className="text-gray-600 mt-1">Database connection string was misconfigured in the latest release, causing the auth-service pod to enter a CrashLoopBackOff state.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800">Recommended Actions</h2>
          <ul className="list-disc pl-5 mt-1 text-gray-600 space-y-1">
            <li>Rollback to previous version immediately.</li>
            <li>Fix the connection string in the configuration repository.</li>
            <li>Add pre-deployment validation for database connectivity.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800">Status</h2>
          <span className="inline-block mt-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            Pending Resolution
          </span>
        </section>
      </div>
    </div>
  );
}
