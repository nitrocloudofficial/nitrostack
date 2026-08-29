import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BarChartProps {
  data: any[];
  xKey: string;
  dataKey: string;
  name?: string;
  color?: string;
}

export const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  xKey,
  dataKey,
  name = 'Value',
  color = '#10b981'
}) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey={xKey} stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
            itemStyle={{ color: '#fff', fontSize: '12px' }}
          />
          <Bar dataKey={dataKey} name={name} fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
