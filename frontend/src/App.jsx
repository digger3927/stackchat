import React, { useState } from 'react';
import ProjectManager from './components/ProjectManager';
import ProjectDashboard from './components/ProjectDashboard';
import ChatInterface from './components/ChatInterface';
import { Database } from 'lucide-react';

function App() {
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);

  const handleProjectSelect = (id) => {
    setCurrentProjectId(id);
    setCurrentChatId(null); // Go back to dashboard when switching projects
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
            onOpenChat={setCurrentChatId} 
          />
        ) : (
          <ChatInterface 
            chatId={currentChatId} 
            onBack={() => setCurrentChatId(null)} 
          />
        )}
      </div>
    </div>
  );
}

export default App;
