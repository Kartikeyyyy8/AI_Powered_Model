import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const defaultData = [
  { x: 10, y: 30, z: 200 },
  { x: 120, y: 100, z: 260 },
  { x: 170, y: 300, z: 400 },
  { x: 140, y: 250, z: 280 },
  { x: 150, y: 400, z: 500 },
  { x: 110, y: 280, z: 200 },
  { x: 500, y: 900, z: 900 }, // Outlier
];

const OutlierChart = ({ data = defaultData }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis type="number" dataKey="x" name="Value" stroke="#6b7280" fontSize={12} />
        <YAxis type="number" dataKey="y" name="Z-Score" stroke="#6b7280" fontSize={12} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
        <Scatter name="Transactions" data={data} fill="#f43f5e" />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default OutlierChart;
