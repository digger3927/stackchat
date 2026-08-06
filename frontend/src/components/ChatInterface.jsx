import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Database } from 'lucide-react';
import { marked } from 'marked';

export default function ChatInterface({ projectId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (projectId) {
      fetch(`http://localhost:8000/api/projects/${projectId}/history`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            setMessages(data.history);
          }
        });
    } else {
      setMessages([]);
    }
  }, [projectId]);

  const handleSend = async () => {
    if (!input.trim() || !projectId || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, query: userMsg }),
      });
      
      const data = await response.json();
      
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || data.detail || 'Chat failed');
      }

      setMessages(prev => [...prev, { role: 'bot', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: `**Error:** ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) {
    return (
      <div className="empty-state">
        <Database size={48} strokeWidth={1} />
        <h3>No Project Selected</h3>
        <p>Please select or create a project in the sidebar to start chatting.</p>
      </div>
    );
  }

  return (
    <>
      <div className="chat-header">
        <Bot size={24} color="var(--accent-color)" />
        <h2>Local Knowledge Chat</h2>
      </div>
      
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
             <div dangerouslySetInnerHTML={{ __html: marked(msg.content) }} />
          </div>
        ))}
        {loading && (
          <div className="message bot">
            <span className="typing-indicator">Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a question about your documents..."
          disabled={loading}
        />
        <button className="icon-btn" onClick={handleSend} disabled={!input.trim() || loading}>
          <Send size={18} />
        </button>
      </div>
    </>
  );
}
