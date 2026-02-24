import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import UploadForm from './components/UploadForm';
import DataTable from './components/DataTable';
import Charts from './components/Charts';
import Summary from './components/Summary';
import AdminPanel from './components/AdminPanel';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

function App() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [darkMode, setDarkMode] = useState(false);  

  useEffect(() => {
    fetchDatasets();
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.body.classList.add('dark-mode');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
    document.body.classList.toggle('dark-mode');
  };

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/datasets/summary/`);
      setDatasets(response.data.datasets);
      if (response.data.datasets.length > 0) {
        setSelectedDataset(response.data.datasets[0]);
      }
    } catch (err) {
      setError('Failed to fetch datasets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/datasets/upload/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSelectedDataset(response.data);
      await fetchDatasets();
      alert('File uploaded successfully!');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to upload file. Please check the file format and try again.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDataset = async (datasetId) => {
    if (!window.confirm('Are you sure you want to delete this dataset?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/datasets/${datasetId}/`);
      
      // If deleted dataset was selected, clear selection
      if (selectedDataset?.id === datasetId) {
        setSelectedDataset(null);
      }
      
      // Refresh datasets list
      await fetchDatasets();
      alert('Dataset deleted successfully!');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to delete dataset.';
      setError(errorMessage);
      alert(`Upload failed: ${errorMessage}`);
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Chemical Equipment Parameter Visualizer</h1>
        <p>Upload and analyze chemical equipment data</p>
        <div className="header-buttons">
          <button className="dark-mode-toggle" onClick={toggleDarkMode} title={darkMode ? "Light Mode" : "Dark Mode"}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button className="admin-toggle-btn" onClick={() => setShowAdmin(!showAdmin)}>
            {showAdmin ? '📊 Dashboard' : '🔐 Admin Panel'}
          </button>
        </div>
      </header>

      <main className="App-main">
        {showAdmin ? (
          <AdminPanel />
        ) : (
          <div className="container">{error && <div className="error-message">{error}</div>}

          <section className="upload-section">
            <UploadForm onUpload={handleUpload} loading={loading} />
          </section>

          {selectedDataset && (
            <>
              <section className="summary-section">
                <Summary dataset={selectedDataset} />
              </section>

              <section className="charts-section">
                <Charts dataset={selectedDataset} />
              </section>

              <section className="data-table-section">
                <DataTable dataset={selectedDataset} />
              </section>
            </>
          )}

          {datasets.length > 0 && (
            <section className="history-section">
              <h2>Upload History (Last 5)</h2>
              <div className="dataset-list">
                {datasets.map((dataset) => (
                  <div key={dataset.id} className="dataset-item-wrapper">
                    <button
                      className={`dataset-item ${selectedDataset?.id === dataset.id ? 'active' : ''}`}
                      onClick={() => setSelectedDataset(dataset)}
                    >
                      <span>{dataset.filename}</span>
                      <small>{new Date(dataset.upload_date).toLocaleDateString()}</small>
                    </button>
                    <button
                      className="delete-dataset-btn"
                      onClick={() => handleDeleteDataset(dataset.id)}
                      title="Delete dataset"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        )}
      </main>
    </div>
  );
}

export default App;
