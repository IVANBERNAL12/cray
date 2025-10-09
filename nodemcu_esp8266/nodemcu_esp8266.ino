/*
 * Crayfish Monitoring System - NodeMCU ESP8266 to Supabase
 * COMPLETE UPDATED VERSION with proper authentication
 * 
 * Connections:
 * ESP8266 TX (GPIO1) → Arduino UNO Pin 10 (RX)
 * ESP8266 RX (GPIO3) → Arduino UNO Pin 11 (TX)
 * ESP8266 GND → Arduino GND
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

// ============================================
// CONFIGURATION - UPDATE THESE VALUES!
// ============================================

// WiFi Configuration
const char* WIFI_SSID = "Kambal_2.4G";
const char* WIFI_PASSWORD = "Jonjon_2627272727";

// Supabase Configuration
const char* SUPABASE_URL = "https://qleubfvmydnitmsylqxo.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZXViZnZteWRuaXRtc3lscXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODg2MjksImV4cCI6MjA3NDk2NDYyOX0.1LtaFFXPadqUZM7iaN-0fJbLcDvbkYZkhdLYpfBBReA";

// IMPORTANT: Replace with your actual user ID from Supabase
// Get this from: Supabase Dashboard → Authentication → Users → Copy UUID
String USER_ID = "26559b74-028b-4d17-b8f7-ed259953b328";  // ← CHANGE THIS!

// ============================================
// HARDWARE SERIAL FOR ARDUINO COMMUNICATION
// ============================================
// ESP8266 uses Hardware Serial (Serial) to talk to Arduino UNO
// Serial is pins: TX (GPIO1) and RX (GPIO3)
#define arduinoSerial Serial

// NTP for time synchronization
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000);

// Data structures
struct SensorData {
  float temperature;
  float ph;
  unsigned long timestamp;
  int errors;
  String status;
  bool valid;
  bool temp_sensor_ok;
  bool ph_sensor_ok;
};

// Global variables
SensorData currentData = {0.0, 7.0, 0, 0, "initializing", false, false, false};
unsigned long lastDataSend = 0;
unsigned long lastCommandCheck = 0;
unsigned long lastStatusPrint = 0;
const unsigned long SEND_INTERVAL = 10000; // Send data every 10 seconds
const unsigned long COMMAND_CHECK_INTERVAL = 5000; // Check commands every 5 seconds
const unsigned long STATUS_PRINT_INTERVAL = 30000; // Print status every 30 seconds

void setup() {
  // Initialize Serial for Arduino communication
  arduinoSerial.begin(9600);
  
  // Wait a moment for serial to initialize
  delay(1000);
  
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH); // LED off initially (inverted on ESP8266)
  
  arduinoSerial.println();
  arduinoSerial.println();
  arduinoSerial.println(F("=== Crayfish Monitoring - NodeMCU ESP8266 ==="));
  arduinoSerial.println(F("Version: 2.0 - Updated with Device Commands"));
  arduinoSerial.println(F("For Arduino UNO Communication"));
  
  // Validate USER_ID
  if (USER_ID == "YOUR_USER_ID_HERE" || USER_ID.length() < 30) {
    arduinoSerial.println(F("========================================"));
    arduinoSerial.println(F("ERROR: USER_ID NOT CONFIGURED!"));
    arduinoSerial.println(F("Please update USER_ID in the code"));
    arduinoSerial.println(F("Get it from: Supabase → Authentication → Users"));
    arduinoSerial.println(F("========================================"));
    
    // Blink LED rapidly to indicate error
    while (true) {
      digitalWrite(LED_BUILTIN, LOW);
      delay(100);
      digitalWrite(LED_BUILTIN, HIGH);
      delay(100);
    }
  }
  
  arduinoSerial.print(F("Configured User ID: "));
  arduinoSerial.println(USER_ID);
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize NTP client
  timeClient.begin();
  timeClient.update();
  
  arduinoSerial.println(F("System ready!"));
  arduinoSerial.println(F("Waiting for sensor data from Arduino UNO..."));
  arduinoSerial.println(F("Listening on Serial (TX/RX)"));
  arduinoSerial.println();
  
  // Signal ready
  blinkLED(3, 200);
}

void loop() {
  // Handle Arduino communication
  handleArduinoData();
  
  // Send data to Supabase at intervals
  if (millis() - lastDataSend > SEND_INTERVAL && currentData.valid) {
    sendDataToSupabase();
    lastDataSend = millis();
  }
  
  // Check for commands from Supabase
  if (millis() - lastCommandCheck > COMMAND_CHECK_INTERVAL) {
    checkForCommands();
    lastCommandCheck = millis();
  }
  
  // Print status periodically
  if (millis() - lastStatusPrint > STATUS_PRINT_INTERVAL) {
    printStatus();
    lastStatusPrint = millis();
  }
  
  // Update time
  timeClient.update();
  
  // Yield to prevent watchdog reset
  yield();
}

void connectToWiFi() {
  arduinoSerial.print(F("Connecting to WiFi: "));
  arduinoSerial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    arduinoSerial.print(F("."));
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    attempts++;
  }
  
  arduinoSerial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    arduinoSerial.println(F("WiFi connected successfully!"));
    arduinoSerial.print(F("IP Address: "));
    arduinoSerial.println(WiFi.localIP());
    arduinoSerial.print(F("Signal Strength: "));
    arduinoSerial.print(WiFi.RSSI());
    arduinoSerial.println(F(" dBm"));
    digitalWrite(LED_BUILTIN, HIGH); // Turn off LED
  } else {
    arduinoSerial.println(F("WiFi connection failed!"));
    arduinoSerial.println(F("Check SSID and password!"));
    
    // Flash LED to indicate error
    while (true) {
      digitalWrite(LED_BUILTIN, LOW);
      delay(100);
      digitalWrite(LED_BUILTIN, HIGH);
      delay(100);
    }
  }
}

void handleArduinoData() {
  if (arduinoSerial.available()) {
    String receivedLine = arduinoSerial.readStringUntil('\n');
    receivedLine.trim();
    
    // Ignore echo from our own transmissions
    if (receivedLine.startsWith("→ ESP:") || 
        receivedLine.startsWith("← ESP Command:") ||
        receivedLine.length() == 0) {
      return;
    }
    
    // Only process DATA lines, ignore debug output
    if (receivedLine.startsWith("DATA:")) {
      parseArduinoData(receivedLine.substring(5)); // Remove "DATA:" prefix
    } else if (receivedLine == "PONG") {
      arduinoSerial.println(F("✓ Arduino heartbeat received"));
    } else if (receivedLine == "WATER_CHANGE_COMPLETE") {
      arduinoSerial.println(F("✓ Water change completed by Arduino"));
      blinkLED(5, 100);
    } else if (receivedLine == "FEEDING_COMPLETE") {
      arduinoSerial.println(F("✓ Feeding completed by Arduino"));
      blinkLED(2, 100);
    } else if (receivedLine == "WATER_TEST_COMPLETE") {
      arduinoSerial.println(F("✓ Water test completed by Arduino"));
    }
  }
}

void parseArduinoData(String jsonData) {
  // Simple JSON parsing without ArduinoJson library overhead
  String cleanData = jsonData;
  cleanData.replace("{", "");
  cleanData.replace("}", "");
  cleanData.replace("\"", "");
  
  // Parse temperature
  int tempIndex = cleanData.indexOf("temperature:");
  if (tempIndex != -1) {
    int startIndex = tempIndex + 12;
    int endIndex = cleanData.indexOf(",", startIndex);
    if (endIndex == -1) endIndex = cleanData.length();
    
    String tempStr = cleanData.substring(startIndex, endIndex);
    if (tempStr != "null") {
      currentData.temperature = tempStr.toFloat();
    }
  }
  
  // Parse pH
  int phIndex = cleanData.indexOf("ph:");
  if (phIndex != -1) {
    int startIndex = phIndex + 3;
    int endIndex = cleanData.indexOf(",", startIndex);
    if (endIndex == -1) endIndex = cleanData.length();
    
    String phStr = cleanData.substring(startIndex, endIndex);
    if (phStr != "null") {
      currentData.ph = phStr.toFloat();
    }
  }
  
  // Parse status
  int statusIndex = cleanData.indexOf("status:");
  if (statusIndex != -1) {
    int startIndex = statusIndex + 7;
    int endIndex = cleanData.indexOf(",", startIndex);
    if (endIndex == -1) endIndex = cleanData.length();
    
    currentData.status = cleanData.substring(startIndex, endIndex);
  }
  
  // Parse errors
  int errorsIndex = cleanData.indexOf("errors:");
  if (errorsIndex != -1) {
    int startIndex = errorsIndex + 7;
    int endIndex = cleanData.indexOf(",", startIndex);
    if (endIndex == -1) endIndex = cleanData.length();
    
    String errorsStr = cleanData.substring(startIndex, endIndex);
    currentData.errors = errorsStr.toInt();
  }
  
  // Parse sensor status
  int tempSensorIndex = cleanData.indexOf("temp_sensor_ok:");
  if (tempSensorIndex != -1) {
    String tempSensorStatus = cleanData.substring(tempSensorIndex + 15);
    tempSensorStatus = tempSensorStatus.substring(0, tempSensorStatus.indexOf(","));
    currentData.temp_sensor_ok = (tempSensorStatus == "true");
  }
  
  int phSensorIndex = cleanData.indexOf("ph_sensor_ok:");
  if (phSensorIndex != -1) {
    String phSensorStatus = cleanData.substring(phSensorIndex + 13);
    phSensorStatus = phSensorStatus.substring(0, phSensorStatus.indexOf(","));
    currentData.ph_sensor_ok = (phSensorStatus == "true");
  }
  
  // Update metadata
  currentData.timestamp = timeClient.getEpochTime();
  currentData.valid = true;
  
  // Print parsed data
  arduinoSerial.print(F("📊 Parsed - Temp: "));
  arduinoSerial.print(currentData.temperature, 2);
  arduinoSerial.print(F("°C, pH: "));
  arduinoSerial.print(currentData.ph, 2);
  arduinoSerial.print(F(", Status: "));
  arduinoSerial.print(currentData.status);
  arduinoSerial.print(F(", Errors: "));
  arduinoSerial.println(currentData.errors);
}

void sendDataToSupabase() {
  if (WiFi.status() != WL_CONNECTED) {
    arduinoSerial.println(F("❌ WiFi not connected, cannot send data"));
    return;
  }
  
  arduinoSerial.println(F("📤 Sending data to Supabase..."));
  
  // Create JSON document
  StaticJsonDocument<512> doc;
  
  doc["user_id"] = USER_ID;
  doc["temperature"] = currentData.temperature;
  doc["ph"] = currentData.ph;
  doc["population"] = 15; // Default value - update as needed
  doc["health_status"] = calculateHealthScore();
  doc["avg_weight"] = 5.0; // Default value - update as needed
  doc["days_to_harvest"] = 120; // Default value - update as needed
  
  // Serialize JSON to string
  String jsonString;
  serializeJson(doc, jsonString);
  
  arduinoSerial.print(F("JSON: "));
  arduinoSerial.println(jsonString);
  
  // Create HTTPS client
  WiFiClientSecure client;
  client.setInsecure(); // Skip SSL verification (acceptable for local projects)
  
  HTTPClient http;
  
  // Set headers
  String url = String(SUPABASE_URL) + "/rest/v1/sensor_readings";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  http.addHeader("Prefer", "return=minimal");
  
  // Send POST request
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    arduinoSerial.print(F("HTTP Response code: "));
    arduinoSerial.println(httpResponseCode);
    
    if (httpResponseCode == 201) {
      arduinoSerial.println(F("✅ Data successfully sent to Supabase"));
      blinkLED(1, 100); // Success indicator
    } else if (httpResponseCode == 401) {
      arduinoSerial.println(F("❌ Error 401: Check SUPABASE_ANON_KEY"));
    } else if (httpResponseCode == 400) {
      arduinoSerial.println(F("❌ Error 400: Check USER_ID and table structure"));
      String response = http.getString();
      arduinoSerial.print(F("Response: "));
      arduinoSerial.println(response);
    } else {
      String response = http.getString();
      arduinoSerial.print(F("Response: "));
      arduinoSerial.println(response);
    }
  } else {
    arduinoSerial.print(F("❌ Error sending POST: "));
    arduinoSerial.println(http.errorToString(httpResponseCode).c_str());
    blinkLED(3, 200); // Error indicator
  }
  
  http.end();
}

void checkForCommands() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  // Create HTTPS client
  WiFiClientSecure client;
  client.setInsecure();
  
  HTTPClient http;
  
  // Get pending commands for this device
  String url = String(SUPABASE_URL) + "/rest/v1/device_commands?user_id=eq." + USER_ID + "&status=eq.pending&order=created_at.asc&limit=1";
  http.begin(client, url);
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_ANON_KEY));
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    
    // Parse JSON response
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (error) {
      arduinoSerial.print(F("JSON parse error: "));
      arduinoSerial.println(error.c_str());
      http.end();
      return;
    }
    
    if (doc.size() > 0) {
      String command = doc[0]["command"];
      String commandId = doc[0]["id"];
      
      arduinoSerial.print(F("🎯 Received command: "));
      arduinoSerial.println(command);
      
      // Execute command by sending to Arduino
      if (command == "feed") {
        arduinoSerial.println(F("Executing: FEED"));
        arduinoSerial.println("FEED_NOW");
        delay(100);
      } else if (command == "change_water") {
        arduinoSerial.println(F("Executing: CHANGE WATER"));
        arduinoSerial.println("CHANGE_WATER");
        delay(100);
      } else if (command == "test_water") {
        arduinoSerial.println(F("Executing: TEST WATER"));
        arduinoSerial.println("TEST_WATER");
        delay(100);
      } else if (command == "test_connection") {
        arduinoSerial.println(F("Executing: TEST CONNECTION"));
        arduinoSerial.println(F("✅ ESP8266 is connected and receiving commands!"));
      }
      
      // Mark command as processed
      markCommandProcessed(commandId);
    }
  } else if (httpResponseCode != 200 && httpResponseCode != -1) {
    arduinoSerial.print(F("❌ Command check failed: "));
    arduinoSerial.println(httpResponseCode);
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
  
  int httpResponseCode = http.PATCH(payload);
  
  if (httpResponseCode == 200 || httpResponseCode == 204) {
    arduinoSerial.println(F("✅ Command marked as processed"));
  } else {
    arduinoSerial.print(F("❌ Failed to mark command as processed: "));
    arduinoSerial.println(httpResponseCode);
  }
  
  http.end();
}

int calculateHealthScore() {
  int score = 100;
  
  // Temperature health (ideal: 18-24°C)
  if (currentData.temperature < 18 || currentData.temperature > 24) {
    score -= 20;
  }
  if (currentData.temperature < 16 || currentData.temperature > 26) {
    score -= 30;
  }
  
  // pH health (ideal: 6.5-8.5)
  if (currentData.ph < 6.5 || currentData.ph > 8.5) {
    score -= 20;
  }
  if (currentData.ph < 6.0 || currentData.ph > 9.0) {
    score -= 30;
  }
  
  // Sensor status
  if (!currentData.temp_sensor_ok) score -= 25;
  if (!currentData.ph_sensor_ok) score -= 25;
  
  return max(0, score);
}

void printStatus() {
  arduinoSerial.println(F("\n========== ESP8266 STATUS =========="));
  arduinoSerial.print(F("WiFi: "));
  arduinoSerial.print(WiFi.status() == WL_CONNECTED ? F("Connected") : F("Disconnected"));
  arduinoSerial.print(F(" ("));
  arduinoSerial.print(WiFi.RSSI());
  arduinoSerial.println(F(" dBm)"));
  
  arduinoSerial.print(F("IP: "));
  arduinoSerial.println(WiFi.localIP());
  
  arduinoSerial.print(F("Uptime: "));
  arduinoSerial.print(millis() / 1000);
  arduinoSerial.println(F(" seconds"));
  
  arduinoSerial.print(F("Free Heap: "));
  arduinoSerial.println(ESP.getFreeHeap());
  
  arduinoSerial.print(F("Last Data: Temp="));
  arduinoSerial.print(currentData.temperature);
  arduinoSerial.print(F("°C, pH="));
  arduinoSerial.println(currentData.ph);
  
  arduinoSerial.println(F("====================================\n"));
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, LOW);  // LED on (inverted on ESP8266)
    delay(delayMs);
    digitalWrite(LED_BUILTIN, HIGH); // LED off
    delay(delayMs);
  }
}