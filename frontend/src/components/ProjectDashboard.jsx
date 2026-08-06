import React, { useState, useEffect } from 'react';
import { FileText, Search, Loader2, Plus, Trash2 } from 'lucide-react';
import ModelSelector from './ModelSelector';

export default function ProjectDashboard({ projectId, onOpenChat }) {
  const [project, setProject] = useState(null);
  const [chats, setChats] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    
    // Fetch project details
    fetch(`http://localhost:8000/api/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setProject(data.project);
        }
      });
      
    // Fetch past chats
    fetch(`http://localhost:8000/api/projects/${projectId}/chats`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setChats(data.chats);
        }
      });
  }, [projectId]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/projects/${projectId}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        onOpenChat(data.chat_id);
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

  if (!project) return <div className="empty-state"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div className="project-dashboard">
      <div className="dashboard-header">
        <h1 className="project-title">{project.name}</h1>
        <div className="sources-badge">
          <FileText size={14} color="#ef4444" />
          <span style={{ fontWeight: 600 }}>{project.doc_count || 0} Sources</span>
        </div>
      </div>
      
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
        <div className="ask-box-bottom">
          <ModelSelector compact={true} />
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
