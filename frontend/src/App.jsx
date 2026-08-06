import React, { useState } from 'react';
import ProjectManager from './components/ProjectManager';
import ChatInterface from './components/ChatInterface';
import ModelSelector from './components/ModelSelector';

function App() {
  const [currentProjectId, setCurrentProjectId] = useState(null);

  return (
    <div className="app-container">
      <div className="sidebar glass-panel">
        <h2>Local RAG Setup</h2>
        <ModelSelector />
        <ProjectManager 
          currentProjectId={currentProjectId}
          onProjectSelect={setCurrentProjectId} 
        />
      </div>
      
      <div className="chat-container glass-panel">
        <ChatInterface projectId={currentProjectId} />
      </div>
    </div>
  );
}

export default App;
