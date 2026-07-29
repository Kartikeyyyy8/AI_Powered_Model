import React from 'react';

const severityStyles = {
  Low: { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  Medium: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
  High: { bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', border: 'rgba(244, 63, 94, 0.3)' },
  Critical: { bg: 'rgba(217, 70, 239, 0.15)', color: '#d946ef', border: 'rgba(217, 70, 239, 0.3)' },
};

const SeverityBadge = ({ severity = 'Medium' }) => {
  const style = severityStyles[severity] || severityStyles.Medium;

  return (
    <span style={{
      background: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
      padding: '0.25rem 0.65rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      display: 'inline-block'
    }}>
      {severity}
    </span>
  );
};

export default SeverityBadge;
