import React from 'react';
import ChartCard from '../components/ChartCard';
import OutlierChart from '../charts/OutlierChart';
import DataTable from '../components/DataTable';
import SeverityBadge from '../components/SeverityBadge';

const anomalyRecords = [
  { row: 142, feature: 'Transaction_Amount', value: '$84,500.00', model: 'Isolation Forest', score: '0.94', severity: 'Critical' },
  { row: 589, feature: 'Order_Frequency', value: '1,200 / hr', model: 'Local Outlier Factor', score: '0.88', severity: 'High' },
  { row: 902, feature: 'Discount_Percent', value: '98%', model: 'DBSCAN Cluster', score: '0.82', severity: 'Medium' },
];

const columns = [
  { header: 'Row #', key: 'row' },
  { header: 'Feature Name', key: 'feature' },
  { header: 'Observed Value', key: 'value' },
  { header: 'Detection Algorithm', key: 'model' },
  { header: 'Anomaly Score', key: 'score' },
  { header: 'Severity', render: (row) => <SeverityBadge severity={row.severity} /> },
];

const Anomaly = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
          Machine Learning Anomaly Detection
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Multi-dimensional anomaly detection powered by Isolation Forest, LOF, and DBSCAN clustering.
        </p>
      </div>

      <ChartCard title="Isolation Forest Scatter Cluster" subtitle="Visualizing multidimensional outliers">
        <OutlierChart />
      </ChartCard>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
          Flagged ML Anomalies
        </h3>
        <DataTable columns={columns} data={anomalyRecords} />
      </div>
    </div>
  );
};

export default Anomaly;
