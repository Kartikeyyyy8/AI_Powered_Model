import React from 'react';
import DataTable from '../components/DataTable';
import SeverityBadge from '../components/SeverityBadge';
import ChartCard from '../components/ChartCard';
import MissingChart from '../charts/MissingChart';

const validationIssues = [
  { id: 1, field: 'Price', issue: 'Negative numeric price found (-$45.00)', type: 'Value Range', severity: 'High' },
  { id: 2, field: 'Date', issue: 'Invalid format standard (07/32/2026)', type: 'Date Format', severity: 'Medium' },
  { id: 3, field: 'Product_ID', issue: 'Duplicate Transaction ID detected', type: 'Uniqueness', severity: 'Critical' },
  { id: 4, field: 'Customer_Email', issue: 'Failed email regex validation', type: 'Regex Pattern', severity: 'Low' },
  { id: 5, field: 'Quantity', issue: 'Null value in mandatory field', type: 'Null Value', severity: 'High' },
];

const columns = [
  { header: 'ID', key: 'id' },
  { header: 'Target Field', key: 'field' },
  { header: 'Validation Finding', key: 'issue' },
  { header: 'Validation Type', key: 'type' },
  { header: 'Severity', render: (row) => <SeverityBadge severity={row.severity} /> },
];

const Validation = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
          Validation & Business Rules Engine
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Detailed audit logs for missing values, datatype mismatches, and custom business logic rules.
        </p>
      </div>

      <ChartCard title="Missing Values Per Column" subtitle="Distribution of null entries across schema">
        <MissingChart />
      </ChartCard>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
          Rule Violations & Schema Diagnostics
        </h3>
        <DataTable columns={columns} data={validationIssues} />
      </div>
    </div>
  );
};

export default Validation;
