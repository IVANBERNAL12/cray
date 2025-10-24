/*
 * AquaVision Pro - NodeMCU ESP8266 Code
 * COMPLETE WORKING VERSION v6.0
 * 
 * Hardware Connections:
 * - ESP D5 (GPIO14/RX) → Arduino TX1 (Pin 18) via voltage divider (1kΩ + 2kΩ)
 * - ESP D6 (GPIO12/TX) → Arduino RX1 (Pin 19) direct
 * - ESP GND → Arduino GND (CRITICAL!)
 * - ESP VIN → 5V from LM2596 or external supply
 * 
 * BEFORE UPLOADING:
 * 1. Update WIFI_SSID with your WiFi name
 * 2. Update WIFI_PASSWORD with your WiFi password
 * 3. Update USER_ID with your Supabase user UUID (from Auth → Users)
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <SoftwareSerial.h>

// ============================================
// CONFIGURATION - UPDATE THESE 3 LINES!
// ============================================
const char* WIFI_SSID = "Kambal_2.4G";              // ← YOUR WIFI NAME HERE
const char* WIFI_PASSWORD = "Jonjon_2627272727";    // ← YOUR WIFI PASSWORD HERE
String USER_ID = "26559b74-028b-4d17-b8f7-ed259953b328";  // ← YOUR USER ID HERE

// ============================================
// SUPABASE CONFIGURATION - DO NOT CHANGE
// ============================================
const char* SUPABASE_URL = "https://qleubfvmydnitmsylqxo.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZXViZnZteWRuaXRtc3lscXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODg2MjksImV4cCI6MjA3NDk2NDYyOX0.1LtaFFXPadqUZM7iaN-0fJbLcDvbkYZkhdLYpfBBReA";

// ============================================
// SERIAL & TIMING CONFIGURATION
// ============================================
SoftwareSerial arduinoSerial(14, 12); // RX=D5(GPIO14), TX=D6(GPIO12)

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 28800, 60000);

const unsigned long SEND_INTERVAL = 30000;           // Send data every 30s
const unsigned long COMMAND_CHECK_INTERVAL = 10000;  // Check commands every 10s
const unsigned long PING_INTERVAL = 25000;           // Ping Arduino every 25s
const unsigned long DATA_TIMEOUT = 60000;            // Data timeout 60s

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

SensorData currentData = {24.5, 7.0, "", 0, "initializing", false, false, false};

// ============================================
// GLOBAL VARIABLES
// ============================================
unsigned long lastDataSend = 0;
unsigned long lastCommandCheck = 0;
unsigned long lastArduinoPing = 0;
unsigned long lastDataReceived = 0;

bool wifiConnected = false;
int dataPacketsReceived = 0;
int successfulSends = 0;
String lastProcessedCommandId = "";

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  arduinoSerial.begin(9600);
  delay(500);
  
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);
  
  Serial.println();
  Serial.println(F("╔════════════════════════════════════════╗"));
  Serial.println(F("║  AquaVision Pro ESP8266 v6.0          ║"));
  Serial.println(F("║  COMPLETE WORKING VERSION              ║"));
  Serial.println(F("╚════════════════════════════════════════╝"));
  Serial.println();
  
  // Verify User ID is configured
  if (USER_ID.length() < 30) {
    Serial.println(F("❌ ERROR: USER_ID NOT SET!"));
    Serial.println(F("Please update USER_ID with your Supabase UUID"));
    while (true) {
      digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
      delay(100);
    }
  }
  
  Serial.print(F("✓ User ID: "));
  Serial.println(USER_ID.substring(0, 8) + "...");
  
  // Connect to WiFi
  connectToWiFi();
  
  if (wifiConnected) {
    timeClient.begin();
    timeClient.update();
    Serial.print(F("✓ Time: "));
    Serial.println(timeClient.getFormattedTime());
    clearOldCommands();
  }
  
  Serial.println(F("\n✓ ESP8266 Ready!"));
  Serial.println(F("✓ Listening for Arduino...\n"));
  
  blinkLED(3, 200);
  
  // Clear serial buffer
  while (arduinoSerial.available()) {
    arduinoSerial.read();
  }
  
  // Send initial ping
  delay(1000);
  arduinoSerial.println("PING");
  Serial.println(F("📤 PING sent to Arduino"));
  
  lastDataReceived = millis();
  lastArduinoPing = millis();
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  unsigned long currentMillis = millis();
  
  // Handle Arduino data (highest priority)
  handleArduinoData();
  
  // WiFi reconnect if needed
  if (WiFi.status() != WL_CONNECTED && wifiConnected) {
    Serial.println(F("⚠ WiFi disconnected!"));
    wifiConnected = false;
    connectToWiFi();
  }
  
  // Send data to Supabase every 30 seconds
  if (currentMillis - lastDataSend >= SEND_INTERVAL) {
    if (currentData.valid && wifiConnected) {
      sendDataToSupabase();
    } else if (!currentData.valid) {
      Serial.println(F("⏳ Requesting data from Arduino..."));
      arduinoSerial.println("GET_DATA");
    }
    lastDataSend = currentMillis;
  }
  
  // Check for commands every 10 seconds
  if (currentMillis - lastCommandCheck >= COMMAND_CHECK_INTERVAL) {
    if (wifiConnected) {
      checkForCommands();
    }
    lastCommandCheck = currentMillis;
  }
  
  // Ping Arduino every 25 seconds
  if (currentMillis - lastArduinoPing >= PING_INTERVAL) {
    arduinoSerial.println("PING");
    Serial.print(F("💓 PING → Arduino ("));
    Serial.print(dataPacketsReceived);
    Serial.println(F(" packets)"));
    lastArduinoPing = currentMillis;
  }
  
  // Check for data timeout
  if (currentMillis - lastDataReceived > DATA_TIMEOUT) {
    if (currentData.valid) {
      Serial.println(F("⚠ No Arduino data for 60s!"));
      Serial.println(F("   Check wiring and ground connection!"));
      currentData.valid = false;
    }
  }
  
  // Update NTP time
  if (wifiConnected) {
    timeClient.update();
  }
  
  yield();
}

// ============================================
// WIFI CONNECTION
// ============================================
void connectToWiFi() {
  Serial.print(F("📡 Connecting to WiFi: "));
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(F("."));
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println(F("✓ WiFi connected!"));
    Serial.print(F("  IP Address: "));
    Serial.println(WiFi.localIP());
    Serial.print(F("  Signal: "));
    Serial.print(WiFi.RSSI());
    Serial.println(F(" dBm"));
    digitalWrite(LED_BUILTIN, HIGH);
  } else {
    wifiConnected = false;
    Serial.println(F("✗ WiFi connection failed!"));
    Serial.println(F("  Check SSID and password!"));
  }
}

// ============================================
// ARDUINO COMMUNICATION
// ============================================
void handleArduinoData() {
  while (arduinoSerial.available()) {
    String line = arduinoSerial.readStringUntil('\n');
    line.trim();
    
    if (line.length() == 0) continue;
    
    lastDataReceived = millis();
    
    Serial.print(F("📥 Arduino: "));
    Serial.println(line);
    
    // Parse SIMPLE format: "SIMPLE:T=24.5,P=7.2,E=0,S=ok"
    if (line.startsWith("SIMPLE:")) {
      parseSimpleData(line.substring(7));
      dataPacketsReceived++;
      blinkLED(1, 50);
    }
    // Parse JSON format: "DATA:{...}"
    else if (line.startsWith("DATA:")) {
      parseArduinoData(line.substring(5));
      dataPacketsReceived++;
      blinkLED(1, 50);
    }
    // Handle responses
    else if (line == "PONG") {
      Serial.println(F("   ✓ Arduino alive!"));
    }
    else if (line == "READY") {
      Serial.println(F("   ✓ Arduino READY!"));
      currentData.valid = false;
    }
    else if (line == "HEARTBEAT") {
      Serial.println(F("   💓"));
    }
    else if (line == "WATER_CHANGE_COMPLETE") {
      Serial.println(F("   ✓ Water change complete!"));
      blinkLED(5, 100);
    }
    else if (line == "FEEDING_COMPLETE") {
      Serial.println(F("   ✓ Feeding complete!"));
      blinkLED(2, 100);
    }
    else if (line.startsWith("ACK:")) {
      Serial.print(F("   ✓ ACK: "));
      Serial.println(line.substring(4));
    }
    else if (line.startsWith("STATUS:")) {
      Serial.print(F("   📋 "));
      Serial.println(line.substring(7));
    }
    else if (line.startsWith("ERROR:")) {
      Serial.print(F("   ❌ "));
      Serial.println(line.substring(6));
    }
  }
}

// Parse SIMPLE format from Arduino
void parseSimpleData(String data) {
  // Format: "T=24.5,P=7.2,E=0,S=ok"
  float temp = -999;
  float ph = -999;
  int errors = 0;
  String status = "unknown";
  
  int tPos = data.indexOf("T=");
  int pPos = data.indexOf(",P=");
  int ePos = data.indexOf(",E=");
  int sPos = data.indexOf(",S=");
  
  if (tPos >= 0 && pPos > tPos) {
    String tempStr = data.substring(tPos + 2, pPos);
    temp = tempStr.toFloat();
  }
  
  if (pPos >= 0 && ePos > pPos) {
    String phStr = data.substring(pPos + 3, ePos);
    ph = phStr.toFloat();
  }
  
  if (ePos >= 0 && sPos > ePos) {
    String errStr = data.substring(ePos + 3, sPos);
    errors = errStr.toInt();
  }
  
  if (sPos >= 0) {
    status = data.substring(sPos + 3);
  }
  
  // Validate and update
  if (temp > -10 && temp < 50) currentData.temperature = temp;
  if (ph >= 0 && ph <= 14) currentData.ph = ph;
  currentData.errors = errors;
  currentData.status = status;
  currentData.valid = true;
  currentData.tempSensorOK = (status != "ns");
  currentData.phSensorOK = (status != "ns");
  
  Serial.print(F("   📊 T="));
  Serial.print(currentData.temperature, 1);
  Serial.print(F("°C, pH="));
  Serial.print(currentData.ph, 2);
  Serial.print(F(", Status="));
  Serial.println(currentData.status);
}

// Parse JSON format from Arduino
void parseArduinoData(String jsonData) {
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, jsonData);
  
  if (!error) {
    float temp = doc["t"] | doc["temperature"] | 24.5;
    float ph = doc["p"] | doc["ph"] | 7.0;
    
    if (temp > -10 && temp < 50) currentData.temperature = temp;
    if (ph >= 0 && ph <= 14) currentData.ph = ph;
    
    currentData.errors = doc["e"] | doc["errors"] | 0;
    currentData.status = doc["s"] | doc["status"] | "unknown";
    currentData.tempSensorOK = doc["tsok"] | doc["temp_sensor_ok"] | false;
    currentData.phSensorOK = doc["psok"] | doc["ph_sensor_ok"] | false;
    currentData.valid = true;
    
    Serial.print(F("   📊 T="));
    Serial.print(currentData.temperature, 1);
    Serial.print(F("°C, pH="));
    Serial.print(currentData.ph, 2);
    Serial.print(F(", Status="));
    Serial.println(currentData.status);
  } else {
    Serial.print(F("   ❌ JSON error: "));
    Serial.println(error.c_str());
  }
}

// ============================================
// SUPABASE FUNCTIONS
// ============================================
void sendDataToSupabase() {
  if (!wifiConnected || !currentData.valid) {
    Serial.println(F("⚠ Cannot send: no WiFi or invalid data"));
    return;
  }
  
  Serial.println(F("📤 Sending to Supabase..."));
  
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
  
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  
  String url = String(SUPABASE_URL) + "/rest/v1/sensor_readings";
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.addHeader("Prefer", "return=minimal");
  http.setTimeout(15000);
  
  int httpCode = http.POST(jsonPayload);
  
  if (httpCode == 201) {
    Serial.println(F("   ✓ SUCCESS!"));
    successfulSends++;
    blinkLED(1, 50);
  } else {
    Serial.print(F("   ✗ HTTP "));
    Serial.println(httpCode);
    if (httpCode > 0) {
      String response = http.getString();
      Serial.print(F("   Response: "));
      Serial.println(response.substring(0, 100));
    }
  }
  
  http.end();
  client.stop();
}

void checkForCommands() {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  
  String url = String(SUPABASE_URL) + "/rest/v1/device_commands?user_id=eq." + USER_ID + 
               "&status=eq.pending&order=created_at.desc&limit=1";
  
  http.begin(client, url);
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.setTimeout(10000);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    
    if (response != "[]" && response.length() > 5) {
      StaticJsonDocument<1024> doc;
      DeserializationError error = deserializeJson(doc, response);
      
      if (!error && doc.size() > 0) {
        String command = doc[0]["command"].as<String>();
        String commandId = doc[0]["id"].as<String>();
        
        if (commandId != lastProcessedCommandId) {
          Serial.print(F("🎯 Command: "));
          Serial.println(command);
          
          // Send to Arduino
          String arduinoCmd = "";
          if (command == "feed") arduinoCmd = "FEED_NOW";
          else if (command == "change_water") arduinoCmd = "CHANGE_WATER";
          else if (command == "test_water") arduinoCmd = "TEST_WATER";
          else if (command == "emergency_stop") arduinoCmd = "EMERGENCY_STOP";
          else if (command == "test_connection") {
            blinkLED(3, 100);
            arduinoCmd = "PING";
          }
          
          if (arduinoCmd.length() > 0) {
            arduinoSerial.println(arduinoCmd);
            Serial.print(F("   📤 "));
            Serial.print(arduinoCmd);
            Serial.println(F(" → Arduino"));
          }
          
          http.end();
          client.stop();
          delay(500);
          
          markCommandProcessed(commandId);
          lastProcessedCommandId = commandId;
        }
      }
    }
  }
  
  http.end();
  client.stop();
}

void markCommandProcessed(String commandId) {
  Serial.println(F("   📝 Marking processed..."));
  
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  
  String url = String(SUPABASE_URL) + "/rest/v1/device_commands?id=eq." + commandId;
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.addHeader("Prefer", "return=minimal");
  
  String payload = "{\"status\":\"processed\",\"processed_at\":\"" + 
                   timeClient.getFormattedDate() + "\"}";
  
  int httpCode = http.PATCH(payload);
  
  if (httpCode == 200 || httpCode == 204) {
    Serial.println(F("   ✓ Marked!"));
  } else {
    Serial.print(F("   ⚠ HTTP "));
    Serial.println(httpCode);
  }
  
  http.end();
  client.stop();
}

void clearOldCommands() {
  Serial.println(F("🧹 Clearing old commands..."));
  
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  
  String url = String(SUPABASE_URL) + "/rest/v1/device_commands?user_id=eq." + USER_ID + 
               "&status=eq.pending";
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.addHeader("Prefer", "return=minimal");
  
  String payload = "{\"status\":\"processed\"}";
  int httpCode = http.PATCH(payload);
  
  if (httpCode == 200 || httpCode == 204) {
    Serial.println(F("✓ Cleared"));
  }
  
  http.end();
  client.stop();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
int calculateHealthScore() {
  int score = 100;
  if (currentData.temperature < 18 || currentData.temperature > 24) score -= 20;
  if (currentData.ph < 6.5 || currentData.ph > 8.5) score -= 20;
  if (!currentData.tempSensorOK) score -= 25;
  if (!currentData.phSensorOK) score -= 25;
  if (currentData.errors > 5) score -= 10;
  return max(0, score);
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, LOW);
    delay(delayMs);
    digitalWrite(LED_BUILTIN, HIGH);
    delay(delayMs);
  }
}