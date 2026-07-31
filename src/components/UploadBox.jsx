import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

const MAX_FILE_SIZE_MB = 150; // supporting file for uploadinf dataset
const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.json'];// these are only allowed extensions

const UploadBox = ({ onFileSelected }) => {
  // 1. drag 2. selected file 3. error shown 4. file input 
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // validating file acc to ext and size
  const validateFile = (file) => {
    if (!file) return false;
    // fetching file extension like .csv 
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    // check whether there exists any file in allowed extensions 
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      setError(`Invalid file type. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }
    // also for the file size but in bytes 
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setError(`File size exceeds limit (${MAX_FILE_SIZE_MB}MB max).`);
      return false;
    }

    setError(null);
    return true;
  };
  // process for uploading file 
  const processFile = (file) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      if (onFileSelected) onFileSelected(file);
    }
  };
  // handling drop
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };
  // choosing file
  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };
  // for clicking on the file
  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  // for uploading from keyboard like enter and space
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload dataset file"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        border: `2px dashed ${dragOver ? 'var(--accent-primary)' : error ? 'var(--accent-rose)' : 'var(--border-color)'}`,
        borderRadius: '18px',
        padding: '3rem 2rem',
        textAlign: 'center',
        background: dragOver ? 'rgba(99, 102, 241, 0.05)' : 'rgba(17, 24, 39, 0.5)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        outline: 'none'
      }}
    >
      {/* hidden input type file */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv, .xlsx, .xls, .json"
        style={{ display: 'none' }}
        onChange={handleChange}
        onClick={(e) => {
          e.stopPropagation();
          e.target.value = null;
        }}
      />
      {/*when file gets selected , show name and size of file with check circle
        otherwise show that cloud and drag drop one
        */}

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
            <UploadCloud size={45} />
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
      {error && (
        <div style={{
          marginTop: '1rem',
          color: 'var(--accent-rose)',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default UploadBox;

