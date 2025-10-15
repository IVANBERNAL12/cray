/*
 * AquaVision Pro - Arduino Mega 2560 Code
 * Crayfish Monitoring System with Automatic Water Change
 * 
 * Hardware Connections (Based on Schematic):
 * - DS18B20 Temperature Sensor: Pin 2 (with 4.7kΩ pull-up)
 * - PH4502C pH Sensor: Pin A0 (analog)
 * - DS3231 RTC: Pin 20 (SDA), Pin 21 (SCL)
 * - SG90 Servo (Feed): Pin 9
 * - Relay CH1 (Drain Pump): Pin 5
 * - Relay CH2 (Fill Pump): Pin 6
 * - NodeMCU ESP8266: Pin 18 (TX1), Pin 19 (RX1)
 * 
 * Version: 3.0 - Updated without HX711
 */

#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <RTClib.h>
#include <Servo.h>

// ============================================
// PIN DEFINITIONS
// ============================================

// Sensors
#define ONE_WIRE_BUS 2        // DS18B20 temperature sensor
#define PH_PIN A0             // pH sensor analog input

// Actuators
#define SERVO_PIN 9           // Servo motor for feeding
#define RELAY_DRAIN 5         // Relay CH1 - Drain pump
#define RELAY_FILL 6          // Relay CH2 - Fill pump
#define RELAY_CH3 7           // Relay CH3 - Reserve
#define RELAY_CH4 8           // Relay CH4 - Reserve

// Communication (Hardware Serial1)
#define ESP_SERIAL Serial1    // TX1=18, RX1=19

// ============================================
// SENSOR OBJECTS
// ============================================

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensors(&oneWire);
RTC_DS3231 rtc;
Servo feedServo;

// ============================================
// CONFIGURATION
// ============================================

// pH Calibration Values (adjust based on your sensor)
const float PH_NEUTRAL_VOLTAGE = 2.50;  // Voltage at pH 7.0
const float PH_ACID_SLOPE = 0.18;       // Volts per pH unit (acidic)
const float PH_BASE_SLOPE = -0.18;      // Volts per pH unit (basic)

// Water Change Timing (in milliseconds)
const unsigned long DRAIN_TIME = 30000;   // 30 seconds
const unsigned long FILL_TIME = 35000;    // 35 seconds  
const unsigned long SETTLE_TIME = 5000;   // 5 seconds

// Feeding Settings
const int SERVO_CLOSED = 0;    // Servo position when closed
const int SERVO_OPEN = 90;     // Servo position when open
const int FEED_DURATION = 2000; // How long to keep servo open (ms)

// Data Collection Intervals
const unsigned long SENSOR_READ_INTERVAL = 2000;  // Read sensors every 2s
const unsigned long DATA_SEND_INTERVAL = 5000;    // Send data every 5s

// ============================================
// GLOBAL VARIABLES
// ============================================

// Sensor Data
float currentTemperature = -999.0;
float currentPH = 7.0;
bool tempSensorOK = false;
bool phSensorOK = false;
int errorCount = 0;

// System State
bool waterChangeActive = false;
bool systemInitialized = false;

// Timing
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;

// Data Smoothing
const int TEMP_SAMPLES = 5;
const int PH_SAMPLES = 10;
float tempReadings[TEMP_SAMPLES];
float phReadings[PH_SAMPLES];
int tempIndex = 0;
int phIndex = 0;

// ============================================
// SETUP
// ============================================

void setup() {
  // Initialize Serial Communications
  Serial.begin(9600);        // Debug serial
  ESP_SERIAL.begin(9600);    // ESP8266 communication
  
  // Wait for serial to be ready
  delay(1000);
  
  Serial.println(F("========================================"));
  Serial.println(F("  AquaVision Pro - Arduino Mega 2560"));
  Serial.println(F("  Crayfish Monitoring System"));
  Serial.println(F("  Version 3.0"));
  Serial.println(F("========================================\n"));
  
  // Initialize LED
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  
  // Initialize Relay Pins (ACTIVE LOW - HIGH=OFF, LOW=ON)
  pinMode(RELAY_DRAIN, OUTPUT);
  pinMode(RELAY_FILL, OUTPUT);
  pinMode(RELAY_CH3, OUTPUT);
  pinMode(RELAY_CH4, OUTPUT);
  
  // Turn all relays OFF
  digitalWrite(RELAY_DRAIN, HIGH);
  digitalWrite(RELAY_FILL, HIGH);
  digitalWrite(RELAY_CH3, HIGH);
  digitalWrite(RELAY_CH4, HIGH);
  
  Serial.println(F("✓ Relay outputs initialized (all OFF)"));
  
  // Initialize I2C for RTC
  Wire.begin();
  
  // Initialize RTC
  if (!rtc.begin()) {
    Serial.println(F("✗ DS3231 RTC not found!"));
  } else {
    Serial.println(F("✓ DS3231 RTC initialized"));
    
    if (rtc.lostPower()) {
      Serial.println(F("⚠ RTC lost power, setting time..."));
      rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }
    
    DateTime now = rtc.now();
    Serial.print(F("  Current time: "));
    Serial.print(now.year());
    Serial.print('/');
    Serial.print(now.month());
    Serial.print('/');
    Serial.print(now.day());
    Serial.print(' ');
    Serial.print(now.hour());
    Serial.print(':');
    Serial.print(now.minute());
    Serial.print(':');
    Serial.println(now.second());
  }
  
  // Initialize Temperature Sensor
  Serial.print(F("Initializing DS18B20... "));
  tempSensors.begin();
  int deviceCount = tempSensors.getDeviceCount();
  
  if (deviceCount > 0) {
    tempSensors.setResolution(12);
    tempSensorOK = true;
    Serial.print(F("✓ Found "));
    Serial.print(deviceCount);
    Serial.println(F(" sensor(s)"));
  } else {
    Serial.println(F("✗ No DS18B20 found!"));
    tempSensorOK = false;
  }
  
  // Initialize pH Sensor
  Serial.print(F("Testing PH4502C sensor... "));
  int phTest = analogRead(PH_PIN);
  if (phTest > 10 && phTest < 1014) {
    phSensorOK = true;
    Serial.print(F("✓ OK (raw: "));
    Serial.print(phTest);
    Serial.println(F(")"));
  } else {
    phSensorOK = false;
    Serial.println(F("✗ No response"));
  }
  
  // Initialize Servo
  feedServo.attach(SERVO_PIN);
  feedServo.write(SERVO_CLOSED);
  Serial.println(F("✓ Servo initialized (closed position)"));
  
  // Initialize data arrays
  for (int i = 0; i < TEMP_SAMPLES; i++) tempReadings[i] = 0;
  for (int i = 0; i < PH_SAMPLES; i++) phReadings[i] = 7.0;
  
  // Warm up sensors
  Serial.println(F("\nWarming up sensors (3 seconds)..."));
  delay(3000);
  
  // Test relay system
  Serial.println(F("\nTesting relay system..."));
  testRelays();
  
  systemInitialized = true;
  Serial.println(F("\n✓ System initialized successfully!"));
  Serial.println(F("Ready for commands from ESP8266\n"));
  Serial.println(F("Commands: CHANGE_WATER, FEED_NOW, TEST_WATER, STATUS, GET_DATA\n"));
  
  // Success indication
  blinkLED(3, 200);
  
  // Send initial status to ESP8266
  delay(1000);
  sendStatusToESP();
}

// ============================================
// MAIN LOOP
// ============================================

void loop() {
  unsigned long currentMillis = millis();
  
  // Read sensors at intervals (skip during water change)
  if (!waterChangeActive && (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL)) {
    readAllSensors();
    lastSensorRead = currentMillis;
    
    // Toggle LED to show activity
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
  }
  
  // Send data to ESP8266 at intervals
  if (!waterChangeActive && (currentMillis - lastDataSend >= DATA_SEND_INTERVAL)) {
    sendDataToESP();
    lastDataSend = currentMillis;
  }
  
  // Check for commands from ESP8266
  if (ESP_SERIAL.available()) {
    handleESPCommand();
  }
  
  // Check for debug commands from Serial Monitor
  if (Serial.available()) {
    handleDebugCommand();
  }
  
  yield();
}

// ============================================
// SENSOR READING FUNCTIONS
// ============================================

void readAllSensors() {
  readTemperature();
  readPH();
  
  // Print readings to Serial Monitor
  Serial.print(F("📊 T: "));
  if (currentTemperature > -900) {
    Serial.print(currentTemperature, 2);
    Serial.print(F("°C"));
  } else {
    Serial.print(F("FAIL"));
  }
  
  Serial.print(F(" | pH: "));
  if (currentPH > 0 && currentPH < 14) {
    Serial.print(currentPH, 2);
  } else {
    Serial.print(F("FAIL"));
  }
  
  Serial.print(F(" | Errors: "));
  Serial.println(errorCount);
}

void readTemperature() {
  if (!tempSensorOK) {
    currentTemperature = -999.0;
    return;
  }
  
  tempSensors.requestTemperatures();
  delay(100);
  
  float temp = tempSensors.getTempCByIndex(0);
  
  // Validate reading
  if (temp != DEVICE_DISCONNECTED_C && temp > -10 && temp < 50) {
    // Add to smoothing array
    tempReadings[tempIndex] = temp;
    tempIndex = (tempIndex + 1) % TEMP_SAMPLES;
    
    // Calculate average
    float sum = 0;
    int validCount = 0;
    for (int i = 0; i < TEMP_SAMPLES; i++) {
      if (tempReadings[i] != 0) {
        sum += tempReadings[i];
        validCount++;
      }
    }
    
    if (validCount > 0) {
      currentTemperature = sum / validCount;
      errorCount = max(0, errorCount - 1); // Reduce error count on success
    }
  } else {
    errorCount++;
    Serial.println(F("⚠ Temperature reading failed"));
    
    if (errorCount > 10) {
      tempSensorOK = false;
      currentTemperature = -999.0;
    }
  }
}

void readPH() {
  if (!phSensorOK) {
    currentPH = -1.0;
    return;
  }
  
  // Take multiple readings and average
  long sum = 0;
  int validReadings = 0;
  
  for (int i = 0; i < 20; i++) {
    int reading = analogRead(PH_PIN);
    if (reading > 10 && reading < 1014) {
      sum += reading;
      validReadings++;
    }
    delay(10);
  }
  
  if (validReadings > 10) {
    float avgReading = sum / (float)validReadings;
    float voltage = avgReading * (5.0 / 1024.0);
    float phValue = voltageToPH(voltage);
    
    // Validate pH range
    if (phValue >= 3.0 && phValue <= 11.0) {
      // Add to smoothing array
      phReadings[phIndex] = phValue;
      phIndex = (phIndex + 1) % PH_SAMPLES;
      
      // Calculate average
      float sum = 0;
      int validCount = 0;
      for (int i = 0; i < PH_SAMPLES; i++) {
        if (phReadings[i] > 0) {
          sum += phReadings[i];
          validCount++;
        }
      }
      
      if (validCount > 0) {
        currentPH = sum / validCount;
        errorCount = max(0, errorCount - 1);
      }
    } else {
      errorCount++;
    }
  } else {
    errorCount++;
    if (errorCount > 20) {
      phSensorOK = false;
      currentPH = -1.0;
    }
  }
}

float voltageToPH(float voltage) {
  // Linear approximation around neutral pH
  float phDifference = (voltage - PH_NEUTRAL_VOLTAGE) / PH_ACID_SLOPE;
  return 7.0 - phDifference;
}

// ============================================
// WATER CHANGE FUNCTIONS
// ============================================

void executeWaterChange() {
  if (waterChangeActive) {
    Serial.println(F("⚠ Water change already in progress!"));
    ESP_SERIAL.println("ERROR:Water change already active");
    return;
  }
  
  waterChangeActive = true;
  Serial.println(F("\n╔════════════════════════════════════╗"));
  Serial.println(F("║  AUTOMATIC WATER CHANGE STARTED    ║"));
  Serial.println(F("╚════════════════════════════════════╝\n"));
  ESP_SERIAL.println("STATUS:Water change started");
  
  // Safety: Ensure both pumps are OFF
  digitalWrite(RELAY_DRAIN, HIGH);
  digitalWrite(RELAY_FILL, HIGH);
  delay(1000);
  
  // PHASE 1: DRAIN OLD WATER
  Serial.println(F("═══ PHASE 1: DRAINING WATER ═══"));
  ESP_SERIAL.println("STATUS:Draining");
  
  digitalWrite(RELAY_DRAIN, LOW);  // Turn ON drain pump
  
  unsigned long phaseStart = millis();
  while (millis() - phaseStart < DRAIN_TIME) {
    // Fast LED blink during drain
    digitalWrite(LED_BUILTIN, (millis() / 250) % 2);
    
    // Progress update every 5 seconds
    if ((millis() - phaseStart) % 5000 < 100) {
      Serial.print(F("⏳ Draining... "));
      Serial.print((millis() - phaseStart) / 1000);
      Serial.print(F("/"));
      Serial.print(DRAIN_TIME / 1000);
      Serial.println(F("s"));
    }
    delay(100);
  }
  
  digitalWrite(RELAY_DRAIN, HIGH);  // Turn OFF drain pump
  Serial.println(F("✓ Drain phase complete\n"));
  
  // SETTLING PHASE
  Serial.println(F("═══ SETTLING ═══"));
  ESP_SERIAL.println("STATUS:Settling");
  delay(SETTLE_TIME);
  Serial.println(F("✓ Settling complete\n"));
  
  // PHASE 2: FILL FRESH WATER
  Serial.println(F("═══ PHASE 2: FILLING WATER ═══"));
  ESP_SERIAL.println("STATUS:Filling");
  
  digitalWrite(RELAY_FILL, LOW);  // Turn ON fill pump
  
  phaseStart = millis();
  while (millis() - phaseStart < FILL_TIME) {
    // Slow LED blink during fill
    digitalWrite(LED_BUILTIN, (millis() / 500) % 2);
    
    // Progress update every 5 seconds
    if ((millis() - phaseStart) % 5000 < 100) {
      Serial.print(F("⏳ Filling... "));
      Serial.print((millis() - phaseStart) / 1000);
      Serial.print(F("/"));
      Serial.print(FILL_TIME / 1000);
      Serial.println(F("s"));
    }
    delay(100);
  }
  
  digitalWrite(RELAY_FILL, HIGH);  // Turn OFF fill pump
  Serial.println(F("✓ Fill phase complete\n"));
  
  // Final settling
  Serial.println(F("═══ FINAL SETTLING ═══"));
  delay(SETTLE_TIME);
  
  // Complete
  Serial.println(F("\n╔════════════════════════════════════╗"));
  Serial.println(F("║  WATER CHANGE COMPLETE ✓           ║"));
  Serial.println(F("╚════════════════════════════════════╝\n"));
  ESP_SERIAL.println("WATER_CHANGE_COMPLETE");
  
  waterChangeActive = false;
  
  // Reset sensor arrays for fresh readings
  for (int i = 0; i < TEMP_SAMPLES; i++) tempReadings[i] = 0;
  for (int i = 0; i < PH_SAMPLES; i++) phReadings[i] = 7.0;
  tempIndex = 0;
  phIndex = 0;
  
  // Success blink
  blinkLED(5, 200);
  digitalWrite(LED_BUILTIN, LOW);
}

void emergencyStop() {
  Serial.println(F("\n╔════════════════════════════════════╗"));
  Serial.println(F("║    !!! EMERGENCY STOP !!!          ║"));
  Serial.println(F("╚════════════════════════════════════╝\n"));
  
  // Turn OFF all relays immediately
  digitalWrite(RELAY_DRAIN, HIGH);
  digitalWrite(RELAY_FILL, HIGH);
  digitalWrite(RELAY_CH3, HIGH);
  digitalWrite(RELAY_CH4, HIGH);
  
  waterChangeActive = false;
  
  Serial.println(F("✓ All pumps stopped"));
  ESP_SERIAL.println("STATUS:Emergency stop executed");
  
  // Rapid blink warning
  for (int i = 0; i < 20; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(50);
    digitalWrite(LED_BUILTIN, LOW);
    delay(50);
  }
}

// ============================================
// FEEDING FUNCTION
// ============================================

void executeFeeding() {
  Serial.println(F("\n═══ FEEDING CRAYFISH ═══"));
  ESP_SERIAL.println("STATUS:Feeding");
  
  // Open servo to dispense food
  feedServo.write(SERVO_OPEN);
  Serial.println(F("⏳ Dispensing food..."));
  
  delay(FEED_DURATION);
  
  // Close servo
  feedServo.write(SERVO_CLOSED);
  Serial.println(F("✓ Feeding complete\n"));
  
  ESP_SERIAL.println("FEEDING_COMPLETE");
  blinkLED(2, 200);
}

// ============================================
// COMMUNICATION FUNCTIONS
// ============================================

void sendDataToESP() {
  // Get current time from RTC
  DateTime now = rtc.now();
  
  // Build JSON data packet - FIXED: Proper boolean formatting
  String data = "DATA:{";
  data += "\"temperature\":";
  data += (currentTemperature > -900) ? String(currentTemperature, 2) : "null";
  data += ",\"ph\":";
  data += (currentPH > 0 && currentPH < 14) ? String(currentPH, 2) : "null";
  data += ",\"timestamp\":\"";
  data += now.timestamp();
  data += "\",\"errors\":";
  data += String(errorCount);
  data += ",\"status\":\"";
  
  if (waterChangeActive) {
    data += "water_change";
  } else if (!tempSensorOK || !phSensorOK) {
    data += "sensor_error";
  } else if (errorCount > 5) {
    data += "warning";
  } else {
    data += "ok";
  }
  
  // FIXED: No spaces around booleans
  data += "\",\"temp_sensor_ok\":";
  data += tempSensorOK ? "true" : "false";
  data += ",\"ph_sensor_ok\":";
  data += phSensorOK ? "true" : "false";
  data += "}";
  
  Serial.println("[Arduino] Sending data to ESP8266:");
  Serial.println(data);
  
  ESP_SERIAL.println(data);
}
void sendStatusToESP() {
  String status = "STATUS:{";
  status += "\"initialized\":true";
  status += ",\"uptime\":";
  status += String(millis());
  status += ",\"free_ram\":";
  status += String(freeRam());
  status += ",\"temp_ok\":";
  status += tempSensorOK ? "true" : "false";
  status += ",\"ph_ok\":";
  status += phSensorOK ? "true" : "false";
  status += ",\"water_change_active\":";
  status += waterChangeActive ? "true" : "false";
  status += "}";
  
  ESP_SERIAL.println(status);
}

void handleESPCommand() {
  String command = ESP_SERIAL.readStringUntil('\n');
  command.trim();
  
  if (command.length() == 0) return;
  
  Serial.print(F("📥 ESP Command: "));
  Serial.println(command);
  
  if (command == "PING") {
    ESP_SERIAL.println("PONG");
  } 
  else if (command == "CHANGE_WATER") {
    executeWaterChange();
  } 
  else if (command == "EMERGENCY_STOP") {
    emergencyStop();
  } 
  else if (command == "FEED_NOW") {
    executeFeeding();
  } 
  else if (command == "TEST_WATER") {
    readAllSensors();
    sendDataToESP();
    ESP_SERIAL.println("WATER_TEST_COMPLETE");
  } 
  else if (command == "STATUS") {
    sendStatusToESP();
  } 
  else if (command == "GET_DATA") {
    sendDataToESP();
  } 
  else {
    Serial.println(F("⚠ Unknown command"));
    ESP_SERIAL.println("ERROR:Unknown command");
  }
}

void handleDebugCommand() {
  String command = Serial.readStringUntil('\n');
  command.trim();
  command.toUpperCase();
  
  if (command == "WATER") {
    executeWaterChange();
  } 
  else if (command == "FEED") {
    executeFeeding();
  }
  else if (command == "STOP") {
    emergencyStop();
  } 
  else if (command == "TEST") {
    testRelays();
  } 
  else if (command == "STATUS") {
    printSystemStatus();
  } 
  else if (command == "HELP") {
    printHelp();
  } 
  else {
    Serial.println(F("⚠ Unknown command. Type HELP"));
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

void testRelays() {
  Serial.println(F("\n═══ TESTING RELAY SYSTEM ═══"));
  
  Serial.println(F("Testing Drain Pump (CH1)..."));
  digitalWrite(RELAY_DRAIN, LOW);
  delay(1000);
  digitalWrite(RELAY_DRAIN, HIGH);
  delay(500);
  
  Serial.println(F("Testing Fill Pump (CH2)..."));
  digitalWrite(RELAY_FILL, LOW);
  delay(1000);
  digitalWrite(RELAY_FILL, HIGH);
  delay(500);
  
  Serial.println(F("✓ Relay test complete\n"));
}

void printSystemStatus() {
  DateTime now = rtc.now();
  
  Serial.println(F("\n╔════════════════════════════════════╗"));
  Serial.println(F("║       SYSTEM STATUS REPORT         ║"));
  Serial.println(F("╚════════════════════════════════════╝"));
  
  Serial.print(F("📅 Date/Time: "));
  Serial.print(now.year());
  Serial.print('/');
  Serial.print(now.month());
  Serial.print('/');
  Serial.print(now.day());
  Serial.print(' ');
  Serial.print(now.hour());
  Serial.print(':');
  Serial.print(now.minute());
  Serial.print(':');
  Serial.println(now.second());
  
  Serial.print(F("⏱ Uptime: "));
  Serial.print(millis() / 1000);
  Serial.println(F(" seconds"));
  
  Serial.print(F("🌡 Temperature: "));
  if (currentTemperature > -900) {
    Serial.print(currentTemperature, 2);
    Serial.print(F("°C ["));
    Serial.print(tempSensorOK ? F("OK") : F("FAIL"));
    Serial.println(F("]"));
  } else {
    Serial.println(F("SENSOR FAILED"));
  }
  
  Serial.print(F("⚗ pH Level: "));
  if (currentPH > 0 && currentPH < 14) {
    Serial.print(currentPH, 2);
    Serial.print(F(" ["));
    Serial.print(phSensorOK ? F("OK") : F("FAIL"));
    Serial.println(F("]"));
  } else {
    Serial.println(F("SENSOR FAILED"));
  }
  
  Serial.print(F("💧 Water Change: "));
  Serial.println(waterChangeActive ? F("ACTIVE") : F("IDLE"));
  
  Serial.print(F("⚠ Error Count: "));
  Serial.println(errorCount);
  
  Serial.print(F("💾 Free RAM: "));
  Serial.print(freeRam());
  Serial.println(F(" bytes"));
  
  Serial.println();
}

void printHelp() {
  Serial.println(F("\n╔════════════════════════════════════╗"));
  Serial.println(F("║      AVAILABLE COMMANDS            ║"));
  Serial.println(F("╚════════════════════════════════════╝"));
  Serial.println(F("WATER  - Start automatic water change"));
  Serial.println(F("FEED   - Dispense food"));
  Serial.println(F("STOP   - Emergency stop all pumps"));
  Serial.println(F("TEST   - Test relay system"));
  Serial.println(F("STATUS - Show system status"));
  Serial.println(F("HELP   - Show this menu"));
  Serial.println();
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_BUILTIN, LOW);
    delay(delayMs);
  }
}

int freeRam() {
  extern int __heap_start, *__brkval;
  int v;
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
}