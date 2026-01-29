import React from 'react';
import '../styles/Summary.css';

function Summary({ dataset }) {
  const formatNumber = (value) => {
    if (value === null || value === undefined) return 'N/A';
    const num = parseFloat(value);
    return isNaN(num) ? 'N/A' : num.toFixed(2);
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '40px'
  };

  const cardStyle = {
    background: '#ffffff',
    padding: '25px 20px',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e8e8e8',
    display: 'flex',
    flexDirection: 'column'
  };

  const titleStyle = {
    fontSize: '1.1rem',
    margin: '0 0 15px 0',
    color: '#333',
    fontWeight: '700',
    paddingBottom: '12px',
    borderBottom: '2px solid #667eea'
  };

  const rowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0'
  };

  const lastRowStyle = {
    ...rowStyle,
    borderBottom: 'none'
  };

  const labelStyle = {
    color: '#666',
    fontSize: '0.9rem',
    fontWeight: '500'
  };

  const valueStyle = {
    color: '#333',
    fontSize: '1rem',
    fontWeight: '700'
  };

  return (
    <div className="summary">
      <h2>Statistics Summary</h2>
      <div style={gridStyle}>
        <div style={cardStyle}>
          <h3 style={titleStyle}>Flowrate</h3>
          <div style={rowStyle}>
            <span style={labelStyle}>Average:</span>
            <span style={valueStyle}>{formatNumber(dataset.avg_flowrate)}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Min:</span>
            <span style={valueStyle}>{formatNumber(dataset.min_flowrate)}</span>
          </div>
          <div style={lastRowStyle}>
            <span style={labelStyle}>Max:</span>
            <span style={valueStyle}>{formatNumber(dataset.max_flowrate)}</span>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={titleStyle}>Pressure</h3>
          <div style={rowStyle}>
            <span style={labelStyle}>Average:</span>
            <span style={valueStyle}>{formatNumber(dataset.avg_pressure)}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Min:</span>
            <span style={valueStyle}>{formatNumber(dataset.min_pressure)}</span>
          </div>
          <div style={lastRowStyle}>
            <span style={labelStyle}>Max:</span>
            <span style={valueStyle}>{formatNumber(dataset.max_pressure)}</span>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={titleStyle}>Temperature</h3>
          <div style={rowStyle}>
            <span style={labelStyle}>Average:</span>
            <span style={valueStyle}>{formatNumber(dataset.avg_temperature)}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Min:</span>
            <span style={valueStyle}>{formatNumber(dataset.min_temperature)}</span>
          </div>
          <div style={lastRowStyle}>
            <span style={labelStyle}>Max:</span>
            <span style={valueStyle}>{formatNumber(dataset.max_temperature)}</span>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={titleStyle}>Total Equipment</h3>
          <div style={rowStyle}>
            <span style={labelStyle}>Count:</span>
            <span style={valueStyle}>{dataset.equipment_count || 0}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Types:</span>
            <span style={valueStyle}>{Object.keys(dataset.type_distribution || {}).length}</span>
          </div>
          <div style={lastRowStyle}>
            <span style={labelStyle}>Dataset:</span>
            <span style={{...valueStyle, fontSize: '0.85rem'}}>{dataset.filename?.split('.')[0] || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="type-distribution">
        <h3>Equipment Type Distribution</h3>
        <div className="type-list">
          {Object.entries(dataset.type_distribution || {}).map(([type, count]) => (
            <div key={type} className="type-item">
              <span className="type-name">{type}</span>
              <span className="type-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Summary;
