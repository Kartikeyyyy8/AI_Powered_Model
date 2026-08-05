import React from 'react';
import MetricCard from '../components/MetricCard';
import ChartCard from '../components/ChartCard';
import QualityChart from '../charts/QualityChart';
import OutlierChart from '../charts/OutlierChart';
import CategoryChart from '../charts/CategoryChart';
import DataTable from '../components/DataTable';
import SeverityBadge from '../components/SeverityBadge';
import { useDataset } from '../context/DatasetContext';
import { Award, AlertTriangle, FileSpreadsheet, ShieldAlert } from 'lucide-react';

const columns = [
  { header: 'ID', key: '_id' },
  { header: 'Dataset Name', key: 'originalName' },
  { header: 'Size (KB)', render: (row) => `${(row.size / 1024).toFixed(1)} KB` },
  { header: 'Status', render: (row) => <span style={{ textTransform: 'capitalize', color: 'var(--accent-emerald)' }}>{row.status}</span> },
  { header: 'Uploaded Date', render: (row) => new Date(row.uploadedAt || Date.now()).toLocaleDateString() },
];

const Dashboard = () => {
  const { dashboardStats, datasetsList, activeDataset } = useDataset();

  const stats = dashboardStats || {
    overallQualityScore: 94.2,
    totalDatasetsProcessed: datasetsList?.length || 1,
    totalAnomaliesDetected: 14,
    criticalAlerts: 2,
  };

  const runsTable = datasetsList && datasetsList.length > 0 ? datasetsList : [
    { _id: 'DS-901', originalName: 'ecommerce_transactions.csv', size: 245000, status: 'uploaded', uploadedAt: new Date().toISOString() }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
          Executive System Dashboard
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Real-time metrics and quality scoring trends for <strong>{activeDataset?.originalName || 'Active Dataset'}</strong>.
        </p>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <MetricCard
          title="Overall Quality Score"
          value={`${stats.overallQualityScore} / 100`}
          subtitle="vs last week"
          trend="up"
          trendValue="+3.2%"
          icon={Award}
          color="var(--accent-primary)"
        />
        <MetricCard
          title="Total Datasets Processed"
          value={stats.totalDatasetsProcessed || datasetsList.length || 1}
          subtitle="registered in system"
          icon={FileSpreadsheet}
          color="var(--accent-cyan)"
        />
        <MetricCard
          title="Anomalies Detected"
          value={stats.totalAnomaliesDetected}
          subtitle="critical flagged"
          trend="down"
          trendValue="-14%"
          icon={AlertTriangle}
          color="var(--accent-amber)"
        />
        <MetricCard
          title="Critical Rule Violations"
          value={stats.criticalAlerts}
          subtitle="requires attention"
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
          Registered Datasets
        </h3>
        <DataTable columns={columns} data={runsTable} />
      </div>
    </div>
  );
};

export default Dashboard;
