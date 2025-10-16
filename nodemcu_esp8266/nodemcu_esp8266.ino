/*
 * AquaVision Pro - NodeMCU ESP8266 Code (FIXED)
 * Version: 5.1 - Critical Fixes Applied
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ============================================
// CONFIGURATION
// ============================================

const char* WIFI_SSID = "Kambal_2.4G";
const char* WIFI_PASSWORD = "Jonjon_2627272727";

const char* SUPABASE_URL = "https://qleubfvmydnitmsylqxo.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZXViZnZteWRuaXRtc3lscXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODg2MjksImV4cCI6MjA3NDk2NDYyOX0.1LtaFFXPadqUZM7iaN-0fJbLcDvbkYZkhdLYpfBBReA";

// CRITICAL: Replace with YOUR user ID from Supabase
String USER_ID = "26559b74-028b-4d17-b8f7-ed259953b328";

// ============================================
// HARDWARE SERIAL
// ============================================
#define arduinoSerial Serial

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
// GLOBALS
// ============================================
SensorData currentData = {0.0, 7.0, "", 0, "initializing", false, false, false};

unsigned long lastDataSend = 0;
unsigned long lastCommandCheck = 0;
unsigned long lastStatusPrint = 0;
unsigned long lastHeartbeat = 0;

const unsigned long SEND_INTERVAL = 10000;        // Send data every 10 seconds
const unsigned long COMMAND_CHECK_INTERVAL = 5000; // Check commands every 5 seconds
const unsigned long STATUS_PRINT_INTERVAL = 30000; // Print status every 30 seconds
const unsigned long HEARTBEAT_INTERVAL = 60000;    // Send heartbeat every 60 seconds

bool wifiConnected = false;
int successfulSends = 0;
int failedSends = 0;

// ============================================
// SETUP
// ============================================
void setup() {
  arduinoSerial.begin(9600);
  delay(2000);
  
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);
  
  arduinoSerial.println();
  arduinoSerial.println(F("╔════════════════════════════════════════╗"));
  arduinoSerial.println(F("║  AquaVision Pro ESP8266 v5.1          ║"));
  arduinoSerial.println(F("║  FIXED VERSION                        ║"));
  arduinoSerial.println(F("╚════════════════════════════════════════╝"));
  arduinoSerial.println();
  
  // Validate USER_ID
  if (USER_ID.length() < 30) {
    arduinoSerial.println(F("╔════════════════════════════════════════╗"));
    arduinoSerial.println(F("║  ⚠️  ERROR: USER_ID NOT SET!          ║"));
    arduinoSerial.println(F("║  Update USER_ID in code!              ║"));
    arduinoSerial.println(F("╚════════════════════════════════════════╝"));
    while (true) {
      digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
      delay(100);
    }
  }
  
  arduinoSerial.print(F("✓ User ID: "));
  arduinoSerial.println(USER_ID.substring(0, 8) + "...");
  
  connectToWiFi();
  
  arduinoSerial.println();
  arduinoSerial.println(F("✓ ESP8266 ready!"));
  arduinoSerial.println();
  
  blinkLED(3, 200);
  delay(1000);
  arduinoSerial.println("PING");
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  unsigned long currentMillis = millis();
  
  // Handle incoming Arduino data
  handleArduinoData();
  
  // Send data to Supabase
  if (currentMillis - lastDataSend > SEND_INTERVAL && currentData.valid) {
    if (wifiConnected) {
      sendDataToSupabase();
      lastDataSend = currentMillis;
    } else {
      arduinoSerial.println(F("⚠ WiFi disconnected, reconnecting..."));
      connectToWiFi();
    }
  }
  
  // Check for commands
  if (currentMillis - lastCommandCheck > COMMAND_CHECK_INTERVAL && wifiConnected) {
    checkForCommands();
    lastCommandCheck = currentMillis;
  }
  
  // Print status
  if (currentMillis - lastStatusPrint > STATUS_PRINT_INTERVAL) {
    printStatus();
    lastStatusPrint = currentMillis;
  }
  
  // Send heartbeat
  if (currentMillis - lastHeartbeat > HEARTBEAT_INTERVAL) {
    arduinoSerial.println("PING");
    lastHeartbeat = currentMillis;
  }
  
  // Check WiFi status
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
  }
  
  yield();
}

// ============================================
// WIFI
// ============================================
void connectToWiFi() {
  arduinoSerial.println();
  arduinoSerial.print(F("📡 Connecting to: "));
  arduinoSerial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    arduinoSerial.print(F("."));
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    attempts++;
  }
  
  arduinoSerial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    arduinoSerial.println(F("✓ WiFi connected!"));
    arduinoSerial.print(F("  IP: "));
    arduinoSerial.println(WiFi.localIP());
    arduinoSerial.print(F("  Signal: "));
    arduinoSerial.print(WiFi.RSSI());
    arduinoSerial.println(F(" dBm"));
    digitalWrite(LED_BUILTIN, HIGH);
  } else {
    wifiConnected = false;
    arduinoSerial.println(F("✗ WiFi failed!"));
  }
}

// ============================================
// ARDUINO COMMUNICATION (FIXED)
// ============================================
void handleArduinoData() {
  if (arduinoSerial.available()) {
    String line = arduinoSerial.readStringUntil('\n');
    line.trim();
    
    if (line.length() == 0) return;
    
    if (line.startsWith("DATA:")) {
      parseArduinoData(line.substring(5));
    } 
    else if (line.startsWith("STATUS:")) {
      arduinoSerial.print(F("📋 Arduino: "));
      arduinoSerial.println(line.substring(7));
    }
    else if (line == "PONG") {
      // Heartbeat OK
    }
    else if (line == "WATER_CHANGE_COMPLETE") {
      arduinoSerial.println(F("✓ Water change done!"));
      blinkLED(5, 100);
    }
    else if (line == "FEEDING_COMPLETE") {
      arduinoSerial.println(F("✓ Feeding done!"));
      blinkLED(2, 100);
    }
  }
}

void parseArduinoData(String jsonData) {
  jsonData.trim();
  
  // Use ArduinoJson for proper parsing
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, jsonData);
  
  if (error) {
    arduinoSerial.print(F("✗ JSON error: "));
    arduinoSerial.println(error.c_str());
    arduinoSerial.println(F("Raw data:"));
    arduinoSerial.println(jsonData);
    return;
  }
  
  // Extract values with proper defaults
  currentData.temperature = doc["temperature"] | 0.0;
  currentData.ph = doc["ph"] | 7.0;
  currentData.timestamp = doc["timestamp"].as<String>();
  currentData.errors = doc["errors"] | 0;
  currentData.status = doc["status"].as<String>();
  currentData.tempSensorOK = doc["temp_sensor_ok"] | false;
  currentData.phSensorOK = doc["ph_sensor_ok"] | false;
  currentData.valid = true;
  
  arduinoSerial.print(F("📊 T="));
  arduinoSerial.print(currentData.temperature, 1);
  arduinoSerial.print(F("°C, pH="));
  arduinoSerial.println(currentData.ph, 2);
}

// ============================================
// SUPABASE (FIXED)
// ============================================
void sendDataToSupabase() {
  if (!wifiConnected) return;
  
  arduinoSerial.println(F("📤 Sending..."));
  
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
  
  // FIXED: Use WiFiClientSecure properly
  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL verification for simplicity
  
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/sensor_readings";
  
  if (!http.begin(client, url)) {
    arduinoSerial.println(F("✗ HTTP begin failed!"));
    failedSends++;
    return;
  }
  
  // Set headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.addHeader("Prefer", "return=minimal");
  
  // Send POST request
  int httpCode = http.POST(jsonPayload);
  
  if (httpCode == 201) {
    arduinoSerial.println(F("✓ Sent!"));
    successfulSends++;
    blinkLED(1, 50);
  } else if (httpCode > 0) {
    arduinoSerial.print(F("✗ HTTP "));
    arduinoSerial.println(httpCode);
    String response = http.getString();
    arduinoSerial.print(F("Response: "));
    arduinoSerial.println(response);
    failedSends++;
  } else {
    arduinoSerial.print(F("✗ HTTP Error: "));
    arduinoSerial.println(http.errorToString(httpCode));
    failedSends++;
  }
  
  http.end();
}

void checkForCommands() {
  WiFiClientSecure client;
  client.setInsecure();
  
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/device_commands?user_id=eq." + USER_ID + 
               "&status=eq.pending&order=created_at.asc&limit=1";
  
  if (!http.begin(client, url)) {
    arduinoSerial.println(F("✗ Command check failed!"));
    return;
  }
  
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    
    // Parse JSON response
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error && doc.size() > 0) {
      String command = doc[0]["command"].as<String>();
      String commandId = doc[0]["id"].as<String>();
      
      arduinoSerial.print(F("🎯 Command: "));
      arduinoSerial.println(command);
      
      // Execute command
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
        arduinoSerial.println(F("✓ Connection OK!"));
        blinkLED(3, 100);
      }
      
      // Mark command as processed
      markCommandProcessed(commandId);
    }
  } else if (httpCode > 0) {
    // Silent fail for command checks (normal if no commands)
  } else {
    arduinoSerial.print(F("✗ Command check error: "));
    arduinoSerial.println(http.errorToString(httpCode));
  }
  
  http.end();
}

void markCommandProcessed(String commandId) {
  WiFiClientSecure client;
  client.setInsecure();
  
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/device_commands?id=eq." + commandId;
  
  if (!http.begin(client, url)) {
    return;
  }
  
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.addHeader("Prefer", "return=minimal");
  
  String payload = "{\"status\":\"processed\",\"processed_at\":\"" + getCurrentTimestamp() + "\"}";
  
  int httpCode = http.PATCH(payload);
  
  if (httpCode == 200 || httpCode == 204) {
    arduinoSerial.println(F("✓ Command marked processed"));
  } else {
    arduinoSerial.print(F("✗ Mark processed failed: "));
    arduinoSerial.println(httpCode);
  }
  
  http.end();
}

// ============================================
// UTILITIES
// ============================================
int calculateHealthScore() {
  int score = 100;
  if (currentData.temperature < 18 || currentData.temperature > 24) score -= 20;
  if (currentData.ph < 6.5 || currentData.ph > 8.5) score -= 20;
  if (!currentData.tempSensorOK) score -= 25;
  if (!currentData.phSensorOK) score -= 25;
  return max(0, score);
}

String getCurrentTimestamp() {
  // Simple timestamp format
  unsigned long seconds = millis() / 1000;
  return String(seconds);
}

void printStatus() {
  arduinoSerial.println(F("\n╔════════════════════════════════════════╗"));
  arduinoSerial.println(F("║       ESP8266 STATUS                   ║"));
  arduinoSerial.println(F("╚════════════════════════════════════════╝"));
  
  arduinoSerial.print(F("📡 WiFi: "));
  arduinoSerial.println(wifiConnected ? F("Connected") : F("Disconnected"));
  
  if (wifiConnected) {
    arduinoSerial.print(F("   Signal: "));
    arduinoSerial.print(WiFi.RSSI());
    arduinoSerial.println(F(" dBm"));
  }
  
  arduinoSerial.print(F("📊 Sends: "));
  arduinoSerial.print(successfulSends);
  arduinoSerial.print(F(" ✓, "));
  arduinoSerial.print(failedSends);
  arduinoSerial.println(F(" ✗"));
  
  if (successfulSends + failedSends > 0) {
    int successRate = (successfulSends * 100) / (successfulSends + failedSends);
    arduinoSerial.print(F("   Success Rate: "));
    arduinoSerial.print(successRate);
    arduinoSerial.println(F("%"));
  }
  
  arduinoSerial.print(F("⏱ Uptime: "));
  arduinoSerial.print(millis() / 1000);
  arduinoSerial.println(F("s"));
  
  arduinoSerial.print(F("📦 Free Heap: "));
  arduinoSerial.print(ESP.getFreeHeap());
  arduinoSerial.println(F(" bytes"));
  
  arduinoSerial.println();
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, LOW);
    delay(delayMs);
    digitalWrite(LED_BUILTIN, HIGH);
    delay(delayMs);
  }
}