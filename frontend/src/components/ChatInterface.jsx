import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, ArrowLeft, Download } from 'lucide-react';
import { marked } from 'marked';

export default function ChatInterface({ chatId, initialQuery, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const initialQueryHandled = useRef(false);

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
            if (initialQuery && !initialQueryHandled.current) {
              initialQueryHandled.current = true;
              handleSend(initialQuery);
            }
          }
        });
    }
  }, [chatId]);

  const handleDownload = (content, index) => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Format a nice filename using the index
    link.setAttribute('download', `stackchat-response-${index + 1}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSend = async (overrideQuery = null) => {
    const userMsg = typeof overrideQuery === 'string' ? overrideQuery : input.trim();
    if (!userMsg || !chatId || loading) return;

    if (typeof overrideQuery !== 'string') setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    
    // Add an empty bot message that we will append to
    setMessages(prev => [...prev, { role: 'bot', content: '' }]);

    try {
      const response = await fetch('http://localhost:8000/api/chats/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, query: userMsg }),
      });
      
      if (!response.ok) {
        throw new Error('Chat failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        setMessages(prev => {
          if (prev.length === 0) return prev;
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = { 
            ...newMessages[lastIndex], 
            content: (newMessages[lastIndex].content || '') + chunk 
          };
          return newMessages;
        });
      }
    } catch (err) {
      setMessages(prev => {
         if (prev.length === 0) return prev;
         const newMessages = [...prev];
         const lastIndex = newMessages.length - 1;
         newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: `**Error:** ${err.message}`
         };
         return newMessages;
      });
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
             <div dangerouslySetInnerHTML={{ __html: marked(msg.content || '') }} />
             {msg.role === 'bot' && msg.content && (
               <button 
                 className="message-action-btn"
                 onClick={() => handleDownload(msg.content, i)}
                 title="Download Response as Markdown"
               >
                 <Download size={14} />
                 <span>Download Markdown</span>
               </button>
             )}
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
