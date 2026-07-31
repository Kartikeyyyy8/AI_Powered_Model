import React from 'react';
import MetricCard from '../components/MetricCard';
import ChartCard from '../components/ChartCard';
import QualityChart from '../charts/QualityChart';
import { Award, CheckCircle, Database, ShieldAlert } from 'lucide-react';

const Quality = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
          Dataset Quality & Scoring Engine
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Composite quality scoring based on completeness, uniqueness, consistency, and accuracy metrics.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <MetricCard title="Completeness Index" value="98.2%" subtitle="0.8% null rate" icon={Database} color="var(--accent-cyan)" />
        <MetricCard title="Uniqueness Score" value="99.5%" subtitle="0.5% duplicate rows" icon={CheckCircle} color="var(--accent-emerald)" />
        <MetricCard title="Accuracy Score" value="91.4%" subtitle="valid format adherence" icon={Award} color="var(--accent-primary)" />
        <MetricCard title="Consistency Index" value="95.0%" subtitle="schema & type match" icon={ShieldAlert} color="var(--accent-amber)" />
      </div>

      <ChartCard title="Quality Score Historical Breakdown" subtitle="Aggregate quality evolution over time">
        <QualityChart />
      </ChartCard>
    </div>
  );
};

export default Quality;
