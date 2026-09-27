'use client';
import React, { useState, useEffect } from 'react';

interface AttendanceSummary {
  total_students: number;
  present_count: number;
  focus_score: number;
  phone_alerts_count: number;
  total_break_minutes: number;
}

export default function AttendanceSummaryWidget() {
  const [data, setData] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/attendance/summary');
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const result = await response.json();
      setData(result);
      setError(null);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      setError('⚠️ Could not connect to the Python API. Make sure it is running on port 5000.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>⏳ Loading attendance...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#d32f2f' }}>
        {error}
        <br />
        <button onClick={fetchData} style={{ marginTop: '10px', padding: '8px 16px', cursor: 'pointer' }}>
          🔄 Retry
        </button>
      </div>
    );
  }

  if (!data) return <div>No data available</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#fff', borderRadius: '12px' }}>
      <h2 style={{ marginTop: 0 }}>📊 Live Attendance Summary</h2>
      <div style={{ fontSize: '12px', color: '#999', marginBottom: '15px' }}>
        Last updated: {lastUpdate}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Employees</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{data.total_students}</div>
        </div>
        <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Present</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1565c0' }}>{data.present_count}</div>
        </div>
        <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Focus Score</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#e65100' }}>{data.focus_score}%</div>
        </div>
        <div style={{ background: '#fce4ec', padding: '15px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Phone Alerts</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#c62828' }}>{data.phone_alerts_count}</div>
        </div>
      </div>
      <div style={{ marginTop: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
        ⏱️ Break Time: {data.total_break_minutes} minutes
      </div>
    </div>
  );
}