/*
 * Crayfish Monitoring System - NodeMCU ESP8266 to Supabase
 * Sends sensor data directly to Supabase backend
 * File: nodemcu_to_supabase.ino
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <SoftwareSerial.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <base64.h>

// WiFi Configuration
const char* WIFI_SSID = "PLDT_Home_0D8BB";
const char* WIFI_PASSWORD = "JUNE122002";

// Supabase Configuration
const char* SUPABASE_URL = "https://qleubfvmydnitmsylqxo.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZXViZnZteWRuaXRtc3lscXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODg2MjksImV4cCI6MjA3NDk2NDYyOX0.1LtaFFXPadqUZM7iaN-0fJbLcDvbkYZkhdLYpfBBReA";

// User ID - You'll need to get this from authentication
String USER_ID = "YOUR_USER_ID"; // Replace with actual user ID from auth

// Serial communication with Arduino Mega
SoftwareSerial arduinoSerial(12, 13); // RX, TX

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
const unsigned long SEND_INTERVAL = 10000; // Send data every 10 seconds
const unsigned long COMMAND_CHECK_INTERVAL = 5000; // Check for commands every 5 seconds

void setup() {
  Serial.begin(115200);
  arduinoSerial.begin(9600);
  
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH); // LED off initially
  
  Serial.println("=== Crayfish Monitoring - NodeMCU to Supabase ===");
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize NTP client
  timeClient.begin();
  
  // Get user ID from local storage or authentication
  // In a real implementation, you would authenticate and get the user ID
  // For now, we'll use a placeholder
  USER_ID = "00000000-0000-0000-0000-000000000000"; // Replace with actual user ID
  
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
  
  // Update time
  timeClient.update();
  
  // Yield to prevent watchdog reset
  yield();
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
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
    digitalWrite(LED_BUILTIN, HIGH); // Turn off LED
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
    
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
    
    Serial.print("Arduino: ");
    Serial.println(receivedLine);
    
    if (receivedLine.startsWith("DATA:")) {
      parseArduinoData(receivedLine.substring(5)); // Remove "DATA:" prefix
    } else if (receivedLine == "PONG") {
      // Heartbeat response - Arduino is alive
    }
  }
}

void parseArduinoData(String jsonData) {
  // Simple JSON parsing
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
    currentData.temperature = tempStr.toFloat();
  }
  
  // Parse pH
  int phIndex = cleanData.indexOf("ph:");
  if (phIndex != -1) {
    int startIndex = phIndex + 3;
    int endIndex = cleanData.indexOf(",", startIndex);
    if (endIndex == -1) endIndex = cleanData.length();
    
    String phStr = cleanData.substring(startIndex, endIndex);
    currentData.ph = phStr.toFloat();
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
  
  Serial.printf("Parsed - Temp: %.2f°C, pH: %.2f, Status: %s, Errors: %d\n",
                currentData.temperature, currentData.ph, 
                currentData.status.c_str(), currentData.errors);
}

void sendDataToSupabase() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, cannot send data");
    return;
  }
  
  // Create JSON document
  DynamicJsonDocument doc(1024);
  
  // Create sensor reading object
  JsonObject reading = doc.createNestedObject("sensor_reading");
  
  reading["user_id"] = USER_ID;
  reading["temperature"] = currentData.temperature;
  reading["ph"] = currentData.ph;
  reading["population"] = 15; // Default value
  reading["health_status"] = calculateHealthScore();
  reading["avg_weight"] = 5.0; // Default value
  reading["days_to_harvest"] = 120; // Default value
  
  // Serialize JSON to string
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Create HTTP client
  WiFiClient client;
  HTTPClient http;
  
  // Set headers
  http.begin(client, String(SUPABASE_URL) + "/rest/v1/sensor_readings");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Prefer", "return=minimal");
  
  Serial.print("Sending to Supabase: ");
  Serial.println(jsonString);
  
  // Send POST request
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("HTTP Response code: %d\n", httpResponseCode);
    Serial.println("Response: " + response);
    
    if (httpResponseCode == 201) {
      Serial.println("Data successfully sent to Supabase");
      blinkLED(1, 100); // Success indicator
    }
  } else {
    Serial.printf("Error on sending POST: %s\n", http.errorToString(httpResponseCode).c_str());
    blinkLED(3, 200); // Error indicator
  }
  
  http.end();
}

void checkForCommands() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  WiFiClient client;
  HTTPClient http;
  
  // Get pending commands for this device
  String url = String(SUPABASE_URL) + "/rest/v1/device_commands?user_id=eq." + USER_ID + "&status=eq.pending&limit=1";
  http.begin(client, url);
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    
    // Parse JSON response
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, response);
    
    if (doc.size() > 0) {
      String command = doc[0]["command"];
      String commandId = doc[0]["id"];
      
      Serial.print("Received command: ");
      Serial.println(command);
      
      // Execute command
      if (command == "feed") {
        arduinoSerial.println("FEED_NOW");
      } else if (command == "change_water") {
        arduinoSerial.println("CHANGE_WATER");
      } else if (command == "test_water") {
        arduinoSerial.println("TEST_WATER");
      } else if (command == "test_connection") {
        // Just acknowledge the test
        Serial.println("Connection test received");
      }
      
      // Mark command as processed
      markCommandProcessed(commandId);
    }
  }
  
  http.end();
}

void markCommandProcessed(String commandId) {
  WiFiClient client;
  HTTPClient http;
  
  String url = String(SUPABASE_URL) + "/rest/v1/device_commands?id=eq." + commandId;
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Prefer", "return=minimal");
  
  String payload = "{\"status\":\"processed\",\"processed_at\":\"" + timeClient.getFormattedTime() + "\"}";
  http.PATCH(payload);
  http.end();
}

int calculateHealthScore() {
  int score = 100;
  
  // Temperature health
  if (currentData.temperature < 18 || currentData.temperature > 24) {
    score -= 20;
  }
  if (currentData.temperature < 16 || currentData.temperature > 26) {
    score -= 30;
  }
  
  // pH health
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

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, LOW);  // LED on
    delay(delayMs);
    digitalWrite(LED_BUILTIN, HIGH); // LED off
    delay(delayMs);
  }
}