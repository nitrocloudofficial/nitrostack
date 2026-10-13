import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AttendanceData {
  hour: string;
  present: number;
  absent: number;
}

export const AttendanceChart: FC = () => {
  const [data, setData] = useState<AttendanceData[]>([]);

  useEffect(() => {
    // Mock data for demo – replace with real API data when available
    const mockData: AttendanceData[] = [
      { hour: '9 AM', present: 12, absent: 3 },
      { hour: '10 AM', present: 15, absent: 0 },
      { hour: '11 AM', present: 14, absent: 1 },
      { hour: '12 PM', present: 13, absent: 2 },
      { hour: '1 PM', present: 10, absent: 5 },
      { hour: '2 PM', present: 16, absent: 0 },
    ];
    setData(mockData);
  }, []);

  return (
    <div style={{ padding: '20px', background: '#ffffff', borderRadius: '12px' }}>
      <h3 style={{ marginTop: 0 }}>📈 Attendance by Hour</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="present" fill="#4caf50" />
          <Bar dataKey="absent" fill="#f44336" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};