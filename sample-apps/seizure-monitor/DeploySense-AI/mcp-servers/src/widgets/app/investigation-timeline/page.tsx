import React from 'react';

export default function InvestigationTimeline() {
  const events = [
    { time: '10:00 AM', text: 'Deployment Started', status: 'info' },
    { time: '10:05 AM', text: 'CrashLoopBackOff Detected', status: 'error' },
    { time: '10:10 AM', text: 'Investigation Initiated', status: 'info' },
    { time: '10:12 AM', text: 'Root Cause Identified', status: 'success' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Investigation Timeline</h1>
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={index} className="flex items-center space-x-4 border-l-2 border-gray-300 pl-4 py-2">
            <div className="text-sm text-gray-500 w-20">{event.time}</div>
            <div className={`font-medium ${
              event.status === 'error' ? 'text-red-600' :
              event.status === 'success' ? 'text-green-600' : 'text-blue-600'
            }`}>
              {event.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
