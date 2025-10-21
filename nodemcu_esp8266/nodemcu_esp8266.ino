/*
 * AquaVision Pro - NodeMCU ESP8266 Code
 * Crayfish Monitoring System - Cloud Communication
 * 
 * Hardware Connections to Arduino Mega 2560:
 * - ESP8266 D5 (GPIO14/RX) → Arduino TX1 (Pin 18) via Level Shifter
 * - ESP8266 D6 (GPIO12/TX) → Arduino RX1 (Pin 19) via Level Shifter
 * - ESP8266 GND → Arduino GND
 * - ESP8266 VIN → 5V (via USB or Buck Converter)
 * 
 * IMPORTANT: Use 3.3V-5V level shifter for TX/RX communication!
 * 
 * Version: 3.3 - CORRECTED - SoftwareSerial Implementation
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <time.h>
#include <SoftwareSerial.h>

// ============================================
// CONFIGURATION - UPDATE THESE!
// ============================================

// WiFi Settings
const char* WIFI_SSID = "Kambal_2.4G";
const char* WIFI_PASSWORD = "Jonjon_2627272727";

// Supabase Configuration
const char* SUPABASE_URL = "https://qleubfvmydnitmsylqxo.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZXViZnZteWRuaXRtc3lscXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODg2MjksImV4cCI6MjA3NDk2NDYyOX0.1LtaFFXPadqUZM7iaN-0fJbLcDvbkYZkhdLYpfBBReA";

// IMPORTANT: Replace with your user ID from Supabase Dashboard
String USER_ID = "26559b74-028b-4d17-b8f7-ed259953b328";

// ============================================
// SOFTWARE SERIAL COMMUNICATION
// ============================================
// SoftwareSerial pins: RX=D5(GPIO14), TX=D6(GPIO12)
SoftwareSerial arduinoSerial(14, 12); // RX, TX

// ============================================
// NTP TIME CLIENT
// ============================================
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 28800, 60000); // UTC+8 (Philippines)

// ============================================
// DATA STRUCTURES
// ============================================
struct SensorData {
  float temperature;
  float ph;
  String timestamp;
  int errors;
  String status;
  bool valid;
  bool tempSensorOK;
  bool phSensorOK;
};

// ============================================
// GLOBAL VARIABLES
// ============================================
SensorData currentData = {24.5, 7.0, "", 0, "initializing", false, false, false};

unsigned long lastDataSend = 0;
unsigned long lastCommandCheck = 0;
unsigned long lastStatusPrint = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastWiFiCheck = 0;

const unsigned long SEND_INTERVAL = 30000;           // Send data every 30 seconds
const unsigned long COMMAND_CHECK_INTERVAL = 10000;  // Check commands every 10 seconds
const unsigned long STATUS_PRINT_INTERVAL = 60000;   // Print status every 60 seconds
const unsigned long HEARTBEAT_INTERVAL = 45000;      // Ping Arduino every 45 seconds
const unsigned long WIFI_CHECK_INTERVAL = 30000;     // Check WiFi every 30 seconds

bool wifiConnected = false;
int connectionAttempts = 0;
int failedSendCount = 0;

// Command tracking to prevent duplicates
String lastProcessedCommandId = "";
unsigned long lastCommandTime = 0;
const unsigned long COMMAND_COOLDOWN = 5000; // 5 second cooldown between same commands

// ============================================
// FUNCTION DECLARATIONS
// ============================================
void connectToWiFi();
void clearOldCommands();
void handleArduinoData();
void parseArduinoData(String jsonData);
void sendDataToSupabase();
void checkForCommands();
void markCommandProcessed(String commandId);
void logEventToSupabase(String eventType);
int calculateHealthScore();
void printStatus();
void blinkLED(int times, int delayMs);
bool isValidTemperature(float temp);
bool isValidPH(float ph);

// ============================================
// SETUP
// ============================================
void setup() {
  // Initialize USB Serial for debugging
  Serial.begin(115200);
  
  // Initialize SoftwareSerial for Arduino Mega communication
  arduinoSerial.begin(9600);
  
  // Wait for serial ports to stabilize
  delay(2000);
  
  // Initialize LED
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH); // OFF (LED is inverted on ESP8266)
  
  Serial.println();
  Serial.println(F("╔════════════════════════════════════════╗"));
  Serial.println(F("║  AquaVision Pro - NodeMCU ESP8266     ║"));
  Serial.println(F("║  Cloud Communication Module           ║"));
  Serial.println(F("║  Version 3.3 - CORRECTED              ║"));
  Serial.println(F("╚════════════════════════════════════════╝"));
  Serial.println();
  
  Serial.println(F("Communication Setup:"));
  Serial.println(F("  USB Serial (Debug): 115200 baud"));
  Serial.println(F("  Arduino Serial: 9600 baud"));
  Serial.println(F("  RX: D5 (GPIO14) ← Arduino TX1"));
  Serial.println(F("  TX: D6 (GPIO12) → Arduino RX1"));
  Serial.println();
  
  // Validate USER_ID
  if (USER_ID.length() < 30) {
    Serial.println(F("╔════════════════════════════════════════╗"));
    Serial.println(F("║  ⚠️  ERROR: USER_ID NOT CONFIGURED!   ║"));
    Serial.println(F("║  Update USER_ID in code                ║"));
    Serial.println(F("║  Get from: Supabase → Authentication  ║"));
    Serial.println(F("╚════════════════════════════════════════╝"));
    
    // Rapid blink to indicate error
    while (true) {
      digitalWrite(LED_BUILTIN, LOW);
      delay(100);
      digitalWrite(LED_BUILTIN, HIGH);
      delay(100);
    }
  }
  
  Serial.print(F("✓ User ID configured: "));
  Serial.println(USER_ID.substring(0, 8) + "...");
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize NTP client
  if (wifiConnected) {
    Serial.println(F("Initializing time sync..."));
    timeClient.begin();
    timeClient.update();
    
    if (timeClient.isTimeSet()) {
      Serial.print(F("✓ Time synchronized: "));
      Serial.println(timeClient.getFormattedTime());
    } else {
      Serial.println(F("⚠ Time sync failed, will retry..."));
    }
  }
  
  // Clear old pending commands on startup
  if (wifiConnected) {
    clearOldCommands();
  }
  
  Serial.println();
  Serial.println(F("✓ ESP8266 initialized successfully!"));
  Serial.println(F("✓ Ready to receive data from Arduino Mega"));
  Serial.println(F("✓ Listening on SoftwareSerial (D5/D6)"));
  Serial.println();
  
  // Success indication
  blinkLED(3, 200);
  
  // Send initial ping to Arduino
  delay(1000);
  Serial.println(F("Sending PING to Arduino..."));
  arduinoSerial.println("PING");
  
  Serial.println(F("\n--- System Ready ---\n"));
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  unsigned long currentMillis = millis();
  
  // Handle incoming data from Arduino Mega
  handleArduinoData();
  
  // Check WiFi connection status periodically
  if (currentMillis - lastWiFiCheck > WIFI_CHECK_INTERVAL) {
    if (WiFi.status() != WL_CONNECTED) {
      wifiConnected = false;
      Serial.println(F("⚠ WiFi disconnected! Reconnecting..."));
      connectToWiFi();
    } else if (!wifiConnected) {
      wifiConnected = true;
      Serial.println(F("✓ WiFi reconnected!"));
    }
    lastWiFiCheck = currentMillis;
  }
  
  // Send data to Supabase at intervals (only if valid data exists)
  if (currentMillis - lastDataSend > SEND_INTERVAL) {
    if (currentData.valid) {
      if (wifiConnected) {
        sendDataToSupabase();
        lastDataSend = currentMillis;
      } else {
        Serial.println(F("⚠ Cannot send data - WiFi disconnected"));
        failedSendCount++;
        if (failedSendCount > 3) {
          connectToWiFi();
          failedSendCount = 0;
        }
      }
    } else {
      Serial.println(F("⏳ Waiting for valid data from Arduino..."));
      // Request data from Arduino
      arduinoSerial.println("GET_DATA");
    }
    lastDataSend = currentMillis;
  }
  
  // Check for commands from Supabase
  if (currentMillis - lastCommandCheck > COMMAND_CHECK_INTERVAL) {
    if (wifiConnected) {
      checkForCommands();
    }
    lastCommandCheck = currentMillis;
  }
  
  // Print status periodically
  if (currentMillis - lastStatusPrint > STATUS_PRINT_INTERVAL) {
    printStatus();
    lastStatusPrint = currentMillis;
  }
  
  // Send heartbeat to Arduino
  if (currentMillis - lastHeartbeat > HEARTBEAT_INTERVAL) {
    arduinoSerial.println("PING");
    Serial.println(F("💓 Ping → Arduino"));
    lastHeartbeat = currentMillis;
  }
  
  // Update NTP time
  if (wifiConnected && timeClient.isTimeSet()) {
    timeClient.update();
  }
  
  yield(); // Prevent watchdog reset
}

// ============================================
// WIFI CONNECTION
// ============================================
void connectToWiFi() {
  Serial.println();
  Serial.print(F("📡 Connecting to WiFi: "));
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(F("."));
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN)); // Blink during connection
    attempts++;
    yield(); // Prevent watchdog
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    failedSendCount = 0;
    Serial.println(F("✓ WiFi connected successfully!"));
    Serial.print(F("  IP Address: "));
    Serial.println(WiFi.localIP());
    Serial.print(F("  Signal: "));
    Serial.print(WiFi.RSSI());
    Serial.println(F(" dBm"));
    Serial.print(F("  MAC: "));
    Serial.println(WiFi.macAddress());
    digitalWrite(LED_BUILTIN, HIGH); // Turn OFF LED
    connectionAttempts = 0;
  } else {
    wifiConnected = false;
    connectionAttempts++;
    Serial.println(F("✗ WiFi connection failed!"));
    Serial.println(F("  Will retry in next cycle..."));
    
    if (connectionAttempts > 5) {
      Serial.println(F("⚠ Multiple connection failures!"));
      Serial.println(F("  Check SSID and password!"));
      Serial.println(F("  Check WiFi router proximity!"));
    }
  }
}

// ============================================
// CLEAR OLD COMMANDS ON STARTUP
// ============================================
void clearOldCommands() {
  Serial.println(F("🧹 Clearing old pending commands..."));
  
  WiFiClientSecure client;
  client.setInsecure();
  
  HTTPClient http;
  
  // Get all pending commands
  String url = String(SUPABASE_URL) + "/rest/v1/device_commands?user_id=eq." + USER_ID + 
               "&status=eq.pending";
  
  http.begin(client, url);
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.setTimeout(10000); // 10 second timeout
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    
    StaticJsonDocument<2048> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      int commandCount = doc.size();
      
      if (commandCount > 0) {
        Serial.print(F("  Found "));
        Serial.print(commandCount);
        Serial.println(F(" pending commands"));
        
        // Mark all as processed
        for (int i = 0; i < commandCount; i++) {
          String commandId = doc[i]["id"].as<String>();
          markCommandProcessed(commandId);
          delay(200); // Small delay between requests
          yield();
        }
        
        Serial.println(F("✓ Old commands cleared"));
      } else {
        Serial.println(F("✓ No old commands found"));
      }
    } else {
      Serial.print(F("⚠ JSON parse error: "));
      Serial.println(error.c_str());
    }
  } else if (httpCode > 0) {
    Serial.print(F("⚠ HTTP error: "));
    Serial.println(httpCode);
  } else {
    Serial.print(F("⚠ Connection error: "));
    Serial.println(http.errorToString(httpCode));
  }
  
  http.end();
}

// ============================================
// ARDUINO COMMUNICATION
// ============================================
void handleArduinoData() {
  if (arduinoSerial.available()) {
    String line = arduinoSerial.readStringUntil('\n');
    line.trim();
    
    if (line.length() == 0) return;
    
    // Echo to debug serial
    Serial.print(F("📥 Arduino: "));
    Serial.println(line);
    
    // Parse different message types from Arduino
    if (line.startsWith("DATA:")) {
      parseArduinoData(line.substring(5)); // Remove "DATA:" prefix
    } 
    else if (line.startsWith("STATUS:")) {
      Serial.print(F("📋 Arduino Status: "));
      Serial.println(line.substring(7));
    }
    else if (line == "PONG") {
      Serial.println(F("💓 Arduino heartbeat OK"));
    }
    else if (line == "WATER_CHANGE_COMPLETE") {
      Serial.println(F("✓ Water change completed!"));
      blinkLED(5, 100);
      logEventToSupabase("water_change_complete");
    }
    else if (line == "FEEDING_COMPLETE") {
      Serial.println(F("✓ Feeding completed!"));
      blinkLED(2, 100);
      logEventToSupabase("feeding_complete");
    }
    else if (line == "WATER_TEST_COMPLETE") {
      Serial.println(F("✓ Water test completed!"));
      logEventToSupabase("water_test_complete");
    }
    else if (line.startsWith("ERROR:")) {
      Serial.print(F("❌ Arduino Error: "));
      Serial.println(line.substring(6));
    }
    
    yield(); // Prevent watchdog
  }
}

void parseArduinoData(String jsonData) {
  // Clean up JSON string
  jsonData.trim();
  
  Serial.println(F("Parsing sensor data..."));
  
  // Parse using ArduinoJson for better reliability
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, jsonData);
  
  if (!error) {
    // Extract values with validation
    float temp = doc["temperature"] | 24.5;
    float ph = doc["ph"] | 7.0;
    
    if (isValidTemperature(temp)) {
      currentData.temperature = temp;
    } else {
      Serial.println(F("⚠ Invalid temperature, using last value"));
    }
    
    if (isValidPH(ph)) {
      currentData.ph = ph;
    } else {
      Serial.println(F("⚠ Invalid pH, using last value"));
    }
    
    currentData.timestamp = doc["timestamp"] | "2025-01-15T12:00:00";
    currentData.errors = doc["errors"] | 0;
    currentData.status = doc["status"] | "unknown";
    currentData.tempSensorOK = doc["temp_sensor_ok"] | false;
    currentData.phSensorOK = doc["ph_sensor_ok"] | false;
    currentData.valid = true;
    
    // Print parsed data
    Serial.print(F("📊 Data: T="));
    Serial.print(currentData.temperature, 1);
    Serial.print(F("°C, pH="));
    Serial.print(currentData.ph, 2);
    Serial.print(F(", Status="));
    Serial.println(currentData.status);
    
  } else {
    Serial.print(F("❌ JSON parse error: "));
    Serial.println(error.c_str());
    Serial.println(F("Raw data: "));
    Serial.println(jsonData);
    
    // Fallback to simple parsing if JSON fails
    int tempIdx = jsonData.indexOf("\"temperature\":");
    if (tempIdx != -1) {
      int start = tempIdx + 14;
      int end = jsonData.indexOf(",", start);
      if (end > start) {
        String tempStr = jsonData.substring(start, end);
        float temp = tempStr.toFloat();
        if (isValidTemperature(temp)) {
          currentData.temperature = temp;
          currentData.valid = true;
        }
      }
    }
    
    int phIdx = jsonData.indexOf("\"ph\":");
    if (phIdx != -1) {
      int start = phIdx + 5;
      int end = jsonData.indexOf(",", start);
      if (end > start) {
        String phStr = jsonData.substring(start, end);
        float ph = phStr.toFloat();
        if (isValidPH(ph)) {
          currentData.ph = ph;
          currentData.valid = true;
        }
      }
    }
  }
}

// ============================================
// SUPABASE DATA TRANSMISSION
// ============================================
void sendDataToSupabase() {
  if (!wifiConnected) {
    Serial.println(F("⚠ Cannot send - WiFi disconnected"));
    return;
  }
  
  Serial.println(F("📤 Sending to Supabase..."));
  
  // Create JSON payload
  StaticJsonDocument<512> doc;
  doc["user_id"] = USER_ID;
  doc["temperature"] = currentData.temperature;
  doc["ph"] = currentData.ph;
  doc["population"] = 15;
  doc["health_status"] = calculateHealthScore();
  doc["avg_weight"] = 5.0;
  doc["days_to_harvest"] = 120;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.print(F("  Payload: "));
  Serial.println(jsonPayload);
  
  // Create secure client
  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL verification
  
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/sensor_readings";
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.addHeader("Prefer", "return=minimal");
  http.setTimeout(10000); // 10 second timeout
  
  int httpCode = http.POST(jsonPayload);
  
  if (httpCode > 0) {
    if (httpCode == 201) {
      Serial.println(F("✓ Data sent successfully!"));
      blinkLED(1, 50);
      failedSendCount = 0;
    } else if (httpCode == 401) {
      Serial.println(F("✗ Auth error - check API key"));
    } else if (httpCode == 400) {
      Serial.print(F("✗ Bad request: "));
      Serial.println(http.getString());
    } else {
      Serial.print(F("⚠ HTTP "));
      Serial.print(httpCode);
      Serial.print(F(": "));
      String response = http.getString();
      Serial.println(response.substring(0, 100)); // Limit response length
    }
  } else {
    Serial.print(F("✗ Connection error: "));
    Serial.println(http.errorToString(httpCode));
    failedSendCount++;
  }
  
  http.end();
  yield();
}

// ============================================
// SUPABASE COMMAND CHECKING
// ============================================
void checkForCommands() {
  if (!wifiConnected) return;
  
  WiFiClientSecure client;
  client.setInsecure();
  
  HTTPClient http;
  
  // Only get the most recent pending command
  String url = String(SUPABASE_URL) + "/rest/v1/device_commands?user_id=eq." + USER_ID + 
               "&status=eq.pending&order=created_at.desc&limit=1";
  
  http.begin(client, url);
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.setTimeout(10000);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    
    // Check if response is empty array
    if (response == "[]" || response.length() < 5) {
      http.end();
      return; // No commands
    }
    
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error && doc.size() > 0) {
      String command = doc[0]["command"].as<String>();
      String commandId = doc[0]["id"].as<String>();
      
      // Prevent duplicate command execution
      if (commandId == lastProcessedCommandId) {
        http.end();
        return; // Already processed this command
      }
      
      // Check cooldown period
      unsigned long currentTime = millis();
      if (currentTime - lastCommandTime < COMMAND_COOLDOWN) {
        Serial.println(F("⏳ Command cooldown active, skipping..."));
        http.end();
        return;
      }
      
      Serial.print(F("🎯 Command received: "));
      Serial.println(command);
      
      // Execute command based on type
      if (command == "feed") {
        arduinoSerial.println("FEED_NOW");
        Serial.println(F("→ Sent FEED_NOW to Arduino"));
      } 
      else if (command == "change_water") {
        arduinoSerial.println("CHANGE_WATER");
        Serial.println(F("→ Sent CHANGE_WATER to Arduino"));
      } 
      else if (command == "test_water") {
        arduinoSerial.println("TEST_WATER");
        Serial.println(F("→ Sent TEST_WATER to Arduino"));
      } 
      else if (command == "test_connection") {
        Serial.println(F("✓ ESP8266 connection test successful!"));
        Serial.print(F("  WiFi: "));
        Serial.print(WiFi.RSSI());
        Serial.println(F(" dBm"));
        Serial.print(F("  IP: "));
        Serial.println(WiFi.localIP());
        Serial.print(F("  Free Heap: "));
        Serial.print(ESP.getFreeHeap());
        Serial.println(F(" bytes"));
        blinkLED(3, 100);
      }
      else if (command == "emergency_stop") {
        arduinoSerial.println("EMERGENCY_STOP");
        Serial.println(F("🚨 EMERGENCY STOP ACTIVATED!"));
      }
      else {
        Serial.print(F("⚠ Unknown command: "));
        Serial.println(command);
      }
      
      // Mark command as processed IMMEDIATELY
      markCommandProcessed(commandId);
      
      // Update tracking variables
      lastProcessedCommandId = commandId;
      lastCommandTime = currentTime;
    } else if (error) {
      Serial.print(F("⚠ Command parse error: "));
      Serial.println(error.c_str());
    }
  } else if (httpCode > 0) {
    Serial.print(F("⚠ Command check HTTP error: "));
    Serial.println(httpCode);
  }
  
  http.end();
  yield();
}

// ============================================
// MARK COMMAND AS PROCESSED
// ============================================
void markCommandProcessed(String commandId) {
  if (!wifiConnected) return;
  
  WiFiClientSecure client;
  client.setInsecure();
  
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/device_commands?id=eq." + commandId;
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.addHeader("Prefer", "return=minimal");
  http.setTimeout(10000);
  
  StaticJsonDocument<256> doc;
  doc["status"] = "processed";
  
  // Get current epoch time and convert to ISO 8601
  timeClient.update();
  unsigned long epochTime = timeClient.getEpochTime();
  
  // Format as ISO 8601: YYYY-MM-DDTHH:MM:SSZ
  time_t rawTime = (time_t)epochTime;
  struct tm* timeInfo = gmtime(&rawTime);
  
  char timestamp[25];
  sprintf(timestamp, "%04d-%02d-%02dT%02d:%02d:%02dZ",
          timeInfo->tm_year + 1900,
          timeInfo->tm_mon + 1,
          timeInfo->tm_mday,
          timeInfo->tm_hour,
          timeInfo->tm_min,
          timeInfo->tm_sec);
  
  doc["processed_at"] = timestamp;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.PATCH(payload);
  
  if (httpCode == 200 || httpCode == 204) {
    Serial.println(F("✓ Command marked as processed"));
  } else if (httpCode > 0) {
    Serial.print(F("⚠ Failed to mark command: HTTP "));
    Serial.print(httpCode);
    Serial.print(F(" - "));
    Serial.println(http.getString().substring(0, 50));
  } else {
    Serial.print(F("⚠ Failed to mark command: "));
    Serial.println(http.errorToString(httpCode));
  }
  
  http.end();
  yield();
}

// ============================================
// LOG EVENTS TO SUPABASE
// ============================================
void logEventToSupabase(String eventType) {
  if (!wifiConnected) return;
  
  WiFiClientSecure client;
  client.setInsecure();
  
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/system_events";
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.addHeader("Prefer", "return=minimal");
  http.setTimeout(10000);
  
  StaticJsonDocument<256> doc;
  doc["user_id"] = USER_ID;
  doc["event_type"] = eventType;
  doc["description"] = "Event logged from ESP8266";
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode == 201) {
    Serial.println(F("✓ Event logged to Supabase"));
  } else if (httpCode > 0) {
    Serial.print(F("⚠ Failed to log event: HTTP "));
    Serial.println(httpCode);
  }
  
  http.end();
  yield();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
int calculateHealthScore() {
  int score = 100;
  
  // Temperature check (ideal: 18-24°C)
  if (currentData.temperature < 18 || currentData.temperature > 24) score -= 20;
  if (currentData.temperature < 16 || currentData.temperature > 26) score -= 30;
  
  // pH check (ideal: 6.5-8.5)
  if (currentData.ph < 6.5 || currentData.ph > 8.5) score -= 20;
  if (currentData.ph < 6.0 || currentData.ph > 9.0) score -= 30;
  
  // Sensor status
  if (!currentData.tempSensorOK) score -= 25;
  if (!currentData.phSensorOK) score -= 25;
  
  // Error penalty
  if (currentData.errors > 5) score -= 10;
  if (currentData.errors > 10) score -= 20;
  
  return max(0, score);
}

bool isValidTemperature(float temp) {
  return (temp > -10.0 && temp < 50.0);
}

bool isValidPH(float ph) {
  return (ph >= 0.0 && ph <= 14.0);
}

void printStatus() {
  Serial.println(F("\n╔════════════════════════════════════════╗"));
  Serial.println(F("║       ESP8266 STATUS REPORT            ║"));
  Serial.println(F("╚════════════════════════════════════════╝"));
  
  Serial.print(F("📡 WiFi: "));
  Serial.print(wifiConnected ? F("Connected") : F("Disconnected"));
  if (wifiConnected) {
    Serial.print(F(" ("));
    Serial.print(WiFi.RSSI());
    Serial.println(F(" dBm)"));
    Serial.print(F("🌐 IP: "));
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
  }
  
  Serial.print(F("⏱ Uptime: "));
  unsigned long seconds = millis() / 1000;
  unsigned long minutes = seconds / 60;
  unsigned long hours = minutes / 60;
  Serial.print(hours);
  Serial.print(F("h "));
  Serial.print(minutes % 60);
  Serial.print(F("m "));
  Serial.print(seconds % 60);
  Serial.println(F("s"));
  
  Serial.print(F("💾 Free Heap: "));
  Serial.print(ESP.getFreeHeap());
  Serial.println(F(" bytes"));
  
  Serial.print(F("📊 Last Data: T="));
  Serial.print(currentData.temperature, 1);
  Serial.print(F("°C, pH="));
  Serial.print(currentData.ph, 2);
  Serial.print(F(", Errors="));
  Serial.println(currentData.errors);
  
  Serial.print(F("🔬 Sensors: Temp="));
  Serial.print(currentData.tempSensorOK ? F("OK") : F("FAIL"));
  Serial.print(F(", pH="));
  Serial.println(currentData.phSensorOK ? F("OK") : F("FAIL"));
  
  Serial.print(F("🏥 Health Score: "));
  Serial.print(calculateHealthScore());
  Serial.println(F("%"));
  
  Serial.print(F("📝 Data Valid: "));
  Serial.println(currentData.valid ? F("Yes") : F("No (waiting for Arduino)"));
  
  Serial.print(F("⚠ Failed Sends: "));
  Serial.println(failedSendCount);
  
  if (timeClient.isTimeSet()) {
    Serial.print(F("🕐 Time: "));
    Serial.println(timeClient.getFormattedTime());
  }
  
  Serial.println();
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, LOW);  // ON (inverted)
    delay(delayMs);
    digitalWrite(LED_BUILTIN, HIGH); // OFF
    delay(delayMs);
    yield(); // Prevent watchdog
  }
}