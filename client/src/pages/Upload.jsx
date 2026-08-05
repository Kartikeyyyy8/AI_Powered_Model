import React, { useState } from 'react';
import UploadBox from '../components/UploadBox';
import Loader from '../components/Loader';
import { useDataset } from '../context/DatasetContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle } from 'lucide-react';

const Upload = () => {
  const { uploadDataset } = useDataset();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const navigate = useNavigate();

  const handleFile = async (file) => {
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await uploadDataset(file);
      setStatusMessage(`Dataset "${file.name}" uploaded successfully!`);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err) {
      setErrorMessage(err.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
          Upload Dataset for Analysis
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Ingest transaction logs, user tables, or e-commerce records into the ML pipeline.
        </p>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        <UploadBox onFileSelected={handleFile} />

        {loading && <Loader label="Uploading dataset & initializing schema analysis..." />}

        {statusMessage && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            color: 'var(--accent-emerald)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <CheckCircle size={20} />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '12px',
            color: 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
