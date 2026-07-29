import React from 'react';
import MetricCard from '../components/MetricCard';
import ChartCard from '../components/ChartCard';
import QualityChart from '../charts/QualityChart';
import OutlierChart from '../charts/OutlierChart';
import CategoryChart from '../charts/CategoryChart';
import DataTable from '../components/DataTable';
import SeverityBadge from '../components/SeverityBadge';
import { Award, AlertTriangle, FileSpreadsheet, ShieldAlert } from 'lucide-react';

const sampleRecentRuns = [
  { id: 'DS-901', name: 'ecommerce_transactions.csv', rows: 10000, score: '94.2%', severity: 'Low', date: '2026-07-29' },
  { id: 'DS-902', name: 'user_logs_q3.csv', rows: 4500, score: '88.5%', severity: 'Medium', date: '2026-07-28' },
  { id: 'DS-903', name: 'payments_july.xlsx', rows: 12000, score: '76.0%', severity: 'High', date: '2026-07-27' },
];

const columns = [
  { header: 'ID', key: 'id' },
  { header: 'Dataset Name', key: 'name' },
  { header: 'Row Count', key: 'rows' },
  { header: 'Quality Score', key: 'score' },
  { header: 'Severity', render: (row) => <SeverityBadge severity={row.severity} /> },
  { header: 'Processed Date', key: 'date' },
];

const Dashboard = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
          Executive System Dashboard
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Real-time metrics, data quality scoring trends, and statistical anomaly insights.
        </p>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <MetricCard
          title="Overall Quality Score"
          value="94.2 / 100"
          subtitle="vs last week"
          trend="up"
          trendValue="+3.2%"
          icon={Award}
          color="var(--accent-primary)"
        />
        <MetricCard
          title="Total Datasets Processed"
          value="128"
          subtitle="across 4 workspace teams"
          icon={FileSpreadsheet}
          color="var(--accent-cyan)"
        />
        <MetricCard
          title="Anomalies Detected"
          value="342"
          subtitle="12 critical flagged"
          trend="down"
          trendValue="-14%"
          icon={AlertTriangle}
          color="var(--accent-amber)"
        />
        <MetricCard
          title="Critical Business Rule Violations"
          value="4"
          subtitle="requires immediate cleanup"
          icon={ShieldAlert}
          color="var(--accent-rose)"
        />
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <ChartCard title="Data Quality Trend" subtitle="Daily average score tracking">
          <QualityChart />
        </ChartCard>

        <ChartCard title="Z-Score Outlier Distribution" subtitle="Statistical scatter anomaly visualization">
          <OutlierChart />
        </ChartCard>

        <ChartCard title="Category Anomaly Frequency" subtitle="Anomalies broken down by domain">
          <CategoryChart />
        </ChartCard>
      </div>

      {/* Recent Datasets Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
          Recent Analysis Runs
        </h3>
        <DataTable columns={columns} data={sampleRecentRuns} />
      </div>
    </div>
  );
};

export default Dashboard;
