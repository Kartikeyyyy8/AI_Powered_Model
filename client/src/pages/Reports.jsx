import React, { useState } from 'react';
import { generateReport } from '../services/reportApi';
import Loader from '../components/Loader';
import { FileText, FileSpreadsheet, Presentation, Download, CheckCircle } from 'lucide-react';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const handleGenerate = async (type) => {
    setLoading(true);
    setDownloadUrl(null);
    try {
      const res = await generateReport(type, 'DS-MOCK-001');
      setDownloadUrl(res.fileUrl);
    } catch (err) {
      alert('Report generation error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
          Reports & Export Center
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Export executive summary reports in PDF, Microsoft PowerPoint (PPT), or Excel workbook formats.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', padding: '1rem', borderRadius: '50%', color: 'var(--accent-rose)' }}>
            <FileText size={36} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>PDF Executive Report</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Comprehensive visual document complete with quality charts and audit summaries.
          </p>
          <button onClick={() => handleGenerate('PDF')} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Generate PDF
          </button>
        </div>

        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '1rem', borderRadius: '50%', color: 'var(--accent-emerald)' }}>
            <FileSpreadsheet size={36} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Excel Audit Workbook</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Multi-tab workbook containing cleaned dataset, rule violations, and row scores.
          </p>
          <button onClick={() => handleGenerate('EXCEL')} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Generate Excel
          </button>
        </div>

        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '1rem', borderRadius: '50%', color: 'var(--accent-amber)' }}>
            <Presentation size={36} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>PowerPoint Deck</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Presentation-ready slide deck for executive and stakeholder reviews.
          </p>
          <button onClick={() => handleGenerate('PPT')} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Generate PPT
          </button>
        </div>
      </div>

      {loading && <Loader label="Compiling report data and generating export file..." />}

      {downloadUrl && (
        <div style={{
          padding: '1.5rem',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '16px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
            <CheckCircle size={24} />
            <span>Report generated successfully!</span>
          </div>
          <a href={downloadUrl} download className="btn-primary">
            <Download size={18} /> Download Report
          </a>
        </div>
      )}
    </div>
  );
};

export default Reports;
