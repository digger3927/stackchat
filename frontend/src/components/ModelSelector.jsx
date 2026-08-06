import React, { useState, useEffect } from 'react';
import { Cpu, Loader2 } from 'lucide-react';

export default function ModelSelector() {
  const [models, setModels] = useState([]);
  const [currentModel, setCurrentModel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setModels(data.models);
          setCurrentModel(data.current_model);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch models", err);
        setLoading(false);
      });
  }, []);

  const handleModelChange = async (e) => {
    const newModel = e.target.value;
    setCurrentModel(newModel);
    try {
      await fetch('http://localhost:8000/api/models/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: newModel }),
      });
    } catch (err) {
      console.error("Failed to set model", err);
    }
  };

  return (
    <div className="input-group" style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Cpu size={16} /> Language Model
      </label>
      <div className="select-wrapper" style={{ position: 'relative' }}>
        <select 
          value={currentModel} 
          onChange={handleModelChange}
          disabled={loading}
          className="model-select"
        >
          {loading ? (
            <option>Loading models...</option>
          ) : (
            models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))
          )}
        </select>
        {loading && <Loader2 className="animate-spin select-spinner" size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }} />}
      </div>
    </div>
  );
}
