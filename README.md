# AquaVision Pro - Crayfish Monitoring System

![AquaVision Pro Logo](./assets/logo.png)

## 🦞 Overview

AquaVision Pro is an advanced IoT-based crayfish farm monitoring and management system that combines real-time sensor data collection, automated feeding, water management, and intelligent analytics to optimize crayfish aquaculture operations.

## ✨ Features

### 📊 Real-Time Monitoring
- **Water Temperature Monitoring** - Continuous temperature tracking with DS18B20 waterproof sensor
- **pH Level Monitoring** - Real-time pH measurement using PH4502C sensor
- **Population Tracking** - Monitor crayfish count and health status
- **Feed Level Monitoring** - Automated feed quantity tracking with HX711 load cell

### 🤖 Automated Systems
- **Automated Feeding** - Scheduled and manual feeding with servo motor control
- **Water Management** - Automated water changes with dual pump system
- **Smart Scheduling** - Time-based automation using DS3231 RTC module
- **Remote Control** - Web-based dashboard for remote farm management

### 📈 Analytics & Insights
- **Historical Data Charts** - Temperature and pH trends visualization
- **Harvest Projections** - Growth rate analysis and harvest planning
- **Alert System** - Real-time notifications for critical parameters
- **AI Assistant** - Interactive chatbot for farm management guidance

## 🛠️ Hardware Components

| Component | Quantity | Purpose |
|-----------|----------|---------|
| Arduino Mega 2560 | 1 | Main controller |
| NodeMCU ESP8266 | 1 | WiFi connectivity |
| DS18B20 Waterproof | 1 | Temperature sensing |
| PH4502C pH Sensor | 1 | pH level measurement |
| DS3231 RTC Module | 1 | Real-time clock |
| HX711 + 5kg Load Cell | 1 | Feed weight measurement |
| SG90 Servo Motor | 1 | Feed dispenser control |
| 4-Channel Relay Module | 1 | Pump and device control |
| DC Water Pumps 12V 19W | 2 | Water circulation and drainage |
| 12V Power Supply | 1 | System power |

## 📋 Requirements

### Hardware Requirements
- Arduino Mega 2560
- NodeMCU ESP8266
- Sensors and modules (see Hardware Components)
- 12V DC Power Supply
- USB cables for programming

### Software Requirements
- Arduino IDE 1.8.x or later
- Node.js 14.x or later (for local development)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Supabase account (for database)

### Arduino Libraries
- ESP8266WiFi
- ESP8266HTTPClient
- Wire
- OneWire
- DallasTemperature
- HX711
- Servo
- RTClib

## 🚀 Quick Start

See [SETUP.md](./SETUP.md) for detailed installation and configuration instructions.

### Basic Setup Steps
1. Clone the repository
2. Install Arduino libraries
3. Configure WiFi credentials
4. Upload Arduino sketch to Mega 2560
5. Upload NodeMCU sketch to ESP8266
6. Set up Supabase database
7. Deploy web application
8. Access dashboard

## 📁 Project Structure

```
aquavision-pro/
├── arduino/
│   ├── mega2560/           # Arduino Mega sketch
│   └── nodemcu/            # NodeMCU ESP8266 sketch
├── web/
│   ├── index.html          # Landing page
│   ├── dashboard.html      # Main dashboard
│   ├── landing.css         # Landing page styles
│   ├── dashboard.css       # Dashboard styles
│   ├── landing.js          # Landing page logic
│   ├── dashboard.js        # Dashboard logic
│   ├── auth.js             # Authentication
│   ├── database.js         # Database operations
│   └── supabase-init.js    # Supabase initialization
├── docs/
│   ├── SETUP.md            # Setup instructions
│   ├── USER_MANUAL.md      # User manual
│   ├── SCHEMATIC.md        # Circuit diagrams
│   └── API.md              # API documentation
├── assets/
│   └── images/             # Images and diagrams
└── README.md
```

## 🔧 Configuration

### WiFi Configuration (NodeMCU)
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "YOUR_SERVER_URL";
```

### Supabase Configuration
```javascript
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
```

## 📖 Documentation

- **[Setup Guide](./SETUP.md)** - Complete installation and setup instructions
- **[User Manual](./USER_MANUAL.md)** - How to use the system
- **[Schematic Diagram](./SCHEMATIC.md)** - Hardware wiring and PCB design
- **[API Documentation](./API.md)** - Backend API reference

## 🎯 Usage

1. **Access Dashboard**: Navigate to your deployed web app URL
2. **Login/Register**: Create an account or login
3. **Monitor**: View real-time sensor data and farm status
4. **Control**: Manage feeding schedules and water changes
5. **Analyze**: Review historical data and harvest projections

## 🔒 Security Features

- Secure authentication with Supabase
- Password strength validation
- Session management
- Row-level security in database
- Encrypted data transmission

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📊 System Architecture

```
┌─────────────────┐      WiFi      ┌──────────────┐
│  Arduino Mega   │◄──────────────►│   NodeMCU    │
│     2560        │                 │   ESP8266    │
└────────┬────────┘                 └──────┬───────┘
         │                                  │
    Sensors &                          Internet
    Actuators                               │
         │                          ┌───────▼────────┐
    ┌────▼─────┐                   │    Supabase    │
    │ DS18B20  │                   │    Database    │
    │ PH4502C  │                   └───────┬────────┘
    │ HX711    │                           │
    │ RTC      │                    ┌──────▼────────┐
    │ Servo    │                    │  Web Dashboard│
    │ Relays   │                    │   (Browser)   │
    └──────────┘                    └───────────────┘
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Development Team

- **John Paul Santonia** - Leader
- **Ivan James L. Bernal** - Lead Developer
- **Dereck Larino** - Hardware Specialist
- **Angelo Manuel** - UI/UX Designer

## 📧 Contact

- **Email**: ivanbeernal12@gmail.com
- **Location**: STI College Calamba, Laguna, Philippines
- **Phone**: +63 928 110 8137

## 🙏 Acknowledgments

- STI College Calamba for project support
- Arduino and ESP8266 communities
- Supabase for backend infrastructure
- Chart.js for data visualization

## 🔄 Version History

### v1.0.0 (2024)
- Initial release
- Core monitoring features
- Web dashboard
- Automated feeding and water management
- Historical data tracking

## 🐛 Known Issues

- Demo mode when hardware is disconnected
- Chart updates may lag on slow connections
- Mobile responsiveness needs optimization

## 🗺️ Roadmap

- [ ] Mobile app (iOS/Android)
- [ ] Advanced AI predictions
- [ ] Multi-farm support
- [ ] Export reports to PDF
- [ ] SMS notifications
- [ ] Camera integration
- [ ] Water quality forecasting

## ⚠️ Disclaimer

This system is designed for educational and small-scale farming purposes. Always verify sensor readings with manual testing equipment and consult aquaculture experts for commercial operations.

---

**Built with ❤️ for sustainable aquaculture**