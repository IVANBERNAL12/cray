/*
 * Crayfish Monitoring System - Arduino Mega 2560 with Automatic Water Change
 * Reads DS18B20 temperature and pH sensors, sends data to NodeMCU ESP8266
 * Controls 2 pumps via 2-channel relay for automatic water change
 */

#include <OneWire.h>
#include <DallasTemperature.h>

// Pin definitions - Sensors
#define ONE_WIRE_BUS 2        // DS18B20 data pin
#define PH_PIN A0             // pH sensor analog pin
#define TEMP_POWER_PIN 3      // Temperature sensor power control
#define PH_POWER_PIN 4        // pH sensor power control

// Pin definitions - Relay and Pumps
#define RELAY_DRAIN_PUMP 5    // Relay channel 1 - Drain pump (OUT water)
#define RELAY_FILL_PUMP 6     // Relay channel 2 - Fill pump (IN water)

// Serial communication with NodeMCU (Hardware Serial3: TX3=14, RX3=15)
#define ESP_SERIAL Serial3

// Temperature sensor setup
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// pH calibration constants
const float PH_NEUTRAL = 7.0;
const float PH_4_VOLTAGE = 3.32;
const float PH_7_VOLTAGE = 2.50;
const float PH_10_VOLTAGE = 1.68;

// Water change settings
const unsigned long DRAIN_TIME = 30000;   // 30 seconds to drain water (adjust as needed)
const unsigned long FILL_TIME = 35000;    // 35 seconds to fill water (adjust as needed)
const unsigned long SETTLE_TIME = 5000;   // 5 seconds settling time between operations
bool waterChangeInProgress = false;

// Timing variables
unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
const unsigned long SENSOR_INTERVAL = 2000;
const unsigned long SEND_INTERVAL = 5000;

// Data variables
float currentTemperature = -999.0;
float currentPH = -1.0;
bool sensorsInitialized = false;
int errorCount = 0;
bool temperatureSensorWorking = false;
bool phSensorWorking = false;

// Smoothing arrays
float tempReadings[5] = {0};
float phReadings[10] = {0};
int tempIndex = 0;
int phIndex = 0;
bool tempArrayFilled = false;
bool phArrayFilled = false;

void setup() {
  // Initialize serial communications
  Serial.begin(9600);
  ESP_SERIAL.begin(9600);
  
  // Initialize sensor power control pins
  pinMode(TEMP_POWER_PIN, OUTPUT);
  pinMode(PH_POWER_PIN, OUTPUT);
  digitalWrite(TEMP_POWER_PIN, HIGH);
  digitalWrite(PH_POWER_PIN, HIGH);
  
  // Initialize relay pins (ACTIVE LOW - HIGH = OFF, LOW = ON)
  pinMode(RELAY_DRAIN_PUMP, OUTPUT);
  pinMode(RELAY_FILL_PUMP, OUTPUT);
  digitalWrite(RELAY_DRAIN_PUMP, HIGH);  // Turn OFF drain pump
  digitalWrite(RELAY_FILL_PUMP, HIGH);   // Turn OFF fill pump
  
  // Initialize built-in LED
  pinMode(LED_BUILTIN, OUTPUT);
  
  Serial.println(F("=== Crayfish Monitoring System - Arduino Mega ==="));
  Serial.println(F("Version 2.0 - With Automatic Water Change"));
  Serial.println(F("Initializing sensors..."));
  
  // Test relays at startup
  Serial.println(F("Testing relay system..."));
  testRelays();
  
  // Initialize temperature sensor
  sensors.begin();
  int deviceCount = sensors.getDeviceCount();
  
  if (deviceCount > 0) {
    sensors.setResolution(12);
    Serial.print(F("Found "));
    Serial.print(deviceCount);
    Serial.println(F(" DS18B20 sensor(s)"));
    temperatureSensorWorking = true;
  } else {
    Serial.println(F("ERROR: No DS18B20 sensors found!"));
    temperatureSensorWorking = false;
  }
  
  // Test pH sensor
  Serial.println(F("Testing pH sensor..."));
  int phTestRead = analogRead(PH_PIN);
  if (phTestRead > 0 && phTestRead < 1024) {
    Serial.print(F("pH sensor OK. Raw: "));
    Serial.println(phTestRead);
    phSensorWorking = true;
  } else {
    Serial.println(F("ERROR: pH sensor not responding!"));
    phSensorWorking = false;
  }
  
  // Warm up sensors
  Serial.println(F("Warming up sensors (5 seconds)..."));
  delay(5000);
  
  // Initialize arrays
  for (int i = 0; i < 5; i++) tempReadings[i] = -999.0;
  for (int i = 0; i < 10; i++) phReadings[i] = -1.0;
  
  sensorsInitialized = true;
  Serial.println(F("System initialized!"));
  Serial.println(F("Ready for commands from ESP8266"));
  Serial.println(F("Available commands: CHANGE_WATER, FEED_NOW, TEST_WATER, STATUS\n"));
  
  blinkLED(3, 200);
}

void loop() {
  unsigned long currentTime = millis();
  
  // Don't read sensors during water change
  if (!waterChangeInProgress) {
    // Read sensors
    if (currentTime - lastSensorRead >= SENSOR_INTERVAL) {
      readSensors();
      lastSensorRead = currentTime;
      digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    }
    
    // Send data to ESP8266
    if (currentTime - lastDataSend >= SEND_INTERVAL) {
      sendDataToESP();
      lastDataSend = currentTime;
    }
  }
  
  // Check for commands from ESP8266
  if (ESP_SERIAL.available()) {
    handleESPCommands();
  }
  
  // Check for debug commands
  if (Serial.available()) {
    handleDebugCommands();
  }
  
  yield();
}

void testRelays() {
  Serial.println(F("Testing drain pump relay..."));
  digitalWrite(RELAY_DRAIN_PUMP, LOW);   // Turn ON
  delay(500);
  digitalWrite(RELAY_DRAIN_PUMP, HIGH);  // Turn OFF
  delay(500);
  
  Serial.println(F("Testing fill pump relay..."));
  digitalWrite(RELAY_FILL_PUMP, LOW);    // Turn ON
  delay(500);
  digitalWrite(RELAY_FILL_PUMP, HIGH);   // Turn OFF
  delay(500);
  
  Serial.println(F("Relay test complete!"));
}

void executeWaterChange() {
  if (waterChangeInProgress) {
    Serial.println(F("Water change already in progress!"));
    ESP_SERIAL.println("ERROR:Water change already running");
    return;
  }
  
  waterChangeInProgress = true;
  Serial.println(F("\n=== STARTING AUTOMATIC WATER CHANGE ==="));
  ESP_SERIAL.println("STATUS:Water change started");
  
  // Safety check - make sure both pumps are OFF
  digitalWrite(RELAY_DRAIN_PUMP, HIGH);
  digitalWrite(RELAY_FILL_PUMP, HIGH);
  delay(1000);
  
  // PHASE 1: DRAIN OLD WATER
  Serial.println(F("PHASE 1: Draining old water..."));
  ESP_SERIAL.println("STATUS:Draining water");
  
  digitalWrite(RELAY_DRAIN_PUMP, LOW);  // Turn ON drain pump
  
  unsigned long drainStart = millis();
  while (millis() - drainStart < DRAIN_TIME) {
    // Blink LED rapidly during drain
    if ((millis() - drainStart) % 500 < 250) {
      digitalWrite(LED_BUILTIN, HIGH);
    } else {
      digitalWrite(LED_BUILTIN, LOW);
    }
    
    // Print progress every 5 seconds
    if ((millis() - drainStart) % 5000 == 0) {
      Serial.print(F("Draining... "));
      Serial.print((millis() - drainStart) / 1000);
      Serial.print(F("/"));
      Serial.print(DRAIN_TIME / 1000);
      Serial.println(F(" seconds"));
    }
    
    delay(100);
  }
  
  digitalWrite(RELAY_DRAIN_PUMP, HIGH);  // Turn OFF drain pump
  Serial.println(F("Drain complete!"));
  
  // SETTLING PHASE
  Serial.println(F("Settling time..."));
  ESP_SERIAL.println("STATUS:Settling");
  delay(SETTLE_TIME);
  
  // PHASE 2: FILL FRESH WATER
  Serial.println(F("PHASE 2: Filling fresh water..."));
  ESP_SERIAL.println("STATUS:Filling water");
  
  digitalWrite(RELAY_FILL_PUMP, LOW);  // Turn ON fill pump
  
  unsigned long fillStart = millis();
  while (millis() - fillStart < FILL_TIME) {
    // Blink LED slowly during fill
    if ((millis() - fillStart) % 1000 < 500) {
      digitalWrite(LED_BUILTIN, HIGH);
    } else {
      digitalWrite(LED_BUILTIN, LOW);
    }
    
    // Print progress every 5 seconds
    if ((millis() - fillStart) % 5000 == 0) {
      Serial.print(F("Filling... "));
      Serial.print((millis() - fillStart) / 1000);
      Serial.print(F("/"));
      Serial.print(FILL_TIME / 1000);
      Serial.println(F(" seconds"));
    }
    
    delay(100);
  }
  
  digitalWrite(RELAY_FILL_PUMP, HIGH);  // Turn OFF fill pump
  Serial.println(F("Fill complete!"));
  
  // Final settling
  Serial.println(F("Final settling..."));
  delay(SETTLE_TIME);
  
  // Water change complete
  Serial.println(F("=== WATER CHANGE COMPLETE ===\n"));
  ESP_SERIAL.println("WATER_CHANGE_COMPLETE");
  
  waterChangeInProgress = false;
  
  // Reset sensor arrays to get fresh readings
  for (int i = 0; i < 5; i++) tempReadings[i] = -999.0;
  for (int i = 0; i < 10; i++) phReadings[i] = -1.0;
  tempArrayFilled = false;
  phArrayFilled = false;
  
  // Success indication
  blinkLED(5, 200);
}

void emergencyStop() {
  Serial.println(F("\n!!! EMERGENCY STOP !!!"));
  
  // Turn OFF both pumps immediately
  digitalWrite(RELAY_DRAIN_PUMP, HIGH);
  digitalWrite(RELAY_FILL_PUMP, HIGH);
  
  waterChangeInProgress = false;
  
  Serial.println(F("All pumps stopped!"));
  ESP_SERIAL.println("STATUS:Emergency stop executed");
  
  // Rapid blink
  for (int i = 0; i < 10; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(100);
    digitalWrite(LED_BUILTIN, LOW);
    delay(100);
  }
}

void readSensors() {
  if (temperatureSensorWorking) {
    readTemperature();
  }
  
  if (phSensorWorking) {
    readPH();
  }
  
  // Debug output
  Serial.print(F("Temp: "));
  if (currentTemperature > -900) {
    Serial.print(currentTemperature, 2);
    Serial.print(F("°C"));
  } else {
    Serial.print(F("FAILED"));
  }
  
  Serial.print(F(", pH: "));
  if (currentPH > 0) {
    Serial.print(currentPH, 2);
  } else {
    Serial.print(F("FAILED"));
  }
  
  Serial.print(F(", Errors: "));
  Serial.println(errorCount);
}

void readTemperature() {
  sensors.requestTemperatures();
  delay(100);
  
  float tempC = sensors.getTempCByIndex(0);
  
  if (tempC != DEVICE_DISCONNECTED_C && tempC > -10 && tempC < 50) {
    tempReadings[tempIndex] = tempC;
    tempIndex = (tempIndex + 1) % 5;
    if (tempIndex == 0) tempArrayFilled = true;
    
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
      errorCount = 0;
    }
  } else {
    errorCount++;
    if (errorCount > 10) {
      temperatureSensorWorking = false;
      currentTemperature = -999.0;
    }
  }
}

void readPH() {
  long sum = 0;
  int validReadings = 0;
  
  for (int i = 0; i < 20; i++) {
    int reading = analogRead(PH_PIN);
    if (reading > 50 && reading < 974) {
      sum += reading;
      validReadings++;
    }
    delay(10);
  }
  
  if (validReadings > 10) {
    float averageReading = sum / (float)validReadings;
    float voltage = averageReading * (5.0 / 1024.0);
    float phValue = voltageToPH(voltage);
    
    if (phValue >= 3.0 && phValue <= 11.0) {
      phReadings[phIndex] = phValue;
      phIndex = (phIndex + 1) % 10;
      if (phIndex == 0) phArrayFilled = true;
      
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
      errorCount++;
    }
  } else {
    errorCount++;
    if (errorCount > 20) {
      phSensorWorking = false;
      currentPH = -1.0;
    }
  }
}

float voltageToPH(float voltage) {
  if (voltage >= PH_7_VOLTAGE) {
    float slope = (4.0 - 7.0) / (PH_4_VOLTAGE - PH_7_VOLTAGE);
    return 7.0 + slope * (voltage - PH_7_VOLTAGE);
  } else {
    float slope = (7.0 - 10.0) / (PH_7_VOLTAGE - PH_10_VOLTAGE);
    return 7.0 + slope * (voltage - PH_7_VOLTAGE);
  }
}

void sendDataToESP() {
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
  
  String status = "ok";
  if (waterChangeInProgress) {
    status = "water_change";
  } else if (!temperatureSensorWorking || !phSensorWorking) {
    status = "sensor_failure";
  } else if (errorCount > 5) {
    status = "warning";
  }
  
  dataString += "\"status\":\"" + status + "\",";
  dataString += "\"temp_sensor_ok\":" + String(temperatureSensorWorking ? "true" : "false") + ",";
  dataString += "\"ph_sensor_ok\":" + String(phSensorWorking ? "true" : "false");
  dataString += "}";
  
  ESP_SERIAL.println(dataString);
  
  Serial.print(F("→ ESP: "));
  Serial.println(dataString);
}

void handleESPCommands() {
  String command = ESP_SERIAL.readStringUntil('\n');
  command.trim();
  
  Serial.print(F("← ESP Command: "));
  Serial.println(command);
  
  if (command == "PING") {
    ESP_SERIAL.println("PONG");
  } else if (command == "CHANGE_WATER") {
    executeWaterChange();
  } else if (command == "EMERGENCY_STOP") {
    emergencyStop();
  } else if (command == "FEED_NOW") {
    executeFeeding();
  } else if (command == "TEST_WATER") {
    executeWaterTest();
  } else if (command == "STATUS") {
    sendStatusToESP();
  } else if (command == "GET_DATA") {
    sendDataToESP();
  } else {
    Serial.println(F("Unknown command"));
    ESP_SERIAL.println("ERROR:Unknown command");
  }
}

void handleDebugCommands() {
  String command = Serial.readStringUntil('\n');
  command.trim();
  command.toUpperCase();
  
  if (command == "WATER") {
    executeWaterChange();
  } else if (command == "STOP") {
    emergencyStop();
  } else if (command == "TEST") {
    testRelays();
  } else if (command == "STATUS") {
    printSystemStatus();
  } else if (command == "HELP") {
    printHelp();
  } else {
    Serial.println(F("Unknown command. Type HELP"));
  }
}

void executeFeeding() {
  Serial.println(F("Executing feeding command..."));
  // Add your feeding mechanism here
  
  ESP_SERIAL.println("FEEDING_COMPLETE");
  Serial.println(F("Feeding complete"));
  blinkLED(2, 200);
}

void executeWaterTest() {
  Serial.println(F("Executing water test..."));
  readSensors();
  sendDataToESP();
  
  ESP_SERIAL.println("WATER_TEST_COMPLETE");
  Serial.println(F("Water test complete"));
}

void sendStatusToESP() {
  String status = "STATUS:{";
  status += "\"initialized\":" + String(sensorsInitialized ? "true" : "false") + ",";
  status += "\"uptime\":" + String(millis()) + ",";
  status += "\"errors\":" + String(errorCount) + ",";
  status += "\"temp_working\":" + String(temperatureSensorWorking ? "true" : "false") + ",";
  status += "\"ph_working\":" + String(phSensorWorking ? "true" : "false") + ",";
  status += "\"water_change_active\":" + String(waterChangeInProgress ? "true" : "false") + ",";
  status += "\"free_ram\":" + String(freeRam());
  status += "}";
  
  ESP_SERIAL.println(status);
}

void printSystemStatus() {
  Serial.println(F("\n=== SYSTEM STATUS ==="));
  Serial.print(F("Uptime: "));
  Serial.print(millis() / 1000);
  Serial.println(F(" seconds"));
  
  Serial.print(F("Temperature: "));
  if (currentTemperature > -900) {
    Serial.print(currentTemperature);
    Serial.println(F("°C"));
  } else {
    Serial.println(F("FAILED"));
  }
  
  Serial.print(F("pH: "));
  if (currentPH > 0) {
    Serial.println(currentPH);
  } else {
    Serial.println(F("FAILED"));
  }
  
  Serial.print(F("Water change active: "));
  Serial.println(waterChangeInProgress ? F("YES") : F("NO"));
  
  Serial.print(F("Errors: "));
  Serial.println(errorCount);
  
  Serial.print(F("Free RAM: "));
  Serial.print(freeRam());
  Serial.println(F(" bytes"));
}

void printHelp() {
  Serial.println(F("\n=== AVAILABLE COMMANDS ==="));
  Serial.println(F("WATER  - Start automatic water change"));
  Serial.println(F("STOP   - Emergency stop all pumps"));
  Serial.println(F("TEST   - Test relay system"));
  Serial.println(F("STATUS - Show system status"));
  Serial.println(F("HELP   - Show this menu"));
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