import React from 'react';

const ChartCard = ({ title, subtitle, children, action }) => {
  return (
    <div className="glass-card" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{title}</h3>
          {subtitle && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div style={{ width: '100%', height: '260px', flex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default ChartCard;
