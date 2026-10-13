import { useEffect, useState } from 'react';
import type { FC } from 'react';

interface HeaderProps {
  title: string;
  subtitle: string;
}

export const Header: FC<HeaderProps> = ({ title, subtitle }) => {
  const [status, setStatus] = useState<'online' | 'offline' | 'connecting'>('connecting');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/attendance/summary', {
          signal: AbortSignal.timeout(3000),
        });
        setStatus(response.ok ? 'online' : 'offline');
      } catch {
        setStatus('offline');
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const statusColors: Record<'online' | 'offline' | 'connecting', string> = {
    online: '#4caf50',
    offline: '#f44336',
    connecting: '#ff9800',
  };

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px',
      background: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <div>
        <h1 style={{ margin: 0, color: '#1a237e' }}>{title}</h1>
        <p style={{ margin: 0, color: '#666' }}>{subtitle}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: statusColors[status],
            animation: status === 'connecting' ? 'pulse 1.5s infinite' : 'none'
          }} />
          <span style={{ fontSize: '14px', color: '#666' }}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        <div style={{ fontSize: '14px', color: '#999' }}>
          {new Date().toLocaleTimeString()}
        </div>
      </div>
    </header>
  );
};