import React, { useState, useEffect, useCallback } from 'react';
import '../styles/AdminPanel.css';

const API_BASE_URL = 'http://localhost:8000/api';

function AdminPanel() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Data state
  const [datasets, setDatasets] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [stats, setStats] = useState({});
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Edit modals
  const [editingEquipment, setEditingEquipment] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch admin data
  const fetchAdminData = useCallback(async (authToken) => {
    setLoading(true);
    setError('');
    try {
      // Fetch ALL datasets using the /all/ endpoint
      let datasetsList = [];
      const datasetsRes = await fetch(`${API_BASE_URL}/datasets/all/`, {
        headers: { 'Authorization': `Token ${authToken}` }
      });
      
      if (!datasetsRes.ok) {
        // Fallback to regular endpoint if /all/ doesn't exist
        const fallbackRes = await fetch(`${API_BASE_URL}/datasets/`, {
          headers: { 'Authorization': `Token ${authToken}` }
        });
        if (!fallbackRes.ok) {
          throw new Error('Failed to fetch datasets');
        }
        const fallbackData = await fallbackRes.json();
        datasetsList = Array.isArray(fallbackData) ? fallbackData : (fallbackData.results || []);
      } else {
        const datasetsData = await datasetsRes.json();
        datasetsList = Array.isArray(datasetsData) ? datasetsData : (datasetsData.results || []);
      }
      setDatasets(datasetsList);

      // Fetch all equipment
      let equipmentList = [];
      const equipmentRes = await fetch(`${API_BASE_URL}/equipment/all/`, {
        headers: { 'Authorization': `Token ${authToken}` }
      });
      
      if (equipmentRes.ok) {
        const equipmentData = await equipmentRes.json();
        equipmentList = Array.isArray(equipmentData) ? equipmentData : (equipmentData.results || []);
      } else {
        // Fallback to regular endpoint
        const fallbackEquipRes = await fetch(`${API_BASE_URL}/equipment/`, {
          headers: { 'Authorization': `Token ${authToken}` }
        });
        if (fallbackEquipRes.ok) {
          const equipmentData = await fallbackEquipRes.json();
          equipmentList = Array.isArray(equipmentData) ? equipmentData : (equipmentData.results || []);
        }
      }
      setEquipment(equipmentList);

      // Fetch stats from backend for accuracy
      let statsData = null;
      try {
        const statsRes = await fetch(`${API_BASE_URL}/equipment/stats/`, {
          headers: { 'Authorization': `Token ${authToken}` }
        });
        if (statsRes.ok) {
          statsData = await statsRes.json();
        }
      } catch (e) {
        console.log('Stats endpoint not available, calculating locally');
      }

      // Use backend stats if available, otherwise calculate locally
      if (statsData && statsData.total_equipment !== undefined) {
        setStats({
          totalDatasets: datasetsList.length,
          totalEquipment: statsData.total_equipment,
          avgFlowrate: parseFloat(statsData.avg_flowrate || 0).toFixed(2),
          avgPressure: parseFloat(statsData.avg_pressure || 0).toFixed(2),
          avgTemperature: parseFloat(statsData.avg_temperature || 0).toFixed(2),
          typeDistribution: statsData.type_distribution || {}
        });
      } else {
        // Fallback: Calculate from datasets
        let totalEquipment = datasetsList.reduce((sum, d) => sum + (d.equipment_count || 0), 0);
        let avgFlowrate = 0;
        let avgPressure = 0;
        let avgTemperature = 0;
        let typeDistribution = {};

        const validDatasets = datasetsList.filter(d => d.equipment_count > 0);
        if (validDatasets.length > 0 && totalEquipment > 0) {
          let totalWeightedFlowrate = 0;
          let totalWeightedPressure = 0;
          let totalWeightedTemperature = 0;
          
          validDatasets.forEach(d => {
            const count = d.equipment_count || 0;
            totalWeightedFlowrate += (parseFloat(d.avg_flowrate) || 0) * count;
            totalWeightedPressure += (parseFloat(d.avg_pressure) || 0) * count;
            totalWeightedTemperature += (parseFloat(d.avg_temperature) || 0) * count;
            
            if (d.type_distribution) {
              Object.entries(d.type_distribution).forEach(([type, cnt]) => {
                typeDistribution[type] = (typeDistribution[type] || 0) + cnt;
              });
            }
          });
          
          avgFlowrate = totalWeightedFlowrate / totalEquipment;
          avgPressure = totalWeightedPressure / totalEquipment;
          avgTemperature = totalWeightedTemperature / totalEquipment;
        }
        
        setStats({
          totalDatasets: datasetsList.length,
          totalEquipment,
          avgFlowrate: avgFlowrate.toFixed(2),
          avgPressure: avgPressure.toFixed(2),
          avgTemperature: avgTemperature.toFixed(2),
          typeDistribution
        });
      }

    } catch (err) {
      setError('Failed to fetch admin data: ' + err.message);
    }
    setLoading(false);
  }, []);

  // Check for saved token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    const savedUser = localStorage.getItem('adminUser');
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
      fetchAdminData(savedToken);
    }
  }, [fetchAdminData]);

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setToken(data.token);
      setCurrentUser({ id: data.user_id, username: data.username });
      setIsLoggedIn(true);
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify({ id: data.user_id, username: data.username }));
      await fetchAdminData(data.token);
      setSuccess('Login successful!');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Register handler
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setToken(data.token);
      setCurrentUser({ id: data.user_id, username: data.username });
      setIsLoggedIn(true);
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify({ id: data.user_id, username: data.username }));
      await fetchAdminData(data.token);
      setSuccess('Registration successful!');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` }
      });
    } catch (err) {
      console.log('Logout API call failed, but continuing with local logout');
    }
    
    setIsLoggedIn(false);
    setToken(null);
    setCurrentUser(null);
    setUsername('');
    setPassword('');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setDatasets([]);
    setEquipment([]);
    setStats({});
    setSuccess('Logged out successfully');
  };

  // Delete dataset
  const handleDeleteDataset = async (id) => {
    if (!window.confirm('Are you sure you want to delete this dataset? This will also delete all associated equipment.')) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/datasets/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.ok || response.status === 204) {
        await fetchAdminData(token);
        setSuccess('Dataset deleted successfully');
      } else {
        throw new Error('Failed to delete dataset');
      }
    } catch (err) {
      setError('Error deleting dataset: ' + err.message);
    }
    setLoading(false);
  };

  // Delete equipment
  const handleDeleteEquipment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this equipment?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/equipment/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });

      if (response.ok || response.status === 204) {
        await fetchAdminData(token);
        setSuccess('Equipment deleted successfully');
      } else {
        throw new Error('Failed to delete equipment');
      }
    } catch (err) {
      setError('Error deleting equipment: ' + err.message);
    }
    setLoading(false);
  };

  // Update equipment
  const handleUpdateEquipment = async (e) => {
    e.preventDefault();
    if (!editingEquipment) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/equipment/${editingEquipment.id}/`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingEquipment.name,
          equipment_type: editingEquipment.equipment_type,
          flowrate: parseFloat(editingEquipment.flowrate),
          pressure: parseFloat(editingEquipment.pressure),
          temperature: parseFloat(editingEquipment.temperature)
        })
      });

      if (response.ok) {
        await fetchAdminData(token);
        setEditingEquipment(null);
        setSuccess('Equipment updated successfully');
      } else {
        throw new Error('Failed to update equipment');
      }
    } catch (err) {
      setError('Error updating equipment: ' + err.message);
    }
    setLoading(false);
  };

  // Export data
  const exportData = (format) => {
    const data = { datasets, equipment, stats, exportDate: new Date().toISOString() };
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      // Export equipment as CSV
      const headers = ['ID', 'Name', 'Type', 'Flowrate', 'Pressure', 'Temperature', 'Dataset'];
      const rows = equipment.map(e => [
        e.id,
        e.name,
        e.equipment_type,
        e.flowrate,
        e.pressure,
        e.temperature,
        e.dataset
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `equipment-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setSuccess(`Data exported as ${format.toUpperCase()}`);
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Pagination
  const paginatedEquipment = equipment.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(equipment.length / itemsPerPage);

  // Login/Register Form
  if (!isLoggedIn) {
    return (
      <div className="admin-login">
        <div className="login-container">
          <h2>🔐 Admin Portal</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <div className="login-buttons">
              <button type="submit" disabled={loading} className="login-btn">
                {loading ? 'Loading...' : 'Login'}
              </button>
              <button type="button" onClick={handleRegister} disabled={loading} className="register-btn">
                {loading ? 'Loading...' : 'Register'}
              </button>
            </div>
          </form>
          <p className="login-hint">New user? Click Register to create an account.</p>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-header">
        <div className="header-left">
          <h1>🔒 Admin Dashboard</h1>
          <span className="user-info">Welcome, {currentUser?.username || 'Admin'}</span>
        </div>
        <div className="header-right">
          <button className="refresh-btn" onClick={() => fetchAdminData(token)} disabled={loading}>
            🔄 Refresh
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="error-message admin-message">{error}</div>}
      {success && <div className="success-message admin-message">{success}</div>}

      {/* Tabs */}
      <div className="admin-tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''} 
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={activeTab === 'datasets' ? 'active' : ''} 
          onClick={() => setActiveTab('datasets')}
        >
          📁 Datasets ({datasets.length})
        </button>
        <button 
          className={activeTab === 'equipment' ? 'active' : ''} 
          onClick={() => { setActiveTab('equipment'); setCurrentPage(1); }}
        >
          ⚙️ Equipment ({equipment.length})
        </button>
        <button 
          className={activeTab === 'tools' ? 'active' : ''} 
          onClick={() => setActiveTab('tools')}
        >
          🛠️ Tools
        </button>
      </div>

      {/* Loading */}
      {loading && <div className="loading-bar"><div className="loading-progress"></div></div>}

      {/* Content */}
      <div className="admin-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview">
            <h2>System Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card blue">
                <div className="stat-icon">📁</div>
                <div className="stat-info">
                  <h3>Total Datasets</h3>
                  <p className="stat-value">{stats.totalDatasets || 0}</p>
                </div>
              </div>
              <div className="stat-card purple">
                <div className="stat-icon">⚙️</div>
                <div className="stat-info">
                  <h3>Total Equipment</h3>
                  <p className="stat-value">{stats.totalEquipment || 0}</p>
                </div>
              </div>
              <div className="stat-card green">
                <div className="stat-icon">💧</div>
                <div className="stat-info">
                  <h3>Avg Flowrate</h3>
                  <p className="stat-value">{stats.avgFlowrate || '0.00'}</p>
                </div>
              </div>
              <div className="stat-card orange">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <h3>Avg Pressure</h3>
                  <p className="stat-value">{stats.avgPressure || '0.00'}</p>
                </div>
              </div>
              <div className="stat-card red">
                <div className="stat-icon">🌡️</div>
                <div className="stat-info">
                  <h3>Avg Temperature</h3>
                  <p className="stat-value">{stats.avgTemperature || '0.00'}</p>
                </div>
              </div>
            </div>

            {/* Type Distribution */}
            {stats.typeDistribution && Object.keys(stats.typeDistribution).length > 0 && (
              <div className="type-distribution">
                <h3>Equipment Type Distribution</h3>
                <div className="type-grid">
                  {Object.entries(stats.typeDistribution).map(([type, count]) => (
                    <div key={type} className="type-card">
                      <span className="type-name">{type}</span>
                      <span className="type-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="recent-activity">
              <h3>Recent Datasets</h3>
              <div className="activity-list">
                {datasets.slice(0, 5).map(dataset => (
                  <div key={dataset.id} className="activity-item">
                    <span className="activity-icon">📄</span>
                    <div className="activity-info">
                      <span className="activity-name">{dataset.filename}</span>
                      <span className="activity-date">{new Date(dataset.upload_date).toLocaleString()}</span>
                    </div>
                    <span className="activity-count">{dataset.equipment_count} items</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Datasets Tab */}
        {activeTab === 'datasets' && (
          <div className="datasets-section">
            <div className="section-header">
              <h2>Manage Datasets</h2>
              <span className="total-count">{datasets.length} total</span>
            </div>
            
            {datasets.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>No datasets uploaded yet</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Filename</th>
                      <th>Upload Date</th>
                      <th>Equipment</th>
                      <th>Avg Flowrate</th>
                      <th>Avg Pressure</th>
                      <th>Avg Temp</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasets.map(dataset => (
                      <tr key={dataset.id}>
                        <td className="id-cell" title={dataset.id}>{String(dataset.id).substring(0, 8)}...</td>
                        <td className="filename-cell">{dataset.filename}</td>
                        <td>{new Date(dataset.upload_date).toLocaleDateString()}</td>
                        <td>{dataset.equipment_count}</td>
                        <td>{parseFloat(dataset.avg_flowrate || 0).toFixed(2)}</td>
                        <td>{parseFloat(dataset.avg_pressure || 0).toFixed(2)}</td>
                        <td>{parseFloat(dataset.avg_temperature || 0).toFixed(2)}</td>
                        <td className="actions-cell">
                          <button 
                            className="delete-btn"
                            onClick={() => handleDeleteDataset(dataset.id)}
                            title="Delete dataset"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <div className="equipment-section">
            <div className="section-header">
              <h2>Manage Equipment</h2>
              <span className="total-count">{equipment.length} total</span>
            </div>
            
            {equipment.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">⚙️</span>
                <p>No equipment found</p>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Flowrate</th>
                        <th>Pressure</th>
                        <th>Temperature</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEquipment.map(item => (
                        <tr key={item.id}>
                          <td className="id-cell" title={item.id}>{String(item.id).substring(0, 8)}...</td>
                          <td className="name-cell">{item.name}</td>
                          <td><span className="type-badge">{item.equipment_type}</span></td>
                          <td>{parseFloat(item.flowrate).toFixed(2)}</td>
                          <td>{parseFloat(item.pressure).toFixed(2)}</td>
                          <td>{parseFloat(item.temperature).toFixed(2)}</td>
                          <td className="actions-cell">
                            <button 
                              className="edit-btn"
                              onClick={() => setEditingEquipment({...item})}
                              title="Edit equipment"
                            >
                              ✏️
                            </button>
                            <button 
                              className="delete-btn small"
                              onClick={() => handleDeleteEquipment(item.id)}
                              title="Delete equipment"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button 
                      onClick={() => setCurrentPage(1)} 
                      disabled={currentPage === 1}
                    >
                      ⏮️
                    </button>
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1}
                    >
                      ◀️ Prev
                    </button>
                    <span className="page-info">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages}
                    >
                      Next ▶️
                    </button>
                    <button 
                      onClick={() => setCurrentPage(totalPages)} 
                      disabled={currentPage === totalPages}
                    >
                      ⏭️
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div className="tools-section">
            <h2>Admin Tools</h2>
            <div className="tools-grid">
              <div className="tool-card">
                <div className="tool-icon">📥</div>
                <h3>Export Data</h3>
                <p>Download all data in various formats</p>
                <div className="tool-actions">
                  <button onClick={() => exportData('json')} className="tool-btn">
                    Export JSON
                  </button>
                  <button onClick={() => exportData('csv')} className="tool-btn secondary">
                    Export CSV
                  </button>
                </div>
              </div>
              
              <div className="tool-card">
                <div className="tool-icon">🔄</div>
                <h3>Refresh Data</h3>
                <p>Reload all data from server</p>
                <button onClick={() => fetchAdminData(token)} className="tool-btn" disabled={loading}>
                  {loading ? 'Refreshing...' : 'Refresh Now'}
                </button>
              </div>
              
              <div className="tool-card">
                <div className="tool-icon">📊</div>
                <h3>System Status</h3>
                <p>Current system information</p>
                <div className="system-info">
                  <div className="info-row">
                    <span>Datasets:</span>
                    <span>{stats.totalDatasets || 0}</span>
                  </div>
                  <div className="info-row">
                    <span>Equipment:</span>
                    <span>{stats.totalEquipment || 0}</span>
                  </div>
                  <div className="info-row">
                    <span>Status:</span>
                    <span className="status-online">● Online</span>
                  </div>
                  <div className="info-row">
                    <span>User:</span>
                    <span>{currentUser?.username || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="tool-card danger">
                <div className="tool-icon">⚠️</div>
                <h3>Danger Zone</h3>
                <p>Destructive actions - use with caution</p>
                <button 
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete ALL datasets? This cannot be undone!')) {
                      for (const dataset of datasets) {
                        await handleDeleteDataset(dataset.id);
                      }
                    }
                  }} 
                  className="tool-btn danger"
                >
                  Delete All Datasets
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Equipment Modal */}
      {editingEquipment && (
        <div className="modal-overlay" onClick={() => setEditingEquipment(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Equipment</h3>
              <button className="close-btn" onClick={() => setEditingEquipment(null)}>×</button>
            </div>
            <form onSubmit={handleUpdateEquipment}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editingEquipment.name}
                  onChange={(e) => setEditingEquipment({...editingEquipment, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <input
                  type="text"
                  value={editingEquipment.equipment_type}
                  onChange={(e) => setEditingEquipment({...editingEquipment, equipment_type: e.target.value})}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Flowrate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingEquipment.flowrate}
                    onChange={(e) => setEditingEquipment({...editingEquipment, flowrate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Pressure</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingEquipment.pressure}
                    onChange={(e) => setEditingEquipment({...editingEquipment, pressure: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Temperature</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingEquipment.temperature}
                    onChange={(e) => setEditingEquipment({...editingEquipment, temperature: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setEditingEquipment(null)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
