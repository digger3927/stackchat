import React, { useState, useEffect } from 'react';
import { FileText, Search, Loader2, Plus, Trash2 } from 'lucide-react';
import ModelSelector from './ModelSelector';

export default function ProjectDashboard({ projectId, onOpenChat, topK, setTopK }) {
  const [project, setProject] = useState(null);
  const [chats, setChats] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const getContextLabel = (value) => {
    if (value >= 1 && value <= 4) return 'Low';
    if (value >= 5 && value <= 9) return 'Medium';
    if (value >= 10 && value <= 15) return 'High';
    return 'Very High';
  };

  // New states for adding documents
  const [showAddDocs, setShowAddDocs] = useState(false);
  const [folderPath, setFolderPath] = useState('');
  const [skipMedia, setSkipMedia] = useState(true);
  const [ingestStatus, setIngestStatus] = useState('idle');
  const [ingestMessage, setIngestMessage] = useState('');

  const fetchProjectDetails = () => {
    fetch(`http://localhost:8000/api/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setProject(data.project);
        }
      });
  };

  useEffect(() => {
    if (!projectId) return;
    
    let active = true;
    
    // Reset state immediately so we don't display stale data from the previous project
    setProject(null);
    setChats([]);
    
    // Fetch project details
    fetch(`http://localhost:8000/api/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        if (active && data.status === 'success') {
          setProject(data.project);
        }
      });
      
    // Fetch past chats
    fetch(`http://localhost:8000/api/projects/${projectId}/chats`)
      .then(res => res.json())
      .then(data => {
        if (active && data.status === 'success') {
          setChats(data.chats);
        }
      });
      
    return () => {
      active = false;
    };
  }, [projectId]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/projects/${projectId}/chats/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        onOpenChat(data.chat_id, query.trim());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/chats/${chatId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.status === 'success') {
        setChats(prev => prev.filter(c => c.id !== chatId));
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleAddDocs = async () => {
    if (!folderPath) return;
    setIngestStatus('loading');
    
    try {
      const isUrl = folderPath.trim().startsWith('http://') || folderPath.trim().startsWith('https://');
      setIngestMessage(`Ingesting ${isUrl ? 'URL' : 'documents'}... This may take a while.`);
      
      const endpoint = isUrl 
        ? `http://localhost:8000/api/projects/${projectId}/ingest-url` 
        : `http://localhost:8000/api/projects/${projectId}/ingest`;
        
      const payload = isUrl 
        ? { url: folderPath.trim() } 
        : { folder_path: folderPath.trim(), skip_media: skipMedia };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Failed to ingest');
      }
      
      setIngestStatus('success');
      setIngestMessage(data.message);
      fetchProjectDetails();
      
      setTimeout(() => {
         setShowAddDocs(false);
         setIngestStatus('idle');
         setFolderPath('');
      }, 3000);
    } catch (err) {
      setIngestStatus('error');
      setIngestMessage(err.message);
    }
  };

  if (!project) return <div className="empty-state"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div className="project-dashboard">
      <div className="dashboard-header">
        <h1 className="project-title">{project.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="sources-badge">
            <FileText size={14} color="#ef4444" />
            <span style={{ fontWeight: 600 }}>{project.doc_count || 0} Sources</span>
          </div>
          <button className="icon-action" onClick={() => setShowAddDocs(!showAddDocs)} title="Add more documents">
             <Plus size={16} />
          </button>
        </div>
      </div>
      
      {showAddDocs && (
        <div className="input-group" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <label>Add Folder or URL to Project</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input type="text" value={folderPath} onChange={e => setFolderPath(e.target.value)} placeholder="/path/to/docs or https://..." style={{ flex: 1 }} />
            <button onClick={handleBrowse} style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '0.75rem', width: 'auto' }}>...</button>
          </div>
          
          <label style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={skipMedia} onChange={e => setSkipMedia(e.target.checked)} disabled={folderPath.trim().startsWith('http')} />
            Skip audio/video files (faster ingestion - only for folders)
          </label>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button onClick={handleAddDocs} disabled={ingestStatus === 'loading' || !folderPath} style={{ flex: 1 }}>
              {ingestStatus === 'loading' ? <Loader2 className="animate-spin" size={16} /> : 'Ingest'}
            </button>
            <button onClick={() => setShowAddDocs(false)} style={{ background: 'transparent', border: '1px solid var(--text-muted)' }}>
              Cancel
            </button>
          </div>
          
          {ingestStatus !== 'idle' && (
            <div className={`status-msg status-${ingestStatus}`} style={{ marginTop: '0.5rem' }}>
              <span>{ingestMessage}</span>
            </div>
          )}
        </div>
      )}
      
      <form className="ask-box" onSubmit={handleAsk}>
        <div className="ask-box-top">
          <Plus size={24} className="ask-icon" style={{ marginTop: '2px' }} />
          <textarea 
            placeholder="Ask a question..." 
            value={query}
            onChange={e => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
              setQuery(e.target.value);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAsk(e);
              }
            }}
            disabled={loading}
            autoFocus
            rows="3"
            style={{ resize: 'none', overflow: 'hidden', minHeight: '4.5rem' }}
          />
        </div>
        <div className="ask-box-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <ModelSelector compact={true} />
            <div className="context-slider-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Context: <strong style={{ color: 'var(--text-main)' }}>{getContextLabel(topK)} ({topK})</strong></span>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={topK} 
                onChange={(e) => setTopK(parseInt(e.target.value))}
                style={{ width: '80px', cursor: 'pointer', height: '4px', accentColor: 'var(--accent-color)' }}
              />
            </div>
          </div>
          <button type="submit" className="icon-btn submit-btn" disabled={loading || !query.trim()}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          </button>
        </div>
      </form>
      
      <div className="past-chats-section">
        <h3>Past chats</h3>
        <div className="chat-list">
          {chats.map(chat => (
            <div key={chat.id} className="chat-list-item" onClick={() => onOpenChat(chat.id)}>
              <span className="chat-title">{chat.title}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span className="chat-date">{chat.created_at}</span>
                <button 
                  className="icon-action delete" 
                  onClick={(e) => handleDeleteChat(e, chat.id)}
                  title="Delete chat"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {chats.length === 0 && <div className="empty-chats">No past chats yet. Start asking above!</div>}
        </div>
      </div>
    </div>
  );
}
