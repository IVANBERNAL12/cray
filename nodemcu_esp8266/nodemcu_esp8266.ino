/*
 * Crayfish Monitoring System - NodeMCU ESP8266 Server (UPDATED)
 * Receives data from Arduino Mega and forwards to Node.js server + provides web API
 * File: nodemcu_server.ino
 * 
 * Wiring:
 * Arduino Mega TX3(Pin 14) -> NodeMCU D6 (GPIO12)
 * Arduino Mega RX3(Pin 15) -> NodeMCU D7 (GPIO13)
 * NodeMCU GND -> Arduino GND (common ground essential!)
 */

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <SoftwareSerial.h>

// ================================
// CONFIGURATION - UPDATE THESE!
// ================================
const char* WIFI_SSID = "PLDT_Home_0D8BB";         // Change this!
const char* WIFI_PASSWORD = "JUNE122002"; // Change this!
const char* DEVICE_NAME = "crayfish-monitor";     // mDNS name
const int WEB_SERVER_PORT = 80;

// CRITICAL: Update this with your Node.js server IP and port
const char* NODE_SERVER_URL = "http://192.168.1.103:3000/api/data"; // Change this IP!

// Serial communication with Arduino Mega
// NodeMCU D6 (GPIO12) = RX, D7 (GPIO13) = TX
SoftwareSerial arduinoSerial(12, 13); // RX, TX

// Web server
ESP8266WebServer server(WEB_SERVER_PORT);

// Data structures
struct SensorData {
  float temperature;
  float ph;
  unsigned long timestamp;
  int errors;
  String status;
  bool valid;
  unsigned long lastUpdate;
};

struct SystemInfo {
  unsigned long startTime;
  int requestCount;
  int dataPacketsReceived;
  int forwardingAttempts;
  int forwardingSuccesses;
  int forwardingFailures;
  bool arduinoConnected;
  bool nodeServerConnected;
  unsigned long lastArduinoHeartbeat;
  unsigned long lastServerForward;
  String lastError;
  String lastServerResponse;
};

// Global variables
SensorData currentData = {0.0, 7.0, 0, 0, "initializing", false, 0};
SensorData dataHistory[60]; // Store last 60 readings
int historyIndex = 0;
int historyCount = 0;

SystemInfo systemInfo = {0, 0, 0, 0, 0, 0, false, false, 0, 0, "", ""};

// Timing constants
const unsigned long DATA_TIMEOUT = 10000;      // 10 seconds
const unsigned long HEARTBEAT_INTERVAL = 5000; // 5 seconds
const unsigned long HISTORY_INTERVAL = 30000;  // 30 seconds
const unsigned long SERVER_RETRY_INTERVAL = 5000; // 5 seconds

unsigned long lastHeartbeat = 0;
unsigned long lastHistoryUpdate = 0;
unsigned long lastServerRetry = 0;

void setup() {
  Serial.begin(115200);
  arduinoSerial.begin(9600);
  
  systemInfo.startTime = millis();
  
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH); // LED off initially (inverted)
  
  Serial.println();
  Serial.println("=== Crayfish Monitoring - NodeMCU ESP8266 (UPDATED) ===");
  Serial.print("Chip ID: ");
  Serial.println(ESP.getChipId(), HEX);
  Serial.print("Flash Size: ");
  Serial.println(ESP.getFlashChipSize());
  Serial.print("Free Heap: ");
  Serial.println(ESP.getFreeHeap());
  Serial.println("Node.js Server URL: " + String(NODE_SERVER_URL));
  
  // Connect to WiFi
  connectToWiFi();
  
  // Test connection to Node.js server
  testNodeServerConnection();
  
  // Setup mDNS
  if (MDNS.begin(DEVICE_NAME)) {
    Serial.printf("mDNS started: http://%s.local\n", DEVICE_NAME);
    MDNS.addService("http", "tcp", WEB_SERVER_PORT);
  }
  
  // Setup web server routes
  setupWebServer();
  
  // Start web server
  server.begin();
  
  Serial.println("=== System Ready ===");
  Serial.printf("Local Web interface: http://%s\n", WiFi.localIP().toString().c_str());
  Serial.printf("Local mDNS access: http://%s.local\n", DEVICE_NAME);
  Serial.println("Data forwarding to Node.js server: " + String(NODE_SERVER_URL));
  Serial.println("Waiting for Arduino data...");
  
  // Signal ready
  blinkLED(3, 200);
}

void loop() {
  // Handle web server
  server.handleClient();
  MDNS.update();
  
  // Handle Arduino communication
  handleArduinoData();
  
  // Send heartbeat to Arduino
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
    sendHeartbeatToArduino();
    lastHeartbeat = millis();
  }
  
  // Check for data timeout
  checkDataTimeout();
  
  // Update historical data
  updateHistoricalData();
  
  // Test Node.js server connection periodically
  if (millis() - lastServerRetry > SERVER_RETRY_INTERVAL) {
    if (!systemInfo.nodeServerConnected) {
      testNodeServerConnection();
    }
    lastServerRetry = millis();
  }
  
  // Update connection status LED
  updateStatusLED();
  
  // Yield to prevent watchdog reset
  yield();
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.hostname(DEVICE_NAME);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print(".");
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected successfully!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    digitalWrite(LED_BUILTIN, HIGH); // Turn off LED
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
    Serial.println("Please check your credentials and try again.");
    
    // Flash LED to indicate error
    while (true) {
      digitalWrite(LED_BUILTIN, LOW);
      delay(100);
      digitalWrite(LED_BUILTIN, HIGH);
      delay(100);
    }
  }
}

void testNodeServerConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    systemInfo.nodeServerConnected = false;
    return;
  }
  
  Serial.println("Testing Node.js server connection...");
  
  WiFiClient client;
  HTTPClient http;
  
  // Test with a simple GET request to /api/status
  String testURL = String(NODE_SERVER_URL);
  testURL.replace("/api/data", "/api/status");
  
  http.begin(client, testURL);
  http.setTimeout(5000); // 5 second timeout
  
  int httpCode = http.GET();
  
  if (httpCode > 0) {
    Serial.printf("Node.js server responded with code: %d\n", httpCode);
    if (httpCode == HTTP_CODE_OK) {
      systemInfo.nodeServerConnected = true;
      systemInfo.lastServerResponse = "Connection OK";
      Serial.println("✓ Node.js server connection successful!");
    } else {
      systemInfo.nodeServerConnected = false;
      systemInfo.lastError = "Server responded with error code: " + String(httpCode);
    }
  } else {
    systemInfo.nodeServerConnected = false;
    systemInfo.lastError = "Cannot reach Node.js server: " + String(http.errorToString(httpCode));
    Serial.println("✗ Node.js server connection failed: " + String(http.errorToString(httpCode)));
    Serial.println("Check if Node.js server is running and URL is correct");
  }
  
  http.end();
}

void handleArduinoData() {
  if (arduinoSerial.available()) {
    String receivedLine = arduinoSerial.readStringUntil('\n');
    receivedLine.trim();
    
    Serial.print("Arduino: ");
    Serial.println(receivedLine);
    
    systemInfo.lastArduinoHeartbeat = millis();
    systemInfo.arduinoConnected = true;
    
    if (receivedLine.startsWith("DATA:")) {
      parseArduinoData(receivedLine.substring(5)); // Remove "DATA:" prefix
      systemInfo.dataPacketsReceived++;
      
    } else if (receivedLine.startsWith("STATUS:")) {
      parseArduinoStatus(receivedLine.substring(7)); // Remove "STATUS:" prefix
      
    } else if (receivedLine.startsWith("CALIBRATING:")) {
      Serial.println("Calibration status: " + receivedLine.substring(12));
      
    } else if (receivedLine.startsWith("RESETTING:")) {
      Serial.println("Reset status: " + receivedLine.substring(10));
      
    } else if (receivedLine == "PONG") {
      // Heartbeat response - Arduino is alive
      systemInfo.arduinoConnected = true;
      
    } else if (receivedLine.startsWith("ERROR:")) {
      systemInfo.lastError = receivedLine.substring(6);
      Serial.println("Arduino Error: " + systemInfo.lastError);
    }
  }
}

void parseArduinoData(String jsonData) {
  // Simple JSON parsing (basic implementation for ESP8266)
  String cleanData = jsonData;
  cleanData.replace("{", "");
  cleanData.replace("}", "");
  cleanData.replace("\"", "");
  
  // Parse temperature
  int tempIndex = cleanData.indexOf("temperature:");
  if (tempIndex != -1) {
    int startIndex = tempIndex + 12; // length of "temperature:"
    int endIndex = cleanData.indexOf(",", startIndex);
    if (endIndex == -1) endIndex = cleanData.length();
    
    String tempStr = cleanData.substring(startIndex, endIndex);
    currentData.temperature = tempStr.toFloat();
  }
  
  // Parse pH
  int phIndex = cleanData.indexOf("ph:");
  if (phIndex != -1) {
    int startIndex = phIndex + 3; // length of "ph:"
    int endIndex = cleanData.indexOf(",", startIndex);
    if (endIndex == -1) endIndex = cleanData.length();
    
    String phStr = cleanData.substring(startIndex, endIndex);
    currentData.ph = phStr.toFloat();
  }
  
  // Parse status
  int statusIndex = cleanData.indexOf("status:");
  if (statusIndex != -1) {
    int startIndex = statusIndex + 7; // length of "status:"
    int endIndex = cleanData.indexOf(",", startIndex);
    if (endIndex == -1) endIndex = cleanData.length();
    
    currentData.status = cleanData.substring(startIndex, endIndex);
  }
  
  // Parse errors
  int errorsIndex = cleanData.indexOf("errors:");
  if (errorsIndex != -1) {
    int startIndex = errorsIndex + 7; // length of "errors:"
    int endIndex = cleanData.indexOf(",", startIndex);
    if (endIndex == -1) endIndex = cleanData.length();
    
    String errorsStr = cleanData.substring(startIndex, endIndex);
    currentData.errors = errorsStr.toInt();
  }
  
  // Update metadata
  currentData.timestamp = millis();
  currentData.lastUpdate = millis();
  currentData.valid = true;
  
  Serial.printf("Parsed - Temp: %.2f°C, pH: %.2f, Status: %s, Errors: %d\n",
                currentData.temperature, currentData.ph, 
                currentData.status.c_str(), currentData.errors);
  
  // **CRITICAL: Forward data to Node.js server**
  forwardDataToNodeServer();
}

void forwardDataToNodeServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, cannot forward data");
    return;
  }
  
  systemInfo.forwardingAttempts++;
  
  WiFiClient client;
  HTTPClient http;
  
  http.begin(client, NODE_SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000); // 5 second timeout
  
  // Create JSON payload for Node.js server
  String payload = "{";
  payload += "\"temperature\":" + String(currentData.temperature, 2) + ",";
  payload += "\"ph\":" + String(currentData.ph, 2) + ",";
  payload += "\"timestamp\":" + String(currentData.timestamp) + ",";
  payload += "\"status\":\"" + currentData.status + "\",";
  payload += "\"errors\":" + String(currentData.errors) + ",";
  payload += "\"source\":\"nodemcu\",";
  payload += "\"device_id\":\"" + String(ESP.getChipId(), HEX) + "\"";
  payload += "}";
  
  Serial.println("Forwarding to Node.js server: " + payload);
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    systemInfo.forwardingSuccesses++;
    systemInfo.nodeServerConnected = true;
    systemInfo.lastServerForward = millis();
    
    String response = http.getString();
    systemInfo.lastServerResponse = response;
    
    Serial.printf("✓ Server response code: %d\n", httpResponseCode);
    Serial.println("Server response: " + response);
    
    if (httpResponseCode == HTTP_CODE_OK) {
      Serial.println("Data successfully forwarded to Node.js server");
    }
  } else {
    systemInfo.forwardingFailures++;
    systemInfo.nodeServerConnected = false;
    String error = http.errorToString(httpResponseCode);
    systemInfo.lastError = "HTTP Error: " + error;
    
    Serial.printf("✗ Error forwarding data: %s\n", error.c_str());
    Serial.println("Check Node.js server status and URL configuration");
  }
  
  http.end();
}

void parseArduinoStatus(String statusData) {
  // Handle status information from Arduino
  Serial.println("Arduino Status: " + statusData);
}

void sendHeartbeatToArduino() {
  arduinoSerial.println("PING");
}

void checkDataTimeout() {
  if (currentData.valid && (millis() - currentData.lastUpdate > DATA_TIMEOUT)) {
    Serial.println("WARNING: Arduino data timeout!");
    currentData.valid = false;
    currentData.status = "timeout";
    systemInfo.arduinoConnected = false;
  }
  
  // Check Arduino connection timeout
  if (millis() - systemInfo.lastArduinoHeartbeat > (DATA_TIMEOUT * 2)) {
    systemInfo.arduinoConnected = false;
  }
}

void updateHistoricalData() {
  if (millis() - lastHistoryUpdate > HISTORY_INTERVAL && currentData.valid) {
    // Store current data in history
    dataHistory[historyIndex] = currentData;
    historyIndex = (historyIndex + 1) % 60;
    if (historyCount < 60) historyCount++;
    
    lastHistoryUpdate = millis();
    
    Serial.printf("Stored data point %d in history\n", historyCount);
  }
}

void updateStatusLED() {
  static unsigned long lastLEDUpdate = 0;
  static bool ledState = false;
  
  if (millis() - lastLEDUpdate > 1000) { // Update every second
    if (WiFi.status() != WL_CONNECTED) {
      // Fast blink - WiFi disconnected
      ledState = !ledState;
      digitalWrite(LED_BUILTIN, ledState ? LOW : HIGH);
    } else if (!systemInfo.arduinoConnected) {
      // Slow blink - Arduino disconnected
      if (millis() - lastLEDUpdate > 2000) {
        ledState = !ledState;
        digitalWrite(LED_BUILTIN, ledState ? LOW : HIGH);
        lastLEDUpdate = millis();
      }
    } else if (!systemInfo.nodeServerConnected) {
      // Medium blink - Node.js server disconnected
      if (millis() - lastLEDUpdate > 1500) {
        ledState = !ledState;
        digitalWrite(LED_BUILTIN, ledState ? LOW : HIGH);
        lastLEDUpdate = millis();
      }
    } else if (currentData.valid) {
      // Solid off - everything working
      digitalWrite(LED_BUILTIN, HIGH);
    } else {
      // Medium blink - data issues
      if (millis() - lastLEDUpdate > 500) {
        ledState = !ledState;
        digitalWrite(LED_BUILTIN, ledState ? LOW : HIGH);
        lastLEDUpdate = millis();
      }
    }
    
    if (WiFi.status() == WL_CONNECTED && (systemInfo.arduinoConnected || currentData.valid)) {
      lastLEDUpdate = millis();
    }
  }
}

void setupWebServer() {
  // Enable CORS for all routes
  server.onNotFound([]() {
    if (server.method() == HTTP_OPTIONS) {
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
      server.send(200, "text/plain", "");
    } else {
      handleNotFound();
    }
  });
  
  // API Routes
  server.on("/api/current", HTTP_GET, handleCurrentData);
  server.on("/api/history", HTTP_GET, handleHistoryData);
  server.on("/api/status", HTTP_GET, handleSystemStatus);
  server.on("/api/calibrate", HTTP_POST, handleCalibration);
  server.on("/api/reset", HTTP_POST, handleReset);
  server.on("/api/test-server", HTTP_GET, handleTestServer);
  
  // Root route - Basic web interface
  server.on("/", HTTP_GET, handleRoot);
  
  Serial.println("Web server routes configured");
}

void handleTestServer() {
  systemInfo.requestCount++;
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Content-Type", "application/json");
  
  testNodeServerConnection();
  
  String json = "{";
  json += "\"node_server_connected\":" + String(systemInfo.nodeServerConnected ? "true" : "false") + ",";
  json += "\"server_url\":\"" + String(NODE_SERVER_URL) + "\",";
  json += "\"forwarding_attempts\":" + String(systemInfo.forwardingAttempts) + ",";
  json += "\"forwarding_successes\":" + String(systemInfo.forwardingSuccesses) + ",";
  json += "\"forwarding_failures\":" + String(systemInfo.forwardingFailures) + ",";
  json += "\"last_error\":\"" + systemInfo.lastError + "\",";
  json += "\"last_response\":\"" + systemInfo.lastServerResponse + "\"";
  json += "}";
  
  server.send(200, "application/json", json);
}

void handleCurrentData() {
  systemInfo.requestCount++;
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Content-Type", "application/json");
  server.sendHeader("Cache-Control", "no-cache");
  
  String json = "{";
  json += "\"temperature\":" + String(currentData.temperature, 2) + ",";
  json += "\"ph\":" + String(currentData.ph, 2) + ",";
  json += "\"timestamp\":" + String(currentData.timestamp) + ",";
  json += "\"status\":\"" + currentData.status + "\",";
  json += "\"valid\":" + String(currentData.valid ? "true" : "false") + ",";
  json += "\"errors\":" + String(currentData.errors) + ",";
  json += "\"wifi_rssi\":" + String(WiFi.RSSI()) + ",";
  json += "\"uptime\":" + String(millis()) + ",";
  json += "\"free_heap\":" + String(ESP.getFreeHeap()) + ",";
  json += "\"arduino_connected\":" + String(systemInfo.arduinoConnected ? "true" : "false") + ",";
  json += "\"node_server_connected\":" + String(systemInfo.nodeServerConnected ? "true" : "false");
  json += "}";
  
  server.send(200, "application/json", json);
}

void handleHistoryData() {
  systemInfo.requestCount++;
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Content-Type", "application/json");
  
  String json = "[";
  
  for (int i = 0; i < historyCount; i++) {
    int index = (historyIndex - historyCount + i + 60) % 60;
    
    if (i > 0) json += ",";
    json += "{";
    json += "\"temperature\":" + String(dataHistory[index].temperature, 2) + ",";
    json += "\"ph\":" + String(dataHistory[index].ph, 2) + ",";
    json += "\"timestamp\":" + String(dataHistory[index].timestamp);
    json += "}";
  }
  
  json += "]";
  server.send(200, "application/json", json);
}

void handleSystemStatus() {
  systemInfo.requestCount++;
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Content-Type", "application/json");
  
  String json = "{";
  json += "\"system_status\":\"running\",";
  json += "\"wifi_connected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
  json += "\"ip_address\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  json += "\"uptime\":" + String(millis() - systemInfo.startTime) + ",";
  json += "\"free_heap\":" + String(ESP.getFreeHeap()) + ",";
  json += "\"data_points\":" + String(historyCount) + ",";
  json += "\"client_requests\":" + String(systemInfo.requestCount) + ",";
  json += "\"arduino_connected\":" + String(systemInfo.arduinoConnected ? "true" : "false") + ",";
  json += "\"node_server_connected\":" + String(systemInfo.nodeServerConnected ? "true" : "false") + ",";
  json += "\"data_packets_received\":" + String(systemInfo.dataPacketsReceived) + ",";
  json += "\"forwarding_attempts\":" + String(systemInfo.forwardingAttempts) + ",";
  json += "\"forwarding_successes\":" + String(systemInfo.forwardingSuccesses) + ",";
  json += "\"forwarding_failures\":" + String(systemInfo.forwardingFailures) + ",";
  json += "\"last_error\":\"" + systemInfo.lastError + "\"";
  json += "}";
  
  server.send(200, "application/json", json);
}

void handleCalibration() {
  systemInfo.requestCount++;
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Content-Type", "application/json");
  
  // Send calibration command to Arduino
  arduinoSerial.println("CALIBRATE_PH");
  Serial.println("pH calibration command sent to Arduino");
  
  String json = "{";
  json += "\"status\":\"calibration_started\",";
  json += "\"message\":\"pH calibration command sent to Arduino\"";
  json += "}";
  
  server.send(200, "application/json", json);
}

void handleReset() {
  systemInfo.requestCount++;
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Content-Type", "application/json");
  
  // Send reset command to Arduino
  arduinoSerial.println("RESET");
  Serial.println("Reset command sent to Arduino");
  
  // Reset our own data
  currentData.valid = false;
  currentData.status = "resetting";
  systemInfo.lastError = "";
  
  String json = "{";
  json += "\"status\":\"reset_initiated\",";
  json += "\"message\":\"Reset command sent to Arduino\"";
  json += "}";
  
  server.send(200, "application/json", json);
}

void handleRoot() {
  systemInfo.requestCount++;

  String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crayfish Monitor - NodeMCU Interface</title>
    <style>
        /* Your CSS here */
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Crayfish Monitor - NodeMCU</h1>
            <div class="subtitle">Data Gateway & Local Interface</div>
        </div>
        
        <div class="sensor-grid">
            <div class="sensor-card">
                <div class="sensor-title">Water Temperature</div>
                <div class="sensor-value temp-value" id="temperature">--°C</div>
                <div>Range: 18-24°C optimal</div>
            </div>
            
            <div class="sensor-card">
                <div class="sensor-title">pH Level</div>
                <div class="sensor-value ph-value" id="ph">--</div>
                <div>Range: 6.5-8.5 optimal</div>
            </div>
            
            <div class="status-card" id="status">
                <div>Loading system status...</div>
            </div>
        </div>
        
        <div class="controls">
            <button class="btn-primary" onclick="calibratePH()">Calibrate pH</button>
            <button class="btn-secondary" onclick="resetSensors()">Reset System</button>
            <button class="btn-info" onclick="testServer()">Test Server</button>
        </div>
        
        <div class="info-section">
            <h3>System Information</h3>
            <div class="info-grid" id="systemInfo">
                <div class="info-item"><span>Arduino:</span><span id="arduinoStatus">Loading...</span></div>
                <div class="info-item"><span>Node.js Server:</span><span id="serverStatus">Loading...</span></div>
                <div class="info-item"><span>WiFi Signal:</span><span id="wifiSignal">--</span></div>
                <div class="info-item"><span>Free Memory:</span><span id="freeHeap">--</span></div>
                <div class="info-item"><span>Uptime:</span><span id="uptime">--</span></div>
                <div class="info-item"><span>Data Points:</span><span id="dataPoints">--</span></div>
                <div class="info-item"><span>Forward Success:</span><span id="forwardSuccess">--</span></div>
                <div class="info-item"><span>Forward Failures:</span><span id="forwardFailures">--</span></div>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 0.9em;">
            <p><strong>NodeMCU Gateway Status</strong></p>
            <p>Server URL: )rawliteral" + String(NODE_SERVER_URL) + R"rawliteral(</p>
            <p>Device IP: )rawliteral" + WiFi.localIP().toString() + R"rawliteral( | Chip ID: )rawliteral" + String(ESP.getChipId(), HEX) + R"rawliteral(</p>
        </div>
    </div>

    <script>
        let updateInterval;

        function updateData() {
            fetch("/api/current")
                .then(response => response.json())
                .then(data => {
                    document.getElementById("temperature").textContent =
                        data.temperature ? data.temperature.toFixed(1) + "°C" : "--°C";
                    document.getElementById("ph").textContent =
                        data.ph ? data.ph.toFixed(2) : "--";

                    updateStatus(data);
                })
                .catch(error => {
                    console.error("Error fetching data:", error);
                    updateStatus({valid: false, status: "error"});
                });

            fetch("/api/status")
                .then(response => response.json())
                .then(data => {
                    updateSystemInfo(data);
                })
                .catch(error => console.error("Error fetching status:", error));
        }

        function updateStatus(data) {
            const statusEl = document.getElementById("status");

            if (data.valid && data.status === "ok" && data.arduino_connected && data.node_server_connected) {
                statusEl.className = "status-card status-good";
                statusEl.innerHTML = "<div>All Systems Normal - Data Forwarding</div>";
            } else if (data.valid && data.arduino_connected && !data.node_server_connected) {
                statusEl.className = "status-card status-warning";
                statusEl.innerHTML = "<div>Arduino OK - Server Connection Failed</div>";
            } else if (!data.arduino_connected) {
                statusEl.className = "status-card status-error";
                statusEl.innerHTML = "<div>Arduino Disconnected</div>";
            } else {
                statusEl.className = "status-card status-error";
                statusEl.innerHTML = "<div>System Issues</div>";
            }
        }

        function updateSystemInfo(data) {
            document.getElementById("arduinoStatus").textContent =
                data.arduino_connected ? "Connected" : "Disconnected";
            document.getElementById("serverStatus").textContent =
                data.node_server_connected ? "Connected" : "Disconnected";
            document.getElementById("uptime").textContent =
                Math.floor(data.uptime / 1000 / 60) + " minutes";
            document.getElementById("wifiSignal").textContent = data.rssi + " dBm";
            document.getElementById("freeHeap").textContent =
                Math.floor(data.free_heap / 1024) + " KB";
            document.getElementById("dataPoints").textContent = data.data_points;
            document.getElementById("forwardSuccess").textContent = data.forwarding_successes || "0";
            document.getElementById("forwardFailures").textContent = data.forwarding_failures || "0";
        }

        function calibratePH() {
            if (confirm("Start pH sensor calibration? Have buffer solutions ready (pH 4.0, 7.0, 10.0).")) {
                fetch("/api/calibrate", { method: "POST" })
                    .then(response => response.json())
                    .then(data => {
                        alert("pH calibration started. Check Arduino serial monitor for instructions.");
                    })
                    .catch(error => {
                        alert("Error starting calibration: " + error);
                    });
            }
        }

        function resetSensors() {
            if (confirm("Reset all sensors? This will restart the monitoring system.")) {
                fetch("/api/reset", { method: "POST" })
                    .then(response => response.json())
                    .then(data => {
                        alert("System reset initiated. Sensors will restart in a few seconds.");
                    })
                    .catch(error => {
                        alert("Error resetting system: " + error);
                    });
            }
        }

        function testServer() {
            fetch("/api/test-server")
                .then(response => response.json())
                .then(data => {
                    let message = "Node.js Server Connection Test:\n\n";
                    message += "Status: " + (data.node_server_connected ? "Connected" : "Failed") + "\n";
                    message += "Server URL: " + data.server_url + "\n";
                    message += "Forward Attempts: " + data.forwarding_attempts + "\n";
                    message += "Successes: " + data.forwarding_successes + "\n";
                    message += "Failures: " + data.forwarding_failures + "\n";
                    if (data.last_error) {
                        message += "Last Error: " + data.last_error + "\n";
                    }
                    if (data.last_response) {
                        message += "Last Response: " + data.last_response;
                    }
                    alert(message);
                })
                .catch(error => {
                    alert("Error testing server connection: " + error);
                });
        }

        // Start updating data
        updateData();
        updateInterval = setInterval(updateData, 2000); // Update every 2 seconds

        // Handle page visibility changes
        document.addEventListener("visibilitychange", function() {
            if (document.hidden) {
                clearInterval(updateInterval);
            } else {
                updateData();
                updateInterval = setInterval(updateData, 2000);
            }
        });
    </script>
</body>
</html>
)rawliteral";

  server.send(200, "text/html", html);
}


void handleNotFound() {
  systemInfo.requestCount++;
  
  String message = "NodeMCU API Endpoint Not Found\n\n";
  message += "Available endpoints:\n";
  message += "GET  /api/current     - Current sensor data\n";
  message += "GET  /api/history     - Historical data\n";
  message += "GET  /api/status      - System status\n";
  message += "GET  /api/test-server - Test Node.js server connection\n";
  message += "POST /api/calibrate   - Start pH calibration\n";
  message += "POST /api/reset       - Reset sensors\n";
  message += "GET  /                - NodeMCU web interface\n";
  message += "\nNode.js Server URL: " + String(NODE_SERVER_URL) + "\n";
  
  server.send(404, "text/plain", message);
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, LOW);  // LED on
    delay(delayMs);
    digitalWrite(LED_BUILTIN, HIGH); // LED off
    delay(delayMs);
  }
}