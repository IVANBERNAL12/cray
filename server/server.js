const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server for both Express and WebSocket
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Enhanced CORS for local network
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost and local network IPs
    const allowedOrigins = [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+$/
    ];
    
    const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../web-interface')));

// FIXED: Data storage without mock data
let currentSensorData = {
    temperature: null,
    ph: null,
    timestamp: null,
    status: 'no_data',
    valid: false,
    temp_sensor_ok: false,
    ph_sensor_ok: false,
    error_count: 0
};

let historicalData = [];
let systemStatus = {
    uptime: Date.now(),
    dataPoints: 0,
    lastUpdate: null,
    esp8266Connected: false,
    arduinoConnected: false,
    lastDataTime: null
};

let clientConnections = new Set();

// FIXED: Health calculation function
function calculateHealthScore(temperature, ph, tempSensorOk, phSensorOk) {
    // If sensors are not working, health is 0%
    if (!tempSensorOk && !phSensorOk) {
        return 0;
    }
    
    let healthScore = 0;
    let factors = 0;
    
    // Temperature health (if sensor working)
    if (tempSensorOk && temperature !== null) {
        factors++;
        if (temperature >= 18 && temperature <= 24) {
            healthScore += 50; // Perfect temperature
        } else if (temperature >= 16 && temperature <= 26) {
            healthScore += 35; // Acceptable temperature
        } else if (temperature >= 14 && temperature <= 28) {
            healthScore += 20; // Marginal temperature
        } else {
            healthScore += 0; // Dangerous temperature
        }
    }
    
    // pH health (if sensor working)
    if (phSensorOk && ph !== null) {
        factors++;
        if (ph >= 6.5 && ph <= 8.0) {
            healthScore += 50; // Perfect pH
        } else if (ph >= 6.0 && ph <= 8.5) {
            healthScore += 35; // Acceptable pH
        } else if (ph >= 5.5 && ph <= 9.0) {
            healthScore += 20; // Marginal pH
        } else {
            healthScore += 0; // Dangerous pH
        }
    }
    
    // Return percentage based on working sensors
    if (factors === 0) return 0;
    return Math.round(healthScore / factors);
}

// FIXED: Health status text
function getHealthStatus(healthScore, tempSensorOk, phSensorOk) {
    if (!tempSensorOk && !phSensorOk) {
        return 'Sensor Failure';
    }
    
    if (!tempSensorOk || !phSensorOk) {
        return 'Partial Failure';
    }
    
    if (healthScore >= 85) return 'Excellent';
    if (healthScore >= 70) return 'Good';
    if (healthScore >= 50) return 'Fair';
    if (healthScore >= 30) return 'Poor';
    return 'Critical';
}

// API Routes
app.get('/api/current', (req, res) => {
    try {
        // FIXED: Calculate real health score
        const healthScore = calculateHealthScore(
            currentSensorData.temperature,
            currentSensorData.ph,
            currentSensorData.temp_sensor_ok,
            currentSensorData.ph_sensor_ok
        );
        
        const healthStatus = getHealthStatus(
            healthScore,
            currentSensorData.temp_sensor_ok,
            currentSensorData.ph_sensor_ok
        );
        
        const response = {
            ...currentSensorData,
            health_score: healthScore,
            health_status: healthStatus,
            uptime: Date.now() - systemStatus.uptime,
            // Only add fake WiFi data if sensors are working (for ESP8266 simulation)
            wifi_rssi: currentSensorData.valid ? -45 + Math.floor(Math.random() * 20) : null,
            free_heap: currentSensorData.valid ? 25000 + Math.floor(Math.random() * 5000) : null
        };
        
        res.json(response);
        console.log('Sent current data to client - Health:', healthScore + '%', healthStatus);
    } catch (error) {
        console.error('Error in /api/current:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/history', (req, res) => {
    try {
        res.json(historicalData);
        console.log(`Sent ${historicalData.length} historical data points`);
    } catch (error) {
        console.error('Error in /api/history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/status', (req, res) => {
    try {
        const response = {
            system_status: currentSensorData.valid ? 'running' : 'sensor_errors',
            wifi_connected: true,
            ip_address: getLocalIP(),
            rssi: currentSensorData.valid ? -42 + Math.floor(Math.random() * 10) : null,
            uptime: Date.now() - systemStatus.uptime,
            free_heap: currentSensorData.valid ? 28000 + Math.floor(Math.random() * 5000) : null,
            data_points: systemStatus.dataPoints,
            esp8266_connected: systemStatus.esp8266Connected,
            arduino_connected: systemStatus.arduinoConnected,
            websocket_clients: clientConnections.size,
            last_data_received: systemStatus.lastUpdate,
            temp_sensor_working: currentSensorData.temp_sensor_ok,
            ph_sensor_working: currentSensorData.ph_sensor_ok,
            error_count: currentSensorData.error_count
        };
        
        res.json(response);
    } catch (error) {
        console.error('Error in /api/status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// **CRITICAL ENDPOINT** - Receives data from NodeMCU
app.post('/api/data', (req, res) => {
    try {
        const { 
            temperature, 
            ph, 
            timestamp, 
            status, 
            temp_sensor_ok, 
            ph_sensor_ok,
            errors 
        } = req.body;
        
        console.log('Received data from NodeMCU:', req.body);
        
        // FIXED: Validate sensor data
        let validTemp = null;
        let validPH = null;
        let tempWorking = temp_sensor_ok === true || temp_sensor_ok === 'true';
        let phWorking = ph_sensor_ok === true || ph_sensor_ok === 'true';
        
        // Only accept temperature if sensor is working and value is reasonable
        if (tempWorking && temperature !== null && temperature !== undefined) {
            const temp = parseFloat(temperature);
            if (!isNaN(temp) && temp > -10 && temp < 50) {
                validTemp = temp;
            } else {
                console.log('Invalid temperature value:', temperature);
                tempWorking = false;
            }
        }
        
        // Only accept pH if sensor is working and value is reasonable
        if (phWorking && ph !== null && ph !== undefined) {
            const phVal = parseFloat(ph);
            if (!isNaN(phVal) && phVal >= 0 && phVal <= 14) {
                validPH = phVal;
            } else {
                console.log('Invalid pH value:', ph);
                phWorking = false;
            }
        }
        
        currentSensorData = {
            temperature: validTemp,
            ph: validPH,
            timestamp: timestamp || Date.now(),
            status: status || 'unknown',
            valid: (tempWorking || phWorking), // Valid if at least one sensor works
            temp_sensor_ok: tempWorking,
            ph_sensor_ok: phWorking,
            error_count: parseInt(errors) || 0
        };
        
        // Update system status
        systemStatus.esp8266Connected = true;
        systemStatus.arduinoConnected = tempWorking || phWorking;
        systemStatus.lastUpdate = new Date();
        systemStatus.lastDataTime = Date.now();
        
        // FIXED: Only add to historical data if we have valid readings
        if (validTemp !== null || validPH !== null) {
            historicalData.push({
                temperature: validTemp,
                ph: validPH,
                timestamp: currentSensorData.timestamp
            });
            
            // Keep only last 1000 points
            if (historicalData.length > 1000) {
                historicalData = historicalData.slice(-1000);
            }
            
            systemStatus.dataPoints = historicalData.length;
        }
        
        console.log(`Data stored: T=${validTemp}°C (sensor: ${tempWorking}), pH=${validPH} (sensor: ${phWorking})`);
        
        // Broadcast to WebSocket clients
        broadcastToClients('sensorUpdate', currentSensorData);
        
        res.json({ 
            status: 'success', 
            message: 'Data received and processed',
            dataPoints: historicalData.length,
            temp_accepted: validTemp !== null,
            ph_accepted: validPH !== null
        });
        
    } catch (error) {
        console.error('Error in /api/data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// FIXED: Connection timeout detection
setInterval(() => {
    const now = Date.now();
    if (systemStatus.lastDataTime && (now - systemStatus.lastDataTime) > 30000) {
        // No data for 30 seconds
        if (systemStatus.esp8266Connected) {
            console.log('WARNING: No data received for 30 seconds - ESP8266 may be disconnected');
            systemStatus.esp8266Connected = false;
            systemStatus.arduinoConnected = false;
            
            currentSensorData.status = 'connection_lost';
            currentSensorData.valid = false;
            
            // Broadcast connection loss
            broadcastToClients('connectionLost', {
                message: 'Connection to monitoring system lost',
                lastUpdate: systemStatus.lastUpdate
            });
        }
    }
}, 10000); // Check every 10 seconds

// Serve main web interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../web-interface/index.html'));
});

// WebSocket handling
wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected from:', req.socket.remoteAddress);
    clientConnections.add(ws);
    
    ws.send(JSON.stringify({
        type: 'welcome',
        data: { message: 'Connected to Crayfish Monitor', timestamp: Date.now() }
    }));
    
    // Send current data with health calculation
    const healthScore = calculateHealthScore(
        currentSensorData.temperature,
        currentSensorData.ph,
        currentSensorData.temp_sensor_ok,
        currentSensorData.ph_sensor_ok
    );
    
    ws.send(JSON.stringify({
        type: 'sensorUpdate',
        data: { ...currentSensorData, health_score: healthScore }
    }));
    
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
        clientConnections.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clientConnections.delete(ws);
    });
});

function broadcastToClients(type, data) {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    
    clientConnections.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
            } catch (error) {
                console.error('Error broadcasting to client:', error);
                clientConnections.delete(client);
            }
        }
    });
}

function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    
    return '127.0.0.1';
}

// Start server
server.listen(PORT, '0.0.0.0', () => {  // Listen on all interfaces
    const localIP = getLocalIP();
    console.log(`🌊 Crayfish Monitor Server running on port ${PORT}`);
    console.log(`📱 Local access: http://localhost:${PORT}`);
    console.log(`🌐 Network access: http://${localIP}:${PORT}`);
    console.log(`🔌 WebSocket: ws://${localIP}:${PORT}`);
    console.log(`📡 Waiting for NodeMCU data on: http://${localIP}:${PORT}/api/data`);
    console.log(`🌍 For external access, configure port forwarding for port ${PORT}`);
    console.log('='.repeat(60));
});

module.exports = app;