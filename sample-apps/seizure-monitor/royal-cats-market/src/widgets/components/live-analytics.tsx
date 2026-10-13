'use client';

import React, { useEffect, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface StatData {
  time: string;
  value: number;
}

export default function LiveAnalytics() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const output = getToolOutput<{ widgetProps: { postId: string } }>();
  const postId = output?.widgetProps?.postId;
  const [data, setData] = useState<StatData[]>([]);

  useEffect(() => {
    if (!postId) return;

    const fetchData = async () => {
      try {
        const response = await fetch(`https://api.your-nitro-cloud.com/stats/${postId}`);
        if (response.ok) {
          const json = await response.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      }
    };

    fetchData(); // Initial fetch
    const intervalId = setInterval(fetchData, 5000);

    return () => clearInterval(intervalId);
  }, [postId]);

  if (!postId) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-gray-900 text-gray-400 rounded-lg shadow-xl p-4">
        Waiting for post ID...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-gray-900 text-white rounded-lg shadow-xl font-sans">
      <h2 className="text-2xl font-bold mb-6 text-gray-100">Live Analytics</h2>
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.375rem', color: '#F3F4F6' }}
              itemStyle={{ color: '#60A5FA' }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3B82F6" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#3B82F6', stroke: '#1D4ED8', strokeWidth: 2 }} 
              activeDot={{ r: 6, fill: '#60A5FA' }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
