import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const defaultData = [
  { name: 'Mon', score: 88 },
  { name: 'Tue', score: 91 },
  { name: 'Wed', score: 85 },
  { name: 'Thu', score: 94 },
  { name: 'Fri', score: 92 },
  { name: 'Sat', score: 96 },
  { name: 'Sun', score: 95 },
];

const QualityChart = ({ data = defaultData }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
        <YAxis stroke="#6b7280" fontSize={12} domain={[60, 100]} />
        <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
        <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#qualityGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default QualityChart;
