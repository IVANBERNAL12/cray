/*
 * Crayfish Monitoring System - Arduino Mega 2560 Sensors (FIXED)
 * Reads DS18B20 temperature and pH sensors, sends data to NodeMCU ESP8266
 * File: arduino_mega_sensors.ino
 * 
 * Wiring:
 * DS18B20: VCC->5V, GND->GND, Data->Pin 2 (with 4.7k pull-up to 5V)
 * pH Sensor: VCC->5V, GND->GND, Signal->A0
 * NodeMCU: TX(Pin 14)->ESP RX(D6), RX(Pin 15)->ESP TX(D7)
 */

#include <OneWire.h>
#include <DallasTemperature.h>

// Pin definitions
#define ONE_WIRE_BUS 2        // DS18B20 data pin
#define PH_PIN A0             // pH sensor analog pin
#define TEMP_POWER_PIN 3      // Temperature sensor power control
#define PH_POWER_PIN 4        // pH sensor power control

// Serial communication with NodeMCU (Hardware Serial3: TX3=14, RX3=15)
#define ESP_SERIAL Serial3

// Temperature sensor setup
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// FIXED: pH calibration constants - adjust these for your sensor!
const float PH_NEUTRAL = 7.0;
const float PH_4_VOLTAGE = 3.32;   // Typical voltage at pH 4.0
const float PH_7_VOLTAGE = 2.50;   // Typical voltage at pH 7.0  
const float PH_10_VOLTAGE = 1.68;  // Typical voltage at pH 10.0

// Timing variables
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
const unsigned long SENSOR_INTERVAL = 2000;    // Read sensors every 2 seconds
const unsigned long SEND_INTERVAL = 5000;      // Send data every 5 seconds

// Data variables
float currentTemperature = -999.0;  // FIXED: Use invalid default
float currentPH = -1.0;            // FIXED: Use invalid default  
bool sensorsInitialized = false;
int errorCount = 0;
bool temperatureSensorWorking = false;
bool phSensorWorking = false;

// Smoothing arrays for stable readings
float tempReadings[5] = {0};
float phReadings[10] = {0};
int tempIndex = 0;
int phIndex = 0;
bool tempArrayFilled = false;
bool phArrayFilled = false;

void setup() {
  // Initialize serial communications
  Serial.begin(9600);           // Debug serial
  ESP_SERIAL.begin(9600);       // Communication with NodeMCU
  
  // Initialize sensor power control pins
  pinMode(TEMP_POWER_PIN, OUTPUT);
  pinMode(PH_POWER_PIN, OUTPUT);
  digitalWrite(TEMP_POWER_PIN, HIGH);
  digitalWrite(PH_POWER_PIN, HIGH);
  
  // Initialize built-in LED for status indication
  pinMode(LED_BUILTIN, OUTPUT);
  
  Serial.println(F("=== Crayfish Monitoring System - Arduino Mega (FIXED) ==="));
  Serial.println(F("Initializing sensors..."));
  
  // Initialize temperature sensor
  sensors.begin();
  int deviceCount = sensors.getDeviceCount();
  
  if (deviceCount > 0) {
    sensors.setResolution(12);  // 12-bit resolution for accuracy
    Serial.print(F("Found "));
    Serial.print(deviceCount);
    Serial.println(F(" DS18B20 temperature sensor(s)"));
    temperatureSensorWorking = true;
  } else {
    Serial.println(F("ERROR: No DS18B20 temperature sensors found!"));
    Serial.println(F("Check wiring: VCC->5V, GND->GND, Data->Pin 2, 4.7k pull-up"));
    temperatureSensorWorking = false;
  }
  
  // Test pH sensor
  Serial.println(F("Testing pH sensor..."));
  int phTestRead = analogRead(PH_PIN);
  if (phTestRead > 0 && phTestRead < 1024) {
    Serial.print(F("pH sensor responding. Raw value: "));
    Serial.println(phTestRead);
    phSensorWorking = true;
  } else {
    Serial.println(F("ERROR: pH sensor not responding!"));
    Serial.println(F("Check wiring: VCC->5V, GND->GND, Signal->A0"));
    phSensorWorking = false;
  }
  
  // Warm up sensors
  Serial.println(F("Warming up sensors (5 seconds)..."));
  delay(5000);
  
  // Initialize reading arrays with invalid values
  for (int i = 0; i < 5; i++) {
    tempReadings[i] = -999.0; // Invalid temperature
  }
  for (int i = 0; i < 10; i++) {
    phReadings[i] = -1.0; // Invalid pH
  }
  
  sensorsInitialized = true;
  Serial.println(F("System initialized!"));
  
  if (!temperatureSensorWorking && !phSensorWorking) {
    Serial.println(F("CRITICAL: Both sensors failed! Check all connections!"));
  }
  
  Serial.println(F("Data Format: TEMP:xx.xx,PH:xx.xx,STATUS:ok"));
  Serial.println(F("Starting main loop...\n"));
  
  // Signal ready with LED pattern
  blinkLED(3, 200);
}

void loop() {
  unsigned long currentTime = millis();
  
  // Read sensors at specified interval
  if (currentTime - lastSensorRead >= SENSOR_INTERVAL) {
    readSensors();
    lastSensorRead = currentTime;
    
    // Blink LED to show activity
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
  }
  
  // Send data to ESP8266 at specified interval
  if (currentTime - lastDataSend >= SEND_INTERVAL) {
    sendDataToESP();
    lastDataSend = currentTime;
  }
  
  // Check for commands from ESP8266
  if (ESP_SERIAL.available()) {
    handleESPCommands();
  }
  
  // Check for debug commands from Serial Monitor
  if (Serial.available()) {
    handleDebugCommands();
  }
}

void readSensors() {
  // Read temperature sensor
  if (temperatureSensorWorking) {
    readTemperature();
  } else {
    Serial.println(F("Skipping temperature - sensor not working"));
  }
  
  // Read pH sensor  
  if (phSensorWorking) {
    readPH();
  } else {
    Serial.println(F("Skipping pH - sensor not working"));
  }
  
  // Print debug info to Serial Monitor
  Serial.print(F("Temp: "));
  if (currentTemperature > -900) {
    Serial.print(currentTemperature, 2);
    Serial.print(F("°C"));
  } else {
    Serial.print(F("SENSOR FAILED"));
  }
  
  Serial.print(F(", pH: "));
  if (currentPH > 0) {
    Serial.print(currentPH, 2);
  } else {
    Serial.print(F("SENSOR FAILED"));
  }
  
  Serial.print(F(", Errors: "));
  Serial.println(errorCount);
}

void readTemperature() {
  sensors.requestTemperatures();
  
  // Wait for conversion (750ms for 12-bit resolution)
  delay(100);
  
  float tempC = sensors.getTempCByIndex(0);
  
  // FIXED: Better validation
  if (tempC != DEVICE_DISCONNECTED_C && tempC > -10 && tempC < 50) {
    // Valid reading - add to smoothing array
    tempReadings[tempIndex] = tempC;
    tempIndex = (tempIndex + 1) % 5;
    if (tempIndex == 0) tempArrayFilled = true;
    
    // Calculate average only if we have valid readings
    float sum = 0;
    int validCount = 0;
    for (int i = 0; i < 5; i++) {
      if (tempReadings[i] > -900) {
        sum += tempReadings[i];
        validCount++;
      }
    }
    
    if (validCount > 0) {
      currentTemperature = sum / validCount;
      errorCount = 0; // Reset error count on successful read
    }
  } else {
    Serial.print(F("ERROR: Temperature sensor read failed! Value: "));
    Serial.println(tempC);
    errorCount++;
    
    // FIXED: Don't use invalid readings
    if (errorCount > 10) {
      Serial.println(F("CRITICAL: Temperature sensor completely failed!"));
      temperatureSensorWorking = false;
      currentTemperature = -999.0; // Mark as invalid
    }
  }
}

void readPH() {
  // Take multiple readings for stability
  long sum = 0;
  int validReadings = 0;
  
  for (int i = 0; i < 20; i++) {
    int reading = analogRead(PH_PIN);
    if (reading > 50 && reading < 974) { // FIXED: Better range check
      sum += reading;
      validReadings++;
    }
    delay(10);
  }
  
  if (validReadings > 10) { // FIXED: Require more valid readings
    float averageReading = sum / (float)validReadings;
    float voltage = averageReading * (5.0 / 1024.0);
    
    // FIXED: Convert voltage to pH using calibration curve
    float phValue = voltageToPH(voltage); // FIXED: Function name
    
    // FIXED: Validate pH range more strictly
    if (phValue >= 3.0 && phValue <= 11.0) {
      // Add to smoothing array
      phReadings[phIndex] = phValue;
      phIndex = (phIndex + 1) % 10;
      if (phIndex == 0) phArrayFilled = true;
      
      // Calculate smoothed average
      float sum = 0;
      int validCount = 0;
      for (int i = 0; i < 10; i++) {
        if (phReadings[i] > 0) {
          sum += phReadings[i];
          validCount++;
        }
      }
      
      if (validCount > 0) {
        currentPH = sum / validCount;
      }
    } else {
      Serial.print(F("WARNING: pH out of range: "));
      Serial.print(phValue);
      Serial.print(F(" (voltage: "));
      Serial.print(voltage);
      Serial.println(F("V)"));
      errorCount++;
    }
  } else {
    Serial.print(F("ERROR: pH sensor read failed! Valid readings: "));
    Serial.print(validReadings);
    Serial.println(F("/20"));
    errorCount++;
    
    if (errorCount > 20) {
      Serial.println(F("CRITICAL: pH sensor completely failed!"));
      phSensorWorking = false;
      currentPH = -1.0; // Mark as invalid
    }
  }
}

// FIXED: Correct function name
float voltageToPH(float voltage) {
  // 3-point linear interpolation for pH calculation
  // Uses buffer solution calibration points
  
  if (voltage >= PH_7_VOLTAGE) {
    // Between pH 4 and 7 (or below pH 4)
    float slope = (4.0 - 7.0) / (PH_4_VOLTAGE - PH_7_VOLTAGE);
    return 7.0 + slope * (voltage - PH_7_VOLTAGE);
  } else {
    // Between pH 7 and 10 (or above pH 10)
    float slope = (7.0 - 10.0) / (PH_7_VOLTAGE - PH_10_VOLTAGE);
    return 7.0 + slope * (voltage - PH_7_VOLTAGE);
  }
}

void sendDataToESP() {
  // FIXED: Only send valid data
  String dataString = "DATA:{";
  
  if (currentTemperature > -900) {
    dataString += "\"temperature\":" + String(currentTemperature, 2) + ",";
  } else {
    dataString += "\"temperature\":null,";
  }
  
  if (currentPH > 0) {
    dataString += "\"ph\":" + String(currentPH, 2) + ",";
  } else {
    dataString += "\"ph\":null,";
  }
  
  dataString += "\"timestamp\":" + String(millis()) + ",";
  dataString += "\"errors\":" + String(errorCount) + ",";
  
  // FIXED: Better status determination
  String status = "ok";
  if (!temperatureSensorWorking || !phSensorWorking) {
    status = "sensor_failure";
  } else if (errorCount > 5) {
    status = "warning";
  }
  
  dataString += "\"status\":\"" + status + "\",";
  dataString += "\"temp_sensor_ok\":" + String(temperatureSensorWorking ? "true" : "false") + ",";
  dataString += "\"ph_sensor_ok\":" + String(phSensorWorking ? "true" : "false");
  dataString += "}";
  
  // Send to ESP8266
  ESP_SERIAL.println(dataString);
  
  // Debug output
  Serial.print(F("Sent to ESP: "));
  Serial.println(dataString);
}

void handleESPCommands() {
  String command = ESP_SERIAL.readStringUntil('\n');
  command.trim();
  
  Serial.print(F("Command from ESP: "));
  Serial.println(command);
  
  if (command == "PING") {
    ESP_SERIAL.println("PONG");
    
  } else if (command == "STATUS") {
    sendStatusToESP();
    
  } else if (command == "CALIBRATE_PH") {
    calibratePH();
    
  } else if (command == "RESET") {
    resetSystem();
    
  } else if (command == "GET_DATA") {
    sendDataToESP();
    
  } else {
    Serial.println(F("Unknown command received"));
    ESP_SERIAL.println("ERROR:Unknown command");
  }
}

void handleDebugCommands() {
  String command = Serial.readStringUntil('\n');
  command.trim();
  command.toUpperCase();
  
  if (command == "STATUS") {
    printSystemStatus();
    
  } else if (command == "CALIBRATE") {
    calibratePH();
    
  } else if (command == "RESET") {
    resetSystem();
    
  } else if (command == "TEST") {
    runSensorTest();
    
  } else if (command == "HELP") {
    printHelp();
    
  } else {
    Serial.println(F("Unknown command. Type HELP for available commands."));
  }
}

void sendStatusToESP() {
  String status = "STATUS:{";
  status += "\"initialized\":" + String(sensorsInitialized ? "true" : "false") + ",";
  status += "\"uptime\":" + String(millis()) + ",";
  status += "\"errors\":" + String(errorCount) + ",";
  status += "\"temp_sensors\":" + String(sensors.getDeviceCount()) + ",";
  status += "\"temp_working\":" + String(temperatureSensorWorking ? "true" : "false") + ",";
  status += "\"ph_working\":" + String(phSensorWorking ? "true" : "false") + ",";
  status += "\"free_ram\":" + String(freeRam());
  status += "}";
  
  ESP_SERIAL.println(status);
}

void calibratePH() {
  Serial.println(F("\n=== pH SENSOR CALIBRATION (FIXED) ==="));
  Serial.println(F("This process requires pH buffer solutions (4.0, 7.0, 10.0)"));
  Serial.println(F("Make sure sensor is clean and properly connected!"));
  Serial.println(F("Calibration starting in 5 seconds..."));
  ESP_SERIAL.println("CALIBRATING:Starting pH calibration");
  
  delay(5000);
  
  // Test if sensor is working first
  int testRead = analogRead(PH_PIN);
  if (testRead <= 50 || testRead >= 974) {
    Serial.println(F("ERROR: pH sensor not responding! Check connections."));
    ESP_SERIAL.println("CALIBRATING:pH sensor failed");
    return;
  }
  
  // Calibrate at pH 7.0 first (reference point)
  Serial.println(F("Step 1: Place sensor in pH 7.0 buffer solution"));
  Serial.println(F("Waiting 30 seconds for stabilization..."));
  
  float ph7_voltage = 0;
  for (int i = 0; i < 30; i++) {
    delay(1000);
    long sum = 0;
    for (int j = 0; j < 10; j++) {
      sum += analogRead(PH_PIN);
      delay(10);
    }
    ph7_voltage = (sum / 10.0) * (5.0 / 1024.0);
    
    Serial.print(F("Reading "));
    Serial.print(i+1);
    Serial.print(F("/30: "));
    Serial.print(ph7_voltage, 3);
    Serial.println(F("V"));
  }
  
  Serial.print(F("pH 7.0 calibration voltage: "));
  Serial.println(ph7_voltage, 3);
  Serial.println(F("Update PH_7_VOLTAGE in code to: "));
  Serial.println(ph7_voltage, 3);
  
  Serial.println(F("Calibration completed!"));
  Serial.println(F("For full calibration, also test pH 4.0 and pH 10.0 buffers"));
  
  ESP_SERIAL.println("CALIBRATING:pH calibration completed");
}

void resetSystem() {
  Serial.println(F("Resetting system..."));
  ESP_SERIAL.println("RESETTING:System reset initiated");
  
  // Power cycle sensors
  cycleSensorPower(TEMP_POWER_PIN);
  cycleSensorPower(PH_POWER_PIN);
  
  // Reinitialize sensors
  sensors.begin();
  
  // Check sensors again
  temperatureSensorWorking = (sensors.getDeviceCount() > 0);
  int phTest = analogRead(PH_PIN);
  phSensorWorking = (phTest > 50 && phTest < 974);
  
  // Reset error counter
  errorCount = 0;
  
  // Reset reading arrays
  for (int i = 0; i < 5; i++) {
    tempReadings[i] = -999.0;
  }
  for (int i = 0; i < 10; i++) {
    phReadings[i] = -1.0;
  }
  
  currentTemperature = -999.0;
  currentPH = -1.0;
  tempArrayFilled = false;
  phArrayFilled = false;
  
  Serial.print(F("Temperature sensor working: "));
  Serial.println(temperatureSensorWorking ? F("YES") : F("NO"));
  Serial.print(F("pH sensor working: "));
  Serial.println(phSensorWorking ? F("YES") : F("NO"));
  
  Serial.println(F("System reset completed"));
  ESP_SERIAL.println("RESETTING:System reset completed");
  
  blinkLED(5, 100);
}

void cycleSensorPower(int pin) {
  Serial.print(F("Power cycling sensor on pin "));
  Serial.println(pin);
  
  digitalWrite(pin, LOW);
  delay(2000);
  digitalWrite(pin, HIGH);
  delay(3000);
}

void runSensorTest() {
  Serial.println(F("\n=== SENSOR TEST (FIXED) ==="));
  
  // Test temperature sensor
  Serial.println(F("Testing temperature sensor..."));
  sensors.requestTemperatures();
  delay(1000);
  
  int deviceCount = sensors.getDeviceCount();
  Serial.print(F("Temperature sensors found: "));
  Serial.println(deviceCount);
  
  if (deviceCount > 0) {
    for (int i = 0; i < deviceCount; i++) {
      float temp = sensors.getTempCByIndex(i);
      Serial.print(F("Sensor "));
      Serial.print(i);
      Serial.print(F(": "));
      if (temp == DEVICE_DISCONNECTED_C) {
        Serial.println(F("DISCONNECTED"));
      } else {
        Serial.print(temp);
        Serial.println(F("°C"));
      }
    }
  } else {
    Serial.println(F("FAILED: Check wiring!"));
  }
  
  // Test pH sensor
  Serial.println(F("\nTesting pH sensor..."));
  for (int i = 0; i < 10; i++) {
    int raw = analogRead(PH_PIN);
    float voltage = raw * (5.0 / 1024.0);
    
    Serial.print(F("Test "));
    Serial.print(i+1);
    Serial.print(F(": Raw="));
    Serial.print(raw);
    Serial.print(F(", Voltage="));
    Serial.print(voltage, 3);
    Serial.print(F("V"));
    
    if (raw > 50 && raw < 974) {
      float ph = voltageToPH(voltage);
      Serial.print(F(", pH="));
      Serial.println(ph, 2);
    } else {
      Serial.println(F(" [INVALID]"));
    }
    
    delay(500);
  }
  
  Serial.println(F("Test completed"));
}

void printSystemStatus() {
  Serial.println(F("\n=== SYSTEM STATUS ==="));
  Serial.print(F("Uptime: "));
  Serial.print(millis() / 1000);
  Serial.println(F(" seconds"));
  
  Serial.print(F("Sensors initialized: "));
  Serial.println(sensorsInitialized ? F("Yes") : F("No"));
  
  Serial.print(F("Temperature sensors found: "));
  Serial.println(sensors.getDeviceCount());
  Serial.print(F("Temperature sensor working: "));
  Serial.println(temperatureSensorWorking ? F("YES") : F("NO"));
  
  Serial.print(F("Current temperature: "));
  if (currentTemperature > -900) {
    Serial.print(currentTemperature);
    Serial.println(F("°C"));
  } else {
    Serial.println(F("SENSOR FAILED"));
  }
  
  Serial.print(F("pH sensor working: "));
  Serial.println(phSensorWorking ? F("YES") : F("NO"));
  
  Serial.print(F("Current pH: "));
  if (currentPH > 0) {
    Serial.println(currentPH);
  } else {
    Serial.println(F("SENSOR FAILED"));
  }
  
  Serial.print(F("Error count: "));
  Serial.println(errorCount);
  
  Serial.print(F("Free RAM: "));
  Serial.print(freeRam());
  Serial.println(F(" bytes"));
}

void printHelp() {
  Serial.println(F("\n=== AVAILABLE COMMANDS ==="));
  Serial.println(F("STATUS    - Show system status"));
  Serial.println(F("CALIBRATE - Start pH sensor calibration"));
  Serial.println(F("RESET     - Reset sensors and system"));
  Serial.println(F("TEST      - Run sensor diagnostics"));
  Serial.println(F("HELP      - Show this help menu"));
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

// Watchdog timer simulation
void checkWatchdog() {
  static unsigned long lastWatchdog = 0;
  
  if (millis() - lastWatchdog > 30000) { // 30 seconds
    if (temperatureSensorWorking && phSensorWorking) {
      Serial.println(F("Watchdog: System running normally"));
    } else {
      Serial.println(F("Watchdog: SENSOR FAILURES DETECTED!"));
    }
    lastWatchdog = millis();
  }
}