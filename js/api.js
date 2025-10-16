/**
 * api.js - COMPLETE CORRECTED VERSION
 */

class APIClient {
  constructor() {
    this.baseURL = window.location.origin || `${window.location.protocol}//${window.location.hostname}:${window.location.port || 3000}`;
    this.timeout = 10000;
    this.retryAttempts = 3;
    this.retryDelay = 800;
  }

  setBaseURL(url) {
    if (!url) return;
    this.baseURL = url.replace(/\/$/, '');
    console.log('[API] baseURL set to', this.baseURL);
  }

  buildURL(endpoint) {
    if (!endpoint) endpoint = '/';
    if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
    return (this.baseURL ? (this.baseURL + endpoint) : endpoint);
  }

  async makeRequest(endpoint, options = {}) {
    const url = this.buildURL(endpoint);

    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      ...options
    };

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`[API] Request (attempt ${attempt}): ${defaultOptions.method} ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...defaultOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}: ${response.statusText} ${text}`);
        }

        if (response.status === 204) return null;

        const data = await response.json().catch(() => null);
        return data;
      } catch (err) {
        console.warn(`[API] Request failed attempt ${attempt}:`, err.message || err);
        if (attempt === this.retryAttempts) {
          throw err;
        }
        await new Promise(r => setTimeout(r, this.retryDelay * attempt));
      }
    }
  }

  async getCurrentData() {
    return this.makeRequest('/api/current');
  }

  async getHistoricalData(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.makeRequest(qs ? `/api/history?${qs}` : '/api/history');
  }

  async getSystemStatus() {
    return this.makeRequest('/api/status');
  }

  async calibratePH() {
    return this.makeRequest('/api/calibrate', { method: 'POST' });
  }

  async resetSensors() {
    return this.makeRequest('/api/reset', { method: 'POST' });
  }

  async getMockCurrentData() {
    await new Promise(r => setTimeout(r, 80));
    const now = Date.now();
    
    return {
      temperature: parseFloat((20 + Math.sin(now / 60000) * 3 + (Math.random() - 0.5) * 2).toFixed(2)),
      ph: parseFloat((7.2 + Math.cos(now / 80000) * 0.3 + (Math.random() - 0.5) * 0.2).toFixed(2)),
      timestamp: now,
      status: 'ok',
      valid: true,
      wifi_rssi: -45 + Math.floor(Math.random() * 20),
      uptime: now,
      free_heap: 25000 + Math.floor(Math.random() * 5000)
    };
  }

  async getMockHistoricalData() {
    await new Promise(r => setTimeout(r, 120));
    const points = 100;
    const data = [];
    const now = Date.now();
    
    for (let i = points; i >= 0; i--) {
      const timestamp = now - (i * 60000);
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

  async getCurrentDataWithFallback() {
    try {
      const data = await this.getCurrentData();
      console.log('[API] Real data received:', data);
      return data;
    } catch (err) {
      console.warn('[API] getCurrentData failed, using mock:', err.message || err);
      return this.getMockCurrentData();
    }
  }

  async getHistoricalDataWithFallback(params = {}) {
    try {
      const data = await this.getHistoricalData(params);
      console.log('[API] Real historical data received:', data?.length);
      return data;
    } catch (err) {
      console.warn('[API] getHistoricalData failed, using mock:', err.message || err);
      return this.getMockHistoricalData();
    }
  }

  async getSystemStatusWithFallback() {
    try {
      return await this.getSystemStatus();
    } catch (err) {
      console.warn('[API] getSystemStatus failed, using mock:', err.message || err);
      return {
        system_status: 'running',
        wifi_connected: false,
        ip_address: window.location.hostname,
        rssi: -42,
        uptime: Date.now(),
        free_heap: 25000,
        data_points: 0,
        client_requests: 0,
        arduino_connected: false
      };
    }
  }
}

class DataProcessor {
  static smoothData(data, windowSize = 5) {
    if (!data || data.length < windowSize) return data || [];
    const smoothed = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(data.length - 1, i + Math.floor(windowSize / 2));
      const window = data.slice(start, end + 1);
     const avgTemp = window.reduce((s, d) => s + d.temperature, 0) / window.length;
      const avgPH = window.reduce((s, d) => s + d.ph, 0) / window.length;
      smoothed.push({
        ...data[i],
        temperature: parseFloat(avgTemp.toFixed(2)),
        ph: parseFloat(avgPH.toFixed(2))
      });
    }
    return smoothed;
  }

  static filterByTimeRange(data, startTime, endTime) {
    if (!data) return [];
    return data.filter(d => {
      const ts = (typeof d.timestamp === 'string') ? new Date(d.timestamp).getTime() : d.timestamp;
      return ts >= startTime && ts <= endTime;
    });
  }

  static calculateStatistics(data, field) {
    if (!data || data.length === 0) return null;
    const values = data.map(d => d[field]).filter(v => v !== null && !isNaN(v));
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
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
}

class APICache {
  constructor(maxAge = 30000) {
    this.cache = new Map();
    this.maxAge = maxAge;
  }

  set(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
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
    for (const [k, v] of this.cache.entries()) {
      if (now - v.timestamp > this.maxAge) this.cache.delete(k);
    }
  }
}

// Initialize and export
const API = new APIClient();
const apiCache = new APICache(30000);

API.getCurrentDataCached = async function () {
  const cached = apiCache.get('current');
  if (cached) return cached;
  const data = await this.getCurrentDataWithFallback();
  apiCache.set('current', data);
  return data;
};

// Supabase authentication functions with timeout protection
async function getCurrentUser() {
    try {
        if (!window.supabase) {
            console.warn('[API] Supabase not available');
            return null;
        }
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        const userPromise = window.supabase.auth.getUser();
        
        const { data: { user }, error } = await Promise.race([userPromise, timeoutPromise]);
        
        if (error) {
            console.error('[API] Error getting user:', error);
            return null;
        }
        
        return user;
    } catch (error) {
        // Handle timeout and network errors gracefully
        if (error.message === 'Timeout' || error.name === 'AuthRetryableFetchError') {
            console.warn('[API] Auth check timed out or network error - using cached session');
            // Try to get user from localStorage
            const userId = localStorage.getItem('userId');
            if (userId) {
                return { id: userId }; // Return minimal user object
            }
        }
        console.error('[API] Failed to get current user:', error);
        return null;
    }
}

async function checkAuth() {
    try {
        if (!window.supabase) {
            console.warn('[API] Supabase not available');
            return { authenticated: false, user: null };
        }
        
        const { data: { session }, error } = await window.supabase.auth.getSession();
        if (error) throw error;
        
        return {
            authenticated: !!session,
            user: session?.user || null
        };
    } catch (error) {
        console.error('Error checking auth:', error);
        return {
            authenticated: false,
            user: null
        };
    }
}

// Export global objects
window.API = API;
window.DataProcessor = DataProcessor;
window.APICache = APICache;
window.getCurrentUser = getCurrentUser;
window.checkAuth = checkAuth;

console.log('[API] ✓ API client initialized');