import React, { useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import '../styles/Charts.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

function Charts({ dataset }) {
  const flowrateChartRef = useRef(null);
  const pressureChartRef = useRef(null);
  const temperatureChartRef = useRef(null);
  const typeChartRef = useRef(null);
  const comparisonChartRef = useRef(null);

  if (!dataset || !dataset.equipment_items || dataset.equipment_items.length === 0) {
    return <div className="charts"><p>No data available for charts</p></div>;
  }

  // Download individual chart as PNG
  const downloadChart = (chartRef, filename) => {
    if (chartRef && chartRef.current) {
      const url = chartRef.current.toBase64Image();
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = url;
      link.click();
    }
  };

  // Download all charts as a single image
  const downloadAllCharts = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const charts = [
      { ref: flowrateChartRef, title: 'Flowrate Chart' },
      { ref: pressureChartRef, title: 'Pressure Chart' },
      { ref: temperatureChartRef, title: 'Temperature Chart' },
      { ref: typeChartRef, title: 'Type Distribution' },
      { ref: comparisonChartRef, title: 'All Parameters' }
    ];

    // Calculate canvas size
    const chartWidth = 800;
    const chartHeight = 500;
    const cols = 2;
    const rows = Math.ceil(charts.length / cols);
    canvas.width = chartWidth * cols;
    canvas.height = chartHeight * rows;

    // Draw white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each chart
    let index = 0;
    for (const chart of charts) {
      if (chart.ref.current) {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * chartWidth;
        const y = row * chartHeight;
        
        const img = new Image();
        img.src = chart.ref.current.toBase64Image();
        await new Promise((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, x, y, chartWidth, chartHeight);
            resolve();
          };
        });
        index++;
      }
    }

    // Download
    const link = document.createElement('a');
    link.download = `${dataset.filename.replace('.csv', '')}_all_charts.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Download data as CSV
  const downloadCSV = () => {
    const headers = ['Equipment Name', 'Type', 'Flowrate', 'Pressure', 'Temperature'];
    const rows = dataset.equipment_items.map(item => [
      item.name,
      item.equipment_type,
      item.flowrate,
      item.pressure,
      item.temperature
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${dataset.filename.replace('.csv', '')}_export.csv`;
    link.click();
  };

  // Download summary report as text file
  const downloadReport = () => {
    const flowrates = dataset.equipment_items.map(item => item.flowrate);
    const pressures = dataset.equipment_items.map(item => item.pressure);
    const temperatures = dataset.equipment_items.map(item => item.temperature);

    const report = `
CHEMICAL EQUIPMENT PARAMETER ANALYSIS REPORT
============================================

Dataset: ${dataset.filename}
Upload Date: ${new Date(dataset.upload_date).toLocaleString()}
Total Equipment Count: ${dataset.equipment_count}

STATISTICS SUMMARY
------------------

Flowrate:
  - Average: ${dataset.avg_flowrate?.toFixed(2)}
  - Minimum: ${Math.min(...flowrates).toFixed(2)}
  - Maximum: ${Math.max(...flowrates).toFixed(2)}

Pressure:
  - Average: ${dataset.avg_pressure?.toFixed(2)}
  - Minimum: ${Math.min(...pressures).toFixed(2)}
  - Maximum: ${Math.max(...pressures).toFixed(2)}

Temperature:
  - Average: ${dataset.avg_temperature?.toFixed(2)}
  - Minimum: ${Math.min(...temperatures).toFixed(2)}
  - Maximum: ${Math.max(...temperatures).toFixed(2)}

EQUIPMENT TYPE DISTRIBUTION
----------------------------
${Object.entries(dataset.type_distribution || {}).map(([type, count]) => 
  `${type}: ${count} (${(count / dataset.equipment_count * 100).toFixed(1)}%)`
).join('\n')}

EQUIPMENT DETAILS
-----------------
${dataset.equipment_items.map((item, idx) => `
${idx + 1}. ${item.name}
   Type: ${item.equipment_type}
   Flowrate: ${item.flowrate}
   Pressure: ${item.pressure}
   Temperature: ${item.temperature}
`).join('\n')}

Report generated on: ${new Date().toLocaleString()}
`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${dataset.filename.replace('.csv', '')}_report.txt`;
    link.click();
  };

  // Prepare data for charts
  const equipmentNames = dataset.equipment_items.map(item => item.name);
  const flowrates = dataset.equipment_items.map(item => item.flowrate);
  const pressures = dataset.equipment_items.map(item => item.pressure);
  const temperatures = dataset.equipment_items.map(item => item.temperature);

  const flowrateChart = {
    labels: equipmentNames,
    datasets: [
      {
        label: 'Flowrate',
        data: flowrates,
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const pressureChart = {
    labels: equipmentNames,
    datasets: [
      {
        label: 'Pressure',
        data: pressures,
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  const temperatureChart = {
    labels: equipmentNames,
    datasets: [
      {
        label: 'Temperature',
        data: temperatures,
        borderColor: 'rgba(255, 193, 7, 1)',
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        tension: 0.1,
        fill: true,
      },
    ],
  };

  // Type distribution pie chart
  const typeData = {
    labels: Object.keys(dataset.type_distribution || {}),
    datasets: [
      {
        data: Object.values(dataset.type_distribution || {}),
        backgroundColor: [
          'rgba(102, 126, 234, 0.8)',
          'rgba(118, 75, 162, 0.8)',
          'rgba(237, 100, 166, 0.8)',
          'rgba(255, 154, 158, 0.8)',
          'rgba(250, 208, 196, 0.8)',
          'rgba(212, 163, 115, 0.8)',
        ],
        borderColor: 'white',
        borderWidth: 2,
      },
    ],
  };

  // Multi-parameter comparison
  const comparisonData = {
    labels: equipmentNames,
    datasets: [
      {
        label: 'Flowrate',
        data: flowrates,
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
      {
        label: 'Pressure',
        data: pressures,
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
      {
        label: 'Temperature',
        data: temperatures,
        backgroundColor: 'rgba(255, 206, 86, 0.7)',
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.8,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          padding: 12,
          font: {
            size: 12,
            weight: '600'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          title: function(context) {
            return 'Equipment: ' + context[0].label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 11,
            weight: '500'
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 14,
            weight: 'bold'
          },
          color: '#764ba2',
          maxRotation: 45,
          minRotation: 45,
          autoSkip: false,
          padding: 10
        }
      }
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.8,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          padding: 8,
          font: {
            size: 10
          }
        }
      },
    },
  };

  return (
    <div className="charts">
      <div className="charts-header">
        <h2>📊 Data Visualization</h2>
        <div className="download-buttons">
          <button className="download-btn" onClick={downloadCSV} title="Download data as CSV">
            📥 CSV
          </button>
          <button className="download-btn" onClick={downloadReport} title="Download summary report">
            📄 Report
          </button>
          <button className="download-btn" onClick={downloadAllCharts} title="Download all charts">
            🖼️ All Charts
          </button>
        </div>
      </div>
      
      <div className="charts-grid">
        <div className="chart-container">
          <div className="chart-header">
            <h3>Flowrate by Equipment</h3>
            <button 
              className="download-chart-btn" 
              onClick={() => downloadChart(flowrateChartRef, 'flowrate_chart')}
              title="Download this chart"
            >
              ⬇️
            </button>
          </div>
          <Bar ref={flowrateChartRef} data={flowrateChart} options={options} />
        </div>
        <div className="chart-container">
          <div className="chart-header">
            <h3>Pressure by Equipment</h3>
            <button 
              className="download-chart-btn" 
              onClick={() => downloadChart(pressureChartRef, 'pressure_chart')}
              title="Download this chart"
            >
              ⬇️
            </button>
          </div>
          <Bar ref={pressureChartRef} data={pressureChart} options={options} />
        </div>
        <div className="chart-container">
          <div className="chart-header">
            <h3>Temperature Trend</h3>
            <button 
              className="download-chart-btn" 
              onClick={() => downloadChart(temperatureChartRef, 'temperature_chart')}
              title="Download this chart"
            >
              ⬇️
            </button>
          </div>
          <Line ref={temperatureChartRef} data={temperatureChart} options={options} />
        </div>
        <div className="chart-container">
          <div className="chart-header">
            <h3>Equipment Type Distribution</h3>
            <button 
              className="download-chart-btn" 
              onClick={() => downloadChart(typeChartRef, 'type_distribution_chart')}
              title="Download this chart"
            >
              ⬇️
            </button>
          </div>
          <Pie ref={typeChartRef} data={typeData} options={pieOptions} />
        </div>
        <div className="chart-container chart-wide">
          <div className="chart-header">
            <h3>All Parameters Comparison</h3>
            <button 
              className="download-chart-btn" 
              onClick={() => downloadChart(comparisonChartRef, 'comparison_chart')}
              title="Download this chart"
            >
              ⬇️
            </button>
          </div>
          <Bar ref={comparisonChartRef} data={comparisonData} options={options} />
        </div>
      </div>
    </div>
  );
}

export default Charts;
