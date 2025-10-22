/*
 * AquaVision Pro - Arduino Mega 2560 Code
 * ROBUST COMMUNICATION VERSION v6.0
 * 
 * Hardware Connections:
 * - DS18B20 Temperature: Pin 2 (with 4.7kΩ pull-up)
 * - PH4502C pH Sensor: Pin A0
 * - DS3231 RTC: Pin 20 (SDA), Pin 21 (SCL)
 * - SG90 Servo: Pin 9
 * - Relay CH1 (Drain): Pin 5
 * - Relay CH2 (Fill): Pin 6
 * 
 * ESP8266 Connection:
 * - Arduino TX1 (Pin 18) → ESP D5 via 1KΩ resistor (MINIMUM PROTECTION)
 * - Arduino RX1 (Pin 19) → ESP D6 direct
 * - Arduino GND → ESP GND (MUST BE CONNECTED!)
 */

#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <RTClib.h>
#include <Servo.h>

// ============================================
// PIN DEFINITIONS
// ============================================
#define ONE_WIRE_BUS 2
#define PH_PIN A0
#define SERVO_PIN 9
#define RELAY_DRAIN 5
#define RELAY_FILL 6
#define RELAY_CH3 7
#define RELAY_CH4 8

#define ESP_SERIAL Serial1    // TX1=18, RX1=19

// ============================================
// OBJECTS
// ============================================
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensors(&oneWire);
RTC_DS3231 rtc;
Servo feedServo;

// ============================================
// CONFIGURATION
// ============================================
const float PH_NEUTRAL_VOLTAGE = 2.50;
const float PH_ACID_SLOPE = 0.18;

const unsigned long DRAIN_TIME = 30000;
const unsigned long FILL_TIME = 35000;
const unsigned long SETTLE_TIME = 5000;

const int SERVO_CLOSED = 0;
const int SERVO_OPEN = 90;
const int FEED_DURATION = 2000;

const unsigned long SENSOR_READ_INTERVAL = 10000;
const unsigned long DATA_SEND_INTERVAL = 15000;
const unsigned long HEARTBEAT_INTERVAL = 20000;

// Start with lower baud rate for reliability
const int INITIAL_BAUD_RATE = 4800;
const int FALLBACK_BAUD_RATE = 9600;

// ============================================
// GLOBAL VARIABLES
// ============================================
float currentTemperature = 24.5;
float currentPH = 7.0;
bool tempSensorOK = false;
bool phSensorOK = false;
int errorCount = 0;

bool waterChangeActive = false;
bool systemInitialized = false;
bool espConnected = false;

unsigned long lastSensorRead = 0;
unsigned long lastDataSend = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastESPCheck = 0;

const int TEMP_SAMPLES = 5;
const int PH_SAMPLES = 10;
float tempReadings[TEMP_SAMPLES];
float phReadings[PH_SAMPLES];
int tempIndex = 0;
int phIndex = 0;

int dataPacketsSent = 0;
int commandsReceived = 0;
int baudRate = INITIAL_BAUD_RATE;

// Command queue system
const int MAX_COMMAND_QUEUE = 5;
String commandQueue[MAX_COMMAND_QUEUE];
int commandQueueHead = 0;
int commandQueueTail = 0;
bool commandInProgress = false;
String currentCommand = "";
unsigned long commandStartTime = 0;

// Communication mode
bool useSimpleFormat = true;  // Start with simple format

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  ESP_SERIAL.begin(baudRate);
  
  delay(2000);
  
  Serial.println(F("========================================"));
  Serial.println(F("  AquaVision Pro - Arduino Mega 2560"));
  Serial.println(F("  ROBUST COMMUNICATION v6.0"));
  Serial.println(F("========================================\n"));
  
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  
  // Initialize Relays (ACTIVE LOW)
  pinMode(RELAY_DRAIN, OUTPUT);
  pinMode(RELAY_FILL, OUTPUT);
  pinMode(RELAY_CH3, OUTPUT);
  pinMode(RELAY_CH4, OUTPUT);
  
  digitalWrite(RELAY_DRAIN, HIGH);
  digitalWrite(RELAY_FILL, HIGH);
  digitalWrite(RELAY_CH3, HIGH);
  digitalWrite(RELAY_CH4, HIGH);
  
  Serial.println(F("✓ Relay outputs initialized"));
  
  Wire.begin();
  
  // Initialize RTC
  if (!rtc.begin()) {
    Serial.println(F("✗ RTC not found!"));
  } else {
    Serial.println(F("✓ RTC initialized"));
    if (rtc.lostPower()) {
      Serial.println(F("⚠ RTC lost power, setting time..."));
      rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }
    DateTime now = rtc.now();
    Serial.print(F("  Time: "));
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
    Serial.println(F("✗ No sensor! Using defaults"));
    tempSensorOK = false;
  }
  
  // Initialize pH Sensor
  Serial.print(F("Testing pH sensor... "));
  int phTest = analogRead(PH_PIN);
  if (phTest > 10 && phTest < 1014) {
    phSensorOK = true;
    Serial.print(F("✓ OK ("));
    Serial.print(phTest);
    Serial.println(F(")"));
  } else {
    phSensorOK = false;
    Serial.println(F("✗ No response! Using defaults"));
  }
  
  // Initialize Servo
  feedServo.attach(SERVO_PIN);
  feedServo.write(SERVO_CLOSED);
  Serial.println(F("✓ Servo initialized"));
  
  // Initialize arrays
  for (int i = 0; i < TEMP_SAMPLES; i++) tempReadings[i] = 24.5;
  for (int i = 0; i < PH_SAMPLES; i++) phReadings[i] = 7.0;
  
  Serial.println(F("\nWarming up sensors..."));
  delay(2000);
  readAllSensors();
  
  systemInitialized = true;
  Serial.println(F("\n✓ System ready!"));
  Serial.print(F("✓ Using "));
  Serial.print(baudRate);
  Serial.println(F(" baud for ESP communication\n"));
  
  blinkLED(3, 200);
  
  // Clear ESP buffer
  while (ESP_SERIAL.available()) {
    ESP_SERIAL.read();
  }
  
  // Send ready signal
  delay(1000);
  ESP_SERIAL.println("READY");
  ESP_SERIAL.flush();
  delay(500);
  
  // Send initial data
  sendDataToESP();
  lastDataSend = millis();
  
  Serial.println(F("📤 Initial data sent\n"));
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  unsigned long currentMillis = millis();
  
  // Process command queue
  processCommandQueue();
  
  // Read sensors
  if (!waterChangeActive && (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL)) {
    readAllSensors();
    lastSensorRead = currentMillis;
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
  }
  
  // Send data to ESP
  if (currentMillis - lastDataSend >= DATA_SEND_INTERVAL) {
    sendDataToESP();
    lastDataSend = currentMillis;
    dataPacketsSent++;
  }
  
  // Send heartbeat
  if (currentMillis - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    ESP_SERIAL.println("HEARTBEAT");
    ESP_SERIAL.flush();
    Serial.print(F("💓 Heartbeat #"));
    Serial.println(dataPacketsSent);
    lastHeartbeat = currentMillis;
  }
  
  // Check for ESP commands
  if (ESP_SERIAL.available()) {
    handleESPCommand();
  }
  
  // Check for debug commands
  if (Serial.available()) {
    handleDebugCommand();
  }
  
  // Check ESP connection periodically
  if (currentMillis - lastESPCheck > 60000) { // Every minute
    checkESPConnection();
    lastESPCheck = currentMillis;
  }
  
  yield();
}

// ============================================
// SENSOR FUNCTIONS
// ============================================
void readAllSensors() {
  readTemperature();
  readPH();
  
  Serial.print(F("📊 "));
  Serial.print(currentTemperature, 1);
  Serial.print(F("°C | pH:"));
  Serial.println(currentPH, 2);
}

void readTemperature() {
  if (!tempSensorOK) {
    currentTemperature = 24.5;
    return;
  }
  
  tempSensors.requestTemperatures();
  delay(100);
  
  float temp = tempSensors.getTempCByIndex(0);
  
  if (temp != DEVICE_DISCONNECTED_C && temp > -10 && temp < 50) {
    tempReadings[tempIndex] = temp;
    tempIndex = (tempIndex + 1) % TEMP_SAMPLES;
    
    float sum = 0;
    int validCount = 0;
    for (int i = 0; i < TEMP_SAMPLES; i++) {
      if (tempReadings[i] > 0) {
        sum += tempReadings[i];
        validCount++;
      }
    }
    
    if (validCount > 0) {
      currentTemperature = sum / validCount;
      errorCount = max(0, errorCount - 1);
    }
  } else {
    errorCount++;
    if (errorCount > 10) {
      tempSensorOK = false;
      currentTemperature = 24.5;
    }
  }
}

void readPH() {
  if (!phSensorOK) {
    currentPH = 7.0;
    return;
  }
  
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
    float phValue = 7.0 - ((voltage - PH_NEUTRAL_VOLTAGE) / PH_ACID_SLOPE);
    
    if (phValue >= 3.0 && phValue <= 11.0) {
      phReadings[phIndex] = phValue;
      phIndex = (phIndex + 1) % PH_SAMPLES;
      
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
      currentPH = 7.0;
    }
  }
}

// ============================================
// COMMUNICATION
// ============================================
void sendDataToESP() {
  DateTime now = rtc.now();
  
  if (useSimpleFormat) {
    // Use simple format first
    String data = "SIMPLE:T=" + String(currentTemperature, 1) + 
                  ",P=" + String(currentPH, 2) + 
                  ",E=" + String(errorCount) + 
                  ",S=" + getStatusCode();
    
    ESP_SERIAL.println(data);
    ESP_SERIAL.flush();
    
    Serial.print(F("📤 Sent #"));
    Serial.print(dataPacketsSent);
    Serial.print(F(" (simple, "));
    Serial.print(data.length());
    Serial.println(F(" bytes)"));
  } else {
    // Use JSON format
    String data = "DATA:{";
    data += "\"t\":";  // Shortened key
    data += String(currentTemperature, 2);
    data += ",\"p\":";  // Shortened key
    data += String(currentPH, 2);
    data += ",\"ts\":\"";
    data += now.timestamp();
    data += "\",\"e\":";
    data += String(errorCount);
    data += ",\"s\":\"";
    data += getStatusCode();
    data += "\",\"tsok\":";
    data += tempSensorOK ? "true" : "false";
    data += ",\"psok\":";
    data += phSensorOK ? "true" : "false";
    data += ",\"id\":";
    data += String(dataPacketsSent);
    data += "}";
    
    ESP_SERIAL.println(data);
    ESP_SERIAL.flush();
    
    Serial.print(F("📤 Sent #"));
    Serial.print(dataPacketsSent);
    Serial.print(F(" (JSON, "));
    Serial.print(data.length());
    Serial.println(F(" bytes)"));
  }
}

String getStatusCode() {
  if (waterChangeActive) return "wc";
  else if (!tempSensorOK && !phSensorOK) return "ns";
  else if (errorCount > 5) return "w";
  else return "ok";
}

void handleESPCommand() {
  String command = ESP_SERIAL.readStringUntil('\n');
  command.trim();
  
  if (command.length() == 0) return;
  
  Serial.print(F("📥 ESP: "));
  Serial.println(command);
  
  commandsReceived++;
  
  // Immediate responses
  if (command == "PING") {
    ESP_SERIAL.println("PONG");
    ESP_SERIAL.flush();
    espConnected = true;
  } 
  else if (command == "TEST") {
    ESP_SERIAL.println("OK");
    ESP_SERIAL.flush();
    Serial.println(F("Test response sent"));
    espConnected = true;
  }
  else if (command == "TEST_CONNECTION") {
    ESP_SERIAL.println("CONNECTION_OK");
    ESP_SERIAL.flush();
    Serial.println(F("Connection test response sent"));
    espConnected = true;
  }
  else if (command == "GET_DATA") {
    sendDataToESP();
  }
  else if (command == "STATUS") {
    printSystemStatus();
  }
  else {
    // Queue all other commands
    queueCommand(command);
  }
}

void queueCommand(String command) {
  int nextTail = (commandQueueTail + 1) % MAX_COMMAND_QUEUE;
  
  if (nextTail != commandQueueHead) {
    commandQueue[commandQueueTail] = command;
    commandQueueTail = nextTail;
    Serial.print("Command queued: ");
    Serial.println(command);
  } else {
    Serial.println("Command queue full!");
  }
}

void processCommandQueue() {
  if (!commandInProgress && commandQueueHead != commandQueueTail) {
    currentCommand = commandQueue[commandQueueHead];
    commandQueueHead = (commandQueueHead + 1) % MAX_COMMAND_QUEUE;
    commandInProgress = true;
    commandStartTime = millis();
    
    // Send acknowledgment
    ESP_SERIAL.println("ACK:" + currentCommand);
    ESP_SERIAL.flush();
    
    Serial.print("Processing command: ");
    Serial.println(currentCommand);
    
    // Execute the command
    if (currentCommand == "FEED_NOW") {
      executeFeeding();
    } 
    else if (currentCommand == "CHANGE_WATER") {
      executeWaterChange();
    } 
    else if (currentCommand == "TEST_WATER") {
      readAllSensors();
      sendDataToESP();
      ESP_SERIAL.println("WATER_TEST_COMPLETE");
      ESP_SERIAL.flush();
    } 
    else if (currentCommand == "EMERGENCY_STOP") {
      emergencyStop();
    }
    
    commandInProgress = false;
  }
  
  // Check for command timeout
  if (commandInProgress && (millis() - commandStartTime > 30000)) {
    Serial.println("Command execution timeout!");
    ESP_SERIAL.println("ERROR:Command timeout");
    ESP_SERIAL.flush();
    commandInProgress = false;
  }
}

void checkESPConnection() {
  Serial.println(F("Checking ESP connection..."));
  
  ESP_SERIAL.println("PING");
  ESP_SERIAL.flush();
  
  unsigned long startTime = millis();
  bool responseReceived = false;
  
  while (millis() - startTime < 3000) {
    if (ESP_SERIAL.available()) {
      String response = ESP_SERIAL.readStringUntil('\n');
      response.trim();
      
      if (response == "PONG") {
        responseReceived = true;
        break;
      }
    }
    delay(10);
  }
  
  if (responseReceived) {
    Serial.println(F("✓ ESP connection OK"));
    espConnected = true;
  } else {
    Serial.println(F("⚠ ESP not responding, trying different baud rate..."));
    
    // Try fallback baud rate
    ESP_SERIAL.end();
    delay(100);
    baudRate = baudRate == INITIAL_BAUD_RATE ? FALLBACK_BAUD_RATE : INITIAL_BAUD_RATE;
    ESP_SERIAL.begin(baudRate);
    delay(500);
    
    Serial.print(F("Trying "));
    Serial.print(baudRate);
    Serial.println(F(" baud..."));
    
    ESP_SERIAL.println("PING");
    ESP_SERIAL.flush();
    
    startTime = millis();
    while (millis() - startTime < 3000) {
      if (ESP_SERIAL.available()) {
        String response = ESP_SERIAL.readStringUntil('\n');
        response.trim();
        
        if (response == "PONG") {
          responseReceived = true;
          break;
        }
      }
      delay(10);
    }
    
    if (responseReceived) {
      Serial.print(F("✓ ESP connected at "));
      Serial.print(baudRate);
      Serial.println(F(" baud"));
      espConnected = true;
    } else {
      Serial.println(F("❌ ESP connection failed"));
      espConnected = false;
    }
  }
}

// ============================================
// ACTION FUNCTIONS
// ============================================
void executeWaterChange() {
  if (waterChangeActive) {
    Serial.println(F("⚠ Water change already active!"));
    return;
  }
  
  waterChangeActive = true;
  Serial.println(F("\n╔════════════════════════════════════╗"));
  Serial.println(F("║  WATER CHANGE STARTED              ║"));
  Serial.println(F("╚════════════════════════════════════╝\n"));
  ESP_SERIAL.println("STATUS:Water change started");
  ESP_SERIAL.flush();
  
  digitalWrite(RELAY_DRAIN, HIGH);
  digitalWrite(RELAY_FILL, HIGH);
  delay(1000);
  
  // DRAIN
  Serial.println(F("═══ DRAINING ═══"));
  ESP_SERIAL.println("STATUS:Draining");
  ESP_SERIAL.flush();
  digitalWrite(RELAY_DRAIN, LOW);
  
  unsigned long phaseStart = millis();
  while (millis() - phaseStart < DRAIN_TIME) {
    digitalWrite(LED_BUILTIN, (millis() / 250) % 2);
    if (ESP_SERIAL.available()) {
      String cmd = ESP_SERIAL.readStringUntil('\n');
      if (cmd.indexOf("EMERGENCY_STOP") >= 0) {
        emergencyStop();
        return;
      }
    }
    delay(100);
  }
  
  digitalWrite(RELAY_DRAIN, HIGH);
  Serial.println(F("✓ Drain complete\n"));
  
  // SETTLE
  ESP_SERIAL.println("STATUS:Settling");
  ESP_SERIAL.flush();
  delay(SETTLE_TIME);
  
  // FILL
  Serial.println(F("═══ FILLING ═══"));
  ESP_SERIAL.println("STATUS:Filling");
  ESP_SERIAL.flush();
  digitalWrite(RELAY_FILL, LOW);
  
  phaseStart = millis();
  while (millis() - phaseStart < FILL_TIME) {
    digitalWrite(LED_BUILTIN, (millis() / 500) % 2);
    if (ESP_SERIAL.available()) {
      String cmd = ESP_SERIAL.readStringUntil('\n');
      if (cmd.indexOf("EMERGENCY_STOP") >= 0) {
        emergencyStop();
        return;
      }
    }
    delay(100);
  }
  
  digitalWrite(RELAY_FILL, HIGH);
  Serial.println(F("✓ Fill complete\n"));
  
  delay(SETTLE_TIME);
  
  Serial.println(F("\n╔════════════════════════════════════╗"));
  Serial.println(F("║  WATER CHANGE COMPLETE ✓           ║"));
  Serial.println(F("╚════════════════════════════════════╝\n"));
  ESP_SERIAL.println("WATER_CHANGE_COMPLETE");
  ESP_SERIAL.flush();
  
  waterChangeActive = false;
  
  for (int i = 0; i < TEMP_SAMPLES; i++) tempReadings[i] = currentTemperature;
  for (int i = 0; i < PH_SAMPLES; i++) phReadings[i] = currentPH;
  
  blinkLED(5, 200);
}

void emergencyStop() {
  Serial.println(F("\n!!! EMERGENCY STOP !!!\n"));
  
  digitalWrite(RELAY_DRAIN, HIGH);
  digitalWrite(RELAY_FILL, HIGH);
  digitalWrite(RELAY_CH3, HIGH);
  digitalWrite(RELAY_CH4, HIGH);
  
  waterChangeActive = false;
  commandInProgress = false;
  
  ESP_SERIAL.println("STATUS:Emergency stop");
  ESP_SERIAL.flush();
  
  for (int i = 0; i < 20; i++) {
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    delay(50);
  }
}

void executeFeeding() {
  Serial.println(F("\n═══ FEEDING ═══"));
  ESP_SERIAL.println("STATUS:Feeding");
  ESP_SERIAL.flush();
  
  feedServo.write(SERVO_OPEN);
  delay(FEED_DURATION);
  feedServo.write(SERVO_CLOSED);
  
  Serial.println(F("✓ Feeding complete\n"));
  ESP_SERIAL.println("FEEDING_COMPLETE");
  ESP_SERIAL.flush();
  
  blinkLED(2, 200);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
void printSystemStatus() {
  Serial.println(F("\n╔════════════════════════════════════╗"));
  Serial.println(F("║    SYSTEM STATUS                   ║"));
  Serial.println(F("╚════════════════════════════════════╝"));
  
  Serial.print(F("⏱ Uptime: "));
  Serial.print(millis() / 1000);
  Serial.println(F("s"));
  
  Serial.print(F("🌡 Temp: "));
  Serial.print(currentTemperature, 2);
  Serial.print(F("°C ["));
  Serial.print(tempSensorOK ? F("OK") : F("DEFAULT"));
  Serial.println(F("]"));
  
  Serial.print(F("⚗ pH: "));
  Serial.print(currentPH, 2);
  Serial.print(F(" ["));
  Serial.print(phSensorOK ? F("OK") : F("DEFAULT"));
  Serial.println(F("]"));
  
  Serial.print(F("📤 Packets Sent: "));
  Serial.println(dataPacketsSent);
  
  Serial.print(F("📥 Commands Received: "));
  Serial.println(commandsReceived);
  
  Serial.print(F("🔌 ESP Connected: "));
  Serial.println(espConnected ? "YES" : "NO");
  
  Serial.print(F("📡 Baud Rate: "));
  Serial.println(baudRate);
  
  Serial.println();
}

void handleDebugCommand() {
  String command = Serial.readStringUntil('\n');
  command.trim();
  command.toUpperCase();
  
  if (command == "WATER") executeWaterChange();
  else if (command == "FEED") executeFeeding();
  else if (command == "STOP") emergencyStop();
  else if (command == "STATUS") printSystemStatus();
  else if (command == "SEND") sendDataToESP();
  else if (command == "TEST") {
    Serial.println(F("Sending 5 test packets..."));
    for (int i = 0; i < 5; i++) {
      sendDataToESP();
      delay(2000);
    }
  }
  else if (command == "TOGGLE") {
    useSimpleFormat = !useSimpleFormat;
    Serial.print(F("Switched to "));
    Serial.println(useSimpleFormat ? "simple" : "JSON");
  }
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_BUILTIN, LOW);
    delay(delayMs);
  }
}