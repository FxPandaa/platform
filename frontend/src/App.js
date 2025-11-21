import React, { useState } from 'react';

function App() {
  const [customerName, setCustomerName] = useState('');
  const [status, setStatus] = useState('');

  // Backend URL configuration
  // Lokaal: http://localhost:8000
  // Cluster (NodePort): http://192.168.154.114:30001
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://192.168.154.114:30001";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Creating workspace...');
    
    try {
      const response = await fetch(`${BACKEND_URL}/create-workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            customer_name: customerName,
            service_type: 'nginx' 
        }),
      });
      
      const data = await response.json();
      if (response.ok) {
        setStatus(`Success! Namespace created: ${data.namespace}`);
      } else {
        setStatus(`Error: ${data.detail || 'Failed'}`);
      }
    } catch (error) {
      setStatus(`Network Error: ${error.message}. Is backend running at ${BACKEND_URL}?`);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: '#333' }}>Self-Service Kubernetes Platform</h1>
      <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Klant Naam (voor Namespace):
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="bijv. coca-cola"
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              required
            />
          </div>
          <button 
            type="submit" 
            style={{ 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              padding: '10px 20px', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Maak Workspace
          </button>
        </form>
      </div>
      {status && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <strong>Status:</strong> {status}
        </div>
      )}
    </div>
  );
}

export default App;
