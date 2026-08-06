import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Plus, Edit2, Trash2, Pin, PinOff } from 'lucide-react';

export default function ProjectManager({ onProjectSelect, currentProjectId }) {
  const [projects, setProjects] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [skipMedia, setSkipMedia] = useState(true);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const [renamingId, setRenamingId] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  const fetchProjects = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/projects');
      const data = await res.json();
      if (data.status === 'success') {
        setProjects(data.projects);
        // If current project was deleted or not set, select the first one
        if (data.projects.length > 0 && (!currentProjectId || !data.projects.find(p => p.id === currentProjectId))) {
          onProjectSelect(data.projects[0].id);
        } else if (data.projects.length === 0) {
          onProjectSelect(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [currentProjectId]);

  const handleBrowse = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/select-folder');
      const data = await res.json();
      if (data.status === 'success' && data.folder_path) {
        setFolderPath(data.folder_path);
      }
    } catch (err) {
      console.error("Failed to open folder picker", err);
    }
  };

  const handleCreate = async () => {
    if (!name || !folderPath) return;
    setStatus('loading');
    setMessage('Ingesting documents... This may take a while.');
    
    try {
      const res = await fetch('http://localhost:8000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, folder_path: folderPath, skip_media: skipMedia }),
      });
      const data = await res.json();
      
      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || data.detail || 'Failed to create project');
      }
      
      setStatus('success');
      setMessage(data.message);
      setIsCreating(false);
      setName('');
      setFolderPath('');
      await fetchProjects();
      onProjectSelect(data.project_id);
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this project?")) {
      await fetch(`http://localhost:8000/api/projects/${id}`, { method: 'DELETE' });
      fetchProjects();
    }
  };

  const handlePin = async (e, id, currentPinned) => {
    e.stopPropagation();
    await fetch(`http://localhost:8000/api/projects/${id}/pin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !currentPinned }),
    });
    fetchProjects();
  };

  const startRename = (e, id, currentName) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameInput(currentName);
  };

  const submitRename = async (id) => {
    if (!renameInput.trim()) {
      setRenamingId(null);
      return;
    }
    await fetch(`http://localhost:8000/api/projects/${id}/rename`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameInput.trim() }),
    });
    setRenamingId(null);
    fetchProjects();
  };

  return (
    <div className="project-manager" style={{ marginTop: '1.5rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Projects</h3>
      
      {!isCreating ? (
        <button onClick={() => setIsCreating(true)} style={{ width: '100%', marginBottom: '1rem', background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
          <Plus size={16} /> New Project
        </button>
      ) : (
        <div className="input-group" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <label>Project Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Finance Docs" />
          
          <label style={{ marginTop: '0.5rem' }}>Folder Path</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="text" value={folderPath} onChange={e => setFolderPath(e.target.value)} placeholder="/path/to/docs" style={{ flex: 1 }} />
            <button onClick={handleBrowse} style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '0.75rem', width: 'auto' }}>...</button>
          </div>
          
          <label style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={skipMedia} onChange={e => setSkipMedia(e.target.checked)} />
            Skip audio/video files (faster ingestion)
          </label>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button onClick={handleCreate} disabled={status === 'loading' || !name || !folderPath} style={{ flex: 1 }}>
              {status === 'loading' ? <Loader2 className="animate-spin" size={16} /> : 'Create'}
            </button>
            <button onClick={() => setIsCreating(false)} style={{ background: 'transparent', border: '1px solid var(--text-muted)' }}>
              Cancel
            </button>
          </div>
          
          {status !== 'idle' && (
            <div className={`status-msg status-${status}`}>
              {status === 'error' && <AlertCircle size={16} />}
              <span>{message}</span>
            </div>
          )}
        </div>
      )}

      <div className="project-list">
        {projects.map(p => (
          <div 
            key={p.id} 
            className={`project-item ${currentProjectId === p.id ? 'active' : ''}`}
            onClick={() => onProjectSelect(p.id)}
          >
            {renamingId === p.id ? (
              <input 
                autoFocus
                type="text"
                value={renameInput}
                onChange={e => setRenameInput(e.target.value)}
                onBlur={() => submitRename(p.id)}
                onKeyDown={e => e.key === 'Enter' && submitRename(p.id)}
                onClick={e => e.stopPropagation()}
                className="rename-input"
              />
            ) : (
              <span className="project-name" title={p.name}>
                {p.pinned && <Pin size={14} fill="var(--text-muted)" style={{ marginRight: '6px', minWidth: '14px' }} />}
                {p.name}
              </span>
            )}

            <div className="project-actions">
              <button className="icon-action" onClick={(e) => handlePin(e, p.id, p.pinned)}>
                {p.pinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
              <button className="icon-action" onClick={(e) => startRename(e, p.id, p.name)}>
                <Edit2 size={14} />
              </button>
              <button className="icon-action delete" onClick={(e) => handleDelete(e, p.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {projects.length === 0 && !isCreating && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>
            No projects found.
          </div>
        )}
      </div>
    </div>
  );
}
