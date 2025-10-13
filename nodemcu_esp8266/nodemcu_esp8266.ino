/*
 * AquaVision Pro - NodeMCU ESP8266 Code
 * Crayfish Monitoring System - Cloud Communication
 * 
 * Hardware Connections to Arduino Mega 2560:
 * - ESP8266 RX (GPIO3) → Arduino TX1 (Pin 18)
 * - ESP8266 TX (GPIO1) → Arduino RX1 (Pin 19)
 * - ESP8266 GND → Arduino GND
 * - ESP8266 VIN → 5V (via USB or Buck Converter)
 * 
 * Version: 3.0 - Updated for Mega Hardware Serial
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

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
// HARDWARE SERIAL COMMUNICATION
// ============================================
// ESP8266 uses Hardware Serial to communicate with Arduino Mega
// Serial pins: TX (GPIO1) and RX (GPIO3)
#define arduinoSerial Serial

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
SensorData currentData = {0.0, 7.0, "", 0, "initializing", false, false, false};

unsigned long lastDataSend = 0;
unsigned long lastCommandCheck = 0;
unsigned long lastStatusPrint = 0;
unsigned long lastHeartbeat = 0;

const unsigned long SEND_INTERVAL = 10000;        // Send data every 10 seconds
const unsigned long COMMAND_CHECK_INTERVAL = 5000; // Check commands every 5 seconds
const unsigned long STATUS_PRINT_INTERVAL = 30000; // Print status every 30 seconds
const unsigned long HEARTBEAT_INTERVAL = 60000;   // Ping Arduino every 60 seconds

bool wifiConnected = false;
int connectionAttempts = 0;

// ============================================
// SETUP
// ============================================
void setup() {
  // Initialize Hardware Serial for Arduino Mega communication
  arduinoSerial.begin(9600);
  
  // Wait for serial to stabilize
  delay(2000);
  
  // Initialize LED
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH); // OFF (LED is inverted on ESP8266)
  
  arduinoSerial.println();
  arduinoSerial.println(F("╔════════════════════════════════════════╗"));
  arduinoSerial.println(F("║  AquaVision Pro - NodeMCU ESP8266     ║"));
  arduinoSerial.println(F("║  Cloud Communication Module           ║"));
  arduinoSerial.println(F("║  Version 3.0                          ║"));
  arduinoSerial.println(F("╚════════════════════════════════════════╝"));
  arduinoSerial.println();
  
  // Validate USER_ID
  if (USER_ID.length() < 30) {
    arduinoSerial.println(F("╔════════════════════════════════════════╗"));
    arduinoSerial.println(F("║  ⚠️  ERROR: USER_ID NOT CONFIGURED!   ║"));
    arduinoSerial.println(F("║  Update USER_ID in code                ║"));
    arduinoSerial.println(F("║  Get from: Supabase → Authentication  ║"));
    arduinoSerial.println(F("╚════════════════════════════════════════╝"));
    
    // Rapid blink to indicate error
    while (true) {
      digitalWrite(LED_BUILTIN, LOW);
      delay(100);
      digitalWrite(LED_BUILTIN, HIGH);
      delay(100);
    }
  }
  
  arduinoSerial.print(F("✓ User ID configured: "));
  arduinoSerial.println(USER_ID.substring(0, 8) + "...");
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize NTP client
  arduinoSerial.println(F("Initializing time sync..."));
  timeClient.begin();
  timeClient.update();
  
  arduinoSerial.println();
  arduinoSerial.println(F("✓ ESP8266 initialized successfully!"));
  arduinoSerial.println(F("✓ Ready to receive data from Arduino Mega"));
  arduinoSerial.println(F("✓ Listening on Hardware Serial (TX1/RX1)"));
  arduinoSerial.println();
  
  // Success indication
  blinkLED(3, 200);
  
  // Send initial ping to Arduino
  delay(1000);
  arduinoSerial.println("PING");
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  unsigned long currentMillis = millis();
  
  // Handle incoming data from Arduino Mega
  handleArduinoData();
  
  // Send data to Supabase at intervals
  if (currentMillis - lastDataSend > SEND_INTERVAL && currentData.valid) {
    if (wifiConnected) {
      sendDataToSupabase();
      lastDataSend = currentMillis;
    } else {
      arduinoSerial.println(F("⚠ WiFi disconnected, attempting reconnection..."));
      connectToWiFi();
    }
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
    lastHeartbeat = currentMillis;
  }
  
  // Update NTP time
  if (wifiConnected) {
    timeClient.update();
  }
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
  }
  
  yield(); // Prevent watchdog reset
}

// ============================================
// WIFI CONNECTION
// ============================================
void connectToWiFi() {
  arduinoSerial.println();
  arduinoSerial.print(F("📡 Connecting to WiFi: "));
  arduinoSerial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    arduinoSerial.print(F("."));
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN)); // Blink during connection
    attempts++;
  }
  
  arduinoSerial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    arduinoSerial.println(F("✓ WiFi connected successfully!"));
    arduinoSerial.print(F("  IP Address: "));
    arduinoSerial.println(WiFi.localIP());
    arduinoSerial.print(F("  Signal: "));
    arduinoSerial.print(WiFi.RSSI());
    arduinoSerial.println(F(" dBm"));
    digitalWrite(LED_BUILTIN, HIGH); // Turn OFF LED
    connectionAttempts = 0;
  } else {
    wifiConnected = false;
    connectionAttempts++;
    arduinoSerial.println(F("✗ WiFi connection failed!"));
    arduinoSerial.println(F("  Will retry in next cycle..."));
    
    if (connectionAttempts > 5) {
      arduinoSerial.println(F("⚠ Multiple connection failures!"));
      arduinoSerial.println(F("  Check SSID and password!"));
    }
  }
}

// ============================================
// ARDUINO COMMUNICATION
// ============================================
void handleArduinoData() {
  if (arduinoSerial.available()) {
    String line = arduinoSerial.readStringUntil('\n');
    line.trim();
    
    if (line.length() == 0) return;
    
    // Parse different message types from Arduino
    if (line.startsWith("DATA:")) {
      parseArduinoData(line.substring(5)); // Remove "DATA:" prefix
    } 
    else if (line.startsWith("STATUS:")) {
      arduinoSerial.print(F("📋 Arduino Status: "));
      arduinoSerial.println(line.substring(7));
    }
    else if (line == "PONG") {
      // Heartbeat response received
    }
    else if (line == "WATER_CHANGE_COMPLETE") {
      arduinoSerial.println(F("✓ Water change completed!"));
      blinkLED(5, 100);
      logEventToSupabase("water_change_complete");
    }
    else if (line == "FEEDING_COMPLETE") {
      arduinoSerial.println(F("✓ Feeding completed!"));
      blinkLED(2, 100);
      logEventToSupabase("feeding_complete");
    }
    else if (line == "WATER_TEST_COMPLETE") {
      arduinoSerial.println(F("✓ Water test completed!"));
    }
  }
}

void parseArduinoData(String jsonData) {
  // Clean up JSON string
  jsonData.trim();
  
  // Simple parsing without heavy JSON library
  int tempIdx = jsonData.indexOf("\"temperature\":");
  if (tempIdx != -1) {
    int start = tempIdx + 14;
    int end = jsonData.indexOf(",", start);
    String tempStr = jsonData.substring(start, end);
    if (tempStr != "null") {
      currentData.temperature = tempStr.toFloat();
    }
  }
  
  int phIdx = jsonData.indexOf("\"ph\":");
  if (phIdx != -1) {
    int start = phIdx + 5;
    int end = jsonData.indexOf(",", start);
    String phStr = jsonData.substring(start, end);
    if (phStr != "null") {
      currentData.ph = phStr.toFloat();
    }
  }
  
  int tsIdx = jsonData.indexOf("\"timestamp\":\"");
  if (tsIdx != -1) {
    int start = tsIdx + 13;
    int end = jsonData.indexOf("\"", start);
    currentData.timestamp = jsonData.substring(start, end);
  }
  
  int errIdx = jsonData.indexOf("\"errors\":");
  if (errIdx != -1) {
    int start = errIdx + 9;
    int end = jsonData.indexOf(",", start);
    currentData.errors = jsonData.substring(start, end).toInt();
  }
  
  int statIdx = jsonData.indexOf("\"status\":\"");
  if (statIdx != -1) {
    int start = statIdx + 10;
    int end = jsonData.indexOf("\"", start);
    currentData.status = jsonData.substring(start, end);
  }
  
  int tempOkIdx = jsonData.indexOf("\"temp_sensor_ok\":");
  if (tempOkIdx != -1) {
    String val = jsonData.substring(tempOkIdx + 17);
    currentData.tempSensorOK = val.startsWith("true");
  }
  
  int phOkIdx = jsonData.indexOf("\"ph_sensor_ok\":");
  if (phOkIdx != -1) {
    String val = jsonData.substring(phOkIdx + 15);
    currentData.phSensorOK = val.startsWith("true");
  }
  
  currentData.valid = true;
  
  // Print parsed data
  arduinoSerial.print(F("📊 Data: T="));
  arduinoSerial.print(currentData.temperature, 1);
  arduinoSerial.print(F("°C, pH="));
  arduinoSerial.print(currentData.ph, 2);
  arduinoSerial.print(F(", Status="));
  arduinoSerial.println(currentData.status);
}

// ============================================
// SUPABASE DATA TRANSMISSION
// ============================================
void sendDataToSupabase() {
  if (!wifiConnected) return;
  
  arduinoSerial.println(F("📤 Sending to Supabase..."));
  
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
  
  int httpCode = http.POST(jsonPayload);
  
  if (httpCode > 0) {
    if (httpCode == 201) {
      arduinoSerial.println(F("✓ Data sent successfully!"));
      blinkLED(1, 50);
    } else if (httpCode == 401) {
      arduinoSerial.println(F("✗ Auth error - check API key"));
    } else if (httpCode == 400) {
      arduinoSerial.print(F("✗ Bad request: "));
      arduinoSerial.println(http.getString());
    } else {
      arduinoSerial.print(F("⚠ HTTP "));
      arduinoSerial.print(httpCode);
      arduinoSerial.print(F(": "));
      arduinoSerial.println(http.getString());
    }
  } else {
    arduinoSerial.print(F("✗ Connection error: "));
    arduinoSerial.println(http.errorToString(httpCode));
  }
  
  http.end();
}

// ============================================
// SUPABASE COMMAND CHECKING
// ============================================
void checkForCommands() {
  if (!wifiConnected) return;
  
  WiFiClientSecure client;
  client.setInsecure();
  
  HTTPClient http;
  
  String url = String(SUPABASE_URL) + "/rest/v1/device_commands?user_id=eq." + USER_ID + 
               "&status=eq.pending&order=created_at.asc&limit=1";
  
  http.begin(client, url);
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error && doc.size() > 0) {
      String command = doc[0]["command"];
      String commandId = doc[0]["id"];
      
      arduinoSerial.print(F("🎯 Command received: "));
      arduinoSerial.println(command);
      
      // Send command to Arduino Mega
      if (command == "feed") {
        arduinoSerial.println("FEED_NOW");
      } 
      else if (command == "change_water") {
        arduinoSerial.println("CHANGE_WATER");
      } 
      else if (command == "test_water") {
        arduinoSerial.println("TEST_WATER");
      } 
      else if (command == "test_connection") {
        arduinoSerial.println(F("✓ ESP8266 connection test successful!"));
        blinkLED(3, 100);
      }
      else if (command == "emergency_stop") {
        arduinoSerial.println("EMERGENCY_STOP");
      }
      
      // Mark command as processed
      markCommandProcessed(commandId);
    }
  }
  
  http.end();
}

void markCommandProcessed(String commandId) {
  WiFiClientSecure client;
  client.setInsecure();
  
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/device_commands?id=eq." + commandId;
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.addHeader("Prefer", "return=minimal");
  
  StaticJsonDocument<128> doc;
  doc["status"] = "processed";
  doc["processed_at"] = timeClient.getFormattedTime();
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.PATCH(payload);
  
  if (httpCode == 200 || httpCode == 204) {
    arduinoSerial.println(F("✓ Command marked processed"));
  }
  
  http.end();
}

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
  
  StaticJsonDocument<256> doc;
  doc["user_id"] = USER_ID;
  doc["event_type"] = eventType;
  doc["description"] = "Event logged from ESP8266";
  
  String payload;
  serializeJson(doc, payload);
  
  http.POST(payload);
  http.end();
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
  
  return max(0, score);
}

void printStatus() {
  arduinoSerial.println(F("\n╔════════════════════════════════════════╗"));
  arduinoSerial.println(F("║       ESP8266 STATUS REPORT            ║"));
  arduinoSerial.println(F("╚════════════════════════════════════════╝"));
  
  arduinoSerial.print(F("📡 WiFi: "));
  arduinoSerial.print(wifiConnected ? F("Connected") : F("Disconnected"));
  if (wifiConnected) {
    arduinoSerial.print(F(" ("));
    arduinoSerial.print(WiFi.RSSI());
    arduinoSerial.println(F(" dBm)"));
    arduinoSerial.print(F("🌐 IP: "));
    arduinoSerial.println(WiFi.localIP());
  } else {
    arduinoSerial.println();
  }
  
  arduinoSerial.print(F("⏱ Uptime: "));
  arduinoSerial.print(millis() / 1000);
  arduinoSerial.println(F(" seconds"));
  
  arduinoSerial.print(F("💾 Free Heap: "));
  arduinoSerial.print(ESP.getFreeHeap());
  arduinoSerial.println(F(" bytes"));
  
  arduinoSerial.print(F("📊 Last Data: T="));
  arduinoSerial.print(currentData.temperature, 1);
  arduinoSerial.print(F("°C, pH="));
  arduinoSerial.println(currentData.ph, 2);
  
  arduinoSerial.print(F("🏥 Health Score: "));
  arduinoSerial.println(calculateHealthScore());
  
  arduinoSerial.println();
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, LOW);  // ON (inverted)
    delay(delayMs);
    digitalWrite(LED_BUILTIN, HIGH); // OFF
    delay(delayMs);
  }
}