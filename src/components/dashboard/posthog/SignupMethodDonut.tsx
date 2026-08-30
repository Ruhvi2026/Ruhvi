'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { UserPlus } from 'lucide-react';
import type { SignupMethodCount } from '@/types/posthog-analytics';

interface SignupMethodDonutProps {
  data: SignupMethodCount[];
}

const METHOD_COLORS: Record<string, string> = {
  email: '#9B5DE5',
  google: '#22D3EE',
  phone: '#5DE2A3',
  facebook: '#5E9CF6',
};

export default function SignupMethodDonut({ data }: SignupMethodDonutProps) {
  const hasData = data.length > 0;

  return (
    <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
        <UserPlus className="h-4 w-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white">Signups by Method</h3>
      </div>

      {hasData ? (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="count"
                nameKey="method"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.method}
                    fill={METHOD_COLORS[entry.method] ?? '#64748b'}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  background: '#1a1f35',
                  color: '#fff',
                }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[180px] items-center justify-center text-xs text-slate-500">
          No signup events captured yet.
        </div>
      )}
    </div>
  );
}
