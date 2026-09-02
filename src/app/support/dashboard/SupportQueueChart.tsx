import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface SupportQueueChartProps {
  chartData: {
    name: string;
    value: number;
    color: string;
  }[];
}

export default function SupportQueueChart({
  chartData,
}: SupportQueueChartProps) {
  return (
    <div className="mt-4 h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 10, right: 20 }}
        >
          <XAxis type="number" stroke="#64748b" fontSize={10} />
          <YAxis
            dataKey="name"
            type="category"
            stroke="#94a3b8"
            fontSize={11}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#131726',
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
