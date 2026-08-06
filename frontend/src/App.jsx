import React, { useState } from 'react';
import FolderIngestion from './components/FolderIngestion';
import ChatInterface from './components/ChatInterface';
import ModelSelector from './components/ModelSelector';

function App() {
  const [hasIndex, setHasIndex] = useState(false);

  return (
    <div className="app-container">
      <div className="sidebar glass-panel">
        <h2>Local RAG Setup</h2>
        <ModelSelector />
        <FolderIngestion onIngestSuccess={() => setHasIndex(true)} />
      </div>
      
      <div className="chat-container glass-panel">
        <ChatInterface hasIndex={hasIndex} />
      </div>
    </div>
  );
}

export default App;
