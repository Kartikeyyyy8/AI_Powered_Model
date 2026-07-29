import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, UploadCloud, ShieldCheck, Zap, ArrowRight, BarChart2 } from 'lucide-react';

const Home = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Section */}
      <div className="glass-card" style={{
        padding: '3.5rem 2.5rem',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '24px'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(99, 102, 241, 0.2)',
          color: 'var(--accent-primary)',
          fontSize: '0.85rem',
          fontWeight: 700,
          padding: '0.4rem 0.9rem',
          borderRadius: '20px',
          marginBottom: '1rem'
        }}>
          <Sparkles size={16} /> Next-Gen AI Data Intelligence
        </div>
        <h1 style={{ fontSize: '2.75rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1rem', color: '#fff' }}>
          Automated Data Quality & <span className="text-gradient">ML Anomaly Detection</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '720px', marginBottom: '2rem', lineHeight: 1.6 }}>
          Validate datasets, execute statistical Z-score & IQR outlier checks, run Isolation Forest & LOF clustering, generate LLM narrative summaries, and export executive PDF/PPT reports.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/upload" className="btn-primary">
            <UploadCloud size={18} /> Upload Dataset Now <ArrowRight size={16} />
          </Link>
          <Link to="/dashboard" className="btn-secondary">
            <BarChart2 size={18} /> Open Live Dashboard
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', padding: '0.75rem', borderRadius: '12px', width: 'fit-content', marginBottom: '1rem' }}>
            <ShieldCheck size={24} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>Automated Validation</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Detect missing values, regex pattern errors, duplicate rows, price/quantity rule violations, and invalid date formats automatically.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', padding: '0.75rem', borderRadius: '12px', width: 'fit-content', marginBottom: '1rem' }}>
            <Zap size={24} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>ML Anomaly Detection</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Unsupervised Isolation Forest, Local Outlier Factor (LOF), and DBSCAN density clustering for multi-dimensional anomaly detection.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.75rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', padding: '0.75rem', borderRadius: '12px', width: 'fit-content', marginBottom: '1rem' }}>
            <Sparkles size={24} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>AI Explanation Engine</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Generates natural language summaries detailing root causes, impact severities, and actionable remediation steps.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
