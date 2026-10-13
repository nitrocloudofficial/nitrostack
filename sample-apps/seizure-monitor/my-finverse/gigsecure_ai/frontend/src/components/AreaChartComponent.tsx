import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AreaChartProps {
  data: any[];
  xKey: string;
  dataKey1: string;
  dataKey2?: string;
  name1?: string;
  name2?: string;
}

export const AreaChartComponent: React.FC<AreaChartProps> = ({
  data,
  xKey,
  dataKey1,
  dataKey2,
  name1 = 'Metric 1',
  name2 = 'Metric 2',
}) => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            {dataKey2 && (
              <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            )}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey={xKey} stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
            itemStyle={{ color: '#fff', fontSize: '12px' }}
          />
          <Area type="monotone" dataKey={dataKey1} name={name1} stroke="#10b981" fillOpacity={1} fill="url(#grad1)" strokeWidth={2} />
          {dataKey2 && (
            <Area type="monotone" dataKey={dataKey2} name={name2} stroke="#3b82f6" fillOpacity={1} fill="url(#grad2)" strokeWidth={2} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
