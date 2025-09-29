

class APIClient {
    constructor() {
        // Try to detect NodeMCU IP automatically, fallback to localhost
        this.baseURL = this.detectNodeMCUAddress();
        this.timeout = 10000; // 10 seconds
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }
    
    detectNodeMCUAddress() {
        // Common NodeMCU IP addresses to try
        const possibleAddresses = [
            'http://192.168.1.100',  // Common default
            'http://192.168.0.100',
            'http://crayfish-monitor.local',
            'http://localhost:3000'   // Local development server
        ];
        
        // For now, return localhost - in production, you'd implement IP detection
        return 'http://192.168.1.25:3000/api/data';
    }
    
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: this.timeout,
            ...options
        };
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                console.log(`API Request [Attempt ${attempt}]: ${options.method || 'GET'} ${url}`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                
                const response = await fetch(url, {
                    ...defaultOptions,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log(`API Response: ${endpoint}`, data);
                return data;
                
            } catch (error) {
                console.warn(`API Request failed (attempt ${attempt}):`, error.message);
                
                if (attempt === this.retryAttempts) {
                    throw new Error(`API request failed after ${this.retryAttempts} attempts: ${error.message}`);
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            }
        }
    }
    
    // Sensor Data Endpoints
    async getCurrentData() {
        return await this.makeRequest('/api/current');
    }
    
    async getHistoricalData(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/api/history?${queryString}` : '/api/history';
        return await this.makeRequest(endpoint);
    }
    
    // System Status Endpoints
    async getSystemStatus() {
        return await this.makeRequest('/api/status');
    }
    
    async calibratePH() {
        return await this.makeRequest('/api/calibrate', {
            method: 'POST'
        });
    }
    
    async resetSensors() {
        return await this.makeRequest('/api/reset', {
            method: 'POST'
        });
    }
    
    // Configuration Endpoints
    async updateSettings(settings) {
        return await this.makeRequest('/api/settings', {
            method: 'POST',
            body: JSON.stringify(settings)
        });
    }
    
    async getSettings() {
        return await this.makeRequest('/api/settings');
    }
    
    // WebSocket connection for real-time updates
    connectWebSocket() {
        try {
            const wsURL = this.baseURL.replace('http', 'ws') + '/ws';
            const ws = new WebSocket(wsURL);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('WebSocket message parsing error:', error);
                }
            };
            
            ws.onclose = () => {
                console.log('WebSocket disconnected, attempting reconnect...');
                setTimeout(() => this.connectWebSocket(), 5000);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
            return ws;
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            return null;
        }
    }
    
    handleWebSocketMessage(data) {
        // Dispatch custom events for real-time updates
        const event = new CustomEvent('sensorDataUpdate', {
            detail: data
        });
        document.dispatchEvent(event);
    }
    
    // Mock data for development/testing
    async getMockCurrentData() {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Generate realistic mock data
        const baseTemp = 21;
        const basePH = 7.2;
        const tempVariation = (Math.random() - 0.5) * 2; // ±1°C
        const phVariation = (Math.random() - 0.5) * 0.4; // ±0.2 pH
        
        return {
            temperature: parseFloat((baseTemp + tempVariation).toFixed(2)),
            ph: parseFloat((basePH + phVariation).toFixed(2)),
            timestamp: Date.now(),
            status: 'ok',
            valid: true,
            wifi_rssi: -45 + Math.floor(Math.random() * 20),
            uptime: Date.now(),
            free_heap: 25000 + Math.floor(Math.random() * 5000)
        };
    }
    
    async getMockHistoricalData() {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const data = [];
        const now = Date.now();
        const points = 100;
        
        for (let i = points; i >= 0; i--) {
            const timestamp = now - (i * 60000); // Every minute
            const temp = 21 + Math.sin(i * 0.1) * 2 + (Math.random() - 0.5) * 0.5;
            const ph = 7.2 + Math.cos(i * 0.08) * 0.3 + (Math.random() - 0.5) * 0.1;
            
            data.push({
                temperature: parseFloat(temp.toFixed(2)),
                ph: parseFloat(ph.toFixed(2)),
                timestamp: timestamp
            });
        }
        
        return data;
    }
    
    async getMockSystemStatus() {
        await new Promise(resolve => setTimeout(resolve, 50));
        
        return {
            system_status: 'running',
            wifi_connected: true,
            ip_address: '192.168.1.100',
            rssi: -42,
            uptime: Date.now(),
            free_heap: 28543,
            data_points: 1247,
            client_requests: 156,
            arduino_connected: true
        };
    }
    
    // Auto-fallback to mock data if real API fails
    async getCurrentDataWithFallback() {
        try {
            return await this.getCurrentData();
        } catch (error) {
            console.warn('Real API failed, using mock data:', error.message);
            return await this.getMockCurrentData();
        }
    }
    
    async getHistoricalDataWithFallback() {
        try {
            return await this.getHistoricalData();
        } catch (error) {
            console.warn('Real API failed, using mock data:', error.message);
            return await this.getMockHistoricalData();
        }
    }
    
    async getSystemStatusWithFallback() {
        try {
            return await this.getSystemStatus();
        } catch (error) {
            console.warn('Real API failed, using mock data:', error.message);
            return await this.getMockSystemStatus();
        }
    }
    
    // Network discovery for NodeMCU
    async discoverNodeMCU() {
        const commonAddresses = [
            'http://192.168.1.100',
            'http://192.168.1.101',
            'http://192.168.1.102',
            'http://192.168.0.100',
            'http://192.168.0.101',
            'http://192.168.0.102',
            'http://crayfish-monitor.local',
            'http://10.0.0.100',
            'http://10.0.0.101'
        ];
        
        console.log('Discovering NodeMCU device...');
        
        const promises = commonAddresses.map(async (address) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
                
                const response = await fetch(`${address}/api/status`, {
                    signal: controller.signal,
                    mode: 'cors'
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.system_status) {
                        return address;
                    }
                }
            } catch (error) {
                // Ignore errors, this is expected for non-existent addresses
            }
            return null;
        });
        
        const results = await Promise.allSettled(promises);
        const foundAddress = results
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value)[0];
        
        if (foundAddress) {
            console.log('NodeMCU found at:', foundAddress);
            this.baseURL = foundAddress;
            return foundAddress;
        } else {
            console.warn('NodeMCU not found on common addresses');
            return null;
        }
    }
    
    // Health check
    async healthCheck() {
        try {
            const response = await this.makeRequest('/api/status');
            return {
                status: 'healthy',
                latency: Date.now() - performance.now(),
                data: response
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                latency: null
            };
        }
    }
    
    // Configuration helpers
    setBaseURL(url) {
        this.baseURL = url.replace(/\/$/, ''); // Remove trailing slash
        console.log('API base URL updated to:', this.baseURL);
    }
    
    setTimeout(timeout) {
        this.timeout = timeout;
    }
    
    setRetryAttempts(attempts) {
        this.retryAttempts = attempts;
    }
}

// Data Processing Utilities
class DataProcessor {
    static smoothData(data, windowSize = 5) {
        if (!data || data.length < windowSize) return data;
        
        const smoothed = [];
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - Math.floor(windowSize / 2));
            const end = Math.min(data.length - 1, i + Math.floor(windowSize / 2));
            const window = data.slice(start, end + 1);
            
            const avgTemp = window.reduce((sum, d) => sum + d.temperature, 0) / window.length;
            const avgPH = window.reduce((sum, d) => sum + d.ph, 0) / window.length;
            
            smoothed.push({
                ...data[i],
                temperature: parseFloat(avgTemp.toFixed(2)),
                ph: parseFloat(avgPH.toFixed(2))
            });
        }
        
        return smoothed;
    }
    
    static filterByTimeRange(data, startTime, endTime) {
        return data.filter(d => {
            const timestamp = typeof d.timestamp === 'string' ? 
                new Date(d.timestamp).getTime() : d.timestamp;
            return timestamp >= startTime && timestamp <= endTime;
        });
    }
    
    static calculateStatistics(data, field) {
        if (!data || data.length === 0) return null;
        
        const values = data.map(d => d[field]).filter(v => v !== null && !isNaN(v));
        if (values.length === 0) return null;
        
        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        return {
            count: values.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean: parseFloat(mean.toFixed(3)),
            median: sorted[Math.floor(sorted.length / 2)],
            stdDev: parseFloat(stdDev.toFixed(3)),
            q1: sorted[Math.floor(sorted.length * 0.25)],
            q3: sorted[Math.floor(sorted.length * 0.75)]
        };
    }
    
    static detectAnomalies(data, field, threshold = 2) {
        const stats = this.calculateStatistics(data, field);
        if (!stats) return [];
        
        return data.filter(d => {
            const value = d[field];
            return Math.abs(value - stats.mean) > (threshold * stats.stdDev);
        });
    }
    
    static interpolateMissingData(data, maxGapMinutes = 10) {
        if (data.length < 2) return data;
        
        const result = [data[0]];
        
        for (let i = 1; i < data.length; i++) {
            const prev = data[i - 1];
            const curr = data[i];
            const timeDiff = curr.timestamp - prev.timestamp;
            const gapMinutes = timeDiff / (1000 * 60);
            
            if (gapMinutes > maxGapMinutes && gapMinutes <= maxGapMinutes * 3) {
                // Interpolate missing points
                const steps = Math.ceil(gapMinutes / 5); // Every 5 minutes
                const tempStep = (curr.temperature - prev.temperature) / steps;
                const phStep = (curr.ph - prev.ph) / steps;
                const timeStep = timeDiff / steps;
                
                for (let j = 1; j < steps; j++) {
                    result.push({
                        temperature: parseFloat((prev.temperature + tempStep * j).toFixed(2)),
                        ph: parseFloat((prev.ph + phStep * j).toFixed(2)),
                        timestamp: prev.timestamp + timeStep * j,
                        interpolated: true
                    });
                }
            }
            
            result.push(curr);
        }
        
        return result;
    }
}

// Cache Manager for API responses
class APICache {
    constructor(maxAge = 30000) { // 30 seconds default
        this.cache = new Map();
        this.maxAge = maxAge;
    }
    
    set(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // Clean up old entries
        this.cleanup();
    }
    
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (Date.now() - entry.timestamp > this.maxAge) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.data;
    }
    
    clear() {
        this.cache.clear();
    }
    
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.maxAge) {
                this.cache.delete(key);
            }
        }
    }
}

// Initialize API client and cache
const API = new APIClient();
const apiCache = new APICache();

// Enhanced API methods with caching
API.getCurrentData = async function() {
    const cached = apiCache.get('current');
    if (cached) return cached;
    
    const data = await this.getCurrentDataWithFallback();
    apiCache.set('current', data);
    return data;
};

// Auto-discovery on load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Starting NodeMCU auto-discovery...');
    const discovered = await API.discoverNodeMCU();
    
    if (!discovered) {
        console.log('Auto-discovery failed, using fallback mode with mock data');
    }
    
    // Test connection
    const health = await API.healthCheck();
    console.log('API Health Check:', health);
});

// Export for global access
window.API = API;
window.DataProcessor = DataProcessor;