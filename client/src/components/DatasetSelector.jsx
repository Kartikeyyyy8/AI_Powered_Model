import React from 'react';
import { useDataset } from '../context/DatasetContext';
import { Database, ChevronDown } from 'lucide-react';

const DatasetSelector = () => {
  const { activeDataset, datasetsList, selectDataset } = useDataset();

  if (!datasetsList || datasetsList.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.85rem',
        color: 'var(--text-dim)',
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '0.4rem 0.8rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <Database size={16} />
        <span>No Datasets Uploaded</span>
      </div>
    );
  }

  const handleChange = (e) => {
    const selectedId = e.target.value;
    const selected = datasetsList.find((d) => d._id === selectedId || d.filename === selectedId);
    if (selected) {
      selectDataset(selected);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      background: 'rgba(255, 255, 255, 0.05)',
      padding: '0.35rem 0.75rem',
      borderRadius: '12px',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      position: 'relative'
    }}>
      <Database size={16} color="var(--accent-primary)" />
      <select
        value={activeDataset?._id || activeDataset?.filename || ''}
        onChange={handleChange}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: '0.85rem',
          fontWeight: 600,
          outline: 'none',
          cursor: 'pointer',
          paddingRight: '1rem',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          appearance: 'none'
        }}
      >
        {datasetsList.map((ds) => (
          <option
            key={ds._id || ds.filename}
            value={ds._id || ds.filename}
            style={{ background: '#0b0f19', color: '#fff' }}
          >
            {ds.originalName || ds.filename}
          </option>
        ))}
      </select>
      <ChevronDown size={14} color="var(--text-muted)" style={{ pointerEvents: 'none', marginLeft: '-0.75rem' }} />
    </div>
  );
};

export default DatasetSelector;
