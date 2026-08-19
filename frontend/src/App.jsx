import React, { useState } from 'react';
import ProjectManager from './components/ProjectManager';
import ProjectDashboard from './components/ProjectDashboard';
import ChatInterface from './components/ChatInterface';
import { Database } from 'lucide-react';

function App() {
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [initialQuery, setInitialQuery] = useState(null);
  const [topK, setTopK] = useState(5);

  const handleProjectSelect = (id) => {
    setCurrentProjectId(id);
    setCurrentChatId(null);
    setInitialQuery(null);
  };

  const handleOpenChat = (id, query = null) => {
    setCurrentChatId(id);
    setInitialQuery(query);
  };

  return (
    <div className="app-container">
      <div className="sidebar glass-panel">
        <ProjectManager 
          currentProjectId={currentProjectId}
          onProjectSelect={handleProjectSelect} 
        />
      </div>
      
      <div className="main-content glass-panel">
        {!currentProjectId ? (
          <div className="empty-state">
            <Database size={48} strokeWidth={1} />
            <h3>No Project Selected</h3>
            <p>Please select or create a project in the sidebar to get started.</p>
          </div>
        ) : !currentChatId ? (
          <ProjectDashboard 
            projectId={currentProjectId} 
            onOpenChat={handleOpenChat} 
            topK={topK}
            setTopK={setTopK}
          />
        ) : (
          <ChatInterface 
            chatId={currentChatId} 
            initialQuery={initialQuery}
            topK={topK}
            setTopK={setTopK}
            onBack={() => { setCurrentChatId(null); setInitialQuery(null); }} 
          />
        )}
      </div>
    </div>
  );
}

export default App;
