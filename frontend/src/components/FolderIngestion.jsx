import React, { useState } from 'react';
import { Folder, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function FolderIngestion({ onIngestSuccess }) {
  const [folderPath, setFolderPath] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const handleIngest = async () => {
    if (!folderPath) return;
    
    setStatus('loading');
    setMessage('Scanning and ingesting documents... This may take a while depending on folder size.');
    
    try {
      const response = await fetch('http://localhost:8000/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_path: folderPath }),
      });
      
      const data = await response.json();
      
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || data.detail || 'Failed to ingest');
      }
      
      setStatus('success');
      setMessage(data.message);
      onIngestSuccess();
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  return (
    <div className="input-group">
      <label>Absolute Folder Path</label>
      <input 
        type="text" 
        value={folderPath}
        onChange={(e) => setFolderPath(e.target.value)}
        placeholder="/home/user/Documents/Knowledge"
      />
      <button onClick={handleIngest} disabled={status === 'loading' || !folderPath}>
        {status === 'loading' ? <Loader2 className="animate-spin" size={18} /> : <Folder size={18} />}
        {status === 'loading' ? 'Ingesting...' : 'Ingest Documents'}
      </button>

      {status !== 'idle' && (
        <div className={`status-msg status-${status}`}>
          {status === 'loading' && <Loader2 className="animate-spin" size={16} />}
          {status === 'success' && <CheckCircle size={16} />}
          {status === 'error' && <AlertCircle size={16} />}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
