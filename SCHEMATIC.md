# AquaVision Pro - Schematic Diagram & PCB Design

This document provides detailed wiring diagrams, connection schematics, and PCB design guidelines for the AquaVision Pro Crayfish Monitoring System.

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Pinout Reference](#component-pinout-reference)
3. [Complete Wiring Diagram](#complete-wiring-diagram)
4. [Power Distribution](#power-distribution)
5. [PCB Design Layout](#pcb-design-layout)
6. [Safety Considerations](#safety-considerations)
7. [Assembly Instructions](#assembly-instructions)

---

## System Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    AQUAVISION PRO SYSTEM                         │
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │   12V PSU    │────────►│  Power Dist  │                      │
│  └──────────────┘         └──────┬───────┘                      │
│                                   │                               │
│         ┌─────────────────────────┼─────────────────────┐        │
│         │                         │                     │        │
│         ▼                         ▼                     ▼        │
│  ┌──────────────┐         ┌──────────────┐     ┌──────────────┐│
│  │ Arduino Mega │◄───────►│   NodeMCU    │     │  Relay Board ││
│  │     2560     │  Serial │   ESP8266    │     │  4-Channel   ││
│  └──────┬───────┘         └──────┬───────┘     └──────┬───────┘│
│         │                         │                     │        │
│  ┌──────┴────────────┐           │              ┌──────┴───────┐│
│  │                   │           │              │              ││
│  ▼                   ▼           ▼              ▼              ││
│ Sensors          Actuators     WiFi       Water Pumps         ││
│ • DS18B20        • Servo       Router                          ││
│ • PH4502C        • Feed                                        ││
│ • HX711          Dispenser                                     ││
│ • DS3231                                                       ││
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Pinout Reference

### Arduino Mega 2560 Pinout

```
         ┌─────────────────────────────────┐
         │      ARDUINO MEGA 2560          │
         │                                 │
    5V ──┤ 5V                          GND├── GND
   GND ──┤ GND                         VIN├── (not used)
         │                                 │
    D2 ──┤ Digital Pin 2 ──► DS18B20 DATA │
    D3 ──┤ Digital Pin 3 ──► HX711 DT     │
    D4 ──┤ Digital Pin 4 ──► HX711 SCK    │
    D5 ──┤ Digital Pin 5 ──► Relay CH1    │
    D6 ──┤ Digital Pin 6 ──► Relay CH2    │
    D7 ──┤ Digital Pin 7 ──► Relay CH3    │
    D8 ──┤ Digital Pin 8 ──► Relay CH4    │
    D9 ──┤ Digital Pin 9 ──► Servo Signal │
         │                                 │
   D18 ──┤ TX1 ──────────────► NodeMCU RX │
   D19 ──┤ RX1 ◄──────────────  NodeMCU TX│
   D20 ──┤ SDA ──────────────► DS3231 SDA │
   D21 ──┤ SCL ──────────────► DS3231 SCL │
         │                                 │
    A0 ──┤ Analog Pin 0 ◄──── PH4502C Po  │
         │                                 │
         └─────────────────────────────────┘
```

### NodeMCU ESP8266 Pinout

```
         ┌─────────────────────────────┐
         │     NodeMCU ESP8266         │
         │                             │
    3V3 ─┤ 3.3V                    GND ├─ GND
         │                             │
     RX ─┤ RX ◄─────────── Arduino TX1│
     TX ─┤ TX ─────────────► Arduino RX1
         │                             │
    USB ─┤ Micro USB (Power/Program)  │
         │                             │
         └─────────────────────────────┘
```

### DS18B20 Temperature Sensor

```
    ┌─────────────────┐
    │   DS18B20       │
    │                 │
    │  (Front View)   │
    │                 │
    │    ┌───────┐    │
    │    │  ∩∩∩  │    │
    │    └───────┘    │
    │     │ │ │       │
    │     1 2 3       │
    └─────┼─┼─┼───────┘
          │ │ │
          │ │ └─── DATA (Yellow) ──► Pin 2
          │ └───── VCC (Red) ──────► 5V
          └─────── GND (Black) ────► GND

    Note: Add 4.7kΩ pull-up resistor between VCC and DATA
```

### PH4502C pH Sensor Module

```
    ┌──────────────────────────────┐
    │      PH4502C Module          │
    │                              │
    │   ┌──────────────────┐       │
    │   │  BNC Connector   │       │
    │   └────────┬─────────┘       │
    │            │                 │
    │   [Potentiometers x2]        │
    │                              │
    │   VCC  GND  Do  Po  ──────── │
    │    │    │    │   │           │
    └────┼────┼────┼───┼───────────┘
         │    │    │   │
         │    │    │   └──► A0 (Arduino)
         │    │    └──────► (Not used)
         │    └───────────► GND
         └────────────────► 5V
```

### HX711 Load Cell Amplifier

```
    ┌──────────────────────────────┐
    │     HX711 Amplifier          │
    │                              │
    │   E+  E-  A-  A+             │
    │   │   │   │   │              │
    │   └───┴───┴───┘              │
    │   (Load Cell)                │
    │                              │
    │   VCC GND  DT SCK            │
    │    │   │   │  │              │
    └────┼───┼───┼──┼──────────────┘
         │   │   │  │
         │   │   │  └───► Pin 4 (Arduino)
         │   │   └──────► Pin 3 (Arduino)
         │   └──────────► GND
         └──────────────► 5V

    Load Cell Wiring:
    Red ───► E+
    Black ─► E-
    White ─► A-
    Green ─► A+
```

### DS3231 RTC Module

```
    ┌─────────────────────┐
    │    DS3231 RTC       │
    │                     │
    │   [CR2032 Battery]  │
    │                     │
    │   VCC GND SDA SCL   │
    │    │   │   │   │    │
    └────┼───┼───┼───┼────┘
         │   │   │   │
         │   │   │   └────► Pin 21 (SCL)
         │   │   └────────► Pin 20 (SDA)
         │   └────────────► GND
         └────────────────► 5V
```

### SG90 Servo Motor

```
    ┌─────────────────┐
    │   SG90 Servo    │
    │                 │
    │   ┌─────────┐   │
    │   │  Motor  │   │
    │   └─────────┘   │
    │                 │
    │   Brown Orange Red
    │     │     │    │
    └─────┼─────┼────┼─┘
          │     │    │
          │     │    └─► 5V
          │     └──────► Pin 9 (Signal)
          └────────────► GND
```

### 4-Channel Relay Module

```
    ┌────────────────────────────────────────┐
    │         4-Channel Relay Board          │
    │                                        │
    │  VCC GND IN1 IN2 IN3 IN4               │
    │   │   │   │   │   │   │                │
    │   └───┴───┴───┴───┴───┘                │
    │                                        │
    │  [LED] [LED] [LED] [LED]               │
    │  [RLY1][RLY2][RLY3][RLY4]              │
    │   │││   │││   │││   │││                │
    │   COM NO NC                            │
    │                                        │
    └────────────────────────────────────────┘
         │   │   │   │   │   │
         │   │   │   │   │   └──► Pin 8
         │   │   │   │   └──────► Pin 7
         │   │   │   └──────────► Pin 6
         │   │   └──────────────► Pin 5
         │   └──────────────────► GND
         └──────────────────────► 5V

    Relay 1: Water Pump 1 (Intake)
    Relay 2: Water Pump 2 (Drain)
    Relay 3: Reserve
    Relay 4: Reserve
```

---

## Complete Wiring Diagram

### Full System Schematic

```
                    12V POWER SUPPLY (3A+)
                           │
                    ┌──────┴──────┐
                    │   FUSE 3A   │
                    └──────┬──────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
    ┌───────▼────────┐            ┌──────▼─────┐
    │  12V to 5V     │            │   12V      │
    │  Buck Conv.    │            │   Rail     │
    │  (for MCUs)    │            └──────┬─────┘
    └───────┬────────┘                   │
            │                            │
            5V                          12V
            │                            │
    ┌───────┴────────────────────────────┼─────────────┐
    │                                    │             │
    │   ARDUINO MEGA 2560                │             │
    │   ┌─────────────────┐              │             │
    │   │                 │              │             │
    │   │  5V ◄───────────┼──────────────┘             │
    │   │  GND ◄──────────┼────────┐                   │
    │   │                 │        │                   │
    │   │  D2 ────────────┼───┐    │                   │
    │   │  D3 ────────────┼─┐ │    │                   │
    │   │  D4 ────────────┼┐│ │    │                   │
    │   │  D5 ────────────┼┼│ │    │                   │
    │   │  D6 ────────────┼┼┼ │    │                   │
    │   │  D7 ────────────┼┼┼ │    │                   │
    │   │  D8 ────────────┼┼┼ │    │                   │
    │   │  D9 ────────────┼┼┼ │    │                   │
    │   │  D18(TX1) ──────┼┼┼ │    │                   │
    │   │  D19(RX1) ◄─────┼┼┼ │    │                   │
    │   │  D20(SDA) ──────┼┼┼ │    │                   │
    │   │  D21(SCL) ──────┼┼┼ │    │                   │
    │   │  A0 ◄───────────┼┼┼ │    │                   │
    │   └─────────────────┘││││    │                   │
    └──────────────────────┼┼┼┼────┼───────────────────┘
                           │││││    │
    ┌──────────────────────┼┼┼┼────┼───────────────────┐
    │  DS18B20              │││││   │                   │
    │  ┌─────────────┐      │││││   │                   │
    │  │ VCC ◄───────┼──5V  │││││   │                   │
    │  │ GND ◄───────┼──GND │││││   │                   │
    │  │ DATA ───────┼──────┘││││   │                   │
    │  └─────────────┘       ││││   │                   │
    │  [4.7kΩ Pullup]        ││││   │                   │
    └────────────────────────┼┼┼┼───┼───────────────────┘
                             ││││   │
    ┌────────────────────────┼┼┼┼───┼───────────────────┐
    │  HX711 + Load Cell     ││││   │                   │
    │  ┌─────────────┐       ││││   │                   │
    │  │ VCC ◄───────┼──5V   ││││   │                   │
    │  │ GND ◄───────┼──GND  ││││   │                   │
    │  │ DT ─────────┼───────┘│││   │                   │
    │  │ SCK ────────┼────────┘││   │                   │
    │  └─────────────┘         ││   │                   │
    └──────────────────────────┼┼───┼───────────────────┘
                               ││   │
    ┌──────────────────────────┼┼───┼───────────────────┐
    │  4-Channel Relay         ││   │                   │
    │  ┌─────────────┐         ││   │                   │
    │  │ VCC ◄───────┼──5V     ││   │                   │
    │  │ GND ◄───────┼──GND    ││   │                   │
    │  │ IN1 ────────┼─────────┘│   │                   │
    │  │ IN2 ────────┼──────────┘   │                   │
    │  │ IN3 ────────┼──────────────┘                   │
    │  │ IN4 ────────┼──────────────────────────────────┤
    │  └─────────────┘                                  │
    │                                                    │
    │  Relay 1: COM ◄──12V    NO ──► Pump 1 (+)         │
    │  Relay 2: COM ◄──12V    NO ──► Pump 2 (+)         │
    │           Pump 1 (-) ──► GND                       │
    │           Pump 2 (-) ──► GND                       │
    └────────────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────┐
    │  SG90 Servo                                        │
    │  ┌─────────────┐                                   │
    │  │ VCC ◄───────┼──5V                               │
    │  │ GND ◄───────┼──GND                              │
    │  │ SIG ◄───────┼──Pin 9                            │
    │  └─────────────┘                                   │
    └────────────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────┐
    │  DS3231 RTC                                        │
    │  ┌─────────────┐                                   │
    │  │ VCC ◄───────┼──5V                               │
    │  │ GND ◄───────┼──GND                              │
    │  │ SDA ◄───────┼──Pin 20                           │
    │  │ SCL ◄───────┼──Pin 21                           │
    │  └─────────────┘                                   │
    └────────────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────┐
    │  PH4502C Sensor                                    │
    │  ┌─────────────┐                                   │
    │  │ VCC ◄───────┼──5V                               │
    │  │ GND ◄───────┼──GND                              │
    │  │ Po ─────────┼──A0                               │
    │  └─────────────┘                                   │
    └────────────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────┐
    │  NodeMCU ESP8266                                   │
    │  ┌─────────────┐                                   │
    │  │ VIN ◄───────┼──5V (via USB or Buck)             │
    │  │ GND ◄───────┼──GND                              │
    │  │ RX ◄────────┼──Pin 18 (TX1)                     │
    │  │ TX ─────────┼──Pin 19 (RX1)                     │
    │  └─────────────┘                                   │
    └────────────────────────────────────────────────────┘
```

---

## Power Distribution

### Power Supply Schematic

```
    AC Input (110V/220V)
         │
         ▼
    ┌────────────────┐
    │  12V 3A PSU    │
    │  Switch Mode   │
    └────┬───────────┘
         │
         ├───┬──► (+12V)
         │   │
      [FUSE] │
       3A    │
         │   │
         ▼   ▼
    ┌────────────────────┐
    │  Terminal Block    │
    │  +12V     GND      │
    └──┬─────────┬───────┘
       │         │
       │         │
       ├─────────┼──► Relay Board (12V loads)
       │         │
       │         │
       │     ┌───┴────────┐
       │     │  Common    │
       │     │   GND      │
       │     └───┬────────┘
       │         │
       ▼         ▼
    ┌────────────────────┐
    │  Buck Converter    │
    │  12V → 5V 3A       │
    │  (LM2596 Module)   │
    └──┬─────────┬───────┘
       │         │
     (+5V)     (GND)
       │         │
       ├─────────┼──► Arduino Mega
       ├─────────┼──► NodeMCU
       ├─────────┼──► Sensors
       ├─────────┼──► Servo Motor
       └─────────┴──► Relay Board Logic
```

### Current Requirements

| Component | Voltage | Current | Notes |
|-----------|---------|---------|-------|
| Arduino Mega | 5V | 500mA | Peak consumption |
| NodeMCU ESP8266 | 5V | 300mA | During WiFi transmission |
| DS18B20 | 5V | 1.5mA | Minimal draw |
| PH4502C | 5V | 30mA | Average |
| HX711 | 5V | 10mA | With load cell |
| DS3231 | 5V | 3mA | + battery backup |
| SG90 Servo | 5V | 500mA | Under load |
| Relay Board | 5V | 80mA | Logic side (4 relays) |
| Water Pump 1 | 12V | 1.6A | 19W rating |
| Water Pump 2 | 12V | 1.6A | 19W rating |
| **Total 5V** | **5V** | **~1.5A** | With margins |
| **Total 12V** | **12V** | **~3.2A** | Both pumps running |

**Recommended PSU**: 12V 5A (60W) for safety margin

---

## PCB Design Layout

### PCB Specifications

- **Dimensions**: 150mm x 100mm
- **Layers**: 2-layer (Top + Bottom)
- **Copper Weight**: 1oz (35µm)
- **Material**: FR-4
- **Finish**: HASL (Lead-free)
- **Minimum Trace Width**: 0.5mm
- **Minimum Via Size**: 0.8mm

### Component Placement (Top View)

```
    ┌────────────────────────────────────────────────────┐
    │                  TOP LAYER                         │
    │                                                    │
    │  ┌──────────┐              ┌─────────────┐        │
    │  │ Arduino  │              │  Terminal   │        │
    │  │  Mega    │              │   Blocks    │        │
    │  │  2560    │              │  (Power)    │        │
    │  └──────────┘              └─────────────┘        │
    │                                                    │
    │  ┌────────┐  ┌────────┐   ┌────────┐             │
    │  │DS18B20 │  │HX711   │   │DS3231  │             │
    │  │Terminal│  │Terminal│   │Terminal│             │
    │  └────────┘  └────────┘   └────────┘             │
    │                                                    │
    │  ┌────────┐  ┌────────┐   ┌────────┐             │
    │  │PH4502C │  │ Servo  │   │NodeMCU │             │
    │  │Terminal│  │Terminal│   │Terminal│             │
    │  └────────┘  └────────┘   └────────┘             │
    │                                                    │
    │              ┌──────────────────────┐             │
    │              │   4-Channel Relay    │             │
    │              │       Module         │             │
    │              └──────────────────────┘             │
    │                                                    │
    │  [LED1] [LED2] [LED3]    ┌────────┐               │
    │  Power  WiFi  Status     │ Buck   │               │
    │                          │Convert │               │
    │                          └────────┘               │
    └────────────────────────────────────────────────────┘
```

### Trace Routing Guidelines

1. **Power Traces**
   - 12V lines: Minimum 1.5mm width
   - 5V lines: Minimum 1.0mm width
   - GND: Use ground plane on bottom layer

2. **Signal Traces**
   - Digital signals: 0.5mm width
   - Analog signals: 0.6mm width, keep away from digital
   - I2C (SDA/SCL): 0.6mm, parallel routing, equal length

3. **High Current Paths**
   - Relay outputs to pumps: 2.0mm width
   - Use thick traces or wire jumpers for safety

### Recommended Gerber Settings

```
Layer Stack:
- Top Copper
- Top Silkscreen
- Top Soldermask
- Bottom Soldermask
- Bottom Silkscreen
- Bottom Copper
- Board Outline
- Drill File
```

---

## Safety Considerations

### Electrical Safety

1. **Isolation**
   - Keep 12V circuits separated from 5V circuits
   - Use optocouplers in relay board for isolation
   - Maintain minimum 2mm clearance between high and low voltage

2. **Fusing**
   - Main 12V line: 3A fast-blow fuse
   - Consider individual fuses for each pump

3. **Grounding**
   - Single point ground to avoid ground loops
   - Earth ground the metal enclosure

4. **Wire Gauge**
   - 12V power: 18 AWG minimum
   - 5V power: 22 AWG minimum
   - Signal wires: 24-26 AWG

### Water Safety

1. **Waterproofing**
   - Use IP65+ rated enclosure for electronics
   - Seal all cable entries with grommets
   - Keep electronics above water level

2. **Sensor Protection**
   - Only waterproof sensors in water
   - Use cable glands for waterproof entry
   - Protect pH probe with protective cap when not in use

3. **Pump Installation**
   - Use check valves to prevent backflow
   - Secure pump wiring away from water
   - Ground all metal pump housings

---

## Assembly Instructions

### Step 1: Prepare Components

1. Test all components individually before assembly
2. Label all wires before connecting
3. Prepare heat shrink tubing for connections

### Step 2: Mount Components

1. Mount Arduino Mega on standoffs (M3 screws)
2. Mount relay board on standoffs
3. Secure terminal blocks
4. Use zip ties to organize wiring

### Step 3: Power Wiring

1. Connect 12V PSU to terminal block
2. Install fuse in series with positive line
3. Connect buck converter input to 12V
4. Connect 5V output to distribution terminal

### Step 4: Sensor Connections

1. Connect sensors one at a time
2. Test each sensor after connection
3. Secure with strain relief

### Step 5: Testing

1. Power on system without pumps connected
2. Verify all LEDs illuminate
3. Check voltage levels with multimeter
4. Upload test sketches
5. Connect pumps last after all tests pass

### Step 6: Final Assembly

1. Route all cables neatly
2. Use cable ties every 10cm
3. Label all connections
4. Close and seal enclosure
5. Document any modifications

---

## Troubleshooting Wiring

### No Power

- Check fuse continuity
- Verify PSU output voltage
- Test buck converter output
- Check terminal connections

### Sensors Not Reading

- Verify sensor power (5V present)
- Check ground connections
- Test with multimeter
- Swap with known good sensor

### Relays Not Switching

- Check relay board power
- Verify control signal voltage (5V HIGH)
- Test relay manually
- Check pump connections

### Communication Errors

- Verify TX/RX not swapped
- Check baud rate settings
- Test with loopback
- Check GND common connection

---

## Bill of Materials (BOM)

### Electronics

| Item | Quantity | Specifications | Notes |
|------|----------|----------------|-------|
| Arduino Mega 2560 | 1 | ATmega2560, 54 I/O | Original or compatible |
| NodeMCU ESP8266 | 1 | CP2102, 4MB Flash | V3 or LoLin |
| DS18B20 | 1 | Waterproof, 1m cable | Dallas/Maxim |
| PH4502C Module | 1 | With BNC probe | Pre-calibrated |
| HX711 Module | 1 | 24-bit ADC | Green PCB |
| Load Cell | 1 | 5kg, aluminum | TAL220 or similar |
| DS3231 | 1 | AT24C32, battery holder | ZS-042 module |
| SG90 Servo | 1 | 180°, 4.8-6V | Tower Pro |
| 4-Ch Relay | 1 | 5V, 10A contacts | Optocoupled |
| Water Pumps | 2 | 12V DC, 19W, 800L/H | Submersible |

### Power Components

| Item | Quantity | Specifications |
|------|----------|----------------|
| 12V PSU | 1 | 5A, switch mode |
| Buck Converter | 1 | LM2596, 12V→5V 3A |
| Fuse Holder | 1 | Panel mount |
| Fuse | 2 | 3A fast-blow |

### Passive Components

| Item | Quantity | Value |
|------|----------|-------|
| Resistor | 1 | 4.7kΩ, 1/4W |
| Capacitor | 2 | 100µF, 25V electrolytic |
| Capacitor | 4 | 0.1µF ceramic |

### Hardware & Connectors

| Item | Quantity | Notes |
|------|----------|-------|
| Terminal Blocks | 6 | 2-position, 5mm |
| Jumper Wires | 1 set | Male-Male, Female-Female |
| Wire 18AWG | 2m | Red, Black |
| Wire 22AWG | 3m | Various colors |
| Heat Shrink | 1m | Assorted sizes |
| Standoffs M3 | 8 | 10mm height |
| Screws M3 | 16 | 6mm length |
| Zip Ties | 20 | 100-150mm |
| Enclosure | 1 | IP65, 200x150x100mm |
| Cable Glands | 4 | PG7 or PG9 |

---

## References

- [Arduino Mega Pinout](https://docs.arduino.cc/hardware/mega-2560)
- [ESP8266 Datasheet](https://www.espressif.com/en/products/socs/esp8266)
- [DS18B20 Datasheet](https://datasheets.maximintegrated.com/en/ds/DS18B20.pdf)
- [HX711 Datasheet](https://cdn.sparkfun.com/datasheets/Sensors/ForceFlex/hx711_english.pdf)

---

**End of Schematic Documentation**

For PCB fabrication files and additional diagrams, contact the development team.