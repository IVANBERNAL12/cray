// dashboard.js - COMPLETE UPDATED VERSION WITH EMAIL NOTIFICATIONS
// Part 1: Setup, Configuration, Email Functions
console.log('dashboard.js loaded');

// OPTIMAL CRAYFISH PARAMETERS - From Knowledge Base Guidelines
const CRAYFISH_GUIDELINES = {
    temperature: {
        min: 20.0,
        max: 25.0,
        critical_low: 15.0,
        critical_high: 30.0
    },
    ph: {
        min: 6.5,
        max: 8.0,
        critical_low: 6.0,
        critical_high: 8.5
    }
};

// Alert cooldown tracking (prevents spam)
const lastAlertTimes = {
    temperature: 0,
    ph: 0,
    lowFeed: 0
};

const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// ========================================
// GLOBAL STATE & CONFIGURATION
// ========================================

let hardwareData = {
    temperature: 24.5,
    ph: 7.2,
    population: 15,
    healthStatus: 100,
    avgWeight: 5,
    daysToHarvest: 120,
    lastUpdated: new Date()
};

let feedData = {
    capacity: 500,
    current: 375,
    lastUpdated: new Date()
};

let isConnected = false;
let dataUpdateInterval;
let mockDataInterval;
let deviceCheckInterval;

let farmSettings = {
    name: 'My Crayfish Farm',
    email: 'farmer@example.com',
    phone: '+63 912 345 6789',
    unit: 'metric',
    alertFrequency: 'immediate',
    waterTestingFrequency: 'twice-weekly',
    email_alerts_enabled: true,
    low_feed_threshold: 20
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

function showNotification(title, message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    const notificationIcon = document.getElementById('notification-icon');
    const notificationTitle = document.getElementById('notification-title');
    const notificationMessage = document.getElementById('notification-message');

    if (notificationIcon && notificationTitle && notificationMessage) {
        notificationTitle.textContent = title;
        notificationMessage.textContent = message;

        notificationIcon.className = 'notification-icon ' + type;
        switch (type) {
            case 'success': notificationIcon.innerHTML = '<i class="fas fa-check-circle"></i>'; break;
            case 'warning': notificationIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>'; break;
            case 'error': notificationIcon.innerHTML = '<i class="fas fa-times-circle"></i>'; break;
            default: notificationIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
        }

        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), 5000);
    }
}

function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        lastUpdatedElement.textContent = `Last updated: ${timeString}`;
    }
}

function formatFrequency(frequency) {
    const map = { 
        'twice-daily': 'Twice Daily', 
        'daily': 'Daily', 
        'every-other-day': 'Every Other Day',
        'weekly': 'Weekly', 
        'biweekly': 'Bi-weekly', 
        'monthly': 'Monthly'
    };
    return map[frequency] || frequency;
}

function formatFoodType(type) {
    const map = { 
        'juvenile-pellets': 'Juvenile Pellets (40%)',
        'growth-pellets': 'Growth Pellets (35%)',
        'breeder-pellets': 'Breeder Pellets (30%)'
    };
    return map[type] || type;
}

function formatTime(frequency, time) {
    if (frequency === 'twice-daily') {
        return `8:00 AM and 6:00 PM`;
    } else {
        return `at ${time}`;
    }
}

// ========================================
// FEED HISTORY FUNCTIONS
// ========================================

async function loadFeedHistory() {
    try {
        console.log('[Feed History] Loading feed history...');
        
        if (!window.getFeedHistory) {
            console.error('[Feed History] getFeedHistory function not available');
            showNotification('Error', 'Feed history function not available', 'error');
            return;
        }
        
        const history = await window.getFeedHistory(30);
        console.log('[Feed History] Loaded', history?.length || 0, 'records');
        
        displayFeedHistory(history);
    } catch (error) {
        console.error('[Feed History] Error loading feed history:', error);
        showNotification('Error', 'Failed to load feed history', 'error');
    }
}

function displayFeedHistory(history) {
    const tbody = document.getElementById('feed-history-tbody');
    if (!tbody) {
        console.warn('[Feed History] Table body not found');
        return;
    }

    if (!history || history.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-inbox" style="font-size: 2rem; color: #00d4ff; opacity: 0.5;"></i>
                    <p style="margin-top: 1rem; color: #e0f7fa; opacity: 0.7;">No feed history yet</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = history.map(record => {
        const date = new Date(record.created_at);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const foodTypeMap = {
            'juvenile-pellets': 'Juvenile Pellets',
            'growth-pellets': 'Growth Pellets',
            'breeder-pellets': 'Breeder Pellets'
        };
        
        const methodBadge = record.method === 'scheduled' 
            ? '<span class="source-badge scheduled">Scheduled</span>'
            : '<span class="source-badge manual">Manual</span>';

        return `
            <tr>
                <td>${dateStr} ${timeStr}</td>
                <td>${record.amount.toFixed(1)}g</td>
                <td>${foodTypeMap[record.food_type] || record.food_type}</td>
                <td>${methodBadge}</td>
            </tr>
        `;
    }).join('');
    
    console.log('[Feed History] ✓ Displayed', history.length, 'records');
}
// ========================================
// WATER CHANGE HISTORY FUNCTIONS
// ========================================

async function loadWaterChangeHistory() {
    try {
        console.log('[Water History] Loading water change history...');
        
        if (!window.getWaterChangeHistory) {
            console.error('[Water History] getWaterChangeHistory function not available');
            showNotification('Error', 'Water history function not available', 'error');
            return;
        }
        
        const history = await window.getWaterChangeHistory(30);
        console.log('[Water History] Loaded', history?.length || 0, 'records');
        
        displayWaterChangeHistory(history);
    } catch (error) {
        console.error('[Water History] Error loading water change history:', error);
        showNotification('Error', 'Failed to load water change history', 'error');
    }
}


function displayWaterChangeHistory(history) {
    const tbody = document.getElementById('water-history-tbody');
    if (!tbody) {
        console.warn('[Water History] Table body not found');
        return;
    }

    if (!history || history.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-inbox" style="font-size: 2rem; color: #00d4ff; opacity: 0.5;"></i>
                    <p style="margin-top: 1rem; color: #e0f7fa; opacity: 0.7;">No water change history yet</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = history.map(record => {
        const date = new Date(record.created_at);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const sourceBadge = record.change_type === 'scheduled'
            ? '<span class="source-badge scheduled">Scheduled</span>'
            : record.change_type === 'device'
            ? '<span class="source-badge device">Device</span>'
            : '<span class="source-badge manual">Manual</span>';

        return `
            <tr>
                <td>${dateStr} ${timeStr}</td>
                <td>${record.percentage}%</td>
                <td>${sourceBadge}</td>
                <td>${record.temp_before ? record.temp_before.toFixed(1) + '°C' : '-'}</td>
                <td>${record.ph_before ? record.ph_before.toFixed(1) : '-'}</td>
                <td>${record.temp_after ? record.temp_after.toFixed(1) + '°C' : '-'}</td>
                <td>${record.ph_after ? record.ph_after.toFixed(1) : '-'}</td>
            </tr>
        `;
    }).join('');
    
    console.log('[Water History] ✓ Displayed', history.length, 'records');
}

// ========================================
// EMAIL NOTIFICATION FUNCTIONS
// ========================================

async function checkAndSendLowFeedAlert(currentPercentage) {
    try {
        console.log('[Email] Checking low feed alert for:', currentPercentage, '%');
        
        const settings = await window.getFarmSettings();
        if (!settings || !settings.email) {
            console.log('[Email] No email configured, skipping alert');
            return;
        }
        
        const emailAlertsEnabled = settings.email_alerts_enabled !== false;
        if (!emailAlertsEnabled) {
            console.log('[Email] Email alerts disabled, skipping');
            return;
        }
        
        const threshold = settings.low_feed_threshold || 20;
        const now = Date.now();
        
        if (now - lastAlertTimes.lowFeed < ALERT_COOLDOWN_MS) {
            console.log('[Email] Alert cooldown active, skipping');
            return;
        }
        
        if (currentPercentage <= threshold) {
            console.log('[Email] Feed below threshold! Sending alert...');
            
            const result = await window.sendLowFeedAlert(
                settings.email, 
                currentPercentage, 
                threshold
            );
            
            if (result && result.success) {
                lastAlertTimes.lowFeed = now;
                console.log('[Email] ✓ Low feed alert sent successfully');
                showNotification('Alert Sent', 'Low feed email notification sent', 'info');
            } else {
                console.error('[Email] Failed to send low feed alert:', result);
            }
        }
    } catch (error) {
        console.error('[Email] Error in checkAndSendLowFeedAlert:', error);
    }
}

async function sendWaterChangeEmail(changeType, percentage) {
    try {
        console.log('[Email] Sending water change notification...');
        
        const settings = await window.getFarmSettings();
        if (!settings || !settings.email) {
            console.log('[Email] No email configured');
            return { success: false };
        }
        
        const emailAlertsEnabled = settings.email_alerts_enabled !== false;
        if (!emailAlertsEnabled) {
            console.log('[Email] Email alerts disabled');
            return { success: false };
        }
        
        const result = await window.sendWaterChangeNotification(
            settings.email, 
            changeType, 
            percentage
        );
        
        if (result && result.success) {
            console.log('[Email] ✓ Water change email sent');
        }
        
        return result;
    } catch (error) {
        console.error('[Email] Error sending water change email:', error);
        return { success: false, error: error.message };
    }
}


async function checkParameterViolations(temperature, ph) {
    try {
        const settings = await window.getFarmSettings();
        if (!settings || !settings.email) return;
        
        const emailAlertsEnabled = settings.email_alerts_enabled !== false;
        if (!emailAlertsEnabled) return;
        
        const now = Date.now();
        
        // Temperature check
        const tempGuidelines = CRAYFISH_GUIDELINES.temperature;
        const isTempCritical = temperature < tempGuidelines.critical_low || temperature > tempGuidelines.critical_high;
        const isTempWarning = !isTempCritical && (temperature < tempGuidelines.min || temperature > tempGuidelines.max);
        
        if ((isTempCritical || isTempWarning) && (now - lastAlertTimes.temperature > ALERT_COOLDOWN_MS)) {
            console.log('[Email] Temperature violation detected:', temperature, '°C');
            
            const result = await window.sendParameterViolationAlert(
                settings.email, 
                'temperature', 
                temperature,
                { min: tempGuidelines.min, max: tempGuidelines.max }
            );
            
            if (result && result.success) {
                lastAlertTimes.temperature = now;
                console.log('[Email] ✓ Temperature alert sent');
                showNotification('Alert Sent', 'Temperature violation email sent', 'warning');
            }
        }
        
        // pH check
        const phGuidelines = CRAYFISH_GUIDELINES.ph;
        const isPhCritical = ph < phGuidelines.critical_low || ph > phGuidelines.critical_high;
        const isPhWarning = !isPhCritical && (ph < phGuidelines.min || ph > phGuidelines.max);
        
        if ((isPhCritical || isPhWarning) && (now - lastAlertTimes.ph > ALERT_COOLDOWN_MS)) {
            console.log('[Email] pH violation detected:', ph);
            
            const result = await window.sendParameterViolationAlert(
                settings.email, 
                'ph', 
                ph,
                { min: phGuidelines.min, max: phGuidelines.max }
            );
            
            if (result && result.success) {
                lastAlertTimes.ph = now;
                console.log('[Email] ✓ pH alert sent');
                showNotification('Alert Sent', 'pH violation email sent', 'warning');
            }
        }
    } catch (error) {
        console.error('[Email] Error in checkParameterViolations:', error);
    }
}

async function sendFeedingNotificationEmail(amount, foodType) {
    try {
        console.log('[Email] Sending feeding notification...');
        
        const settings = await window.getFarmSettings();
        if (!settings || !settings.email) {
            console.log('[Email] No email configured');
            return { success: false };
        }
        
        const emailAlertsEnabled = settings.email_alerts_enabled !== false;
        if (!emailAlertsEnabled) {
            console.log('[Email] Email alerts disabled');
            return { success: false };
        }
        
        const result = await window.sendFeedingNotification(
            settings.email, 
            amount, 
            foodType
        );
        
        if (result && result.success) {
            console.log('[Email] ✓ Feeding email sent');
        }
        
        return result;
    } catch (error) {
        console.error('[Email] Error sending feeding email:', error);
        return { success: false, error: error.message };
    }
}
// ========================================
// USER ID DISPLAY FUNCTION
// ========================================

async function displayUserID() {
    try {
        console.log('[User ID] Getting current user...');
    
        const user = await getCurrentUser();
        
        if (!user) {
            console.warn('[User ID] User not authenticated');
            const userIdText = document.getElementById('user-id-text');
            if (userIdText) {
                userIdText.textContent = 'Not logged in';
            }
            return;
        }
        
        console.log('[User ID] User found:', user.id);
        
        const userIdText = document.getElementById('user-id-text');
        if (userIdText) {
            userIdText.textContent = user.id;
            console.log('[User ID] ✓ Displayed user ID');
        } else {
            console.warn('[User ID] user-id-text element not found');
        }
    } catch (error) {
        console.error('[User ID] Error displaying user ID:', error);
        const userIdText = document.getElementById('user-id-text');
        if (userIdText) {
            userIdText.textContent = 'Error loading user ID';
        }
    }

}
async function copyUserID() {
    try {
        const userIdText = document.getElementById('user-id-text');
        if (!userIdText) {
            console.warn('[User ID] user-id-text element not found');
            return;
        }
        
        const userId = userIdText.textContent;
        
        if (!userId || userId === 'Loading...' || userId === 'Not logged in' || userId === 'Error loading user ID') {
            showNotification('Error', 'No user ID available to copy', 'warning');
            return;
        }
        
        await navigator.clipboard.writeText(userId);
        
        showNotification('Copied!', 'User ID copied to clipboard', 'success');
        
        const copyBtn = document.getElementById('copy-user-id');
        if (copyBtn) {
            const icon = copyBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-check';
                setTimeout(() => {
                    icon.className = 'fas fa-copy';
                }, 2000);
            }
        }
        
        console.log('[User ID] ✓ Copied to clipboard');
    } catch (error) {
        console.error('[User ID] Error copying user ID:', error);
        showNotification('Error', 'Failed to copy user ID', 'error');
    }
}

// ========================================
// SUPABASE INTEGRATION
// ========================================

async function saveToSupabase(table, data) {
    try {
        if (!window.supabase) {
            console.warn('Supabase not available, saving to localStorage only');
            localStorage.setItem(table, JSON.stringify(data));
            return { success: true, local: true };
        }

        const user = await getCurrentUser();
        if (!user) {
            console.warn('User not authenticated, saving to localStorage');
            localStorage.setItem(table, JSON.stringify(data));
            return { success: true, local: true };
        }

        const dataWithUser = { ...data, user_id: user.id };

        const { data: result, error } = await window.supabase
            .from(table)
            .upsert([dataWithUser])
            .select();

        if (error) throw error;

        localStorage.setItem(table, JSON.stringify(data));
        
        console.log(`✓ Saved to Supabase (${table}):`, result);
        return { success: true, data: result };
    } catch (error) {
        console.error(`Error saving to Supabase (${table}):`, error);
        localStorage.setItem(table, JSON.stringify(data));
        return { success: false, error: error.message, local: true };
    }
}

async function loadFromSupabase(table) {
    try {
        if (!window.supabase) {
            const local = localStorage.getItem(table);
            return local ? JSON.parse(local) : null;
        }

        const user = await getCurrentUser();
        if (!user) {
            const local = localStorage.getItem(table);
            return local ? JSON.parse(local) : null;
        }

        const { data, error } = await window.supabase
            .from(table)
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (data) {
            const dataWithoutUserId = { ...data };
            delete dataWithoutUserId.user_id;
            delete dataWithoutUserId.id;
            localStorage.setItem(table, JSON.stringify(dataWithoutUserId));
            return dataWithoutUserId;
        }

        const local = localStorage.getItem(table);
        return local ? JSON.parse(local) : null;
    } catch (error) {
        console.error(`Error loading from Supabase (${table}):`, error);
        const local = localStorage.getItem(table);
        return local ? JSON.parse(local) : null;
    }
}

async function saveSensorReading(reading) {
    try {
        if (!window.supabase) return;

        const user = await getCurrentUser();
        if (!user) return;

        const { error } = await window.supabase
            .from('sensor_readings')
            .insert([{
                user_id: user.id,
                temperature: reading.temperature,
                ph: reading.ph,
                population: reading.population || 15,
                health_status: reading.healthStatus || 100,
                avg_weight: reading.avgWeight || 5,
                days_to_harvest: reading.daysToHarvest || 120
            }]);

        if (error) throw error;
        console.log('✓ Sensor reading saved to Supabase');
    } catch (error) {
        console.error('Error saving sensor reading:', error);
    }
}

// ========================================
// DEVICE STATUS & COMMANDS (FIXED!)
// ========================================

// ========================================
// DEVICE STATUS & COMMANDS (COMPLETE FIXED VERSION!)
// ========================================
// INSTRUCTIONS: In your dashboard.js file, find the section that starts with
// "// DEVICE STATUS & COMMANDS" and replace EVERYTHING from there until
// the next major section marker with this code.
// 
// Look for these function names and replace them:
// - checkDeviceStatus()
// - sendCommand()
// - setupRealtimeSubscription()

async function checkDeviceStatus() {
    const statusIndicator = document.getElementById('device-status-indicator');
    const statusText = document.getElementById('device-status-text');
    const lastUpdate = document.getElementById('last-device-update');

    try {
        if (!window.supabase) {
            updateOfflineStatus('Supabase not initialized');
            return;
        }

        const user = await getCurrentUser();
        if (!user) {
            updateOfflineStatus('User not authenticated');
            return;
        }

        // Check for data in last 90 seconds
        const ninetySecondsAgo = new Date();
        ninetySecondsAgo.setSeconds(ninetySecondsAgo.getSeconds() - 90);

        console.log('[Device] Checking for data after:', ninetySecondsAgo.toISOString());

        const { data, error } = await window.supabase
            .from('sensor_readings')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', ninetySecondsAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('[Device] Database error:', error);
            updateOfflineStatus('Database error');
            return;
        }

        console.log('[Device] Recent data found:', data?.length || 0);


        const hasRecentData = data && data.length > 0;
        
        if (hasRecentData) {
            const latestReading = data[0];
            const updateTime = new Date(latestReading.created_at);
            const ageSeconds = Math.floor((new Date() - updateTime) / 1000);
            
            console.log('[Device] Latest data age:', ageSeconds, 'seconds');
            
            isConnected = true;
            
            if (statusIndicator) {
                statusIndicator.className = 'status-indicator online';
                statusIndicator.style.backgroundColor = '#00ff88';
            }
            if (statusText) {
                statusText.textContent = 'Device Connected';
                statusText.style.color = '#00ff88';
            }
            if (lastUpdate) {
                if (ageSeconds < 60) {
                    lastUpdate.textContent = `Last update: ${ageSeconds}s ago`;
                } else {
                    const ageMinutes = Math.floor(ageSeconds / 60);
                    lastUpdate.textContent = `Last update: ${ageMinutes}m ago`;
                }
            }
            
            // Update dashboard with latest data
            hardwareData.temperature = latestReading.temperature;
            hardwareData.ph = latestReading.ph;
            hardwareData.population = latestReading.population || 15;
            hardwareData.healthStatus = latestReading.health_status || 100;
            hardwareData.avgWeight = latestReading.avg_weight || 5;
            hardwareData.daysToHarvest = latestReading.days_to_harvest || 120;
            hardwareData.lastUpdated = new Date(latestReading.created_at);
            
            updateDashboardWithNewData(hardwareData);
            stopMockData();
            
            console.log('[Device] ✓ Dashboard updated from real data');
        } else {
            updateOfflineStatus('No recent data from device');
        }
    } catch (error) {
        console.error('[Device] Error:', error);
        updateOfflineStatus(`Error: ${error.message}`);
    }

    function updateOfflineStatus(reason) {
        console.log('[Device] Offline:', reason);
        isConnected = false;
        
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator offline';
            statusIndicator.style.backgroundColor = '#ff4444';
        }
        if (statusText) {
            statusText.textContent = 'Device Offline';
            statusText.style.color = '#ff4444';
        }
        if (lastUpdate) {
            lastUpdate.textContent = 'No device connected';
        }
    }
}

// FIXED: Better command sending with confirmation
async function sendCommand(command) {
    try {
        console.log('[Device] Sending command:', command);
        
        if (!window.supabase) {
            showNotification('Offline Mode', 'Cannot send commands in offline mode', 'warning');
            return { success: false, reason: 'offline' };
        }

        const user = await getCurrentUser();
        if (!user) {
            showNotification('Authentication Required', 'Please log in to send commands', 'warning');
            return { success: false, reason: 'not_authenticated' };
        }

        
        showNotification('Sending Command', `Sending ${command} to device...`, 'info');

        const { data, error } = await window.supabase
            .from('device_commands')
            .insert([{
                user_id: user.id,
                command: command,
                status: 'pending',
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) throw error;

        console.log('[Device] ✓ Command inserted:', data);
        
        showNotification('Command Sent', `${command} command queued successfully`, 'success');
        
        // Monitor command processing
        const commandId = data[0].id;
        let checkCount = 0;
        const maxChecks = 15;
        
        const checkInterval = setInterval(async () => {
            checkCount++;
            
            const { data: cmdData, error: cmdError } = await window.supabase
                .from('device_commands')
                .select('status, processed_at')
                .eq('id', commandId)
                .single();
            
            if (!cmdError && cmdData && cmdData.status === 'processed') {
                clearInterval(checkInterval);
                console.log('[Device] ✓ Command confirmed processed');
                showNotification('Success', `${command} completed successfully!`, 'success');
            } else if (checkCount >= maxChecks) {
                clearInterval(checkInterval);
                console.log('[Device] ⏱ Command check timeout (may still process)');
            }
        }, 1000);
        
        return { success: true, data: data };
    } catch (error) {
        console.error('[Device] Error sending command:', error);
        showNotification('Error', `Failed to send command: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

// FIXED: Real-time subscription with better error handling
function setupRealtimeSubscription() {
    if (!window.supabase || !window.subscribeToSensorData) {
        console.log('[Device] Supabase or database helpers not available');
        return;
    }

    getCurrentUser().then(user => {
        if (!user) {
            console.log('[Device] User not authenticated');
            return;
        }

        console.log('[Device] Setting up real-time subscription for user:', user.id);

        const subscription = window.subscribeToSensorData(user.id, (newData) => {
            console.log('[Device] 🔴 Real-time update received!');
            
            isConnected = true;
            
            const statusIndicator = document.getElementById('device-status-indicator');
            const statusText = document.getElementById('device-status-text');
            const lastUpdate = document.getElementById('last-device-update');
            
            if (statusIndicator) {
                statusIndicator.className = 'status-indicator online';
                statusIndicator.style.backgroundColor = '#00ff88';
            }
            if (statusText) {
                statusText.textContent = 'Device Connected';
                statusText.style.color = '#00ff88';
            }
            if (lastUpdate) {
                lastUpdate.textContent = 'Last update: Just now';
            }
            
            hardwareData.temperature = newData.temperature;
            hardwareData.ph = newData.ph;
            hardwareData.population = newData.population || 15;
            hardwareData.healthStatus = newData.health_status || 100;
            hardwareData.avgWeight = newData.avg_weight || 5;
            hardwareData.daysToHarvest = newData.days_to_harvest || 120;
            hardwareData.lastUpdated = new Date(newData.created_at);
            
            updateDashboardWithNewData(hardwareData);
            stopMockData();
            
            if (window.chartManager) {
                window.chartManager.streamData('tempChart', {
                    x: hardwareData.lastUpdated.getTime(),
                    y: hardwareData.temperature,
                    temperature: hardwareData.temperature
                });
                
                window.chartManager.streamData('phChart', {
                    x: hardwareData.lastUpdated.getTime(),
                    y: hardwareData.ph,
                    ph: hardwareData.ph
                });
            }
            
            console.log('[Device] ✓ Dashboard updated from real-time data');
        });

        window.sensorSubscription = subscription;
        console.log('[Device] ✓ Real-time subscription active');
    }).catch(error => {
        console.error('[Device] Error setting up subscription:', error);
    });
}

// ========================================
// MOCK DATA SYSTEM (VISUAL ONLY!)
// ========================================

function startMockData() {
    if (mockDataInterval) {
        console.log('[Mock] Mock data already running');
        return;
    }
    
    console.log('[Mock] Starting mock data generation (VISUAL ONLY)...');
    
    // Show demo mode banner
    const notification = document.createElement('div');
    notification.id = 'mock-mode-banner';
    notification.style.cssText = `
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 193, 7, 0.9);
        color: #000;
        padding: 10px 20px;
        border-radius: 8px;
        z-index: 9999;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    notification.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Demo Mode: Showing simulated data (NOT saved to database)';
    
    const existingBanner = document.getElementById('mock-mode-banner');
    if (existingBanner) existingBanner.remove();
    
    document.body.appendChild(notification);
    
    const initializeMockData = () => {
        if (!window.chartManager || !window.chartManager.initialized) {
            console.log('[Mock] Waiting for charts to initialize...');
            setTimeout(initializeMockData, 200);
            return;
        }

        console.log('[Mock] Charts ready, generating initial history (VISUAL ONLY)');
        
        const now = Date.now();
        const historicalData = [];
        const totalPoints = 100;
        const intervalMs = 30000;
        
        // Generate historical mock data for charts
        for (let i = totalPoints; i >= 0; i--) {
            const timestamp = new Date(now - (i * intervalMs));
            const temp = 22 + Math.sin(i * 0.1) * 2 + (Math.random() - 0.5) * 1;
            const ph = 7.2 + Math.cos(i * 0.08) * 0.3 + (Math.random() - 0.5) * 0.1;
            
            historicalData.push({
                timestamp: timestamp,
                created_at: timestamp.toISOString(),
                temperature: parseFloat(temp.toFixed(2)),
                ph: parseFloat(ph.toFixed(2))
            });
        }
        
        console.log('[Mock] Generated', historicalData.length, 'visual data points (NOT saved)');
        
        // Update charts with mock data (visual only)
        if (window.chartManager) {
            window.chartManager.updateAllChartsFromHistory(historicalData);
            console.log('[Mock] Charts updated with visual data');
        }
        
        // Update dashboard display
        if (historicalData.length > 0) {
            const lastPoint = historicalData[historicalData.length - 1];
            hardwareData.temperature = lastPoint.temperature;
            hardwareData.ph = lastPoint.ph;
            hardwareData.lastUpdated = new Date();
            updateDashboardWithNewData(hardwareData);
        }
        
        // Start continuous mock data generation (VISUAL ONLY!)
        mockDataInterval = setInterval(() => {
            const baseTemp = 23;
            const basePh = 7.2;
            const time = Date.now() / 100000;
            
            // Generate new mock values
            hardwareData.temperature = parseFloat((baseTemp + Math.sin(time) * 2 + (Math.random() - 0.5) * 1).toFixed(2));
            hardwareData.ph = parseFloat((basePh + Math.cos(time) * 0.3 + (Math.random() - 0.5) * 0.2).toFixed(2));
            hardwareData.lastUpdated = new Date();
            
            // Update UI only - DO NOT SAVE TO DATABASE!
            updateDashboardWithNewData(hardwareData);
            
            // Log to console (not database)
            console.log('[Mock] Generated visual data (NOT saved):', {
                temp: hardwareData.temperature,
                ph: hardwareData.ph,
                note: 'Display only - not in database'
            });
            
            // Update charts visually
            if (window.chartManager) {
                window.chartManager.streamData('tempChart', {
                    x: hardwareData.lastUpdated.getTime(),
                    y: hardwareData.temperature,
                    temperature: hardwareData.temperature
                });
                
                window.chartManager.streamData('phChart', {
                    x: hardwareData.lastUpdated.getTime(),
                    y: hardwareData.ph,
                    ph: hardwareData.ph
                });
            }
        }, 30000); // Update every 30 seconds
        
        console.log('[Mock] Continuous visual updates started (NOT saving to database)');
    };
    
    setTimeout(initializeMockData, 500);
}

function stopMockData() {
    if (mockDataInterval) {
        clearInterval(mockDataInterval);
        mockDataInterval = null;
        console.log('[Mock] Mock data stopped');
        
        const banner = document.getElementById('mock-mode-banner');
        if (banner) {
            banner.style.transition = 'opacity 0.5s';
            banner.style.opacity = '0';
            setTimeout(() => banner.remove(), 500);
        }
    }
}

// ========================================
// DATA CLEANUP FUNCTION
// ========================================

async function cleanupOldSensorData(daysToKeep = 30) {
    try {
        if (!window.supabase) {
            console.warn('[Cleanup] Supabase not available');
            return { success: false, reason: 'no_supabase' };
        }

        const user = await getCurrentUser();
        if (!user) {
            console.warn('[Cleanup] User not authenticated');
            return { success: false, reason: 'not_authenticated' };
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        console.log('[Cleanup] Deleting sensor data older than', cutoffDate.toISOString());

        const { data, error } = await window.supabase
            .from('sensor_readings')
            .delete()
            .eq('user_id', user.id)
            .lt('created_at', cutoffDate.toISOString());

        if (error) {
            console.error('[Cleanup] Error deleting old data:', error);
            throw error;
        }

        console.log('[Cleanup] ✓ Successfully cleaned up old sensor data');
        return { success: true, deletedRecords: data?.length || 0 };
    } catch (error) {
        console.error('[Cleanup] cleanupOldSensorData error:', error);
        return { success: false, error: error.message };
    }
}

function scheduleDataCleanup() {
    setTimeout(() => {
        cleanupOldSensorData(30).then(result => {
            if (result.success) {
                console.log('[Cleanup] Initial cleanup completed');
            }
        });
    }, 60000);

    setInterval(() => {
        cleanupOldSensorData(30).then(result => {
            if (result.success) {
                console.log('[Cleanup] Scheduled cleanup completed');
                showNotification('Database Cleanup', 'Old sensor data cleaned up successfully', 'info');
            }
        });
    }, 24 * 60 * 60 * 1000);
}

window.cleanupOldSensorData = cleanupOldSensorData;

// ========================================
// HELPER FUNCTION - WAIT FOR CHARTS
// ========================================

function waitForChartsReady() {
    return new Promise((resolve) => {
        const checkCharts = () => {
            if (window.chartManager && window.chartManager.initialized) {
                console.log('[Dashboard] Charts ready');
                resolve();
            } else {
                console.log('[Dashboard] Waiting for charts to initialize...');
                setTimeout(checkCharts, 100);
            }
        };
        
        checkCharts();
        
        setTimeout(() => {
            console.warn('[Dashboard] Chart wait timeout, proceeding anyway');
            resolve();
        }, 5000);
    });
}

// ========================================
// INITIALIZATION (FIXED!)
// ========================================

async function initDashboard() {
    try {
        console.log('[Dashboard] Initializing dashboard...');
        
        await loadFarmSettings();
        
        console.log('[Dashboard] Waiting for charts...');
        await waitForChartsReady();
        console.log('[Dashboard] Charts confirmed ready');
        
        setupRealtimeSubscription();
        
        const user = await getCurrentUser();
        if (user && window.getHistoricalReadings) {
            try {
                const historicalData = await window.getHistoricalReadings(user.id, 24);
                if (historicalData && historicalData.length > 0) {
                    console.log('[Dashboard] ✓ Loaded', historicalData.length, 'historical readings');
                    
                    if (window.chartManager) {
                        window.chartManager.updateAllChartsFromHistory(historicalData);
                    }
                }
            } catch (error) {
                console.warn('[Dashboard] Could not load historical data:', error);
            }
        }
        
        await loadDashboardData();

        setupEventListeners();

        setupChartEnhancements();
        
        // CRITICAL: Display User ID
        console.log('[Dashboard] Displaying user ID...');
        await displayUserID();
        
        // CRITICAL: Load feed and water history
        console.log('[Dashboard] Loading feed history...');
        await loadFeedHistory();
        
        console.log('[Dashboard] Loading water change history...');
        await loadWaterChangeHistory();
        
        await checkDeviceStatus();
        deviceCheckInterval = setInterval(checkDeviceStatus, 30000);
        
        setTimeout(() => {
            if (!isConnected) {
                console.log('[Dashboard] No device detected - starting mock data for demo');
                startMockData();
            } else {
                console.log('[Dashboard] Device connected - using real data');
            }
        }, 5000);

        console.log('[Dashboard] ✓ Dashboard initialized successfully');
        showNotification('Dashboard Ready', 'AquaVision Pro loaded successfully', 'success');
    } catch (error) {
        console.error('[Dashboard] Failed to initialize:', error);
        showNotification('Error', 'Failed to initialize dashboard', 'error');
    }

}

async function loadFarmSettings() {
    const savedSettings = await loadFromSupabase('farm_settings');
    
    if (savedSettings && Object.keys(savedSettings).length > 0) {
        farmSettings = { ...farmSettings, ...savedSettings };
        updateFarmNameDisplay();
        
        // CRITICAL FIX: Populate form fields when loading settings
        const farmNameInput = document.getElementById('farm-name');
        const emailInput = document.getElementById('notification-email');
        const phoneInput = document.getElementById('notification-phone');
        const unitInput = document.getElementById('measurement-unit');
        const alertFreqInput = document.getElementById('alert-frequency');
        const waterTestFreqInput = document.getElementById('water-testing-frequency');
        const emailAlertsCheckbox = document.getElementById('email-alerts-enabled');
        const lowFeedThresholdInput = document.getElementById('low-feed-threshold');

        if (emailAlertsCheckbox) emailAlertsCheckbox.checked = farmSettings.email_alerts_enabled !== false;
        if (lowFeedThresholdInput) lowFeedThresholdInput.value = farmSettings.low_feed_threshold || 20;
        if (farmNameInput) farmNameInput.value = farmSettings.name || 'My Crayfish Farm';
        if (emailInput) emailInput.value = farmSettings.email || '';
        if (phoneInput) phoneInput.value = farmSettings.phone || '';
        if (unitInput) unitInput.value = farmSettings.unit || 'metric';
        if (alertFreqInput) alertFreqInput.value = farmSettings.alertFrequency || 'immediate';
        if (waterTestFreqInput) waterTestFreqInput.value = farmSettings.waterTestingFrequency || 'twice-weekly';
        
        console.log('[Dashboard] Farm settings loaded:', farmSettings);
    }
}

function updateFarmNameDisplay() {
    const dashboardTitle = document.querySelector('.dashboard-title');
    if (dashboardTitle) {
        dashboardTitle.textContent = `${farmSettings.name} - Farm Overview`;
    }
    
    const logoText = document.querySelector('.logo-text');
    if (logoText) {
        logoText.textContent = farmSettings.name;
    }
}

// ========================================
// DATA HANDLING & UI UPDATES
// ========================================

async function loadDashboardData() {
    try {
        updateDashboardWithNewData(hardwareData);
        updateFeedLevelUI(feedData);
        
        const feedingSchedule = await loadFromSupabase('feeding_schedule');
        if (feedingSchedule) {
            updateFeedingScheduleList(feedingSchedule);
        }

        const waterSchedule = await loadFromSupabase('water_schedule');
        if (waterSchedule) {
            updateWaterScheduleList(waterSchedule);
        }
        
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error', 'Failed to load dashboard data.', 'error');
    }
}

function updateDashboardWithNewData(data) {
    if (data && data !== hardwareData) {
        hardwareData = { ...hardwareData, ...data };
    }

    const elements = {
        'temp-value': `${hardwareData.temperature.toFixed(1)}°C`,
        'water-temp-value': `${hardwareData.temperature.toFixed(1)}°C`,
        'ph-value': hardwareData.ph.toFixed(1),
        'water-ph-value': hardwareData.ph.toFixed(1),
        'health-value': `${hardwareData.healthStatus}%`,
    };

    for (const id in elements) {
        const el = document.getElementById(id);
        if (el) el.textContent = elements[id];
    }

    updateWaterQualityStatus(hardwareData.temperature, hardwareData.ph);
    updateLastUpdated();
    
    // CHECK FOR PARAMETER VIOLATIONS AND SEND EMAILS
    checkParameterViolations(hardwareData.temperature, hardwareData.ph);
}

function updateWaterQualityStatus(temperature, ph) {
    const getTempStatus = (t) => {
        if (t < 15 || t > 30) return { text: 'Critical', class: 'critical' };
        if (t < 20 || t > 25) return { text: 'Warning', class: 'warning' };
        return { text: 'Optimal', class: 'optimal' };
    };
    const getPhStatus = (p) => {
        if (p < 6.0 || p > 8.5) return { text: 'Critical', class: 'critical' };
        if (p < 6.5 || p > 8.0) return { text: 'Warning', class: 'warning' };
        return { text: 'Optimal', class: 'optimal' };
    };

    const tempStatus = getTempStatus(temperature);
    const phStatus = getPhStatus(ph);

    const tempEl = document.getElementById('water-temp-status');
    if (tempEl) {
        tempEl.textContent = tempStatus.text;
        tempEl.className = `parameter-status ${tempStatus.class}`;
    }
    const phEl = document.getElementById('water-ph-status');
    if (phEl) {
        phEl.textContent = phStatus.text;
        phEl.className = `parameter-status ${phStatus.class}`;
    }

    const waterStatusIndicator = document.getElementById('water-status-indicator');
    const waterStatusText = document.querySelector('.water-info h3');
    if (waterStatusIndicator && waterStatusText) {
        const isCritical = tempStatus.class === 'critical' || phStatus.class === 'critical';
        const isWarning = tempStatus.class === 'warning' || phStatus.class === 'warning';
        waterStatusIndicator.className = `status-indicator ${isCritical ? 'critical' : isWarning ? 'warning' : 'good'}`;
        waterStatusText.textContent = `Water Quality: ${isCritical ? 'Critical' : isWarning ? 'Warning' : 'Good'}`;
    }
}

function updateWaterQualityStatus(temperature, ph) {
    const getTempStatus = (t) => {
        if (t < 15 || t > 30) return { text: 'Critical', class: 'critical' };
        if (t < 20 || t > 25) return { text: 'Warning', class: 'warning' };
        return { text: 'Optimal', class: 'optimal' };
    };
    const getPhStatus = (p) => {
        if (p < 6.0 || p > 8.5) return { text: 'Critical', class: 'critical' };
        if (p < 6.5 || p > 8.0) return { text: 'Warning', class: 'warning' };
        return { text: 'Optimal', class: 'optimal' };
    };

    const tempStatus = getTempStatus(temperature);
    const phStatus = getPhStatus(ph);

    const tempEl = document.getElementById('water-temp-status');
    if (tempEl) {
        tempEl.textContent = tempStatus.text;
        tempEl.className = `parameter-status ${tempStatus.class}`;
    }
    const phEl = document.getElementById('water-ph-status');
    if (phEl) {
        phEl.textContent = phStatus.text;
        phEl.className = `parameter-status ${phStatus.class}`;
    }

    const waterStatusIndicator = document.getElementById('water-status-indicator');
    const waterStatusText = document.querySelector('.water-info h3');
    if (waterStatusIndicator && waterStatusText) {
        const isCritical = tempStatus.class === 'critical' || phStatus.class === 'critical';
        const isWarning = tempStatus.class === 'warning' || phStatus.class === 'warning';
        waterStatusIndicator.className = `status-indicator ${isCritical ? 'critical' : isWarning ? 'warning' : 'good'}`;
        waterStatusText.textContent = `Water Quality: ${isCritical ? 'Critical' : isWarning ? 'Warning' : 'Good'}`;
    }
}

function updateHarvestProjections(data) {
    const marketSize = 40;
    const projectedWeight = Math.min(data.avgWeight + (data.daysToHarvest * 0.3), marketSize);
    const projectedWeightKg = (projectedWeight * data.population) / 1000;
    const projectedRevenue = Math.round(projectedWeightKg * 150);

    const weightEl = document.getElementById('weight-harvest-value');
    if (weightEl) weightEl.textContent = `${projectedWeight.toFixed(1)}g`;
    const revenueEl = document.getElementById('revenue-harvest-value');
    if (revenueEl) revenueEl.textContent = `₱${projectedRevenue}`;
    const survivalEl = document.getElementById('survival-harvest-value');
    if (survivalEl) survivalEl.textContent = `${data.healthStatus}%`;
    
    const weightProgress = Math.min((projectedWeight / marketSize) * 100, 100);
    const weightProgressBar = document.querySelector('#harvest-management .harvest-progress-bar.progress-15');
    if (weightProgressBar) {
        weightProgressBar.style.width = `${weightProgress}%`;
    }
    
    const daysProgress = Math.max(0, 100 - (data.daysToHarvest / 180 * 100));
    const daysProgressBar = document.querySelector('#harvest-management .harvest-progress-bar.progress-20');
    if (daysProgressBar) {
        daysProgressBar.style.width = `${daysProgress}%`;
    }
}

function updateFeedLevelUI(data) {
    if (!data) return;
    feedData = data;
    const percentage = Math.round((feedData.current / feedData.capacity) * 100);

    const updateElement = (id, text) => { 
        const el = document.getElementById(id); 
        if (el) el.textContent = text; 
    };
    
    updateElement('feed-level-value', `${percentage}%`);
    updateElement('feeding-feed-level-value', `${percentage}%`);
    
    const progressBar = document.getElementById('feeding-feed-level-progress');
    if (progressBar) progressBar.style.width = `${percentage}%`;

    let statusText = 'Adequate', statusClass = 'adequate';
    if (percentage < 20) { statusText = 'Critical'; statusClass = 'critical'; }
    else if (percentage < 40) { statusText = 'Low'; statusClass = 'low'; }
    
    const statusEl = document.getElementById('feed-level-status');
    if (statusEl) {
        statusEl.textContent = statusText;
        statusEl.className = `feed-level-status ${statusClass}`;
    }
    
    updateElement('feed-capacity', `${feedData.capacity}g`);
    updateElement('feed-current', `${feedData.current}g`);
    updateElement('feed-days-left', `${Math.floor(feedData.current / 15)} days`);
    
    // CHECK FOR LOW FEED ALERT
    checkAndSendLowFeedAlert(percentage);
}


function updateFeedingScheduleList(schedule) {
    const listEl = document.getElementById('feeding-schedule-list');
    if (!listEl || !schedule) return;
    listEl.innerHTML = `
        <div class="schedule-item">
            <div class="schedule-info">
                <div class="schedule-time">${formatFrequency(schedule.frequency)}</div>
                <div class="schedule-details">${formatTime(schedule.frequency, schedule.time)} - ${schedule.amount}g of ${formatFoodType(schedule.type)}</div>
            </div>
            <div class="schedule-status active">Active</div>
        </div>
    `;
}

function updateWaterScheduleList(schedule) {
    const listEl = document.getElementById('water-schedule-list');
    if (!listEl || !schedule) return;
    
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = dayOfWeek[1];
    
    listEl.innerHTML = `
        <div class="schedule-item">
            <div class="schedule-info">
                <div class="schedule-time">${formatFrequency(schedule.frequency)}</div>
                <div class="schedule-details">Every ${day} at ${schedule.time} - ${schedule.percentage}% water change</div>
            </div>
            <div class="schedule-status active">Active</div>
        </div>
    `;
}

// ========================================
// COMMAND FUNCTIONS
// ========================================

async function feedNow() {
    const btn = document.getElementById('feed-now');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Feeding...';
    }

    await sendCommand('feed');
    
    setTimeout(async () => {
        try {
            const schedule = await window.getFeedingSchedule();
            const amount = schedule?.amount || 7.5;
            const foodType = schedule?.type || 'juvenile-pellets';
            
            const currentFeedData = await window.getFeedData();
            feedData.capacity = currentFeedData.capacity || 500;
            feedData.current = Math.max(0, (currentFeedData.current || 375) - amount);
            feedData.lastUpdated = new Date();
            
            const saveResult = await window.saveFeedData(feedData);
            
            if (saveResult.success) {
                console.log('[Feed] ✓ Feed data saved successfully');
                updateFeedLevelUI(feedData);
            }
            
            const percentage = Math.round((feedData.current / feedData.capacity) * 100);
            
            await window.saveFeedHistory({
                amount: amount,
                food_type: foodType,
                method: 'manual'
            });
            
            await loadFeedHistory();
            
            // SEND EMAIL NOTIFICATION
            await sendFeedingNotificationEmail(amount, foodType);
            
            await checkAndSendLowFeedAlert(percentage);
            
            const now = new Date();
            const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const lastFeeding = document.getElementById('last-feeding');
            if (lastFeeding) lastFeeding.textContent = `Last fed: Today at ${timeString}`;
            
            showNotification('Feeding Complete', 'Feeding completed successfully', 'success');
        } catch (error) {
            console.error('[Feed] Error in feedNow:', error);
            showNotification('Error', 'Failed to complete feeding', 'error');
        }
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-utensils"></i> Feed Now';
        }
    }, 1000);
}



async function changeWaterNow() {
    const btn = document.getElementById('change-water-now');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing Water...';
    }
    
    await sendCommand('change_water');
    
    setTimeout(async () => {
        const tempBefore = hardwareData.temperature;
        const phBefore = hardwareData.ph;
        
        const schedule = await window.getWaterSchedule();
        const percentage = schedule?.percentage || 50;
        
        await window.saveWaterChangeHistory({
            change_type: 'manual',
            percentage: percentage,
            temp_before: tempBefore,
            ph_before: phBefore,
            temp_after: null,
            ph_after: null,
            status: 'completed'
        });
        
        await loadWaterChangeHistory();
        
        // SEND EMAIL NOTIFICATION
        await sendWaterChangeEmail('manual', percentage);
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const lastWaterChangeEl = document.getElementById('last-water-change');
        if (lastWaterChangeEl) lastWaterChangeEl.textContent = `Last changed: Today at ${timeString}`;
        
        showNotification('Water Change Complete', 'Water change completed successfully', 'success');
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Change Water Now';
        }
    }, 1000);
}


async function testWaterNow() {
    showNotification('Water Test', 'Testing water quality...', 'info');
    await sendCommand('test_water');
    
    setTimeout(() => {
        loadDashboardData();
        showNotification('Water Test Results', 'Water test completed. Dashboard updated.', 'success');
    }, 3000);
}


async function testConnection() {
    showNotification('Testing', 'Testing device connection...', 'info');
    await sendCommand('test_connection');
    setTimeout(checkDeviceStatus, 2000);
}

// ========================================
// MODAL & FORM FUNCTIONS
// ========================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        
        if (modalId === 'record-harvest-modal') {
            const harvestDateRecord = document.getElementById('harvest-date-record');
            if (harvestDateRecord) harvestDateRecord.valueAsDate = new Date();
        }
        
        if (modalId === 'harvest-planning-modal') {
            const harvestDate = new Date();
            harvestDate.setDate(harvestDate.getDate() + 120);
            const harvestDateInput = document.getElementById('harvest-date');
            if (harvestDateInput) harvestDateInput.valueAsDate = harvestDate;
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function toggleFeedingScheduleForm() {
    const form = document.getElementById('feeding-schedule-form');
    
    if (form) {
        const isShowing = form.classList.toggle('show');
        
        if (isShowing) {
            loadFromSupabase('feeding_schedule').then(schedule => {
                if (schedule) {
                    const feedingTime = document.getElementById('feeding-time');
                    const feedingFrequency = document.getElementById('feeding-frequency');
                    const foodAmount = document.getElementById('food-amount');
                    const foodType = document.getElementById('food-type');

                    if (feedingTime) feedingTime.value = schedule.time || '';
                    if (feedingFrequency) feedingFrequency.value = schedule.frequency || 'twice-daily';
                    if (foodAmount) foodAmount.value = schedule.amount || '7.5';
                    if (foodType) foodType.value = schedule.type || 'juvenile-pellets';
                }
            });
        }
    }
}

function toggleWaterScheduleForm() {
    const form = document.getElementById('water-schedule-form');
    
    if (form) {
        const isShowing = form.classList.toggle('show');
        
        if (isShowing) {
            loadFromSupabase('water_schedule').then(schedule => {
                if (schedule) {
                    const waterTime = document.getElementById('water-change-time');
                    const waterFrequency = document.getElementById('water-frequency');
                    const waterPercentage = document.getElementById('water-change-percentage');

                    if (waterTime) waterTime.value = schedule.time || '';
                    if (waterFrequency) waterFrequency.value = schedule.frequency || 'weekly';
                    if (waterPercentage) waterPercentage.value = schedule.percentage || '50';
                }
            });
        }
    }
}

async function saveFeedingSchedule() {
    const feedingTime = document.getElementById('feeding-time')?.value;
    const feedingFrequency = document.getElementById('feeding-frequency')?.value;
    const foodAmount = document.getElementById('food-amount')?.value;
    const foodType = document.getElementById('food-type')?.value;
    
    if (feedingTime && foodAmount) {
        const scheduleData = {
            time: feedingTime,
            frequency: feedingFrequency,
            amount: parseFloat(foodAmount),
            type: foodType
        };
        
        await saveToSupabase('feeding_schedule', scheduleData);
        updateFeedingScheduleList(scheduleData);
        
        const form = document.getElementById('feeding-schedule-form');
        if (form) form.classList.remove('show');
        
        showNotification('Schedule Saved', 
            `Feeding scheduled for ${formatFrequency(feedingFrequency)} at ${feedingTime}`, 
            'success');
    } else {
        showNotification('Error', 'Please fill all required fields', 'warning');
    }
}

async function saveWaterSchedule() {
    const waterTime = document.getElementById('water-change-time')?.value;
    const waterFrequency = document.getElementById('water-frequency')?.value;
    const waterPercentage = document.getElementById('water-change-percentage')?.value;
    
    if (waterTime) {
        const scheduleData = {
            time: waterTime,
            frequency: waterFrequency,
            percentage: parseInt(waterPercentage)
        };
        
        await saveToSupabase('water_schedule', scheduleData);
        updateWaterScheduleList(scheduleData);
        
        const form = document.getElementById('water-schedule-form');
        if (form) form.classList.remove('show');
        
        showNotification('Schedule Saved', 
            `Water change scheduled for ${formatFrequency(waterFrequency)} at ${waterTime}`, 
            'success');
    } else {
        showNotification('Error', 'Please select a time for water change', 'warning');
    }
}

// ========================================
// HISTORY & MODAL FUNCTIONS
// ========================================

function viewWaterHistory() {
    openModal('water-history-modal');
    loadWaterHistoryData();
}

function loadWaterHistoryData() {
    const historyData = [];
    const now = new Date();
    
    for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        const baseTemp = 22;
        const basePh = 7.2;
        const tempVariation = Math.sin(i / 5) * 2 + (Math.random() - 0.5) * 0.5;
        const phVariation = Math.cos(i / 7) * 0.3 + (Math.random() - 0.5) * 0.1;
        
        historyData.push({
            date: date.toISOString().split('T')[0],
            temperature: parseFloat((baseTemp + tempVariation).toFixed(1)),
            ph: parseFloat((basePh + phVariation).toFixed(1))
        });
    }
    
    if (window.chartManager && window.chartManager.historyChart) {
        window.chartManager.updateHistoryChart(historyData);
    }
}

function viewHarvestHistory() {
    openModal('harvest-history-modal');
    loadHarvestHistoryData();
}

function loadHarvestHistoryData() {
    const savedHistory = localStorage.getItem('harvestHistory');
    let historyData = [];
    
    if (savedHistory) {
        try {
            historyData = JSON.parse(savedHistory);
        } catch (error) {
            console.error('Error parsing harvest history:', error);
        }
    }
    
    if (historyData.length === 0) {
        const now = new Date();
        for (let i = 3; i >= 1; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - (i * 30));
            
            historyData.push({
                date: date.toISOString().split('T')[0],
                quantity: (2 + Math.random() * 1.5).toFixed(1),
                price: (140 + Math.random() * 20).toFixed(0),
                notes: i === 1 ? 'First harvest' : 'Partial harvest'
            });
        }
    }
    
    const tableBody = document.querySelector('#harvest-history-modal tbody');
    if (tableBody) {
        tableBody.innerHTML = '';
        
        historyData.forEach(record => {
            const row = document.createElement('tr');
            const revenue = (record.quantity * record.price).toFixed(2);
            
            row.innerHTML = `
                <td>${record.date}</td>
                <td>${record.quantity}</td>
                <td>₱${record.price}</td>
                <td>₱${revenue}</td>
                <td>${record.notes}</td>
            `;
            
            tableBody.appendChild(row);
        });
    }
}

function saveHarvestRecord() {
    const harvestDate = document.getElementById('harvest-date-record')?.value;
    const quantity = document.getElementById('harvest-quantity')?.value;
    const price = document.getElementById('harvest-price-record')?.value;
    const notes = document.getElementById('harvest-notes')?.value;
    
    if (harvestDate && quantity && price) {
        const savedHistory = localStorage.getItem('harvestHistory');
        let historyData = savedHistory ? JSON.parse(savedHistory) : [];
        
        const newRecord = {
            date: harvestDate,
            quantity: parseFloat(quantity),
            price: parseFloat(price),
            notes: notes || ''
        };
        
        historyData.push(newRecord);
        localStorage.setItem('harvestHistory', JSON.stringify(historyData));
        
        const revenue = (quantity * price).toFixed(2);
        showNotification('Harvest Recorded', 
            `Harvest recorded: ${quantity}kg at ₱${price}/kg, Revenue: ₱${revenue}`, 
            'success');
        
        closeModal('record-harvest-modal');
        viewHarvestHistory();
    } else {
        showNotification('Error', 'Please fill all required fields', 'warning');
    }
}

function saveHarvestPlan() {
    const targetSize = document.getElementById('target-size')?.value;
    const harvestDate = document.getElementById('harvest-date')?.value;
    const harvestMethod = document.getElementById('harvest-method')?.value;
    const marketPrice = document.getElementById('market-price')?.value;
    
    if (targetSize && harvestDate) {
        localStorage.setItem('harvestPlan', JSON.stringify({
            targetSize: parseFloat(targetSize),
            harvestDate: harvestDate,
            harvestMethod: harvestMethod,
            marketPrice: parseFloat(marketPrice)
        }));
        
        showNotification('Plan Saved', 
            `Harvest plan saved: ${harvestMethod} harvest targeting ${targetSize}g by ${harvestDate}`, 
            'success');
        closeModal('harvest-planning-modal');
    } else {
        showNotification('Error', 'Please fill all required fields', 'warning');
    }
}

function saveFeedAlert() {
    const threshold = document.getElementById('alert-threshold')?.value;
    const alertType = document.getElementById('alert-type')?.value;
    
    if (threshold) {
        localStorage.setItem('feedAlert', JSON.stringify({
            threshold: parseInt(threshold),
            type: alertType
        }));
        
        showNotification('Alert Set', 
            `Feed alert set at ${threshold}% with ${alertType} notifications`, 
            'success');
        closeModal('feed-alert-modal');
    } else {
        showNotification('Error', 'Please select an alert threshold', 'warning');
    }
}

function saveWaterTestSchedule() {
    const frequency = document.getElementById('test-frequency')?.value;
    const time = document.getElementById('test-time')?.value;
    const notifications = document.getElementById('test-notifications')?.value;
    
    if (frequency && time) {
        localStorage.setItem('waterTestSchedule', JSON.stringify({
            frequency: frequency,
            time: time,
            notifications: notifications
        }));
        
        showNotification('Schedule Saved', 
            `Water testing scheduled ${frequency} at ${time}`, 
            'success');
        closeModal('water-testing-schedule-modal');
    } else {
        showNotification('Error', 'Please fill all required fields', 'warning');
    }
}

async function saveSettings() {
    const farmName = document.getElementById('farm-name')?.value;
    const notificationEmail = document.getElementById('notification-email')?.value;
    const notificationPhone = document.getElementById('notification-phone')?.value;
    const emailAlertsEnabled = document.getElementById('email-alerts-enabled')?.checked;
    const lowFeedThreshold = document.getElementById('low-feed-threshold')?.value;
    const measurementUnit = document.getElementById('measurement-unit')?.value;
    const alertFrequency = document.getElementById('alert-frequency')?.value;
    const waterTestingFrequency = document.getElementById('water-testing-frequency')?.value;
    
    if (!farmName || farmName.trim() === '') {
        showNotification('Error', 'Farm name is required', 'warning');
        return;
    }
    
    if (!notificationEmail || notificationEmail.trim() === '') {
        showNotification('Error', 'Email is required for alerts', 'warning');
        return;
    }
    
    farmSettings = {
        name: farmName.trim(),
        email: notificationEmail.trim(),
        phone: notificationPhone?.trim() || '',
        email_alerts_enabled: emailAlertsEnabled !== false,
        low_feed_threshold: parseInt(lowFeedThreshold) || 20,
        unit: measurementUnit || 'metric',
        alertFrequency: alertFrequency || 'immediate',
        waterTestingFrequency: waterTestingFrequency || 'twice-weekly'
    };
    
    const result = await window.saveFarmSettings(farmSettings);
    
    if (result && result.success) {
        updateFarmNameDisplay();
        showNotification('Success', 
            `Settings saved. ${emailAlertsEnabled ? 'Alerts ON' : 'Alerts OFF'}`,
            'success'
        );
    }
}

function refillFeed() {
    feedData.current = feedData.capacity;
    updateFeedLevelUI(feedData);
    saveToSupabase('feed_data', feedData);
    showNotification('Feed Refilled', 'Feed container has been refilled to capacity', 'success');
}

// ========================================
// CHAT FUNCTIONALITY
// ========================================

function sendMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    
    const message = input.value.trim();
    
    if (message === '') return;
    
    addMessage(message, 'user');
    input.value = '';
    
    setTimeout(() => {
        const response = generateResponse(message);
        addMessage(response, 'system');
    }, 500);
}

function addMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    
    const iconDiv = document.createElement('div');
    iconDiv.classList.add('message-icon');
    iconDiv.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-fish"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.textContent = text;
    
    messageDiv.appendChild(iconDiv);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
        messageDiv.style.transition = 'all 0.3s ease';
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    }, 10);
}

function generateResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('farm') || lowerMessage.includes('name')) {
        return `Your farm is named "${farmSettings.name}". You can change this in the Settings section.`;
    }
    
    if (lowerMessage.includes('settings') || lowerMessage.includes('configuration')) {
        return `Your current settings:\n• Farm: ${farmSettings.name}\n• Email: ${farmSettings.email}\n• Phone: ${farmSettings.phone}`;
    }
    
    if (lowerMessage.includes('feed') || lowerMessage.includes('food')) {
        if (lowerMessage.includes('schedule') || lowerMessage.includes('when')) {
            return "Your feeding schedule is twice daily at 8:00 AM and 6:00 PM with 7.5g of juvenile pellets.";
        } else if (lowerMessage.includes('level') || lowerMessage.includes('amount')) {
            const percentage = Math.round((feedData.current / feedData.capacity) * 100);
            return `Your current feed level is ${percentage}%. This is considered ${percentage > 50 ? 'adequate' : percentage > 20 ? 'low' : 'critical'}.`;
        }
        return "I can help you with feeding! You can check feed levels, set up a feeding schedule, or feed manually.";
    }
    
    if (lowerMessage.includes('water') || lowerMessage.includes('change')) {
        if (lowerMessage.includes('quality') || lowerMessage.includes('test')) {
            return `Current water quality: Temperature is ${hardwareData.temperature.toFixed(1)}°C and pH is ${hardwareData.ph.toFixed(1)}.`;
        }
        return "Water changes are important! I can help you schedule automatic water changes or do it manually.";
    }
    
    if (lowerMessage.includes('temperature') || lowerMessage.includes('temp')) {
        const status = hardwareData.temperature >= 20 && hardwareData.temperature <= 25 ? 'optimal' : 'warning';
        return `The current water temperature is ${hardwareData.temperature.toFixed(1)}°C, which is ${status}. The optimal range is 20-25°C.`;
    }
    
    if (lowerMessage.includes('ph')) {
        const status = hardwareData.ph >= 6.5 && hardwareData.ph <= 8.0 ? 'optimal' : 'warning';
        return `The current pH level is ${hardwareData.ph.toFixed(1)}, which is ${status}. The optimal range is 6.5-8.0.`;
    }
    
    if (lowerMessage.includes('harvest')) {
        return `Your crayfish are projected to be ready for harvest in ${hardwareData.daysToHarvest} days at an average weight of ${hardwareData.avgWeight.toFixed(1)}g.`;
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('guide')) {
        return "I can help you with:\n• Feeding schedules and nutrition\n• Water quality management\n• Harvest planning\n• System settings\nWhat would you like to know more about?";
    }
    
    return "I'm your Crayfish Assistant! I can help with feeding schedules, water changes, sensor data, harvest planning, and system settings. What would you like to know?";
}

function toggleChat() {
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    if (!chatContainer || !chatMessages) return;
    
    const isMinimized = chatContainer.classList.toggle('minimized');
    
    const toggleIcon = document.querySelector('#chat-toggle i');
    if (toggleIcon) {
        toggleIcon.className = isMinimized ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    }

    if (isMinimized) {
        chatMessages.style.display = 'none';
    } else {
        chatMessages.style.display = 'flex';
    }
}

// ========================================
// KNOWLEDGE BASE FUNCTIONS
// ========================================

function openKnowledgeCategory(category) {
    const modal = document.getElementById('knowledge-modal');
    const title = document.getElementById('knowledge-title');
    const content = document.getElementById('knowledge-content');
    
    if (modal && title && content) {
        if (category === 'water-quality') {
            title.textContent = 'Water Quality Management';
        } else if (category === 'feeding') {
            title.textContent = 'Feeding & Nutrition';
        } else if (category === 'harvesting') {
            title.textContent = 'Harvesting Techniques';
        }
        
        content.innerHTML = knowledgeContent[category] || '<p>Content not found.</p>';
        modal.style.display = 'block';
    }
}

const knowledgeContent = {
    'water-quality': `
        <h4>Water Quality Management</h4>
        <p>Maintaining optimal water quality is crucial for crayfish health and growth. Here are the key parameters to monitor:</p>
        <ul>
            <li><strong>Temperature:</strong> Maintain between 20-25°C for optimal growth</li>
            <li><strong>pH Level:</strong> Keep between 6.5-8.0, ideally around 7.2</li>
            <li><strong>Dissolved Oxygen:</strong> Should be above 5 mg/L</li>
            <li><strong>Ammonia:</strong> Keep below 0.02 mg/L</li>
            <li><strong>Nitrites:</strong> Keep below 1 mg/L</li>
        </ul>
        <p>Regular water testing and partial water changes (20-30% weekly) help maintain water quality.</p>
    `,
    'feeding': `
        <h4>Feeding & Nutrition</h4>
        <p>Proper feeding is essential for crayfish growth and health:</p>
        <ul>
            <li><strong>Frequency:</strong> Feed twice daily for juveniles, once daily for adults</li>
            <li><strong>Amount:</strong> Feed only what they can consume in 15-20 minutes</li>
            <li><strong>Food Type:</strong> Use specialized crayfish pellets with 30-40% protein content</li>
            <li><strong>Supplements:</strong> Occasionally provide vegetables like carrots and peas</li>
        </ul>
        <p>Monitor feeding behavior and adjust amounts accordingly. Remove uneaten food to prevent water quality issues.</p>
    `,
    'harvesting': `
        <h4>Harvesting Techniques</h4>
        <p>Harvesting crayfish at the right time and using proper techniques ensures quality and yield:</p>
        <ul>
            <li><strong>Harvest Size:</strong> Market size is typically 30-50g per crayfish</li>
            <li><strong>Timing:</strong> Harvest in early morning when water is cooler</li>
            <li><strong>Methods:</strong>
                <ul>
                    <li>Drain harvesting: Partially drain the pond and collect crayfish</li>
                    <li>Trap harvesting: Use baited traps for selective harvesting</li>
                    <li>Hand harvesting: For small ponds or tanks</li>
                </ul>
            </li>
            <li><strong>Post-Harvest:</strong> Keep crayfish in clean, aerated water before market</li>
        </ul>
        <p>Partial harvesting allows for continuous production and better market timing.</p>
    `
};

// ========================================
// EVENT LISTENER SETUP
// ========================================

function setupEventListeners() {
    console.log('Setting up event listeners...');

    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.dashboard-section');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            sections.forEach(section => section.classList.remove('active'));
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');
        });
    });

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            const navLinksMenu = document.querySelector('.nav-links');
            navLinksMenu?.classList.toggle('active');
            
            const icon = mobileMenuBtn.querySelector('i');
            if (icon && navLinksMenu) {
                if (navLinksMenu.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }

    const feedNowBtn = document.getElementById('feed-now');
    if (feedNowBtn) feedNowBtn.addEventListener('click', feedNow);
    
    const changeWaterNowBtn = document.getElementById('change-water-now');
    if (changeWaterNowBtn) changeWaterNowBtn.addEventListener('click', changeWaterNow);
    
    const testWaterNowBtn = document.getElementById('test-water-now');
    if (testWaterNowBtn) testWaterNowBtn.addEventListener('click', testWaterNow);
    
    const testConnectionBtn = document.getElementById('test-connection');
    if (testConnectionBtn) testConnectionBtn.addEventListener('click', testConnection);

    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const icon = refreshBtn.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            loadDashboardData().then(() => { 
                if (icon) icon.classList.remove('fa-spin'); 
            });
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                if (window.signOut) {
                    await window.signOut();
                }
                localStorage.clear();
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error logging out:', error);
                showNotification('Error', 'Failed to log out', 'error');
            }
        });
    }

    document.querySelectorAll('.modal-close, .modal-cancel').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    const setFeedingScheduleBtn = document.getElementById('set-feeding-schedule');
    const setFeedingScheduleBtn2 = document.getElementById('set-feeding-schedule-btn');
    
    if (setFeedingScheduleBtn) {
        setFeedingScheduleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleFeedingScheduleForm();
        });
    }
    if (setFeedingScheduleBtn2) {
        setFeedingScheduleBtn2.addEventListener('click', (e) => {
            e.preventDefault();
            toggleFeedingScheduleForm();
        });
    }

    const setWaterScheduleBtn = document.getElementById('set-water-schedule');
    if (setWaterScheduleBtn) {
        setWaterScheduleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleWaterScheduleForm();
        });
    }
    
    const saveFeedingScheduleBtn = document.getElementById('save-feeding-schedule');
    if (saveFeedingScheduleBtn) {
        saveFeedingScheduleBtn.addEventListener('click', saveFeedingSchedule);
    }

    const saveWaterScheduleBtn = document.getElementById('save-water-schedule');
    if (saveWaterScheduleBtn) {
        saveWaterScheduleBtn.addEventListener('click', saveWaterSchedule);
    }
    
    const cancelFeedingScheduleBtn = document.getElementById('cancel-feeding-schedule');
    if (cancelFeedingScheduleBtn) {
        cancelFeedingScheduleBtn.addEventListener('click', () => {
            const form = document.getElementById('feeding-schedule-form');
            if (form) form.classList.remove('show');
        });
    }

    const cancelWaterScheduleBtn = document.getElementById('cancel-water-schedule');
    if (cancelWaterScheduleBtn) {
        cancelWaterScheduleBtn.addEventListener('click', () => {
            const form = document.getElementById('water-schedule-form');
            if (form) form.classList.remove('show');
        });
    }

    const viewWaterHistoryBtn = document.getElementById('view-water-history');
    if (viewWaterHistoryBtn) {
        viewWaterHistoryBtn.addEventListener('click', viewWaterHistory);
    }

    const viewHarvestHistoryBtn = document.getElementById('view-harvest-history');
    if (viewHarvestHistoryBtn) {
        viewHarvestHistoryBtn.addEventListener('click', viewHarvestHistory);
    }

    const recordHarvestBtn = document.getElementById('record-harvest');
    if (recordHarvestBtn) {
        recordHarvestBtn.addEventListener('click', () => openModal('record-harvest-modal'));
    }

    const planHarvestBtn = document.getElementById('plan-harvest');
    if (planHarvestBtn) {
        planHarvestBtn.addEventListener('click', () => openModal('harvest-planning-modal'));
    }

    const setWaterTestingScheduleBtn = document.getElementById('set-water-testing-schedule');
    if (setWaterTestingScheduleBtn) {
        setWaterTestingScheduleBtn.addEventListener('click', () => openModal('water-testing-schedule-modal'));
    }

    const setFeedAlertBtn = document.getElementById('set-feed-alert');
    if (setFeedAlertBtn) {
        setFeedAlertBtn.addEventListener('click', () => openModal('feed-alert-modal'));
    }

    const refillFeedBtn = document.getElementById('refill-feed');
    if (refillFeedBtn) {
        refillFeedBtn.addEventListener('click', refillFeed);
    }

    const saveTestScheduleBtn = document.getElementById('save-test-schedule');
    if (saveTestScheduleBtn) {
        saveTestScheduleBtn.addEventListener('click', saveWaterTestSchedule);
    }

    const saveHarvestPlanBtn = document.getElementById('save-harvest-plan');
    if (saveHarvestPlanBtn) {
        saveHarvestPlanBtn.addEventListener('click', saveHarvestPlan);
    }

    const saveHarvestRecordBtn = document.getElementById('save-harvest-record');
    if (saveHarvestRecordBtn) {
        saveHarvestRecordBtn.addEventListener('click', saveHarvestRecord);
    }

    const saveFeedAlertBtn = document.getElementById('save-feed-alert');
    if (saveFeedAlertBtn) {
        saveFeedAlertBtn.addEventListener('click', saveFeedAlert);
    }

    const saveSettingsBtn = document.getElementById('save-settings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }

    const waterQualityCategory = document.getElementById('water-quality-category');
    if (waterQualityCategory) {
        waterQualityCategory.addEventListener('click', (e) => {
            e.preventDefault();
            openKnowledgeCategory('water-quality');
        });
    }
    
    const feedingCategory = document.getElementById('feeding-category');
    if (feedingCategory) {
        feedingCategory.addEventListener('click', (e) => {
            e.preventDefault();
            openKnowledgeCategory('feeding');
        });
    }
    
    const harvestingCategory = document.getElementById('harvesting-category');
    if (harvestingCategory) {
        harvestingCategory.addEventListener('click', (e) => {
            e.preventDefault();
            openKnowledgeCategory('harvesting');
        });
    }

    const sendButton = document.getElementById('send-button');
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    const chatToggle = document.getElementById('chat-toggle');
    if (chatToggle) {
        chatToggle.addEventListener('click', toggleChat);
    }
    
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    const notificationClose = document.getElementById('notification-close');
    if (notificationClose) {
        notificationClose.addEventListener('click', () => {
            const notification = document.getElementById('notification');
            if (notification) notification.classList.remove('show');
        });
    }
    
    console.log('Event listeners attached.');
}
function toggleFullscreenChart(chartId, chartTitle) {
    console.log('[Charts] Opening fullscreen for:', chartId);
    
    // Get the chart instance
    const chart = window.chartManager?.charts[chartId] || window[chartId];
    
    if (!chart) {
        console.error('[Charts] Chart not found:', chartId);
        showNotification('Error', 'Chart not found', 'error');
        return;
    }
    
    console.log('[Charts] Chart object:', chart);
    console.log('[Charts] Chart config:', chart.config);
    console.log('[Charts] Chart data:', chart.data);
    
    // Create fullscreen modal
    const modal = document.createElement('div');
    modal.className = 'chart-fullscreen-modal';
    modal.innerHTML = `
        <div class="chart-fullscreen-content">
            <div class="chart-fullscreen-header">
                <h3>${chartTitle}</h3>
                <button class="chart-fullscreen-close" aria-label="Close fullscreen">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="chart-fullscreen-body">
                <canvas id="${chartId}-fullscreen"></canvas>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Trigger animation
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    // Create fullscreen chart
    const canvas = document.getElementById(`${chartId}-fullscreen`);
    const ctx = canvas.getContext('2d');
    
    // ULTRA-SAFE: Build configuration from scratch
    let chartType = 'line'; // default
    let chartData = { datasets: [], labels: [] };
    let chartOptions = {};
    
    try {
        // Get chart type
        if (chart.config && chart.config.type) {
            chartType = chart.config.type;
        } else if (chart.type) {
            chartType = chart.type;
        }
        
        // Clone data safely
        if (chart.data) {
            chartData = JSON.parse(JSON.stringify(chart.data));
        }
        
        // Clone options safely
        if (chart.config && chart.config.options) {
            chartOptions = JSON.parse(JSON.stringify(chart.config.options));
        } else if (chart.options) {
            chartOptions = JSON.parse(JSON.stringify(chart.options));
        }
    } catch (error) {
        console.error('[Charts] Error cloning chart data:', error);
    }
    
    // Build final config
    const config = {
        type: chartType,
        data: chartData,
        options: chartOptions || {}
    };
    
    // Force responsive settings
    config.options.responsive = true;
    config.options.maintainAspectRatio = false;
    
    console.log('[Charts] Creating fullscreen chart with config:', config);
    
    const fullscreenChart = new Chart(ctx, config);
    
    // Close button functionality
    const closeBtn = modal.querySelector('.chart-fullscreen-close');
    const closeFullscreen = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            fullscreenChart.destroy();
            modal.remove();
        }, 300);
    };
    
    closeBtn.addEventListener('click', closeFullscreen);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFullscreen();
        }
    });
    
    // Close on ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeFullscreen();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    console.log('[Charts] ✓ Fullscreen chart opened');
}
// Chart Fullscreen & Download Functions
function setupChartEnhancements() {
    console.log('[Charts] Setting up chart enhancements...');
    
    // Temperature Chart - Expand Button
    const expandTempBtn = document.getElementById('expand-temp-chart');
    if (expandTempBtn) {
        expandTempBtn.addEventListener('click', () => {
            toggleFullscreenChart('tempChart', 'Temperature Trends');
        });
    }
    
    // Temperature Chart - Download Button
    const downloadTempBtn = document.getElementById('download-temp-chart');
    if (downloadTempBtn) {
        downloadTempBtn.addEventListener('click', () => {
            downloadChartData('tempChart', 'Temperature-Data');
        });
    }
    
    // pH Chart - Expand Button
    const expandPhBtn = document.getElementById('expand-ph-chart');
    if (expandPhBtn) {
        expandPhBtn.addEventListener('click', () => {
            toggleFullscreenChart('phChart', 'pH Level Trends');
        });
    }
    
    // pH Chart - Download Button
    const downloadPhBtn = document.getElementById('download-ph-chart');
    if (downloadPhBtn) {
        downloadPhBtn.addEventListener('click', () => {
            downloadChartData('phChart', 'pH-Data');
        });
    }
    
    // Historical Chart - Expand Button
    const expandHistoricalBtn = document.getElementById('expand-historical-chart');
    if (expandHistoricalBtn) {
        expandHistoricalBtn.addEventListener('click', () => {
            toggleFullscreenChart('historicalChart', 'Historical Data (Temperature & pH)');
        });
    }
    
    // Historical Chart - Download Button
    const downloadHistoricalBtn = document.getElementById('download-historical-chart');
    if (downloadHistoricalBtn) {
        downloadHistoricalBtn.addEventListener('click', () => {
            downloadChartData('historicalChart', 'Historical-Data');
        });
    }
    
    console.log('[Charts] ✓ Chart enhancements setup complete');
}

// Download Chart Data as CSV/Excel
function downloadChartData(chartId, filename) {
    console.log('[Charts] Downloading data for:', chartId);
    
    // Get the chart instance
    const chart = window.chartManager?.charts[chartId] || window[chartId];
    
    if (!chart || !chart.data || !chart.data.datasets) {
        console.error('[Charts] Chart data not found:', chartId);
        showNotification('Error', 'No data available to download', 'error');
        return;
    }
    
    try {
        // Prepare CSV data
        let csvContent = '';
        const datasets = chart.data.datasets;
        
        // Determine if it's a time-based chart
        const isTimeChart = datasets[0]?.data[0]?.x !== undefined;
        
        if (isTimeChart) {
            // Header row
            const headers = ['Timestamp', 'Date', 'Time'];
            datasets.forEach(dataset => {
                headers.push(dataset.label || 'Value');
            });
            csvContent += headers.join(',') + '\n';
            
            // Get all unique timestamps
            const allTimestamps = new Set();
            datasets.forEach(dataset => {
                dataset.data.forEach(point => {
                    if (point.x) {
                        allTimestamps.add(point.x);
                    }
                });
            });
            
            // Sort timestamps
            const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
            
            // Data rows
            sortedTimestamps.forEach(timestamp => {
                const date = new Date(timestamp);
                const dateStr = date.toLocaleDateString();
                const timeStr = date.toLocaleTimeString();
                
                const row = [timestamp, dateStr, timeStr];
                
                datasets.forEach(dataset => {
                    const point = dataset.data.find(p => p.x === timestamp);
                    row.push(point ? point.y.toFixed(2) : '');
                });
                
                csvContent += row.join(',') + '\n';
            });
        } else {
            // Simple chart (non-time based)
            const headers = ['Index'];
            datasets.forEach(dataset => {
                headers.push(dataset.label || 'Value');
            });
            csvContent += headers.join(',') + '\n';
            
            // Assume all datasets have the same length
            const dataLength = Math.max(...datasets.map(d => d.data.length));
            
            for (let i = 0; i < dataLength; i++) {
                const row = [i + 1];
                datasets.forEach(dataset => {
                    row.push(dataset.data[i] !== undefined ? dataset.data[i] : '');
                });
                csvContent += row.join(',') + '\n';
            }
        }
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('[Charts] ✓ Chart data downloaded');
        showNotification('Success', `Chart data downloaded as ${filename}_${timestamp}.csv`, 'success');
        
    } catch (error) {
        console.error('[Charts] Error downloading chart data:', error);
        showNotification('Error', 'Failed to download chart data', 'error');
    }
    const viewFeedHistoryBtn = document.getElementById('view-feed-history-btn');
    if (viewFeedHistoryBtn) {
        viewFeedHistoryBtn.addEventListener('click', async () => {
            await loadFeedHistory();
            showNotification('Feed History', 'Feed history loaded', 'info');
        });
    }
    
    // Refresh Feed History Button
    const refreshFeedHistoryBtn = document.getElementById('refresh-feed-history');
    if (refreshFeedHistoryBtn) {
        refreshFeedHistoryBtn.addEventListener('click', async () => {
            const icon = refreshFeedHistoryBtn.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            
            await loadFeedHistory();
            
            if (icon) icon.classList.remove('fa-spin');
            showNotification('Refreshed', 'Feed history refreshed', 'success');
        });
    }
    
    // Refresh Water History Button
    const refreshWaterHistoryBtn = document.getElementById('refresh-water-history');
    if (refreshWaterHistoryBtn) {
        refreshWaterHistoryBtn.addEventListener('click', async () => {
            const icon = refreshWaterHistoryBtn.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            
            await loadWaterChangeHistory();
            
            if (icon) icon.classList.remove('fa-spin');
            showNotification('Refreshed', 'Water change history refreshed', 'success');
        });
    }
    
    // Copy User ID Button
    const copyUserIdBtn = document.getElementById('copy-user-id');
    if (copyUserIdBtn) {
        copyUserIdBtn.addEventListener('click', copyUserID);
    }
    
    console.log('✓ New event listeners attached');
}

// ========================================
// UPDATE YOUR initDashboard() FUNCTION
// Add these function calls
// ========================================

async function initDashboard() {
    try {
        console.log('[Dashboard] Initializing dashboard...');
        
        await loadFarmSettings();
        
        console.log('[Dashboard] Waiting for charts...');
        await waitForChartsReady();
        console.log('[Dashboard] Charts confirmed ready');
        
        setupRealtimeSubscription();
        
        const user = await getCurrentUser();
        if (user && window.getHistoricalReadings) {
            try {
                const historicalData = await window.getHistoricalReadings(user.id, 24);
                if (historicalData && historicalData.length > 0) {
                    console.log('[Dashboard] ✓ Loaded', historicalData.length, 'historical readings');
                    
                    if (window.chartManager) {
                        window.chartManager.updateAllChartsFromHistory(historicalData);
                    }
                }
            } catch (error) {
                console.warn('[Dashboard] Could not load historical data:', error);
            }
        }
        
        await loadDashboardData();
        setupEventListeners();
        setupChartEnhancements();
        
        // NEW: Display User ID
        await displayUserID();
        
        // NEW: Load feed and water history
        await loadFeedHistory();
        await loadWaterChangeHistory();
        
        await checkDeviceStatus();
        deviceCheckInterval = setInterval(checkDeviceStatus, 30000);
        
        setTimeout(() => {
            if (!isConnected) {
                console.log('[Dashboard] No device detected - starting mock data for demo');
                startMockData();
            } else {
                console.log('[Dashboard] Device connected - using real data');
            }
        }, 5000);

        console.log('[Dashboard] ✓ Dashboard initialized successfully');
        showNotification('Dashboard Ready', 'AquaVision Pro loaded successfully', 'success');
    } catch (error) {
        console.error('[Dashboard] Failed to initialize:', error);
        showNotification('Error', 'Failed to initialize dashboard', 'error');
    }

}
// ========================================
// SUPABASE DATA HELPER FUNCTIONS
// ========================================

async function getHistoricalSensorData(days = 7) {
    try {
        if (!window.supabase) {
            console.warn('[Supabase] Supabase not available');
            return [];
        }

        const user = await getCurrentUser();
        if (!user) {
            console.warn('[Supabase] User not authenticated');
            return [];
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        console.log('[Supabase] Fetching sensor data from', startDate.toISOString(), 'to', endDate.toISOString());

        const { data, error } = await window.supabase
            .from('sensor_readings')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[Supabase] Error fetching historical data:', error);
            throw error;
        }

        console.log('[Supabase] Fetched', data?.length || 0, 'sensor readings');
        return data || [];
    } catch (error) {
        console.error('[Supabase] getHistoricalSensorData error:', error);
        return [];
    }
}

async function getLatestSensorReading() {
    try {
        if (!window.supabase) {
            console.warn('[Supabase] Supabase not available');
            return null;
        }

        const user = await getCurrentUser();
        if (!user) {
            console.warn('[Supabase] User not authenticated');
            return null;
        }

        const { data, error } = await window.supabase
            .from('sensor_readings')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[Supabase] Error fetching latest reading:', error);
            throw error;
        }

        return data || null;
    } catch (error) {
        console.error('[Supabase] getLatestSensorReading error:', error);
        return null;
    }
}

async function saveSensorReadingToSupabase(reading) {
    try {
        if (!window.supabase) {
            console.warn('[Supabase] Supabase not available');
            return { success: false, reason: 'no_supabase' };
        }

        const user = await getCurrentUser();
        if (!user) {
            console.warn('[Supabase] User not authenticated');
            return { success: false, reason: 'not_authenticated' };
        }

        const { data, error } = await window.supabase
            .from('sensor_readings')
            .insert([{
                user_id: user.id,
                temperature: reading.temperature,
                ph: reading.ph,
                population: reading.population || 15,
                health_status: reading.healthStatus || 100,
                avg_weight: reading.avgWeight || 5,
                days_to_harvest: reading.daysToHarvest || 120,
                created_at: reading.timestamp || new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error('[Supabase] Error saving sensor reading:', error);
            throw error;
        }

        console.log('[Supabase] Sensor reading saved successfully');
        return { success: true, data: data };
    } catch (error) {
        console.error('[Supabase] saveSensorReadingToSupabase error:', error);
        return { success: false, error: error.message };
    }
}

async function hasRecentDeviceData(minutes = 5) {
    try {
        if (!window.supabase) {
            return false;
        }

        const user = await getCurrentUser();
        if (!user) {
            return false;
        }

        const cutoffTime = new Date();
        cutoffTime.setMinutes(cutoffTime.getMinutes() - minutes);

        const { data, error } = await window.supabase
            .from('sensor_readings')
            .select('id')
            .eq('user_id', user.id)
            .gte('created_at', cutoffTime.toISOString())
            .limit(1);

        if (error) {
            console.error('[Supabase] Error checking recent data:', error);
            return false;
        }

        return data && data.length > 0;
    } catch (error) {
        console.error('[Supabase] hasRecentDeviceData error:', error);
        return false;
    }
}

async function getSensorStatistics(days = 7) {
    try {
        const data = await getHistoricalSensorData(days);
        
        if (!data || data.length === 0) {
            return null;
        }

        const temperatures = data.map(d => d.temperature).filter(t => t !== null);
        const phLevels = data.map(d => d.ph).filter(p => p !== null);

        const calcStats = (values) => {
            if (values.length === 0) return null;
            const sorted = [...values].sort((a, b) => a - b);
            const sum = values.reduce((a, b) => a + b, 0);
            const mean = sum / values.length;
            
            return {
                min: sorted[0],
                max: sorted[sorted.length - 1],
                mean: parseFloat(mean.toFixed(2)),
                median: sorted[Math.floor(sorted.length / 2)],
                count: values.length
            };
        };

        return {
            temperature: calcStats(temperatures),
            ph: calcStats(phLevels),
            totalReadings: data.length,
            timeRange: {
                start: data[0].created_at,
                end: data[data.length - 1].created_at
            }
        };
    } catch (error) {
        console.error('[Supabase] getSensorStatistics error:', error);
        return null;
    }
}

window.getHistoricalSensorData = getHistoricalSensorData;
window.getLatestSensorReading = getLatestSensorReading;
window.saveSensorReadingToSupabase = saveSensorReadingToSupabase;
window.hasRecentDeviceData = hasRecentDeviceData;
window.getSensorStatistics = getSensorStatistics;

console.log('[Supabase] Data helper functions loaded');

// ========================================
// MAIN ENTRY POINT & ANIMATIONS
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded. Initializing dashboard...');
    
    const oceanElements = document.querySelector('.ocean-elements');
    if (oceanElements) {
        const elementCount = 15;
        for (let i = 0; i < elementCount; i++) {
            const element = document.createElement('div');
            if (Math.random() > 0.7) {
                element.classList.add('ocean-element', 'ocean-jellyfish');
            } else {
                element.classList.add('ocean-element', 'ocean-bubble');
                const size = Math.random() * 20 + 10;
                element.style.width = `${size}px`;
                element.style.height = `${size}px`;
            }
            element.style.left = `${Math.random() * 100}%`;
            const delay = Math.random() * 20;
            const duration = Math.random() * 20 + 20;
            element.style.animationDelay = `${delay}s`;
            element.style.animationDuration = `${duration}s`;
            oceanElements.appendChild(element);
        }
    }

    const bioluminescence = document.querySelector('.bioluminescence');
    if (bioluminescence) {
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('bio-particle');
            const size = Math.random() * 10 + 5;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${Math.random() * 100}%`;
            const delay = Math.random() * 20;
            const duration = Math.random() * 20 + 20;
            particle.style.animationDelay = `${delay}s`;
            particle.style.animationDuration = `${duration}s`;
            bioluminescence.appendChild(particle);
        }
    }
    
    setTimeout(() => {
        initDashboard();
    }, 100);
});

window.addEventListener('beforeunload', () => {
    console.log('[Dashboard] Cleaning up...');
    
    if (mockDataInterval) clearInterval(mockDataInterval);
    if (deviceCheckInterval) clearInterval(deviceCheckInterval);
    if (dataUpdateInterval) clearInterval(dataUpdateInterval);
    
    if (window.sensorSubscription) {
        window.sensorSubscription.unsubscribe();
        console.log('[Device] Unsubscribed from realtime updates');
    }
});

window.toggleFullscreenChart = toggleFullscreenChart;
window.downloadChartData = downloadChartData;
window.setupChartEnhancements = setupChartEnhancements;
window.checkDeviceStatus = checkDeviceStatus;
window.sendCommand = sendCommand;
window.setupRealtimeSubscription = setupRealtimeSubscription;
window.startMockData = startMockData;
window.stopMockData = stopMockData;

window.feedNow = feedNow;
window.loadFeedHistory = loadFeedHistory;
window.displayFeedHistory = displayFeedHistory;
window.loadWaterChangeHistory = loadWaterChangeHistory;
window.displayWaterChangeHistory = displayWaterChangeHistory;
window.displayUserID = displayUserID;
window.copyUserID = copyUserID;

document.addEventListener('chartReady', function() {
    console.log('[Dashboard] Received chartReady event');
    if (mockDataInterval) {
        console.log('[Dashboard] Charts ready - mock data already running');
    }
});

console.log('[Mock] ✓ Mock data system loaded (VISUAL ONLY - NO DATABASE SAVES)');
console.log('[Dashboard] ✓ Dashboard script loaded successfully');