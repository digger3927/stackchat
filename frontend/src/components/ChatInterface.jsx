import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, ArrowLeft } from 'lucide-react';
import { marked } from 'marked';

export default function ChatInterface({ chatId, onBack }) {
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
    if (chatId) {
      fetch(`http://localhost:8000/api/chats/${chatId}/history`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            setMessages(data.history);
          }
        });
    }
  }, [chatId]);

  const handleSend = async () => {
    if (!input.trim() || !chatId || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, query: userMsg }),
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

  return (
    <div className="chat-interface-wrapper">
      <div className="chat-header">
        <button className="icon-btn" onClick={onBack} style={{ marginRight: '1rem', background: 'transparent', border: '1px solid var(--border-color)' }}>
          <ArrowLeft size={18} />
        </button>
        <Bot size={24} color="var(--accent-color)" />
        <h2>Chat</h2>
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
          placeholder="Ask a follow-up question..."
          disabled={loading}
          autoFocus
        />
        <button className="icon-btn" onClick={handleSend} disabled={!input.trim() || loading}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
