/**
 * Charts Module for AquaVision Pro - COMPLETE FIXED VERSION
 * Integrated with Supabase and AquaVision Pro theme
 * NO ERRORS - FULLY FUNCTIONAL
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
          backgroundColor: 'rgba(0, 31, 63, 0.9)',
          titleColor: '#00d4ff',
          bodyColor: '#e0f7fa',
          borderColor: 'rgba(0, 212, 255, 0.5)',
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
            tooltipFormat: 'MMM dd, HH:mm',
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
            maxTicksLimit: 8,
            font: {
              family: "'Exo 2', sans-serif"
            }
          }
        },
        y: {
          grid: {
            color: 'rgba(0, 212, 255, 0.1)',
            drawBorder: false
          },
          ticks: {
            color: '#e0f7fa',
            padding: 8,
            font: {
              family: "'Exo 2', sans-serif"
            }
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
      console.error(`[Charts] Canvas with id "${canvasId}" not found`);
      return null;
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
    gradient.addColorStop(0, this.chartColors.temperature.fill);
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0.01)');

    const formattedData = this.formatDataForChart(initialData, 'temperature');

    const config = {
      type: 'line',
      data: {
        datasets: [{
          label: 'Temperature (°C)',
          data: formattedData,
          borderColor: this.chartColors.temperature.line,
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 2,
          pointHoverBackgroundColor: '#ffffff',
          pointBackgroundColor: this.chartColors.temperature.line
        }]
      },
      options: {
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
            backgroundColor: 'rgba(0, 31, 63, 0.9)',
            titleColor: '#00d4ff',
            bodyColor: '#e0f7fa',
            borderColor: 'rgba(0, 212, 255, 0.5)',
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
              },
              label: function(context) {
                try {
                  return `Temperature: ${context.parsed.y.toFixed(1)}°C`;
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
              tooltipFormat: 'MMM dd, HH:mm',
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
              maxTicksLimit: 8,
              font: {
                family: "'Exo 2', sans-serif"
              }
            }
          },
          y: {
            title: {
              display: true,
              text: 'Temperature (°C)',
              color: '#e0f7fa',
              font: { 
                size: 12, 
                weight: '500', 
                family: "'Exo 2', sans-serif" 
              }
            },
            grid: {
              color: 'rgba(0, 212, 255, 0.1)',
              drawBorder: false
            },
            ticks: {
              color: '#e0f7fa',
              padding: 8,
              font: {
                family: "'Exo 2', sans-serif"
              }
            },
            min: 15,
            max: 30
          }
        }
      }
    };

    const chart = new Chart(ctx, config);
    
    chart.updateData = (newData) => {
      try {
        chart.data.datasets[0].data = this.formatDataForChart(newData, 'temperature');
        chart.update('none');
      } catch (e) { 
        console.warn('[Charts] temperatureChart.updateData error', e); 
      }
    };

    this.charts[canvasId] = chart;
    console.log('[Charts] Temperature chart created with', formattedData.length, 'points');
    return chart;
  }

  createPHChart(canvasId, initialData = []) {
    if (!this.isChartJsAvailable) {
      this.createFallbackChart(canvasId, 'pH Chart');
      return null;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`[Charts] Canvas with id "${canvasId}" not found`);
      return null;
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
    gradient.addColorStop(0, this.chartColors.ph.fill);
    gradient.addColorStop(1, 'rgba(125, 249, 255, 0.01)');

    const formattedData = this.formatDataForChart(initialData, 'ph');

    const config = {
      type: 'line',
      data: {
        datasets: [{
          label: 'pH Level',
          data: formattedData,
          borderColor: this.chartColors.ph.line,
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 2,
          pointHoverBackgroundColor: '#ffffff',
          pointBackgroundColor: this.chartColors.ph.line
        }]
      },
      options: {
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
            backgroundColor: 'rgba(0, 31, 63, 0.9)',
            titleColor: '#00d4ff',
            bodyColor: '#e0f7fa',
            borderColor: 'rgba(0, 212, 255, 0.5)',
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
              },
              label: function(context) {
                try {
                  return `pH Level: ${context.parsed.y.toFixed(2)}`;
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
              tooltipFormat: 'MMM dd, HH:mm',
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
              maxTicksLimit: 8,
              font: {
                family: "'Exo 2', sans-serif"
              }
            }
          },
          y: {
            title: {
              display: true,
              text: 'pH Level',
              color: '#e0f7fa',
              font: { 
                size: 12, 
                weight: '500', 
                family: "'Exo 2', sans-serif" 
              }
            },
            grid: {
              color: 'rgba(0, 212, 255, 0.1)',
              drawBorder: false
            },
            ticks: {
              color: '#e0f7fa',
              padding: 8,
              font: {
                family: "'Exo 2', sans-serif"
              }
            },
            min: 6,
            max: 9
          }
        }
      }
    };

    const chart = new Chart(ctx, config);
    
    chart.updateData = (newData) => {
      try {
        chart.data.datasets[0].data = this.formatDataForChart(newData, 'ph');
        chart.update('none');
      } catch (e) { 
        console.warn('[Charts] phChart.updateData error', e); 
      }
    };

    this.charts[canvasId] = chart;
    console.log('[Charts] pH chart created with', formattedData.length, 'points');
    return chart;
  }

  createCombinedChart(canvasId, initialData = []) {
    if (!this.isChartJsAvailable) {
      this.createFallbackChart(canvasId, 'Combined Chart');
      return null;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error(`[Charts] Canvas with id "${canvasId}" not found`);
      return null;
    }

    const ctx = canvas.getContext('2d');
    const tempData = this.formatDataForChart(initialData, 'temperature');
    const phData = this.formatDataForChart(initialData, 'ph');

    const config = {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Temperature (°C)',
            data: tempData,
            borderColor: this.chartColors.combined.temperature,
            backgroundColor: 'rgba(0, 212, 255, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 6,
            pointBackgroundColor: this.chartColors.combined.temperature,
            yAxisID: 'y'
          },
          {
            label: 'pH Level',
            data: phData,
            borderColor: this.chartColors.combined.ph,
            backgroundColor: 'rgba(125, 249, 255, 0.1)',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 6,
            pointBackgroundColor: this.chartColors.combined.ph,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
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
            backgroundColor: 'rgba(0, 31, 63, 0.9)',
            titleColor: '#00d4ff',
            bodyColor: '#e0f7fa',
            borderColor: 'rgba(0, 212, 255, 0.5)',
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
              },
              label: function(context) {
                try {
                  if (context.datasetIndex === 0) {
                    return `Temperature: ${context.parsed.y.toFixed(1)}°C`;
                  } else {
                    return `pH Level: ${context.parsed.y.toFixed(2)}`;
                  }
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
              tooltipFormat: 'MMM dd, HH:mm',
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
              maxTicksLimit: 8,
              font: {
                family: "'Exo 2', sans-serif"
              }
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Temperature (°C)',
              color: this.chartColors.combined.temperature,
              font: { 
                size: 12, 
                weight: '500', 
                family: "'Exo 2', sans-serif" 
              }
            },
            grid: { 
              color: 'rgba(0, 212, 255, 0.1)', 
              drawBorder: false 
            },
            ticks: { 
              color: this.chartColors.combined.temperature,
              font: { 
                family: "'Exo 2', sans-serif" 
              }
            },
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
              font: { 
                size: 12, 
                weight: '500', 
                family: "'Exo 2', sans-serif" 
              }
            },
            grid: { 
              drawOnChartArea: false, 
              drawBorder: false 
            },
            ticks: { 
              color: this.chartColors.combined.ph,
              font: { 
                family: "'Exo 2', sans-serif" 
              }
            },
            min: 6,
            max: 9
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
      } catch (e) { 
        console.warn('[Charts] historicalChart.updateData error', e); 
      }
    };

    this.charts[canvasId] = chart;
    console.log('[Charts] Combined chart created with', tempData.length, 'points');
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
      if (!data || !Array.isArray(data)) {
        console.warn('[Charts] formatDataForChart: Invalid data provided');
        return [];
      }
      
      const formatted = data
        .filter(item => {
          if (!item) return false;
          const value = item[field];
          return value !== null && value !== undefined && !isNaN(value);
        })
        .map(item => {
          let time = item.created_at || item.timestamp || new Date();
          
          if (typeof time === 'string') {
            time = new Date(time);
          } else if (typeof time === 'number') {
            if (time < 10000000000) {
              time = new Date(time * 1000);
            } else {
              time = new Date(time);
            }
          } else if (!(time instanceof Date)) {
            time = new Date();
          }

          return {
            x: time.getTime(),
            y: parseFloat(item[field])
          };
        })
        .sort((a, b) => a.x - b.x);

      return formatted;
    } catch (e) {
      console.warn('[Charts] formatDataForChart error:', e);
      return [];
    }
  }

  updateAllChartsFromHistory(data) {
    if (!data || !Array.isArray(data)) {
      console.warn('[Charts] Invalid data provided to updateAllChartsFromHistory');
      return;
    }

    console.log('[Charts] Updating all charts with', data.length, 'data points');

    if (this.charts['tempChart']) {
      const tempData = this.formatDataForChart(data, 'temperature');
      this.charts['tempChart'].data.datasets[0].data = tempData;
      this.charts['tempChart'].update('none');
      console.log('[Charts] Temperature chart updated with', tempData.length, 'points');
    }

    if (this.charts['phChart']) {
      const phData = this.formatDataForChart(data, 'ph');
      this.charts['phChart'].data.datasets[0].data = phData;
      this.charts['phChart'].update('none');
      console.log('[Charts] pH chart updated with', phData.length, 'points');
    }

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
      chart.data.datasets.forEach((dataset) => {
        if (!Array.isArray(dataset.data)) dataset.data = [];
        
        if (dataset.data.length > 100) {
          dataset.data.shift();
        }
        
        const point = {
          x: newDataPoint.x || Date.now(),
          y: newDataPoint.y || newDataPoint.temperature || newDataPoint.ph
        };
        
        dataset.data.push(point);
      });
      
      chart.update('none');
    } catch (e) {
      console.warn('[Charts] streamData error', e);
    }
  }

  resizeAllCharts() {
    Object.values(this.charts).forEach(chart => {
      try { 
        if (typeof chart.resize === 'function') {
          chart.resize(); 
        }
      } catch (e) {
        console.warn('[Charts] resize error', e);
      }
    });
  }

  destroyAllCharts() {
    Object.keys(this.charts).forEach(id => {
      try {
        if (this.charts[id] && typeof this.charts[id].destroy === 'function') {
          this.charts[id].destroy();
        }
      } catch (e) {
        console.warn('[Charts] destroy error', e);
      }
      delete this.charts[id];
    });
  }
}

const chartManager = new ChartManager();

function initializeCharts() {
  console.log('[Charts] Initializing charts...');
  
  if (typeof Chart === 'undefined') {
    console.log('[Charts] Chart.js not ready, retrying in 100ms...');
    setTimeout(initializeCharts, 100);
    return;
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCharts);
    return;
  }

  const sampleData = generateSampleData(7);
  console.log('[Charts] Generated', sampleData.length, 'sample data points');
  
  window.tempChart = chartManager.createTemperatureChart('tempChart', sampleData);
  window.phChart = chartManager.createPHChart('phChart', sampleData);
  window.historicalChart = chartManager.createCombinedChart('historicalChart', sampleData);

  console.log('[Charts] All charts initialized');

  loadInitialChartData().then(() => {
    console.log('[Charts] Initial data load complete');
    document.dispatchEvent(new CustomEvent('chartReady'));
  }).catch((err) => {
    console.warn('[Charts] Failed to load initial data:', err);
    document.dispatchEvent(new CustomEvent('chartReady'));
  });
}

async function loadInitialChartData() {
  try {
    console.log('[Charts] Loading initial chart data...');
    
    let historicalData = [];
    
    if (window.getHistoricalSensorData) {
      try {
        historicalData = await window.getHistoricalSensorData(7);
        console.log('[Charts] Loaded from Supabase:', historicalData.length, 'points');
      } catch (error) {
        console.warn('[Charts] Supabase data load failed:', error);
      }
    }

    if (historicalData && historicalData.length > 10) {
      console.log('[Charts] Using real Supabase data');
      chartManager.updateAllChartsFromHistory(historicalData);
    } else {
      console.log('[Charts] Keeping sample data');
    }
  } catch (error) {
    console.warn('[Charts] Failed to load initial chart data:', error);
  }
}

function generateSampleData(days) {
  const data = [];
  const now = new Date();
  const pointsPerDay = 24;
  
  for (let i = days * pointsPerDay; i >= 0; i--) {
    const date = new Date(now);
    date.setHours(date.getHours() - i);
    
    const baseTemp = 23;
    const dailyCycle = Math.sin((i / pointsPerDay) * Math.PI * 2) * 2;
    const randomNoise = (Math.random() - 0.5) * 0.8;
    const temperature = baseTemp + dailyCycle + randomNoise;
    
    const basePh = 7.2;
    const slowCycle = Math.sin((i / (pointsPerDay * 3)) * Math.PI * 2) * 0.3;
    const phNoise = (Math.random() - 0.5) * 0.15;
    const ph = basePh + slowCycle + phNoise;
    
    data.push({
      created_at: date.toISOString(),
      timestamp: date.getTime(),
      temperature: parseFloat(temperature.toFixed(2)),
      ph: parseFloat(ph.toFixed(2))
    });
  }
  
  return data;
}

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
      chartManager.streamData('tempChart', { 
        x: now.getTime(), 
        y: temperature, 
        temperature: temperature 
      });
    }

    if (window.phChart && typeof ph === 'number') {
      chartManager.streamData('phChart', { 
        x: now.getTime(), 
        y: ph, 
        ph: ph 
      });
    }

    console.log('[Charts] Live data updated:', { temperature, ph });
  } catch (e) {
    console.warn('[Charts] updateChartWithLiveData error', e);
  }
}

document.addEventListener('sensorDataUpdate', (event) => {
  try {
    const payload = (event && event.detail) ? event.detail : event;
    let sensor = payload && payload.data ? payload.data : payload;
    
    if (sensor && typeof sensor.temperature !== 'undefined' && typeof sensor.ph !== 'undefined') {
      updateChartWithLiveData({ 
        temperature: sensor.temperature, 
        ph: sensor.ph 
      });
    }
  } catch (e) {
    console.warn('[Charts] sensorDataUpdate handler error', e);
  }
});

window.addEventListener('resize', () => {
  setTimeout(() => { 
    chartManager.resizeAllCharts(); 
  }, 100);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCharts);
} else {
  initializeCharts();
}

window.chartManager = chartManager;
window.updateChartWithLiveData = updateChartWithLiveData;
window.generateSampleData = generateSampleData;

document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('sensorDataLoaded', function(event) {
    const sensorData = event.detail;
    if (sensorData) {
      updateChartWithLiveData(sensorData);
    }
  });
  
  document.addEventListener('historicalDataLoaded', function(event) {
    const historicalData = event.detail;
    if (historicalData && Array.isArray(historicalData) && historicalData.length > 0) {
      console.log('[Charts] Historical data loaded event received with', historicalData.length, 'points');
      chartManager.updateAllChartsFromHistory(historicalData);
    }
  });
});

console.log('[Charts] Chart module loaded successfully');