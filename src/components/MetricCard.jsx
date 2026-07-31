import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const MetricCard = ({ title, value, subtitle, trend, trendValue, icon: Icon, color = 'var(--accent-primary)' }) => {
  return (
    <div className="glass-card" style={{ padding: '1.5rem', flex: 1, minWidth: '220px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>{title}</span>
        {Icon && (
          <div style={{
            background: `${color}20`,
            padding: '0.5rem',
            borderRadius: '10px',
            color: color
          }}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.4rem', color: '#fff' }}>
        {value}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
        {trend && (
          <span style={{
            color: trend === 'up' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            fontWeight: 600
          }}>
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trendValue}
          </span>
        )}
        <span style={{ color: 'var(--text-dim)' }}>{subtitle}</span>
      </div>
    </div>
  );
};

export default MetricCard;
