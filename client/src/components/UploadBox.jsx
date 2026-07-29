import React, { useState } from 'react';
import { UploadCloud, File, CheckCircle } from 'lucide-react';

const UploadBox = ({ onFileSelected }) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (onFileSelected) onFileSelected(file);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (onFileSelected) onFileSelected(file);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-color)'}`,
        borderRadius: '16px',
        padding: '3rem 2rem',
        textAlign: 'center',
        background: dragOver ? 'rgba(99, 102, 241, 0.05)' : 'rgba(17, 24, 39, 0.5)',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      onClick={() => document.getElementById('file-upload-input').click()}
    >
      <input
        id="file-upload-input"
        type="file"
        accept=".csv, .xlsx, .xls, .json"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      {selectedFile ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle size={48} color="var(--accent-emerald)" />
          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedFile.name}</div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'rgba(99, 102, 241, 0.1)',
            padding: '1rem',
            borderRadius: '50%',
            color: 'var(--accent-primary)'
          }}>
            <UploadCloud size={36} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.3rem' }}>
              Drag & Drop your dataset here
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Supports CSV, Excel (.xlsx), and JSON up to 50MB
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadBox;
