import React, { useState, useMemo } from 'react';
import '../styles/DataTable.css';

function DataTable({ dataset }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Get unique equipment types for filter
  const equipmentTypes = useMemo(() => {
    if (!dataset || !dataset.equipment_items || dataset.equipment_items.length === 0) {
      return ['all'];
    }
    const types = new Set(dataset.equipment_items.map(item => item.equipment_type));
    return ['all', ...Array.from(types)];
  }, [dataset]);

  // Filter and search logic
  const filteredData = useMemo(() => {
    if (!dataset || !dataset.equipment_items || dataset.equipment_items.length === 0) {
      return [];
    }
    let filtered = dataset.equipment_items;

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.equipment_type === filterType);
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.equipment_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [dataset, searchTerm, filterType, sortConfig]);

  if (!dataset || !dataset.equipment_items || dataset.equipment_items.length === 0) {
    return <div className="data-table"><p className="no-data">No equipment data available</p></div>;
  }

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const exportToCSV = () => {
    const headers = ['Equipment Name', 'Type', 'Flowrate', 'Pressure', 'Temperature'];
    const rows = filteredData.map(item => [
      item.name,
      item.equipment_type,
      item.flowrate.toFixed(2),
      item.pressure.toFixed(2),
      item.temperature.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `equipment_data_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToExcel = () => {
    let html = '<table>';
    html += '<thead><tr><th>Equipment Name</th><th>Type</th><th>Flowrate</th><th>Pressure</th><th>Temperature</th></tr></thead>';
    html += '<tbody>';
    filteredData.forEach(item => {
      html += `<tr><td>${item.name}</td><td>${item.equipment_type}</td><td>${item.flowrate.toFixed(2)}</td><td>${item.pressure.toFixed(2)}</td><td>${item.temperature.toFixed(2)}</td></tr>`;
    });
    html += '</tbody></table>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `equipment_data_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
  };

  const printTable = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Equipment Data</title>');
    printWindow.document.write('<style>table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:12px;text-align:left;}th{background:#667eea;color:white;}tr:nth-child(even){background:#f9f9f9;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h1>Chemical Equipment Data Report</h1>');
    printWindow.document.write('<p>Generated: ' + new Date().toLocaleString() + '</p>');
    printWindow.document.write('<table><thead><tr><th>Equipment Name</th><th>Type</th><th>Flowrate</th><th>Pressure</th><th>Temperature</th></tr></thead><tbody>');
    filteredData.forEach(item => {
      printWindow.document.write(`<tr><td>${item.name}</td><td>${item.equipment_type}</td><td>${item.flowrate.toFixed(2)}</td><td>${item.pressure.toFixed(2)}</td><td>${item.temperature.toFixed(2)}</td></tr>`);
    });
    printWindow.document.write('</tbody></table></body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="data-table">
      <div className="table-header">
        <h2>📊 Equipment Data</h2>
        <div className="table-actions">
          <button className="action-btn print-btn" onClick={printTable} title="Print Table">
            🖨️ Print
          </button>
          <button className="action-btn csv-btn" onClick={exportToCSV} title="Export to CSV">
            📄 CSV
          </button>
          <button className="action-btn excel-btn" onClick={exportToExcel} title="Export to Excel">
            📊 Excel
          </button>
        </div>
      </div>

      <div className="table-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-box">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            {equipmentTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : type}
              </option>
            ))}
          </select>
        </div>
        <div className="result-count">
          Showing {filteredData.length} of {dataset.equipment_items.length} items
        </div>
      </div>

      <div className="table-wrapper">
        <table className="equipment-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">
                Equipment Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('equipment_type')} className="sortable">
                Type {sortConfig.key === 'equipment_type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('flowrate')} className="sortable">
                Flowrate {sortConfig.key === 'flowrate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('pressure')} className="sortable">
                Pressure {sortConfig.key === 'pressure' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('temperature')} className="sortable">
                Temperature {sortConfig.key === 'temperature' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td><span className="badge">{item.equipment_type}</span></td>
                <td className="num">{item.flowrate.toFixed(2)}</td>
                <td className="num">{item.pressure.toFixed(2)}</td>
                <td className="num">{item.temperature.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
