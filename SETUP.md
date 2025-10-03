# AquaVision Pro - Setup Guide

This guide will walk you through the complete setup process for the AquaVision Pro Crayfish Monitoring System.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Hardware Assembly](#hardware-assembly)
3. [Arduino Setup](#arduino-setup)
4. [Database Setup](#database-setup)
5. [Web Application Deployment](#web-application-deployment)
6. [Testing and Calibration](#testing-and-calibration)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Hardware
- ✅ Arduino Mega 2560
- ✅ NodeMCU ESP8266
- ✅ DS18B20 Waterproof Temperature Sensor
- ✅ PH4502C pH Sensor Module
- ✅ DS3231 RTC Module
- ✅ HX711 Load Cell Amplifier + 5kg Load Cell
- ✅ SG90 Servo Motor
- ✅ 4-Channel Relay Module
- ✅ 2x DC Water Pumps (12V 19W 5M 800L/H)
- ✅ 12V Power Supply (minimum 3A)
- ✅ Jumper wires
- ✅ Breadboard (optional for testing)
- ✅ USB cables (Type-A to Type-B for Mega, Micro-USB for NodeMCU)

### Required Software
- Arduino IDE 1.8.19 or later
- Modern web browser
- Text editor (VS Code recommended)
- Git (optional)

### Required Accounts
- Supabase account (free tier available)
- WiFi network with internet access

---

## Hardware Assembly

### Step 1: Power Distribution

⚠️ **IMPORTANT**: Always disconnect power before making connections!

1. Connect 12V power supply to a power distribution block or breadboard power rails
2. Ensure proper polarity (red = positive, black = negative)
3. Add a fuse (2-3A) for safety

### Step 2: Arduino Mega 2560 Connections

#### DS18B20 Temperature Sensor
```
DS18B20    →    Arduino Mega
VCC (Red)  →    5V
GND (Black)→    GND
DATA (Yellow)→  Digital Pin 2
```
**Note**: Add a 4.7kΩ pull-up resistor between VCC and DATA line

#### PH4502C pH Sensor
```
PH4502C    →    Arduino Mega
VCC        →    5V
GND        →    GND
Po (Analog)→    A0
Do (Digital)→   (Not used)
```

#### HX711 Load Cell Amplifier
```
HX711      →    Arduino Mega
VCC        →    5V
GND        →    GND
DT (Data)  →    Digital Pin 3
SCK (Clock)→    Digital Pin 4

Load Cell  →    HX711
Red        →    E+
Black      →    E-
White      →    A-
Green      →    A+
```

#### DS3231 RTC Module
```
DS3231     →    Arduino Mega
VCC        →    5V
GND        →    GND
SDA        →    SDA (Pin 20)
SCL        →    SCL (Pin 21)
```

#### SG90 Servo Motor (Feed Dispenser)
```
SG90       →    Arduino Mega
VCC (Red)  →    5V
GND (Brown)→    GND
Signal (Orange)→ Digital Pin 9
```

#### 4-Channel Relay Module
```
Relay      →    Arduino Mega
VCC        →    5V
GND        →    GND
IN1        →    Digital Pin 5 (Water Pump 1)
IN2        →    Digital Pin 6 (Water Pump 2)
IN3        →    Digital Pin 7 (Reserve)
IN4        →    Digital Pin 8 (Reserve)
```

**Relay to Pump Connections:**
```
12V Supply → Relay COM pins
Relay NO (Normally Open) → Water Pump +
Water Pump - → GND
```

### Step 3: NodeMCU ESP8266 Connections

```
NodeMCU    →    Arduino Mega
RX         →    TX1 (Pin 18)
TX         →    RX1 (Pin 19)
GND        →    GND
```

**Note**: NodeMCU is powered via USB during development. For production, use a 5V regulator from the 12V supply.

### Step 4: Physical Installation

1. **Temperature Sensor**: Submerge DS18B20 in the crayfish tank
2. **pH Sensor**: Submerge pH probe in the tank, keep the circuit board dry
3. **Feed Container**: Mount load cell under feed container
4. **Servo Motor**: Attach to feed dispenser mechanism
5. **Water Pumps**: 
   - Pump 1: Fresh water intake
   - Pump 2: Drainage/circulation
6. **Enclosure**: Place Arduino, NodeMCU, and relays in waterproof enclosure

---

## Arduino Setup

### Step 1: Install Arduino IDE

1. Download Arduino IDE from [arduino.cc](https://www.arduino.cc/en/software)
2. Install for your operating system
3. Launch Arduino IDE

### Step 2: Install Required Libraries

Go to **Sketch → Include Library → Manage Libraries**

Install the following libraries:

```
- ESP8266WiFi (by ESP8266 Community)
- OneWire (by Jim Studt, Tom Pollard, et al.)
- DallasTemperature (by Miles Burton)
- HX711 (by Bogdan Necula)
- Servo (Built-in)
- RTClib (by Adafruit)
- ArduinoJson (by Benoit Blanchon)
- Wire (Built-in)
```

### Step 3: Configure Arduino Code

#### Arduino Mega Sketch

Create a new sketch: `AquaVision_Mega.ino`

```cpp
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <HX711.h>
#include <Servo.h>
#include <RTClib.h>

// Pin Definitions
#define TEMP_PIN 2
#define PH_PIN A0
#define HX711_DT 3
#define HX711_SCK 4
#define SERVO_PIN 9
#define RELAY_PUMP1 5
#define RELAY_PUMP2 6
#define RELAY_3 7
#define RELAY_4 8

// Sensor Objects
OneWire oneWire(TEMP_PIN);
DallasTemperature tempSensor(&oneWire);
HX711 scale;
Servo feedServo;
RTC_DS3231 rtc;

// Variables
float temperature = 0;
float phValue = 0;
float feedWeight = 0;
int population = 15;

void setup() {
  Serial.begin(9600);
  Serial1.begin(115200); // Communication with NodeMCU
  
  // Initialize sensors
  tempSensor.begin();
  scale.begin(HX711_DT, HX711_SCK);
  scale.set_scale(420.0983); // Calibration factor
  scale.tare();
  
  feedServo.attach(SERVO_PIN);
  feedServo.write(0); // Initial position
  
  // Initialize relays (active LOW)
  pinMode(RELAY_PUMP1, OUTPUT);
  pinMode(RELAY_PUMP2, OUTPUT);
  pinMode(RELAY_3, OUTPUT);
  pinMode(RELAY_4, OUTPUT);
  digitalWrite(RELAY_PUMP1, HIGH);
  digitalWrite(RELAY_PUMP2, HIGH);
  digitalWrite(RELAY_3, HIGH);
  digitalWrite(RELAY_4, HIGH);
  
  // Initialize RTC
  if (!rtc.begin()) {
    Serial.println("RTC not found!");
  }
  
  if (rtc.lostPower()) {
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }
}

void loop() {
  readSensors();
  sendDataToNodeMCU();
  checkCommands();
  delay(5000); // Read every 5 seconds
}

void readSensors() {
  // Read temperature
  tempSensor.requestTemperatures();
  temperature = tempSensor.getTempCByIndex(0);
  
  // Read pH
  int phRaw = analogRead(PH_PIN);
  phValue = map(phRaw, 0, 1023, 0, 14); // Simplified mapping
  phValue = phValue / 100.0 + 6.5; // Calibration offset
  
  // Read feed weight
  feedWeight = scale.get_units(10); // Average of 10 readings
  if (feedWeight < 0) feedWeight = 0;
}

void sendDataToNodeMCU() {
  // Send as JSON
  Serial1.print("{");
  Serial1.print("\"temp\":");
  Serial1.print(temperature);
  Serial1.print(",\"ph\":");
  Serial1.print(phValue);
  Serial1.print(",\"feed\":");
  Serial1.print(feedWeight);
  Serial1.print(",\"pop\":");
  Serial1.print(population);
  Serial1.println("}");
}

void checkCommands() {
  if (Serial1.available()) {
    String command = Serial1.readStringUntil('\n');
    executeCommand(command);
  }
}

void executeCommand(String cmd) {
  if (cmd == "FEED") {
    dispenseFeed();
  } else if (cmd == "WATER_IN") {
    activatePump(RELAY_PUMP1, 30000); // 30 seconds
  } else if (cmd == "WATER_OUT") {
    activatePump(RELAY_PUMP2, 30000);
  } else if (cmd == "WATER_CHANGE") {
    waterChange();
  }
}

void dispenseFeed() {
  feedServo.write(90); // Open dispenser
  delay(2000);
  feedServo.write(0); // Close dispenser
}

void activatePump(int relayPin, unsigned long duration) {
  digitalWrite(relayPin, LOW); // Activate
  delay(duration);
  digitalWrite(relayPin, HIGH); // Deactivate
}

void waterChange() {
  // Drain water
  digitalWrite(RELAY_PUMP2, LOW);
  delay(60000); // 1 minute
  digitalWrite(RELAY_PUMP2, HIGH);
  
  delay(5000); // Wait
  
  // Fill water
  digitalWrite(RELAY_PUMP1, LOW);
  delay(60000);
  digitalWrite(RELAY_PUMP1, HIGH);
}
```

#### NodeMCU ESP8266 Sketch

Create a new sketch: `AquaVision_NodeMCU.ino`

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Supabase configuration
const char* supabaseUrl = "YOUR_SUPABASE_URL";
const char* supabaseKey = "YOUR_SUPABASE_ANON_KEY";

WiFiClient wifiClient;
HTTPClient http;

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (Serial.available()) {
    String data = Serial.readStringUntil('\n');
    sendToSupabase(data);
  }
  
  checkForCommands();
  delay(1000);
}

void sendToSupabase(String jsonData) {
  if (WiFi.status() == WL_CONNECTED) {
    String url = String(supabaseUrl) + "/rest/v1/sensor_data";
    
    http.begin(wifiClient, url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", supabaseKey);
    http.addHeader("Authorization", "Bearer " + String(supabaseKey));
    http.addHeader("Prefer", "return=minimal");
    
    int httpCode = http.POST(jsonData);
    
    if (httpCode > 0) {
      Serial.println("Data sent successfully");
    } else {
      Serial.println("Error sending data");
    }
    
    http.end();
  }
}

void checkForCommands() {
  // Poll for commands from Supabase
  if (WiFi.status() == WL_CONNECTED) {
    String url = String(supabaseUrl) + "/rest/v1/commands?processed=eq.false&limit=1";
    
    http.begin(wifiClient, url);
    http.addHeader("apikey", supabaseKey);
    http.addHeader("Authorization", "Bearer " + String(supabaseKey));
    
    int httpCode = http.GET();
    
    if (httpCode == 200) {
      String payload = http.getString();
      
      if (payload.length() > 2) {
        DynamicJsonDocument doc(1024);
        deserializeJson(doc, payload);
        
        if (doc.size() > 0) {
          String command = doc[0]["command"];
          int id = doc[0]["id"];
          
          Serial.println(command);
          markCommandProcessed(id);
        }
      }
    }
    
    http.end();
  }
}

void markCommandProcessed(int commandId) {
  String url = String(supabaseUrl) + "/rest/v1/commands?id=eq." + String(commandId);
  
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", "Bearer " + String(supabaseKey));
  
  String payload = "{\"processed\":true}";
  http.PATCH(payload);
  http.end();
}
```

### Step 4: Upload Sketches

1. **Upload to Arduino Mega:**
   - Select **Tools → Board → Arduino Mega or Mega 2560**
   - Select **Tools → Port → [Your Mega Port]**
   - Click Upload

2. **Upload to NodeMCU:**
   - Select **Tools → Board → NodeMCU 1.0 (ESP-12E Module)**
   - Select **Tools → Port → [Your NodeMCU Port]**
   - Click Upload

---

## Database Setup

### Step 1: Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project
4. Note your **Project URL** and **anon public key**

### Step 2: Create Database Tables

Go to **SQL Editor** in Supabase and run:

```sql
-- Users table (handled by Supabase Auth)

-- Sensor data table
CREATE TABLE sensor_data (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  temperature DECIMAL(5,2),
  ph DECIMAL(4,2),
  population INTEGER,
  health_status DECIMAL(5,2),
  avg_weight DECIMAL(6,2),
  days_to_harvest INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feed data table
CREATE TABLE feed_data (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  capacity DECIMAL(8,2),
  current DECIMAL(8,2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feeding schedule table
CREATE TABLE feeding_schedule (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  time TIME,
  frequency VARCHAR(50),
  amount DECIMAL(6,2),
  type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Water schedule table
CREATE TABLE water_schedule (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  time TIME,
  frequency VARCHAR(50),
  percentage INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commands table
CREATE TABLE commands (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  command VARCHAR(50),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own sensor_data" ON sensor_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sensor_data" ON sensor_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feed_data" ON feed_data
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own feeding_schedule" ON feeding_schedule
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own water_schedule" ON water_schedule
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own commands" ON commands
  FOR ALL USING (auth.uid() = user_id);

-- Allow anonymous sensor data insertion (for hardware)
CREATE POLICY "Allow anonymous sensor insert" ON sensor_data
  FOR INSERT WITH CHECK (true);
```

---

## Web Application Deployment

### Step 1: Configure Supabase

Edit `supabase-init.js`:

```javascript
const SUPABASE_URL = 'YOUR_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### Step 2: Local Testing

1. Open `index.html` in a web browser
2. Or use a local server:
```bash
python -m http.server 8000
```
Then visit: `http://localhost:8000`

### Step 3: Deploy to Hosting

#### Option A: Netlify
1. Create account at [netlify.com](https://netlify.com)
2. Drag and drop your project folder
3. Site will be deployed automatically

#### Option B: Vercel
1. Create account at [vercel.com](https://vercel.com)
2. Import your Git repository
3. Deploy with one click

#### Option C: GitHub Pages
1. Push code to GitHub repository
2. Go to Settings → Pages
3. Select branch and save

---

## Testing and Calibration

### 1. Temperature Sensor Calibration

```cpp
// Test in ice water (0°C) and boiling water (100°C)
// Adjust in code if needed
temperature = tempSensor.getTempCByIndex(0) + OFFSET;
```

### 2. pH Sensor Calibration

```cpp
// Use pH 4.0, 7.0, and 10.0 buffer solutions
// Adjust mapping values
phValue = (phRaw * SLOPE) + INTERCEPT;
```

### 3. Load Cell Calibration

```cpp
// Place known weight and adjust scale factor
scale.set_scale(420.0983); // Adjust this value
```

### 4. System Test Checklist

- [ ] Temperature reading accurate
- [ ] pH reading accurate
- [ ] Feed weight measurement working
- [ ] Servo motor dispenses feed
- [ ] Water pumps activate
- [ ] RTC keeps accurate time
- [ ] WiFi connects successfully
- [ ] Data appears in database
- [ ] Dashboard displays real-time data
- [ ] Commands execute from dashboard

---

## Troubleshooting

### Arduino Not Connecting

**Issue**: Can't upload sketch  
**Solution**:
- Check USB cable
- Select correct board and port
- Press reset button before upload
- Check drivers

### Sensors Not Reading

**Issue**: Zero or invalid readings  
**Solution**:
- Check wiring connections
- Verify power supply
- Check sensor with multimeter
- Test with example sketches

### WiFi Connection Failed

**Issue**: NodeMCU can't connect  
**Solution**:
- Verify SSID and password
- Check WiFi signal strength
- Restart NodeMCU
- Check router settings

### Database Errors

**Issue**: Data not saving  
**Solution**:
- Check Supabase URL and key
- Verify table structure
- Check Row Level Security policies
- Review browser console for errors

### Dashboard Not Loading

**Issue**: Blank page or errors  
**Solution**:
- Check browser console
- Verify Supabase configuration
- Clear browser cache
- Check network connectivity

---

## Next Steps

1. ✅ Complete hardware setup
2. ✅ Upload and test Arduino code
3. ✅ Configure database
4. ✅ Deploy web application
5. ✅ Calibrate all sensors
6. ✅ Test automation features
7. 📖 Read [USER_MANUAL.md](./USER_MANUAL.md)
8. 📖 Review [SCHEMATIC.md](./SCHEMATIC.md)

---

## Support

For issues or questions:
- Email: ivanbeernal12@gmail.com
- Check documentation in `/docs` folder
- Review troubleshooting section

**Happy Farming! 🦞**