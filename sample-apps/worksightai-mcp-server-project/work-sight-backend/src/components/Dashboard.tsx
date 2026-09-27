import { useEffect, useState } from 'react';
import type { FC } from 'react';
import AttendanceSummaryWidget from '../widgets/AttendanceSummary.widget.js';
import PhoneAlertWidget from '../widgets/PhoneAlert.widget.js';
import { Header } from './Header.js';
import { AttendanceChart } from './AttendanceChart.js';

export const Dashboard: FC = () => {
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    setLastUpdate(new Date().toLocaleString());
    const interval = setInterval(() => {
      setLastUpdate(new Date().toLocaleString());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'sans-serif', 
      maxWidth: '1400px', 
      margin: '0 auto',
      background: '#f5f7fa',
      minHeight: '100vh'
    }}>
      <Header title="🏢 Work Sight AI" subtitle="Smart Workplace Intelligence Dashboard" />

      {/* Main Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr', 
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Left Column: Attendance Summary */}
        <div style={{ 
          background: '#ffffff', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: '10px'
        }}>
          <AttendanceSummaryWidget />
        </div>

        {/* Right Column: Phone Alerts */}
        <div style={{ 
          background: '#ffffff', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: '10px'
        }}>
          <PhoneAlertWidget />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <AttendanceChart />
      </div>

      {/* Bottom Row: Additional Stats / Charts */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 1fr', 
        gap: '20px'
      }}>
        <div style={{ 
          background: '#ffffff', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px' }}>📊</div>
          <div style={{ fontSize: '14px', color: '#666' }}>Today's Attendance</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1565c0' }}>
            <LiveAttendanceCount />
          </div>
        </div>

        <div style={{ 
          background: '#ffffff', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px' }}>🎯</div>
          <div style={{ fontSize: '14px', color: '#666' }}>Focus Score</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e65100' }}>
            <LiveFocusScore />
          </div>
        </div>

        <div style={{ 
          background: '#ffffff', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px' }}>⏱️</div>
          <div style={{ fontSize: '14px', color: '#666' }}>Break Time Today</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
            <LiveBreakTime />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components for live data
const LiveAttendanceCount: FC = () => {
  const [count, setCount] = useState<number>(0);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/attendance/summary');
        const data = await response.json();
        setCount(data.present_count || 0);
      } catch (error) {
        console.error('Failed to fetch attendance count:', error);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return <>{count}</>;
};

const LiveFocusScore: FC = () => {
  const [score, setScore] = useState<number>(0);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/attendance/summary');
        const data = await response.json();
        setScore(data.focus_score || 0);
      } catch (error) {
        console.error('Failed to fetch focus score:', error);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return <>{score}%</>;
};

const LiveBreakTime: FC = () => {
  const [minutes, setMinutes] = useState<number>(0);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/attendance/summary');
        const data = await response.json();
        setMinutes(data.total_break_minutes || 0);
      } catch (error) {
        console.error('Failed to fetch break time:', error);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return <>{minutes} min</>;
};