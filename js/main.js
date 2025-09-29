/**
 * AquaVision Pro - Main Application Logic
 * Fixed version with better mock data handling and navigation
 */

class AquaVisionApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.isConnected = false;
        this.connectionCheckInterval = null;
        this.dataUpdateInterval = null;
        this.alertSystem = new AlertSystem();
        this.settings = new SettingsManager();
        
        // Default thresholds
        this.thresholds = {
            temperature: { min: 18, max: 24, alertMin: 16, alertMax: 26 },
            ph: { min: 6.5, max: 8.5, alertMin: 6.0, alertMax: 9.0 }
        };
        
        // Data storage
        this.currentData = {
            temperature: null,
            ph: null,
            timestamp: null,
            valid: false
        };
        
        this.historicalData = [];
        this.systemStats = {
            uptime: 0,
            dataPoints: 0,
            lastUpdate: null
        };
        
        // Mock data support
        this.useMockData = false;
        this.mockInterval = null;
        this.mockBaseTemp = 21; // Base temperature for mock data
        this.mockBasePH = 7.2;   // Base pH for mock data
        
        this.init();
    }
    
    init() {
        console.log('[App] Initializing AquaVision Pro...');
        
        // Check if URL has a hash and switch to that section
        const hash = window.location.hash.substring(1);
        if (hash) {
            // Use a timeout to ensure the DOM is fully ready
            setTimeout(() => {
                this.switchSection(hash);
            }, 100);
        }
        
        this.setupEventListeners();
        this.setupChartActions(); // Add this line
        this.loadSettings();
        this.initializeDashboard();
        
        // Start with mock data by default (MCU offline scenario)
        this.startMockFeed();
        
        // Start connection monitoring
        this.startConnectionMonitoring();
        this.startDataUpdates();
        
        // Hide loading overlay after short delay
        this.hideLoadingOverlay();
        
        console.log('[App] AquaVision Pro initialized successfully');
    }

    setupChartActions() {
        // Setup download buttons
        document.querySelectorAll('.action-btn[title="Export Chart"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartCard = e.target.closest('.chart-card');
                const canvas = chartCard.querySelector('canvas');
                if (canvas) {
                    this.exportChart(canvas);
                }
            });
        });

        // Setup fullscreen buttons
        document.querySelectorAll('.action-btn[title="Fullscreen"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartCard = e.target.closest('.chart-card');
                this.toggleFullscreen(chartCard);
            });
        });
    }

    exportChart(canvas) {
        try {
            // Create download link
            const link = document.createElement('a');
            link.download = `chart_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.alertSystem.addAlert('success', 'Chart exported successfully');
        } catch (error) {
            this.alertSystem.addAlert('error', 'Failed to export chart: ' + error.message);
        }
    }

    toggleFullscreen(element) {
        try {
            if (!document.fullscreenElement) {
                element.requestFullscreen().then(() => {
                    element.classList.add('fullscreen-mode');
                    this.alertSystem.addAlert('info', 'Press ESC to exit fullscreen');
                }).catch(err => {
                    this.alertSystem.addAlert('error', 'Fullscreen not supported');
                });
            } else {
                document.exitFullscreen().then(() => {
                    element.classList.remove('fullscreen-mode');
                });
            }
        } catch (error) {
            this.alertSystem.addAlert('error', 'Fullscreen failed: ' + error.message);
        }
    }
    
    setupEventListeners() {
        // Navigation event listeners
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.switchSection(section);
            });
        });
        
        // Chart time range controls
        document.querySelectorAll('.btn-chart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const range = btn.getAttribute('data-range');
                this.updateChartRange(range, btn);
            });
        });
        
        // Settings form handlers
        document.getElementById('startDate')?.addEventListener('change', () => {
            this.updateHistoricalChart();
        });
        
        document.getElementById('endDate')?.addEventListener('change', () => {
            this.updateHistoricalChart();
        });
        
        // Window events
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // Real-time sensor data
        document.addEventListener('sensorDataUpdate', (evt) => {
            this.onRealTimeSensorUpdate(evt);
        });

        console.log('[App] Event listeners set up');
    }
    
    switchSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;
            
            // Update navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
            if (activeNav) activeNav.classList.add('active');
            
            // Handle section-specific initialization
            this.handleSectionSwitch(sectionName);
        }
    }
    
    handleSectionSwitch(section) {
        switch (section) {
            case 'dashboard':
                this.refreshDashboard();
                break;
            case 'analytics':
                this.loadAnalyticsData();
                break;
            case 'settings':
                this.loadCurrentSettings();
                break;
            case 'alerts':
                this.refreshAlertHistory();
                break;
            case 'farm-management':
                // Initialize farm management section if needed
                console.log('[App] Switched to farm management section');
                break;
        }
        console.log('[App] Switched to section:', section);
    }
    
    startConnectionMonitoring() {
        this.connectionCheckInterval = setInterval(() => {
            this.checkConnection();
        }, 10000); // Check every 10 seconds (reduced frequency)
        
        // Initial connection check
        this.checkConnection();
    }
    
    async checkConnection() {
        try {
            const response = await API.getSystemStatus();
            if (response && response.system_status) {
                this.updateConnectionStatus(true, response);
            } else {
                this.updateConnectionStatus(false);
            }
        } catch (error) {
            // Fail silently - this is expected when NodeMCU is offline
            this.updateConnectionStatus(false);
        }
    }
    
    updateConnectionStatus(connected, statusData = null) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;
        
        const indicator = statusElement.querySelector('.status-indicator');
        const text = statusElement.querySelector('span') || statusElement.querySelector('.status-text');
        
        if (connected && statusData && !this.useMockData) {
            // Real hardware connection
            if (indicator) indicator.className = 'status-indicator online';
            if (text) text.textContent = 'Connected (Live Data)';
            this.isConnected = true;
            
            if (statusData.uptime) {
                this.systemStats.uptime = Math.floor(statusData.uptime / 1000 / 60 / 60);
            }
        } else if (this.useMockData) {
            // Mock data mode
            if (indicator) indicator.className = 'status-indicator offline';
            if (text) text.textContent = 'Connected (Mock Data)';
            this.isConnected = false;
        } else {
            // Truly offline
            if (indicator) indicator.className = 'status-indicator offline';
            if (text) text.textContent = 'Offline';
            this.isConnected = false;
        }
        
        this.updateSystemStatusCard();
    }
    
    startDataUpdates() {
        this.dataUpdateInterval = setInterval(() => {
            if (this.isConnected && !this.useMockData) {
                this.fetchCurrentData();
            }
        }, 3000); // Update every 3 seconds
        
        // Try initial data fetch
        this.fetchCurrentData();
    }
    
    async fetchCurrentData() {
        try {
            const data = await API.getCurrentData();
            if (data && data.valid) {
                // Real data received, stop mock feed
                if (this.useMockData) {
                    console.log('[App] Real data received, stopping mock feed');
                    this.stopMockFeed();
                }
                
                this.currentData = {
                    temperature: parseFloat(data.temperature),
                    ph: parseFloat(data.ph),
                    timestamp: data.timestamp,
                    valid: data.valid
                };
                
                this.updateDashboardValues();
                this.checkThresholds();
                this.updateCharts();
                this.systemStats.dataPoints++;
                this.systemStats.lastUpdate = new Date();
            }
        } catch (error) {
            // Expected when NodeMCU is offline - mock data will continue
            this.currentData.valid = false;
        }
    }
    
    updateDashboardValues() {
        // Update temperature
        const tempElement = document.getElementById('currentTemp');
        if (tempElement && this.currentData.temperature !== null) {
            tempElement.textContent = `${this.currentData.temperature.toFixed(1)}°C`;
        }
        
        // Update pH
        const phElement = document.getElementById('currentPH');
        if (phElement && this.currentData.ph !== null) {
            phElement.textContent = this.currentData.ph.toFixed(2);
        }
        
        // Update health score
        this.updateHealthScore();
        
        // Update trends
        this.updateTrends();
    }

    updateHeaderStats(data) {
        const liveReadingsElement = document.getElementById('liveReadings');
        const dataPointsElement = document.getElementById('dataPoints');

        if (liveReadingsElement) {
            let readingCount = 0;
            if (data.temperature !== null) readingCount++;
            if (data.ph !== null) readingCount++;
            liveReadingsElement.textContent = readingCount.toString();
        }

        if (dataPointsElement) {
            dataPointsElement.textContent = (this.historicalData.length || 0).toString();
        }
    }

    calculateHealthScore(temperature, ph) {
        let score = 0;
        let factors = 0;

        // Temperature scoring
        if (temperature !== null && temperature !== undefined) {
            factors++;
            if (temperature >= 18 && temperature <= 24) {
                score += 50; // Perfect range
            } else if (temperature >= 16 && temperature <= 26) {
                score += 35; // Acceptable range
            } else if (temperature >= 14 && temperature <= 28) {
                score += 20; // Marginal range
            } else {
                score += 0; // Dangerous range
            }
        }

        // pH scoring
        if (ph !== null && ph !== undefined) {
            factors++;
            if (ph >= 6.5 && ph <= 8.0) {
                score += 50; // Perfect range
            } else if (ph >= 6.0 && ph <= 8.5) {
                score += 35; // Acceptable range  
            } else if (ph >= 5.5 && ph <= 9.0) {
                score += 20; // Marginal range
            } else {
                score += 0; // Dangerous range
            }
        }

        return factors > 0 ? Math.round(score / factors) : 0;
    }

    updateHealthScore() {
        const temp = this.currentData.temperature;
        const ph = this.currentData.ph;
        
        // Calculate proper health score
        const healthScore = this.calculateHealthScore(temp, ph);
        
        // Update health score display
        const healthElement = document.getElementById('healthScore');
        if (healthElement) {
            healthElement.textContent = `${healthScore}%`;
        }
        
        // FIXED: Correct health status determination
        let healthStatus = 'Critical';
        let healthClass = 'negative';
        
        if (healthScore >= 85) {
            healthStatus = 'Excellent';
            healthClass = 'positive';
        } else if (healthScore >= 70) {
            healthStatus = 'Good'; 
            healthClass = 'positive';
        } else if (healthScore >= 50) {
            healthStatus = 'Fair';
            healthClass = 'neutral';
        } else if (healthScore >= 30) {
            healthStatus = 'Poor';
            healthClass = 'negative';
        } else {
            healthStatus = 'Critical';
            healthClass = 'negative';
        }
        
        // Update health status display
        const healthCard = document.querySelector('.health-card');
        if (healthCard) {
            const statusElement = healthCard.querySelector('.stat-trend');
            const statusSpan = statusElement?.querySelector('span');
            if (statusElement && statusSpan) {
                statusSpan.textContent = healthStatus;
                statusElement.className = `stat-trend ${healthClass}`;
            }
        }
    }
    
    updateTrends() {
        if (this.historicalData.length < 2) return;
        
        const recent = this.historicalData.slice(-5);
        
        if (recent.length >= 2) {
            const tempTrend = recent[recent.length - 1].temperature - recent[0].temperature;
            this.updateTrendDisplay('tempTrend', tempTrend, '°C');
            
            const phTrend = recent[recent.length - 1].ph - recent[0].ph;
            this.updateTrendDisplay('phTrend', phTrend, '');
        }
    }
    
    updateTrendDisplay(elementId, trend, unit) {
        const trendElement = document.getElementById(elementId);
        if (!trendElement) return;
        
        const icon = trendElement.querySelector('i');
        const span = trendElement.querySelector('span');
        if (!icon || !span) return;
        
        if (Math.abs(trend) < 0.1) {
            icon.className = 'fas fa-minus';
            span.textContent = `Stable`;
            trendElement.className = 'stat-trend';
        } else if (trend > 0) {
            icon.className = 'fas fa-arrow-up';
            span.textContent = `+${trend.toFixed(1)}${unit}`;
            trendElement.className = 'stat-trend positive';
        } else {
            icon.className = 'fas fa-arrow-down';
            span.textContent = `${trend.toFixed(1)}${unit}`;
            trendElement.className = 'stat-trend negative';
        }
    }
    
    updateSystemStatusCard() {
        const uptimeElement = document.getElementById('systemUptime');
        if (uptimeElement) {
            uptimeElement.textContent = `${this.systemStats.uptime}h`;
        }
        
        const statusElement = document.getElementById('systemStatus');
        if (statusElement) {
            const icon = statusElement.querySelector('i');
            const span = statusElement.querySelector('span');
            
            if (this.isConnected) {
                if (icon) {
                    icon.className = 'fas fa-circle';
                    icon.style.color = '#10b981'; // Green color for online
                }
                if (span) {
                    span.textContent = 'Online';
                    span.style.color = '#10b981';
                    span.style.fontWeight = 'bold';
                }
                if (statusElement.parentElement) {
                    statusElement.parentElement.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                    statusElement.parentElement.style.border = '1px solid rgba(16, 185, 129, 0.3)';
                }
                statusElement.className = 'stat-trend positive';
            } else {
                if (icon) {
                    icon.className = 'fas fa-exclamation-triangle';
                    icon.style.color = this.useMockData ? '#f59e0b' : '#ef4444'; // Orange for mock, red for offline
                }
                if (span) {
                    span.textContent = this.useMockData ? 'Mock Data' : 'Offline';
                    span.style.color = this.useMockData ? '#f59e0b' : '#ef4444';
                    span.style.fontWeight = 'bold';
                }
                if (statusElement.parentElement) {
                    const color = this.useMockData ? '#f59e0b' : '#ef4444';
                    statusElement.parentElement.style.backgroundColor = `rgba(${this.useMockData ? '245, 158, 11' : '239, 68, 68'}, 0.1)`;
                    statusElement.parentElement.style.border = `1px solid rgba(${this.useMockData ? '245, 158, 11' : '239, 68, 68'}, 0.3)`;
                }
                statusElement.className = this.useMockData ? 'stat-trend warning' : 'stat-trend negative';
            }
        }

        // Update data points display
        const dataPointsElement = document.getElementById('dataPoints');
        if (dataPointsElement) {
            dataPointsElement.textContent = this.systemStats.dataPoints.toString();
            dataPointsElement.style.fontWeight = 'bold';
            dataPointsElement.style.color = '#3b82f6'; // Blue color
        }

        // Update last update timestamp
        const lastUpdateElement = document.getElementById('lastUpdate');
        if (lastUpdateElement && this.systemStats.lastUpdate) {
            lastUpdateElement.textContent = this.systemStats.lastUpdate.toLocaleTimeString();
            lastUpdateElement.style.color = '#6b7280'; // Gray color
        } else if (lastUpdateElement) {
            lastUpdateElement.textContent = 'Never';
            lastUpdateElement.style.color = '#ef4444'; // Red color
        }
    }
    
    checkThresholds() {
        if (!this.currentData.valid) return;
        
        // Temperature threshold checks
        if (this.currentData.temperature !== null) {
            const temp = this.currentData.temperature;
            if (temp < this.thresholds.temperature.alertMin) {
                this.alertSystem.addAlert('error', `Temperature too low: ${temp.toFixed(1)}°C`);
            } else if (temp > this.thresholds.temperature.alertMax) {
                this.alertSystem.addAlert('error', `Temperature too high: ${temp.toFixed(1)}°C`);
            } else if (temp < this.thresholds.temperature.min || temp > this.thresholds.temperature.max) {
                this.alertSystem.addAlert('warning', `Temperature outside optimal range: ${temp.toFixed(1)}°C`);
            }
        }
        
        // pH threshold checks
        if (this.currentData.ph !== null) {
            const ph = this.currentData.ph;
            if (ph < this.thresholds.ph.alertMin) {
                this.alertSystem.addAlert('error', `pH too low: ${ph.toFixed(2)}`);
            } else if (ph > this.thresholds.ph.alertMax) {
                this.alertSystem.addAlert('error', `pH too high: ${ph.toFixed(2)}`);
            } else if (ph < this.thresholds.ph.min || ph > this.thresholds.ph.max) {
                this.alertSystem.addAlert('warning', `pH outside optimal range: ${ph.toFixed(2)}`);
            }
        }
    }
    
    updateCharts() {
        // Add current data to historical data
        if (this.currentData.valid) {
            this.historicalData.push({
                timestamp: new Date(),
                temperature: this.currentData.temperature,
                ph: this.currentData.ph
            });
            
            // Keep only last 500 data points
            if (this.historicalData.length > 500) {
                this.historicalData.shift();
            }
        }
        
        // Update charts if chartManager is available
        if (window.chartManager && this.historicalData.length > 0) {
            window.chartManager.updateAllChartsFromHistory(this.historicalData);
        }
        
        // Update chart info displays
        this.updateChartInfo();
    }
    
    updateChartInfo() {
        // Update temperature chart info
        this.updateTemperatureChartInfo();
        
        // Update pH chart info
        this.updatePHChartInfo();
        
        console.log('[App] Chart info updated');
    }

    updateTemperatureChartInfo() {
        const last24h = this.historicalData.filter(d => 
            Date.now() - d.timestamp.getTime() < 24 * 60 * 60 * 1000
        );

        const temps = last24h.map(d => d.temperature).filter(t => t !== null && t !== undefined);
        
        // Update temperature chart info based on your HTML structure
        const currentElement = document.getElementById('currentTempChart');
        const avgElement = document.getElementById('avgTempChart'); 
        const rangeElement = document.getElementById('rangeTempChart');
        
        if (temps.length > 0) {
            // Current temperature
            if (currentElement && this.currentData.temperature !== null) {
                currentElement.textContent = `${this.currentData.temperature.toFixed(1)}°C`;
            }

            // Average 24h temperature
            const avgTemp = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
            if (avgElement) {
                avgElement.textContent = `${avgTemp.toFixed(1)}°C`;
            }

            // Temperature range
            const minTemp = Math.min(...temps);
            const maxTemp = Math.max(...temps);
            if (rangeElement) {
                rangeElement.textContent = `${minTemp.toFixed(1)}-${maxTemp.toFixed(1)}°C`;
            }
        } else {
            // Fallback to current data if no historical data
            if (this.currentData.temperature !== null) {
                const temp = this.currentData.temperature;
                if (currentElement) currentElement.textContent = `${temp.toFixed(1)}°C`;
                if (avgElement) avgElement.textContent = `${temp.toFixed(1)}°C`;
                if (rangeElement) rangeElement.textContent = `${temp.toFixed(1)}°C`;
            } else {
                // Show "--" when no data is available
                if (currentElement) currentElement.textContent = '--°C';
                if (avgElement) avgElement.textContent = '--°C';
                if (rangeElement) rangeElement.textContent = '--°C';
            }
        }
    }

    updatePHChartInfo() {
        const last24h = this.historicalData.filter(d => 
            Date.now() - d.timestamp.getTime() < 24 * 60 * 60 * 1000
        );

        const phValues = last24h.map(d => d.ph).filter(p => p !== null && p !== undefined);
        
        // Update pH chart info based on your HTML structure
        const currentElement = document.getElementById('currentPHChart');
        const avgElement = document.getElementById('avgPHChart');
        const stabilityElement = document.getElementById('stabilityPHChart');
        
        if (phValues.length > 0) {
            // Current pH
            if (currentElement && this.currentData.ph !== null) {
                currentElement.textContent = this.currentData.ph.toFixed(2);
            }

            // Average 24h pH
            const avgPH = phValues.reduce((sum, ph) => sum + ph, 0) / phValues.length;
            if (avgElement) {
                avgElement.textContent = avgPH.toFixed(2);
            }

            // pH stability (inverse of variance as percentage)
            const phVariance = this.calculateVariance(phValues);
            const stability = Math.max(0, Math.round(100 - (phVariance * 50))); // Scale variance to percentage
            if (stabilityElement) {
                stabilityElement.textContent = `${stability}%`;
            }
        } else {
            // Fallback to current data if no historical data
            if (this.currentData.ph !== null) {
                const ph = this.currentData.ph;
                if (currentElement) currentElement.textContent = ph.toFixed(2);
                if (avgElement) avgElement.textContent = ph.toFixed(2);
                if (stabilityElement) stabilityElement.textContent = '100%'; // Perfect stability for single reading
            } else {
                // Show "--" when no data is available
                if (currentElement) currentElement.textContent = '--';
                if (avgElement) avgElement.textContent = '--';
                if (stabilityElement) stabilityElement.textContent = '--%';
            }
        }
    }
    
    updateChartRange(range, buttonElement) {
        // Update active button
        if (buttonElement && buttonElement.parentElement) {
            buttonElement.parentElement.querySelectorAll('.btn-chart').forEach(btn => {
                btn.classList.remove('active');
            });
            buttonElement.classList.add('active');
        }
        
        // Filter data based on range
        let dataPoints;
        switch (range) {
            case '1h':
                dataPoints = this.historicalData.slice(-60);
                break;
            case '6h':
                dataPoints = this.historicalData.slice(-360);
                break;
            case '24h':
                dataPoints = this.historicalData.slice(-1440);
                break;
            default:
                dataPoints = this.historicalData.slice(-60);
        }
        
        // Update charts with filtered data
        if (window.chartManager && dataPoints.length > 0) {
            window.chartManager.updateAllChartsFromHistory(dataPoints);
        }
    }
    
    refreshDashboard() {
        this.updateDashboardValues();
        this.updateSystemStatusCard();
        this.updateAlertPanel();
        this.updateHeaderStats(this.currentData);
        this.updateChartInfo(); // Make sure chart info is updated
    }
    
    updateAlertPanel() {
        const alertList = document.getElementById('alertList');
        const alertCount = document.getElementById('alertCount');
        
        const alerts = this.alertSystem.getRecentAlerts(5);
        
        if (alerts.length === 0) {
            if (alertList) {
                alertList.innerHTML = `
                    <div class="no-alerts">
                        <i class="fas fa-check-circle"></i>
                        <span>All systems operating normally</span>
                    </div>
                `;
            }
            if (alertCount) {
                alertCount.textContent = '0';
                alertCount.style.backgroundColor = 'var(--success-green, #10b981)';
            }
        } else {
            if (alertList) {
                alertList.innerHTML = alerts.map(alert => `
                    <div class="alert-item ${alert.type}">
                        <div class="alert-time">${alert.timestamp.toLocaleTimeString()}</div>
                        <div class="alert-message">${alert.message}</div>
                    </div>
                `).join('');
            }
            
            if (alertCount) {
                alertCount.textContent = alerts.length.toString();
                const criticalAlerts = alerts.filter(a => a.type === 'error').length;
                alertCount.style.backgroundColor = criticalAlerts > 0 ? 
                    'var(--error-red, #ef4444)' : 'var(--warning-orange, #f59e0b)';
            }
        }
    }
    
    loadAnalyticsData() {
        if (this.historicalData.length === 0) return;
        
        const last24h = this.historicalData.filter(d => 
            Date.now() - d.timestamp.getTime() < 24 * 60 * 60 * 1000
        );
        
        if (last24h.length > 0) {
            // Temperature analytics
            const temps = last24h.map(d => d.temperature).filter(t => t !== null);
            if (temps.length > 0) {
                const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
                const minTemp = Math.min(...temps);
                const maxTemp = Math.max(...temps);
                const tempVariance = this.calculateVariance(temps);
                const tempStability = Math.max(0, 100 - (tempVariance * 10));
                
                this.updateAnalyticsDisplay('avgTemp', `${avgTemp.toFixed(1)}°C`);
                this.updateAnalyticsDisplay('minMaxTemp', `${minTemp.toFixed(1)}/${maxTemp.toFixed(1)}°C`);
                this.updateAnalyticsDisplay('tempStability', `${tempStability.toFixed(0)}%`);
            }
            
            // pH analytics
            const phValues = last24h.map(d => d.ph).filter(p => p !== null);
            if (phValues.length > 0) {
                const avgPH = phValues.reduce((a, b) => a + b, 0) / phValues.length;
                const minPH = Math.min(...phValues);
                const maxPH = Math.max(...phValues);
                const phVariance = this.calculateVariance(phValues);
                const phStability = Math.max(0, 100 - (phVariance * 20));
                
                this.updateAnalyticsDisplay('avgPH', avgPH.toFixed(2));
                this.updateAnalyticsDisplay('minMaxPH', `${minPH.toFixed(2)}/${maxPH.toFixed(2)}`);
                this.updateAnalyticsDisplay('phStability', `${phStability.toFixed(0)}%`);
            }
        }
    }
    
    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }
    
    updateAnalyticsDisplay(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
    
    loadCurrentSettings() {
        const elements = {
            tempMin: this.thresholds.temperature.min,
            tempMax: this.thresholds.temperature.max,
            tempAlertMin: this.thresholds.temperature.alertMin,
            tempAlertMax: this.thresholds.temperature.alertMax,
            phMin: this.thresholds.ph.min,
            phMax: this.thresholds.ph.max,
            phAlertMin: this.thresholds.ph.alertMin,
            phAlertMax: this.thresholds.ph.alertMax
        };
        
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = elements[id];
        });
    }
    
    refreshAlertHistory() {
        const alertHistory = document.getElementById('alertHistory');
        if (!alertHistory) return;
        
        const allAlerts = this.alertSystem.getAllAlerts();
        
        if (allAlerts.length === 0) {
            alertHistory.innerHTML = `
                <div class="no-alerts">
                    <i class="fas fa-info-circle"></i>
                    <span>No alerts in history</span>
                </div>
            `;
        } else {
            alertHistory.innerHTML = allAlerts.map(alert => `
                <div class="alert-item ${alert.type}">
                    <div class="alert-time">${alert.timestamp.toLocaleString()}</div>
                    <div class="alert-message">${alert.message}</div>
                </div>
            `).join('');
        }
    }
    
    updateHistoricalChart() {
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        
        if (!startDate || !endDate) return;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const filteredData = this.historicalData.filter(d => 
            d.timestamp >= start && d.timestamp <= end
        );
        
        if (window.chartManager) {
            window.chartManager.updateAllChartsFromHistory(filteredData);
        }
    }
    
    handleKeyboardShortcuts(e) {
        if (e.altKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.switchSection('dashboard');
                    break;
                case '2':
                    e.preventDefault();
                    this.switchSection('analytics');
                    break;
                case '3':
                    e.preventDefault();
                    this.switchSection('settings');
                    break;
                case '4':
                    e.preventDefault();
                    this.switchSection('alerts');
                    break;
            }
        }
    }
    
    handleResize() {
        setTimeout(() => {
            if (window.temperatureChart?.resize) window.temperatureChart.resize();
            if (window.phChart?.resize) window.phChart.resize();
            if (window.historicalChart?.resize) window.historicalChart.resize();
        }, 100);
    }
    
    initializeDashboard() {
        // Set default date range for historical chart
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput) startDateInput.value = weekAgo.toISOString().split('T')[0];
        if (endDateInput) endDateInput.value = today.toISOString().split('T')[0];
        
        this.updateAlertPanel();
    }
    
    hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 2000); // Show loading for 2 seconds
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('aquavision_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                if (settings.thresholds) {
                    this.thresholds = { ...this.thresholds, ...settings.thresholds };
                }
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }
    
    saveSettings() {
        const settings = {
            thresholds: this.thresholds,
            version: '1.0.0',
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem('aquavision_settings', JSON.stringify(settings));
            this.alertSystem.addAlert('success', 'Settings saved successfully');
        } catch (error) {
            this.alertSystem.addAlert('error', 'Failed to save settings');
        }
    }
    
    cleanup() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
        }
        
        if (this.dataUpdateInterval) {
            clearInterval(this.dataUpdateInterval);
        }

        this.stopMockFeed();
    }

    // Mock data system (improved)
    startMockFeed() {
        if (this.mockInterval) return;
        
        console.log('[App] Starting mock data feed');
        this.useMockData = true;
        
        // Generate some initial historical data
        this.generateInitialMockHistory();

        this.mockInterval = setInterval(() => {
            const now = new Date();
            const temp = this.generateMockTemperature();
            const ph = this.generateMockPH();

            // Update current data
            this.currentData = {
                temperature: temp,
                ph: ph,
                timestamp: now,
                valid: true
            };

            // Add to history
            this.historicalData.push({
                timestamp: now,
                temperature: temp,
                ph: ph
            });

            // Keep reasonable history size
            if (this.historicalData.length > 500) {
                this.historicalData.shift();
            }

            // Update UI
            this.updateDashboardValues();
            this.checkThresholds();
            this.updateChartInfo(); // Update chart statistics
            
            // Update charts
            if (window.chartManager && this.historicalData.length > 0) {
                window.chartManager.updateAllChartsFromHistory(this.historicalData);
            }
            
            this.systemStats.dataPoints++;
            this.systemStats.lastUpdate = now;

        }, 2000); // Update every 2 seconds
    }

    generateInitialMockHistory() {
        // Generate 50 historical data points for better initial charts
        const now = Date.now();
        for (let i = 50; i > 0; i--) {
            const timestamp = new Date(now - (i * 60000)); // 1 minute intervals
            const temp = 20 + Math.sin(i * 0.1) * 2 + (Math.random() - 0.5) * 1;
            const ph = 7.2 + Math.cos(i * 0.08) * 0.2 + (Math.random() - 0.5) * 0.1;
            
            this.historicalData.push({
                timestamp: timestamp,
                temperature: parseFloat(temp.toFixed(2)),
                ph: parseFloat(ph.toFixed(2))
            });
        }
        
        // Set initial current data based on last historical point
        if (this.historicalData.length > 0) {
            const lastPoint = this.historicalData[this.historicalData.length - 1];
            this.currentData = {
                temperature: lastPoint.temperature,
                ph: lastPoint.ph,
                timestamp: new Date(),
                valid: true
            };
        }
        
        console.log('[App] Generated', this.historicalData.length, 'initial mock data points');
        
        // Update chart info immediately after generating data
        setTimeout(() => {
            this.updateChartInfo();
            this.refreshDashboard();
        }, 100);
    }

    stopMockFeed() {
        if (this.mockInterval) {
            console.log('[App] Stopping mock data feed');
            clearInterval(this.mockInterval);
            this.mockInterval = null;
        }
        this.useMockData = false;
    }

    generateMockTemperature() {
        // Generate temperature with some variation but keep it realistic
        const time = Date.now() / 100000; // Slow oscillation
        const base = this.mockBaseTemp;
        const variation = Math.sin(time) * 2 + (Math.random() - 0.5) * 1;
        let temp = base + variation;
        
        // Keep within reasonable bounds
        temp = Math.max(15, Math.min(30, temp));
        this.mockBaseTemp = temp; // Update base for next iteration
        
        return parseFloat(temp.toFixed(2));
    }

    generateMockPH() {
        // Generate pH with some variation but keep it realistic
        const time = Date.now() / 150000; // Slow oscillation
        const base = this.mockBasePH;
        const variation = Math.cos(time) * 0.3 + (Math.random() - 0.5) * 0.2;
        let ph = base + variation;
        
        // Keep within reasonable bounds
        ph = Math.max(6.0, Math.min(9.0, ph));
        this.mockBasePH = ph; // Update base for next iteration
        
        return parseFloat(ph.toFixed(2));
    }

    // Real-time sensor update handler
    onRealTimeSensorUpdate(event) {
        // When real data arrives, stop mock feed
        if (this.useMockData) {
            console.log('[App] Real sensor data received, stopping mock feed');
            this.stopMockFeed();
        }
        
        // Process the real sensor data
        try {
            const payload = event.detail;
            if (payload && typeof payload.temperature !== 'undefined' && typeof payload.ph !== 'undefined') {
                this.currentData = {
                    temperature: parseFloat(payload.temperature),
                    ph: parseFloat(payload.ph),
                    timestamp: new Date(),
                    valid: true
                };
                
                this.updateDashboardValues();
                this.checkThresholds();
                this.updateCharts();
            }
        } catch (e) {
            console.warn('[App] Error processing real sensor data:', e);
        }
    }
}

// Alert System Class
class AlertSystem {
    constructor() {
        this.alerts = [];
        this.maxAlerts = 100;
    }
    
    addAlert(type, message) {
        const alert = {
            id: Date.now(),
            type: type, // 'success', 'warning', 'error', 'info'
            message: message,
            timestamp: new Date()
        };
        
        this.alerts.unshift(alert);
        
        // Remove old alerts
        if (this.alerts.length > this.maxAlerts) {
            this.alerts = this.alerts.slice(0, this.maxAlerts);
        }
        
        console.log(`[Alert ${type.toUpperCase()}] ${message}`);
    }
    
    getRecentAlerts(count = 10) {
        return this.alerts.slice(0, count);
    }
    
    getAllAlerts() {
        return [...this.alerts];
    }
    
    clearAlerts() {
        this.alerts = [];
    }
}

// Settings Manager Class
class SettingsManager {
    constructor() {
        this.defaultSettings = {
            thresholds: {
                temperature: { min: 18, max: 24, alertMin: 16, alertMax: 26 },
                ph: { min: 6.5, max: 8.5, alertMin: 6.0, alertMax: 9.0 }
            },
            notifications: {
                temperature: true,
                ph: true,
                connection: true
            },
            dataCollection: {
                rate: 5, // seconds
                retention: 168 // hours (1 week)
            }
        };
    }
    
    load() {
        try {
            const saved = localStorage.getItem('aquavision_settings');
            return saved ? JSON.parse(saved) : this.defaultSettings;
        } catch {
            return this.defaultSettings;
        }
    }
    
    save(settings) {
        try {
            localStorage.setItem('aquavision_settings', JSON.stringify(settings));
            return true;
        } catch {
            return false;
        }
    }
    
    reset() {
        localStorage.removeItem('aquavision_settings');
        return this.defaultSettings;
    }
}

// Global Functions for Settings Panel
window.saveSettings = function() {
    const app = window.aquaVisionApp;
    if (!app) return;
    
    // Update thresholds from form
    const getValue = (id, defaultVal) => {
        const el = document.getElementById(id);
        return el ? parseFloat(el.value) || defaultVal : defaultVal;
    };
    
    app.thresholds.temperature.min = getValue('tempMin', 18);
    app.thresholds.temperature.max = getValue('tempMax', 24);
    app.thresholds.temperature.alertMin = getValue('tempAlertMin', 16);
    app.thresholds.temperature.alertMax = getValue('tempAlertMax', 26);
    
    app.thresholds.ph.min = getValue('phMin', 6.5);
    app.thresholds.ph.max = getValue('phMax', 8.5);
    app.thresholds.ph.alertMin = getValue('phAlertMin', 6.0);
    app.thresholds.ph.alertMax = getValue('phAlertMax', 9.0);
    
    app.saveSettings();
};

window.loadDefaultSettings = function() {
    const app = window.aquaVisionApp;
    if (!app) return;
    
    const settingsManager = new SettingsManager();
    app.thresholds = settingsManager.defaultSettings.thresholds;
    app.loadCurrentSettings();
    app.alertSystem.addAlert('info', 'Settings reset to defaults');
};

window.calibratePH = async function() {
    try {
        await API.calibratePH();
        window.aquaVisionApp?.alertSystem.addAlert('success', 'pH calibration started');
        const statusEl = document.getElementById('calibrationStatus');
        if (statusEl) statusEl.textContent = `Last calibration: ${new Date().toLocaleString()}`;
    } catch (error) {
        window.aquaVisionApp?.alertSystem.addAlert('error', 'Failed to start pH calibration');
    }
};

window.resetSensors = async function() {
    try {
        await API.resetSensors();
        window.aquaVisionApp?.alertSystem.addAlert('success', 'Sensors reset initiated');
    } catch (error) {
        window.aquaVisionApp?.alertSystem.addAlert('error', 'Failed to reset sensors');
    }
};

window.exportData = function() {
    const app = window.aquaVisionApp;
    if (!app) {
        console.error('AquaVision app not found');
        return;
    }
    
    const data = {
        historical_data: app.historicalData,
        current_data: app.currentData,
        settings: app.thresholds,
        alerts: app.alertSystem.getAllAlerts(),
        system_stats: app.systemStats,
        export_timestamp: new Date().toISOString(),
        export_version: '1.0.0'
    };
    
    try {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aquavision_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        app.alertSystem.addAlert('success', 'Data exported successfully');
        console.log('[Export] Data exported successfully');
    } catch (error) {
        app.alertSystem.addAlert('error', 'Failed to export data: ' + error.message);
        console.error('[Export] Failed to export data:', error);
    }
};

window.updateHistoricalChart = function() {
    window.aquaVisionApp?.updateHistoricalChart();
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] DOM loaded, initializing AquaVision App...');
    window.aquaVisionApp = new AquaVisionApp();
});

// Export for compatibility
window.AquaVisionApp = AquaVisionApp;