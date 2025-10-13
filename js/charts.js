/**
 * Charts Module for AquaVision Pro - FIXED VERSION
 * Integrated with Supabase and AquaVision Pro theme
 */

class ChartManager {
  constructor() {
    this.charts = {};
    this.chartColors = {
      temperature: {
        line: '#00d4ff',
        fill: 'rgba(0, 212, 255, 0.1)',
        gradient: ['#00d4ff', '#0099cc']
      },
      ph: {
        line: '#7df9ff',
        fill: 'rgba(125, 249, 255, 0.1)',
        gradient: ['#7df9ff', '#00d4ff']
      },
      combined: {
        temperature: '#00d4ff',
        ph: '#7df9ff',
        grid: 'rgba(0, 212, 255, 0.1)',
        text: '#e0f7fa'
      }
    };

    this.chartOptions = this.getDefaultChartOptions();
    this.isChartJsAvailable = this.checkChartJs();
  }

  checkChartJs() {
    if (typeof Chart === 'undefined') {
      console.error('[Charts] Chart.js not found! Please include Chart.js in your HTML');
      return false;
    }
    console.log('[Charts] Chart.js detected, version:', Chart.version || 'unknown');
    return true;
  }

  getDefaultChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            color: '#e0f7fa',
            font: {
              size: 12,
              weight: '500',
              family: "'Exo 2', sans-serif"
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 31, 63, 0.8)',
          titleColor: '#e0f7fa',
          bodyColor: '#e0f7fa',
          borderColor: 'rgba(0, 212, 255, 0.3)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          displayColors: true,
          callbacks: {
            title: function(tooltipItems) {
              if (!tooltipItems || tooltipItems.length === 0) return '';
              try {
                const date = new Date(tooltipItems[0].parsed.x);
                return date.toLocaleString();
              } catch (e) {
                return '';
              }
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            tooltipFormat: 'Pp',
            displayFormats: {
              minute: 'HH:mm',
              hour: 'HH:mm',
              day: 'MMM dd'
            }
          },
          grid: {
            color: 'rgba(0, 212, 255, 0.1)',
            drawBorder: false
          },
          ticks: {
            color: '#e0f7fa',
            maxTicksLimit: 8
          }
        },
        y: {
          grid: {
            color: 'rgba(0, 212, 255, 0.1)',
            drawBorder: false
          },
          ticks: {
            color: '#e0f7fa',
            padding: 8
          }
        }
      }
    };
  }

  createTemperatureChart(canvasId, initialData = []) {
    if (!this.isChartJsAvailable) {
      this.createFallbackChart(canvasId, 'Temperature Chart');
      return null;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`Canvas with id "${canvasId}" not found`);
      return null;
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
    gradient.addColorStop(0, this.chartColors.temperature.fill);
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0.01)');

    const config = {
      type: 'line',
      data: {
        datasets: [{
          label: 'Temperature (°C)',
          data: this.formatDataForChart(initialData, 'temperature'),
          borderColor: this.chartColors.temperature.line,
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 2,
          pointHoverBackgroundColor: '#ffffff'
        }]
      },
      options: {
        ...this.chartOptions,
        scales: {
          ...this.chartOptions.scales,
          y: {
            ...this.chartOptions.scales.y,
            title: {
              display: true,
              text: 'Temperature (°C)',
              color: '#e0f7fa',
              font: { size: 12, weight: '500', family: "'Exo 2', sans-serif" }
            },
            min: 15,
            max: 30
          }
        },
        plugins: {
          ...this.chartOptions.plugins,
          tooltip: {
            ...this.chartOptions.plugins.tooltip,
            callbacks: {
              ...this.chartOptions.plugins.tooltip.callbacks,
              label: function(context) {
                try {
                  return `Temperature: ${context.parsed.y.toFixed(1)}°C`;
                } catch (e) { return ''; }
              }
            }
          }
        }
      }
    };

    const chart = new Chart(ctx, config);
    chart.updateData = (newData) => {
      try {
        chart.data.datasets[0].data = this.formatDataForChart(newData, 'temperature');
        chart.update('none');
      } catch (e) { console.warn('temperatureChart.updateData error', e); }
    };

    this.charts[canvasId] = chart;
    console.log('[Charts] Temperature chart created successfully');
    return chart;
  }

  createPHChart(canvasId, initialData = []) {
    if (!this.isChartJsAvailable) {
      this.createFallbackChart(canvasId, 'pH Chart');
      return null;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`Canvas with id "${canvasId}" not found`);
      return null;
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
    gradient.addColorStop(0, this.chartColors.ph.fill);
    gradient.addColorStop(1, 'rgba(125, 249, 255, 0.01)');

    const config = {
      type: 'line',
      data: {
        datasets: [{
          label: 'pH Level',
          data: this.formatDataForChart(initialData, 'ph'),
          borderColor: this.chartColors.ph.line,
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 2,
          pointHoverBackgroundColor: '#ffffff'
        }]
      },
      options: {
        ...this.chartOptions,
        scales: {
          ...this.chartOptions.scales,
          y: {
            ...this.chartOptions.scales.y,
            title: {
              display: true,
              text: 'pH Level',
              color: '#e0f7fa',
              font: { size: 12, weight: '500', family: "'Exo 2', sans-serif" }
            },
            min: 6,
            max: 9
          }
        },
        plugins: {
          ...this.chartOptions.plugins,
          tooltip: {
            ...this.chartOptions.plugins.tooltip,
            callbacks: {
              ...this.chartOptions.plugins.tooltip.callbacks,
              label: function(context) {
                try {
                  return `pH Level: ${context.parsed.y.toFixed(2)}`;
                } catch (e) { return ''; }
              }
            }
          }
        }
      }
    };

    const chart = new Chart(ctx, config);
    chart.updateData = (newData) => {
      try {
        chart.data.datasets[0].data = this.formatDataForChart(newData, 'ph');
        chart.update('none');
      } catch (e) { console.warn('phChart.updateData error', e); }
    };

    this.charts[canvasId] = chart;
    console.log('[Charts] pH chart created successfully');
    return chart;
  }

  createCombinedChart(canvasId, initialData = []) {
    if (!this.isChartJsAvailable) {
      this.createFallbackChart(canvasId, 'Combined Chart');
      return null;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`Canvas with id "${canvasId}" not found`);
      return null;
    }

    const ctx = canvas.getContext('2d');

    const config = {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Temperature (°C)',
            data: this.formatDataForChart(initialData, 'temperature'),
            borderColor: this.chartColors.combined.temperature,
            backgroundColor: 'rgba(0, 212, 255, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 1,
            pointHoverRadius: 6,
            yAxisID: 'y'
          },
          {
            label: 'pH Level',
            data: this.formatDataForChart(initialData, 'ph'),
            borderColor: this.chartColors.combined.ph,
            backgroundColor: 'rgba(125, 249, 255, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 1,
            pointHoverRadius: 6,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        ...this.chartOptions,
        scales: {
          x: { ...this.chartOptions.scales.x },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Temperature (°C)',
              color: this.chartColors.combined.temperature,
              font: { size: 12, weight: '500', family: "'Exo 2', sans-serif" }
            },
            grid: { color: 'rgba(0, 212, 255, 0.1)', drawBorder: false },
            ticks: { color: this.chartColors.combined.temperature },
            min: 15,
            max: 30
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'pH Level',
              color: this.chartColors.combined.ph,
              font: { size: 12, weight: '500', family: "'Exo 2', sans-serif" }
            },
            grid: { drawOnChartArea: false, drawBorder: false },
            ticks: { color: this.chartColors.combined.ph },
            min: 6,
            max: 9
          }
        },
        plugins: {
          ...this.chartOptions.plugins,
          tooltip: {
            ...this.chartOptions.plugins.tooltip,
            callbacks: {
              ...this.chartOptions.plugins.tooltip.callbacks,
              label: function(context) {
                try {
                  if (context.datasetIndex === 0) {
                    return `Temperature: ${context.parsed.y.toFixed(1)}°C`;
                  } else {
                    return `pH Level: ${context.parsed.y.toFixed(2)}`;
                  }
                } catch (e) { return ''; }
              }
            }
          }
        }
      }
    };

    const chart = new Chart(ctx, config);
    chart.updateData = (newData) => {
      try {
        chart.data.datasets[0].data = this.formatDataForChart(newData, 'temperature');
        chart.data.datasets[1].data = this.formatDataForChart(newData, 'ph');
        chart.update('none');
      } catch (e) { console.warn('historicalChart.updateData error', e); }
    };

    this.charts[canvasId] = chart;
    console.log('[Charts] Combined chart created successfully');
    return chart;
  }

  createFallbackChart(canvasId, chartName) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#001f3f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#e0f7fa';
    ctx.font = '16px "Exo 2", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Chart.js Not Available', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillText(`(${chartName})`, canvas.width / 2, canvas.height / 2 + 15);
  }

  formatDataForChart(data, field) {
    try {
      if (!data || !Array.isArray(data)) return [];
      
      return data
        .filter(item => item && item[field] !== null && item[field] !== undefined)
        .map(item => {
          // Handle different timestamp formats
          let time = item.created_at || item.timestamp || new Date();
          
          // Convert to Date object if it's not already
          if (typeof time === 'string') {
            time = new Date(time);
          } else if (typeof time === 'number') {
            // If it's a timestamp in seconds, convert to milliseconds
            if (time < 10000000000) {
              time = new Date(time * 1000);
            } else {
              time = new Date(time);
            }
          } else if (!(time instanceof Date)) {
            time = new Date();
          }

          return {
            x: time,
            y: parseFloat(item[field])
          };
        })
        .sort((a, b) => a.x - b.x);
    } catch (e) {
      console.warn('formatDataForChart error', e);
      return [];
    }
  }

  updateAllChartsFromHistory(data) {
    if (!data || !Array.isArray(data)) {
      console.warn('[Charts] Invalid data provided to updateAllChartsFromHistory');
      return;
    }

    console.log('[Charts] Updating all charts with', data.length, 'data points');

    // Temperature chart
    if (this.charts['tempChart']) {
      const tempData = this.formatDataForChart(data, 'temperature');
      this.charts['tempChart'].data.datasets[0].data = tempData;
      this.charts['tempChart'].update('none');
      console.log('[Charts] Temperature chart updated with', tempData.length, 'points');
    }

    // pH chart
    if (this.charts['phChart']) {
      const phData = this.formatDataForChart(data, 'ph');
      this.charts['phChart'].data.datasets[0].data = phData;
      this.charts['phChart'].update('none');
      console.log('[Charts] pH chart updated with', phData.length, 'points');
    }

    // Historical combined chart
    if (this.charts['historicalChart']) {
      const tempData = this.formatDataForChart(data, 'temperature');
      const phData = this.formatDataForChart(data, 'ph');
      this.charts['historicalChart'].data.datasets[0].data = tempData;
      this.charts['historicalChart'].data.datasets[1].data = phData;
      this.charts['historicalChart'].update('none');
      console.log('[Charts] Historical chart updated');
    }
  }

  streamData(canvasId, newDataPoint) {
    const chart = this.charts[canvasId];
    if (!chart) return;
    
    try {
      chart.data.datasets.forEach(dataset => {
        if (!Array.isArray(dataset.data)) dataset.data = [];
        if (dataset.data.length > 100) dataset.data.shift();
        dataset.data.push(newDataPoint);
      });
      chart.update('none');
    } catch (e) {
      console.warn('streamData error', e);
    }
  }

  resizeAllCharts() {
    Object.values(this.charts).forEach(chart => {
      try { 
        if (typeof chart.resize === 'function') chart.resize(); 
      } catch (e) {}
    });
  }

  destroyAllCharts() {
    Object.keys(this.charts).forEach(id => {
      try {
        this.charts[id].destroy();
      } catch (e) {}
      delete this.charts[id];
    });
  }
}

// Initialize chart manager
const chartManager = new ChartManager();

// Chart initialization function
function initializeCharts() {
  console.log('[Charts] Initializing charts...');
  
  // Wait for Chart.js to load
  if (typeof Chart === 'undefined') {
    console.log('[Charts] Chart.js not ready, retrying...');
    setTimeout(initializeCharts, 100);
    return;
  }
  
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCharts);
    return;
  }

  // Initialize dashboard charts with sample data
  const sampleData = generateSampleData(7);
  
  window.tempChart = chartManager.createTemperatureChart('tempChart', sampleData);
  window.phChart = chartManager.createPHChart('phChart', sampleData);
  window.historicalChart = chartManager.createCombinedChart('historicalChart', sampleData);

  console.log('[Charts] Charts initialized with sample data');

  // Load real data if available
  loadInitialChartData().then(() => {
    console.log('[Charts] Initial data loaded');
    document.dispatchEvent(new CustomEvent('chartReady'));
  }).catch((err) => {
    console.warn('[Charts] Failed to load initial data, keeping sample data:', err);
    document.dispatchEvent(new CustomEvent('chartReady'));
  });

  // Add resize shim for compatibility
  ['tempChart', 'phChart', 'historicalChart'].forEach(id => {
    const c = window[id];
    if (c && typeof c.resize !== 'function') {
      c.resize = function() {
        try {
          if (c && typeof c.update === 'function') c.update();
        } catch (e) {}
      };
    }
  });
}

async function loadInitialChartData() {
  try {
    console.log('[Charts] Loading initial chart data...');
    
    let historicalData = [];
    
    // Try to get data from Supabase if available
    if (window.getHistoricalSensorData) {
      try {
        historicalData = await window.getHistoricalSensorData(7);
        console.log('[Charts] Loaded from Supabase:', historicalData.length, 'points');
      } catch (error) {
        console.warn('[Charts] Supabase data load failed:', error);
      }
    }

    // If we got real data, use it
    if (historicalData && historicalData.length > 0) {
      chartManager.updateAllChartsFromHistory(historicalData);
    }
  } catch (error) {
    console.warn('Failed to load initial chart data:', error);
  }
}

// Generate sample data for testing
function generateSampleData(days) {
  const data = [];
  const now = new Date();
  
  for (let i = days * 24; i >= 0; i--) {
    const date = new Date(now);
    date.setHours(date.getHours() - i);
    
    // Generate realistic temperature data (20-26°C)
    const baseTemp = 23;
    const tempVariation = Math.sin(i / 12) * 2 + (Math.random() - 0.5) * 0.5;
    const temperature = baseTemp + tempVariation;
    
    // Generate realistic pH data (6.8-7.6)
    const basePh = 7.2;
    const phVariation = Math.sin(i / 18) * 0.3 + (Math.random() - 0.5) * 0.1;
    const ph = basePh + phVariation;
    
    data.push({
      created_at: date.toISOString(),
      timestamp: date.getTime(),
      temperature: parseFloat(temperature.toFixed(1)),
      ph: parseFloat(ph.toFixed(2))
    });
  }
  
  console.log('[Charts] Generated', data.length, 'sample data points');
  return data;
}

// Chart utility functions
function updateChartWithLiveData(sensorData) {
  try {
    const payload = (sensorData && sensorData.data) ? sensorData.data : sensorData;
    let sensor = payload;
    if (payload && typeof payload.temperature !== 'undefined' && typeof payload.ph !== 'undefined') {
      sensor = payload;
    }

    if (!sensor) return;

    const now = new Date();
    const temperature = (typeof sensor.temperature === 'number') ? sensor.temperature : null;
    const ph = (typeof sensor.ph === 'number') ? sensor.ph : null;

    if (window.tempChart && typeof temperature === 'number') {
      chartManager.streamData('tempChart', { x: now, y: temperature });
    }

    if (window.phChart && typeof ph === 'number') {
      chartManager.streamData('phChart', { x: now, y: ph });
    }

    console.log('[Charts] Live data updated:', { temperature, ph });
  } catch (e) {
    console.warn('updateChartWithLiveData error', e);
  }
}

// Real-time data event listener
document.addEventListener('sensorDataUpdate', (event) => {
  try {
    const payload = (event && event.detail) ? event.detail : event;
    let sensor = payload && payload.data ? payload.data : payload;
    if (sensor && typeof sensor.temperature !== 'undefined' && typeof sensor.ph !== 'undefined') {
      updateChartWithLiveData({ temperature: sensor.temperature, ph: sensor.ph });
    }
  } catch (e) {
    console.warn('sensorDataUpdate handler error', e);
  }
});

// Resize throttling
window.addEventListener('resize', () => {
  setTimeout(() => { chartManager.resizeAllCharts(); }, 100);
});

// Initialize charts when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCharts);
} else {
  initializeCharts();
}

// Export for global access
window.chartManager = chartManager;
window.updateChartWithLiveData = updateChartWithLiveData;
window.generateSampleData = generateSampleData;

// Integration with dashboard.js
document.addEventListener('DOMContentLoaded', function() {
  // Update charts when new sensor data is loaded
  document.addEventListener('sensorDataLoaded', function(event) {
    const sensorData = event.detail;
    if (sensorData) {
      updateChartWithLiveData(sensorData);
    }
  });
  
  // Update charts when historical data is loaded
  document.addEventListener('historicalDataLoaded', function() {
    console.log('[Charts] Historical data loaded event received');
  });
});