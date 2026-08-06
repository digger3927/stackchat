import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Database } from 'lucide-react';
import { marked } from 'marked';

export default function ChatInterface({ hasIndex }) {
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

  const handleSend = async () => {
    if (!input.trim() || !hasIndex || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Chat failed');
      }

      setMessages(prev => [...prev, { role: 'bot', content: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', content: `**Error:** ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!hasIndex && messages.length === 0) {
    return (
      <div className="empty-state">
        <Database size={48} strokeWidth={1} />
        <h3>No Documents Ingested</h3>
        <p>Please use the sidebar to ingest a folder of documents before starting a chat.</p>
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
          disabled={!hasIndex || loading}
        />
        <button className="icon-btn" onClick={handleSend} disabled={!hasIndex || !input.trim() || loading}>
          <Send size={18} />
        </button>
      </div>
    </>
  );
}
