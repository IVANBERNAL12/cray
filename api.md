# AquaVision Pro - API Documentation

## Overview

This document describes the API endpoints, data structures, and integration methods for the AquaVision Pro Crayfish Monitoring System.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Base URL & Headers](#base-url--headers)
3. [Sensor Data API](#sensor-data-api)
4. [Feed Management API](#feed-management-api)
5. [Schedule Management API](#schedule-management-api)
6. [Commands API](#commands-api)
7. [User Management API](#user-management-api)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [Webhooks](#webhooks)
11. [Hardware Integration](#hardware-integration)
12. [Code Examples](#code-examples)

---

## Authentication

AquaVision Pro uses Supabase Authentication for secure access control.

### Authentication Methods

#### 1. Sign Up

**Endpoint:** `POST /auth/v1/signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "data": {
    "name": "John Doe"
  }
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "v1.MXU4MjI4ZGYtZjcyNi00ZDU1LTk3ZTAtZDQ5ZjQzZTZiMmQ5",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "user_metadata": {
      "name": "John Doe"
    }
  }
}
```

#### 2. Sign In

**Endpoint:** `POST /auth/v1/token?grant_type=password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** Same as Sign Up

#### 3. Sign Out

**Endpoint:** `POST /auth/v1/logout`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "message": "Successfully logged out"
}
```

#### 4. Refresh Token

**Endpoint:** `POST /auth/v1/token?grant_type=refresh_token`

**Request Body:**
```json
{
  "refresh_token": "v1.MXU4MjI4ZGYtZjcyNi00ZDU1LTk3ZTAtZDQ5ZjQzZTZiMmQ5"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "v1.NEW_REFRESH_TOKEN"
}
```

---

## Base URL & Headers

### Base URL

```
https://YOUR_PROJECT_ID.supabase.co
```

### Required Headers

All API requests require:

```http
Content-Type: application/json
apikey: YOUR_SUPABASE_ANON_KEY
Authorization: Bearer YOUR_ACCESS_TOKEN
```

For public/hardware endpoints:
```http
Content-Type: application/json
apikey: YOUR_SUPABASE_ANON_KEY
```

---

## Sensor Data API

### 1. Get Latest Sensor Reading

**Endpoint:** `GET /rest/v1/sensor_data?select=*&order=created_at.desc&limit=1`

**Headers:**
```http
Authorization: Bearer {access_token}
apikey: {supabase_anon_key}
```

**Response:**
```json
[
  {
    "id": 1,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "temperature": 24.5,
    "ph": 7.2,
    "population": 15,
    "health_status": 100,
    "avg_weight": 5.0,
    "days_to_harvest": 120,
    "created_at": "2024-01-15T08:30:00.000Z"
  }
]
```

### 2. Insert Sensor Reading

**Endpoint:** `POST /rest/v1/sensor_data`

**Headers:**
```http
Content-Type: application/json
apikey: {supabase_anon_key}
Prefer: return=minimal
```

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "temperature": 24.5,
  "ph": 7.2,
  "population": 15,
  "health_status": 100,
  "avg_weight": 5.0,
  "days_to_harvest": 120
}
```

**Response:**
```
201 Created
```

### 3. Get Historical Sensor Data

**Endpoint:** `GET /rest/v1/sensor_data?select=*&order=created_at.desc&limit={count}`

**Query Parameters:**
- `limit` - Number of records (default: 100)
- `order` - Sort order (default: created_at.desc)

**Example:**
```
GET /rest/v1/sensor_data?select=*&order=created_at.desc&limit=168
```
Returns last 168 readings (1 week at hourly intervals)

**Response:**
```json
[
  {
    "id": 168,
    "temperature": 24.5,
    "ph": 7.2,
    "created_at": "2024-01-15T08:00:00.000Z"
  },
  {
    "id": 167,
    "temperature": 24.3,
    "ph": 7.1,
    "created_at": "2024-01-15T07:00:00.000Z"
  }
]
```

### 4. Get Sensor Data by Date Range

**Endpoint:** `GET /rest/v1/sensor_data?created_at=gte.{start_date}&created_at=lte.{end_date}&order=created_at.asc`

**Example:**
```
GET /rest/v1/sensor_data?created_at=gte.2024-01-01&created_at=lte.2024-01-07&order=created_at.asc
```

**Response:** Array of sensor readings within date range

---

## Feed Management API

### 1. Get Current Feed Data

**Endpoint:** `GET /rest/v1/feed_data?select=*&order=updated_at.desc&limit=1`

**Response:**
```json
[
  {
    "id": 1,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "capacity": 500,
    "current": 375,
    "updated_at": "2024-01-15T08:30:00.000Z"
  }
]
```

### 2. Update Feed Data

**Endpoint:** `PATCH /rest/v1/feed_data?id=eq.{id}`

**Request Body:**
```json
{
  "current": 367.5,
  "updated_at": "2024-01-15T08:35:00.000Z"
}
```

**Response:**
```
200 OK
```

### 3. Insert Feed Data (First Time)

**Endpoint:** `POST /rest/v1/feed_data`

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "capacity": 500,
  "current": 500
}
```

**Response:**
```
201 Created
```

---

## Schedule Management API

### 1. Get Feeding Schedule

**Endpoint:** `GET /rest/v1/feeding_schedule?select=*&order=created_at.desc&limit=1`

**Response:**
```json
[
  {
    "id": 1,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "time": "08:00:00",
    "frequency": "twice-daily",
    "amount": 7.5,
    "type": "juvenile-pellets",
    "created_at": "2024-01-15T00:00:00.000Z",
    "updated_at": "2024-01-15T00:00:00.000Z"
  }
]
```

### 2. Create/Update Feeding Schedule

**Endpoint:** `POST /rest/v1/feeding_schedule`

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "time": "08:00:00",
  "frequency": "twice-daily",
  "amount": 7.5,
  "type": "juvenile-pellets"
}
```

**Update Endpoint:** `PATCH /rest/v1/feeding_schedule?id=eq.{id}`

### 3. Get Water Schedule

**Endpoint:** `GET /rest/v1/water_schedule?select=*&order=created_at.desc&limit=1`

**Response:**
```json
[
  {
    "id": 1,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "time": "09:00:00",
    "frequency": "weekly",
    "percentage": 50,
    "created_at": "2024-01-15T00:00:00.000Z",
    "updated_at": "2024-01-15T00:00:00.000Z"
  }
]
```

### 4. Create/Update Water Schedule

**Endpoint:** `POST /rest/v1/water_schedule`

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "time": "09:00:00",
  "frequency": "weekly",
  "percentage": 50
}
```

---

## Commands API

Commands allow the web dashboard to control hardware remotely.

### 1. Create Command

**Endpoint:** `POST /rest/v1/commands`

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "command": "FEED",
  "processed": false
}
```

**Available Commands:**
- `FEED` - Dispense feed
- `WATER_IN` - Activate intake pump
- `WATER_OUT` - Activate drain pump
- `WATER_CHANGE` - Full water change sequence

**Response:**
```
201 Created
```

### 2. Get Pending Commands

**Endpoint:** `GET /rest/v1/commands?processed=eq.false&order=created_at.asc&limit=1`

**Response:**
```json
[
  {
    "id": 1,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "command": "FEED",
    "processed": false,
    "created_at": "2024-01-15T08:30:00.000Z"
  }
]
```

### 3. Mark Command as Processed

**Endpoint:** `PATCH /rest/v1/commands?id=eq.{id}`

**Request Body:**
```json
{
  "processed": true
}
```

**Response:**
```
200 OK
```

---

## User Management API

### 1. Get Current User

**Endpoint:** `GET /auth/v1/user`

**Headers:**
```http
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "user_metadata": {
    "name": "John Doe"
  },
  "created_at": "2024-01-15T00:00:00.000Z"
}
```

### 2. Update User Metadata

**Endpoint:** `PUT /auth/v1/user`

**Request Body:**
```json
{
  "data": {
    "name": "John Doe Updated",
    "farm_name": "Doe Crayfish Farm"
  }
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "user_metadata": {
    "name": "John Doe Updated",
    "farm_name": "Doe Crayfish Farm"
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request format |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Response Format

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": "Additional context",
  "hint": "Suggestion to fix"
}
```

**Example:**
```json
{
  "error": "invalid_grant",
  "message": "Invalid login credentials",
  "details": null,
  "hint": null
}
```

---

## Rate Limiting

### Limits

- **Anonymous requests**: 100 requests per hour per IP
- **Authenticated requests**: 1000 requests per hour per user
- **Sensor data insertion**: 3600 requests per hour (1 per second)

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704123600
```

### Handling Rate Limits

When rate limit is exceeded (429 response):

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests",
  "retry_after": 3600
}
```

Wait for `retry_after` seconds before retrying.

---

## Webhooks

Webhooks allow real-time notifications when data changes.

### Setting Up Webhooks

1. Create a webhook endpoint on your server
2. Configure in Supabase Dashboard under Database > Webhooks
3. Select table and events (INSERT, UPDATE, DELETE)
4. Add your endpoint URL

### Webhook Payload

**Example for sensor_data INSERT:**

```json
{
  "type": "INSERT",
  "table": "sensor_data",
  "record": {
    "id": 1,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "temperature": 24.5,
    "ph": 7.2,
    "created_at": "2024-01-15T08:30:00.000Z"
  },
  "schema": "public",
  "old_record": null
}
```

### Webhook Security

Verify webhook signatures:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return hash === signature;
}
```

---

## Hardware Integration

### Arduino to Supabase Flow

```
Arduino Mega → NodeMCU ESP8266 → WiFi → Supabase
```

### Sending Sensor Data from Hardware

**NodeMCU Code Example:**

```cpp
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

void sendSensorData(float temp, float ph) {
  HTTPClient http;
  WiFiClient client;
  
  String url = String(SUPABASE_URL) + "/rest/v1/sensor_data";
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  http.addHeader("Prefer", "return=minimal");
  
  StaticJsonDocument<200> doc;
  doc["temperature"] = temp;
  doc["ph"] = ph;
  doc["population"] = 15;
  doc["health_status"] = 100;
  doc["avg_weight"] = 5.0;
  doc["days_to_harvest"] = 120;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode == 201) {
    Serial.println("Data sent successfully");
  } else {
    Serial.println("Error: " + String(httpCode));
  }
  
  http.end();
}
```

### Polling for Commands

```cpp
void checkCommands() {
  HTTPClient http;
  WiFiClient client;
  
  String url = String(SUPABASE_URL) + "/rest/v1/commands?processed=eq.false&limit=1";
  
  http.begin(client, url);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + String(SUPABASE_KEY));
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);
    
    if (doc.size() > 0) {
      String command = doc[0]["command"];
      int id = doc[0]["id"];
      
      executeCommand(command);
      markCommandProcessed(id);
    }
  }
  
  http.end();
}
```

---

## Code Examples

### JavaScript/TypeScript (Web)

#### Initialize Supabase Client

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);
```

#### Sign Up

```javascript
async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        name: name
      }
    }
  });
  
  if (error) {
    console.error('Error:', error.message);
    return { success: false, message: error.message };
  }
  
  return { success: true, data: data };
}
```

#### Sign In

```javascript
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });
  
  if (error) {
    return { success: false, message: error.message };
  }
  
  return { success: true, data: data };
}
```

#### Get Latest Sensor Data

```javascript
async function getLatestSensorData() {
  const { data, error } = await supabase
    .from('sensor_data')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error:', error);
    return null;
  }
  
  return data;
}
```

#### Insert Sensor Data

```javascript
async function insertSensorData(sensorData) {
  const { error } = await supabase
    .from('sensor_data')
    .insert([sensorData]);
  
  if (error) {
    console.error('Error:', error);
    return false;
  }
  
  return true;
}
```

#### Create Command

```javascript
async function sendCommand(command) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from('commands')
    .insert([{
      user_id: user.id,
      command: command,
      processed: false
    }]);
  
  if (error) {
    console.error('Error:', error);
    return false;
  }
  
  return true;
}
```

#### Real-time Subscription

```javascript
const subscription = supabase
  .channel('sensor_data_changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'sensor_data'
    },
    (payload) => {
      console.log('New sensor data:', payload.new);
      updateDashboard(payload.new);
    }
  )
  .subscribe();
```

### Python (Data Analysis)

```python
import requests
import pandas as pd

class AquaVisionAPI:
    def __init__(self, url, key):
        self.url = url
        self.key = key
        self.headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    
    def get_sensor_data(self, limit=100):
        endpoint = f'{self.url}/rest/v1/sensor_data'
        params = {
            'order': 'created_at.desc',
            'limit': limit
        }
        
        response = requests.get(endpoint, headers=self.headers, params=params)
        
        if response.status_code == 200:
            return pd.DataFrame(response.json())
        else:
            print(f'Error: {response.status_code}')
            return None
    
    def analyze_trends(self):
        df = self.get_sensor_data(limit=168)  # Last week
        
        # Calculate statistics
        temp_mean = df['temperature'].mean()
        temp_std = df['temperature'].std()
        ph_mean = df['ph'].mean()
        ph_std = df['ph'].std()
        
        print(f'Temperature: {temp_mean:.2f} ± {temp_std:.2f}°C')
        print(f'pH: {ph_mean:.2f} ± {ph_std:.2f}')
        
        return df

# Usage
api = AquaVisionAPI('https://your-project.supabase.co', 'your-key')
data = api.analyze_trends()
```

### cURL Examples

#### Get Sensor Data

```bash
curl -X GET 'https://your-project.supabase.co/rest/v1/sensor_data?limit=10' \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-access-token"
```

#### Insert Sensor Data

```bash
curl -X POST 'https://your-project.supabase.co/rest/v1/sensor_data' \
  -H "apikey: your-anon-key" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "temperature": 24.5,
    "ph": 7.2,
    "population": 15,
    "health_status": 100,
    "avg_weight": 5.0,
    "days_to_harvest": 120
  }'
```

#### Send Command

```bash
curl -X POST 'https://your-project.supabase.co/rest/v1/commands' \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "command": "FEED",
    "processed": false
  }'
```

---

## Best Practices

### 1. Security

- Never expose API keys in client-side code
- Use environment variables for sensitive data
- Implement Row Level Security (RLS) policies
- Rotate API keys periodically
- Use HTTPS for all requests

### 2. Performance

- Cache frequently accessed data
- Use pagination for large datasets
- Implement rate limiting on your end
- Batch multiple operations when possible
- Use real-time subscriptions instead of polling

### 3. Error Handling

- Always check response status codes
- Implement retry logic with exponential backoff
- Log errors for debugging
- Provide user-friendly error messages
- Handle network timeouts gracefully

### 4. Data Management

- Validate data before insertion
- Use transactions for related operations
- Archive old data regularly
- Implement data backup strategies
- Monitor database size

---

## Testing

### Test Environment Setup

1. Create separate Supabase project for testing
2. Use test credentials
3. Populate with sample data
4. Test all endpoints

### Example Test Cases

```javascript
describe('Sensor Data API', () => {
  test('should insert sensor data', async () => {
    const data = {
      temperature: 24.5,
      ph: 7.2,
      population: 15
    };
    
    const result = await insertSensorData(data);
    expect(result).toBe(true);
  });
  
  test('should retrieve latest reading', async () => {
    const data = await getLatestSensorData();
    expect(data).toBeDefined();
    expect(data.temperature).toBeGreaterThan(0);
  });
});
```

---

## Support

For API support:
- Email: ivanbeernal12@gmail.com
- Documentation: Check README.md and SETUP.md
- Issues: Report bugs through your communication channel

---

## Changelog

### v1.0.0 (2024)
- Initial API release
- Authentication endpoints
- Sensor data CRUD operations
- Command system
- Schedule management
- Real-time subscriptions

---

**End of API Documentation**

For the latest updates and examples, check the project repository.