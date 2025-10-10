// dashboard.js
console.log('dashboard.js loaded');

// ========================================
// GLOBAL STATE & CONFIGURATION
// ========================================

// Performance optimization variables
let lastDataFetch = 0;
const DATA_FETCH_INTERVAL = 30000; // 30 seconds - matching ESP8266 interval

// Global state for hardware data
let hardwareData = {
    temperature: 24.5,
    ph: 7.2,
    population: 50,
    healthStatus: 98,
    avgWeight: 12.5,
    daysToHarvest: 45,
    lastUpdated: new Date()
};

// Global state for feed data
let feedData = {
    capacity: 500, // Total capacity in grams
    current: 375,  // Current amount in grams
    lastUpdated: new Date()
};

// Connection status to real hardware
let isConnected = false;
let dataUpdateInterval;
let hardwareCheckInterval;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Shows a notification to the user.
 * @param {string} title - The title of the notification.
 * @param {string} message - The message body.
 * @param {'success'|'warning'|'error'|'info'} type - The type of notification.
 */
function showNotification(title, message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.warn('Notification element not found.');
        return;
    }
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

/**
 * Updates the 'Last updated' timestamp on the dashboard.
 */
function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        lastUpdatedElement.textContent = `Last updated: ${timeString}`;
    }
}

/**
 * Formats a frequency string for display.
 */
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

/**
 * Formats a food type string for display.
 */
function formatFoodType(type) {
    const map = { 
        'juvenile-pellets': 'Juvenile Pellets (40%)',
        'growth-pellets': 'Growth Pellets (35%)',
        'breeder-pellets': 'Breeder Pellets (30%)'
    };
    return map[type] || type;
}

/**
 * Formats time based on frequency
 */
function formatTime(frequency, time) {
    if (frequency === 'twice-daily') {
        return `8:00 AM and 6:00 PM`;
    } else {
        return `at ${time}`;
    }
}

/**
 * Formats water schedule for display
 */
function formatWaterSchedule(frequency, time, percentage) {
    const dayOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const day = dayOfWeek[new Date(time).getDay()] || 'Monday';
    
    return `Every ${day} at ${time} - ${percentage}% water change`;
}

// ========================================
// AUTHENTICATION & INITIALIZATION
// ========================================

/**
 * Stubs for functions that should exist in other files.
 * These prevent the dashboard from crashing if auth.js or api.js are missing.
 */
if (typeof checkAuth === 'undefined') {
    window.checkAuth = async () => ({ authenticated: true, user: { email: 'demo@example.com' } });
}
if (typeof getLatestSensorReading === 'undefined') {
    window.getLatestSensorReading = async () => hardwareData;
}
if (typeof getFeedData === 'undefined') {
    window.getFeedData = async () => feedData;
}
if (typeof getFeedingSchedule === 'undefined') {
    window.getFeedingSchedule = async () => ({ frequency: 'twice-daily', time: '08:00', amount: 7.5, type: 'juvenile-pellets' });
}
if (typeof getWaterSchedule === 'undefined') {
    window.getWaterSchedule = async () => ({ frequency: 'weekly', time: '09:00', percentage: 50 });
}
if (typeof getHistoricalSensorData === 'undefined') {
    window.getHistoricalSensorData = async () => [];
}
if (typeof sendDeviceCommand === 'undefined') {
    window.sendDeviceCommand = async (command) => ({ success: true, message: `Simulated ${command} command.` });
}

/**
 * Main initialization function for the dashboard.
 */
async function initDashboard() {
    try {
        console.log('Initializing dashboard...');
        const authResult = await window.checkAuth();
        if (!authResult.authenticated) {
            console.log('User not authenticated, redirecting...');
            window.location.href = 'index.html';
            return;
        }

        // Load initial data and set up the UI
        await loadDashboardData();
        setupEventListeners();
        startDataSimulation();
        setupRealtimeSubscription(); // Will be a no-op if supabase is not ready

        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showNotification('Error', 'Failed to initialize dashboard: ' + error.message, 'error');
    }
}

/**
 * Sets up the real-time subscription for Supabase.
 */
function setupRealtimeSubscription() {
    if (typeof supabase === 'undefined' || !supabase) {
        console.warn('Supabase client not found. Real-time updates disabled.');
        return;
    }
    const subscription = supabase
        .channel('sensor_readings')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (payload) => {
            console.log('New data received:', payload.new);
            updateDashboardWithNewData(payload.new);
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Real-time subscription established.');
            } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
                console.warn('Real-time subscription lost.');
            }
        });
}

// ========================================
// DATA HANDLING & UI UPDATES
// ========================================

/**
 * Loads all initial data for the dashboard.
 */
async function loadDashboardData() {
    try {
        const sensorData = await window.getLatestSensorReading();
        updateDashboardWithNewData(sensorData);

        const feedDataResult = await window.getFeedData();
        updateFeedLevelUI(feedDataResult);

        const feedingSchedule = await window.getFeedingSchedule();
        updateFeedingScheduleList(feedingSchedule);

        const waterSchedule = await window.getWaterSchedule();
        updateWaterScheduleList(waterSchedule);
        
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error', 'Failed to load dashboard data.', 'error');
    }
}

/**
 * Updates the entire dashboard with new sensor data.
 */
function updateDashboardWithNewData(data) {
    // Update global hardwareData if this is new data
    if (data && data !== hardwareData) {
        hardwareData = { ...hardwareData, ...data };
    }

    // Update UI elements
    const elements = {
        'temp-value': `${hardwareData.temperature.toFixed(1)}°C`,
        'water-temp-value': `${hardwareData.temperature.toFixed(1)}°C`,
        'ph-value': hardwareData.ph.toFixed(1),
        'water-ph-value': hardwareData.ph.toFixed(1),
        'population-value': hardwareData.population,
        'health-value': `${hardwareData.healthStatus}%`,
        'weight-value': `${hardwareData.avgWeight.toFixed(1)}g`,
        'harvest-value': hardwareData.daysToHarvest,
        'days-harvest-value': hardwareData.daysToHarvest,
    };

    for (const id in elements) {
        const el = document.getElementById(id);
        if (el) el.textContent = elements[id];
    }

    updateWaterQualityStatus(hardwareData.temperature, hardwareData.ph);
    updateHarvestProjections(hardwareData);
    updateLastUpdated();

    if (window.chartManager) {
        window.chartManager.updateAllChartsFromHistory([hardwareData]);
    }
}

/**
 * Updates the water quality status indicators.
 */
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

/**
 * Updates the harvest projection UI.
 */
function updateHarvestProjections(data) {
    const marketSize = 40;
    const projectedWeight = Math.min(data.avg_weight + (data.days_to_harvest * 0.3), marketSize);
    const projectedWeightKg = (projectedWeight * data.population) / 1000;
    const projectedRevenue = Math.round(projectedWeightKg * 150);

    const weightEl = document.getElementById('weight-harvest-value');
    if (weightEl) weightEl.textContent = `${projectedWeight.toFixed(1)}g`;
    const revenueEl = document.getElementById('revenue-harvest-value');
    if (revenueEl) revenueEl.textContent = `₱${projectedRevenue}`;
    const survivalEl = document.getElementById('survival-harvest-value');
    if (survivalEl) survivalEl.textContent = `${data.health_status}%`;
    
    // Update progress bars
    const weightProgress = Math.min((projectedWeight / marketSize) * 100, 100);
    const weightProgressBar = document.querySelector('#harvest-management .harvest-progress-bar.progress-15');
    if (weightProgressBar) {
        weightProgressBar.style.width = `${weightProgress}%`;
    }
    
    const daysProgress = Math.max(0, 100 - (data.days_to_harvest / 180 * 100)); // Assuming 180 days total
    const daysProgressBar = document.querySelector('#harvest-management .harvest-progress-bar.progress-20');
    if (daysProgressBar) {
        daysProgressBar.style.width = `${daysProgress}%`;
    }
}

/**
 * Updates the feed level UI components.
 */
function updateFeedLevelUI(data) {
    if (!data) return;
    feedData = data; // Sync global state
    const percentage = Math.round((feedData.current / feedData.capacity) * 100);

    const updateElement = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
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
    updateElement('feed-days-left', `${Math.floor(feedData.current / 15)} days`); // 15g/day consumption
}

/**
 * Updates the feeding schedule list in the UI.
 */
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

/**
 * Updates the water schedule list in the UI.
 */
function updateWaterScheduleList(schedule) {
    const listEl = document.getElementById('water-schedule-list');
    if (!listEl || !schedule) return;
    listEl.innerHTML = `
        <div class="schedule-item">
            <div class="schedule-info">
                <div class="schedule-time">${formatFrequency(schedule.frequency)}</div>
                <div class="schedule-details">${formatWaterSchedule(schedule.frequency, schedule.time, schedule.percentage)}</div>
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
    try {
        const result = await window.sendDeviceCommand('feed');
        if (result.success) {
            feedData.current = Math.max(0, feedData.current - 7.5);
            updateFeedLevelUI(feedData);
            
            const now = new Date();
            const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const lastFeeding = document.getElementById('last-feeding');
            if (lastFeeding) lastFeeding.textContent = `Last fed: Today at ${timeString}`;
            
            const feedingStatusIndicator = document.getElementById('feeding-status-indicator');
            if (feedingStatusIndicator) feedingStatusIndicator.className = 'status-indicator good';
            
            showNotification('Feeding', 'Feeding command sent successfully.', 'success');
        }
    } catch (error) {
        showNotification('Error', 'Failed to feed.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-utensils"></i> Feed Now';
        }
    }
}

async function changeWaterNow() {
    const btn = document.getElementById('change-water-now');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing Water...';
    }
    try {
        const result = await window.sendDeviceCommand('change_water');
        if (result.success) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const lastWaterChangeEl = document.getElementById('last-water-change');
            if(lastWaterChangeEl) lastWaterChangeEl.textContent = `Last changed: Today at ${timeString}`;
            
            const waterStatusIndicator = document.getElementById('water-status-indicator');
            if (waterStatusIndicator) waterStatusIndicator.className = 'status-indicator good';
            
            showNotification('Water Change', 'Water change command sent successfully.', 'success');
        }
    } catch (error) {
        showNotification('Error', 'Failed to change water.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Change Water Now';
        }
    }
}

async function testWaterNow() {
    try {
        showNotification('Water Test', 'Testing water quality...', 'info');
        await window.sendDeviceCommand('test_water');
        setTimeout(() => {
            loadDashboardData();
            showNotification('Water Test Results', 'Water test completed. Dashboard updated.', 'success');
        }, 3000);
    } catch (error) {
        showNotification('Error', 'Failed to test water.', 'error');
    }
}

// ========================================
// MODAL FUNCTIONS
// ========================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        
        // Set default date values for date inputs
        if (modalId === 'record-harvest-modal') {
            const harvestDateRecord = document.getElementById('harvest-date-record');
            if (harvestDateRecord) harvestDateRecord.valueAsDate = new Date();
        }
        
        if (modalId === 'harvest-planning-modal') {
            // Calculate estimated harvest date (120 days from now)
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

// ========================================
// SIMULATION & DEMO MODE
// ========================================

/**
 * Generates slightly randomized demo data to simulate real sensor readings.
 */
function generateDemoData() {
    hardwareData.temperature += (Math.random() - 0.5) * 0.5;
    hardwareData.ph += (Math.random() - 0.5) * 0.1;
    hardwareData.temperature = Math.max(20, Math.min(30, hardwareData.temperature));
    hardwareData.ph = Math.max(6.5, Math.min(8.0, hardwareData.ph));
    if (Math.random() > 0.9) hardwareData.daysToHarvest = Math.max(0, hardwareData.daysToHarvest - 1);
    hardwareData.lastUpdated = new Date();
}

/**
 * Starts the data simulation loop for demo mode.
 */
function startDataSimulation() {
    console.log('Starting data simulation...');
    updateDashboardWithNewData(hardwareData); // Initial display
    dataUpdateInterval = setInterval(() => {
        generateDemoData();
        updateDashboardWithNewData(hardwareData);
    }, 5000); // Update every 5 seconds
}

// ========================================
// EVENT LISTENER SETUP
// ========================================

/**
 * Attaches all necessary event listeners to DOM elements.
 */
function setupEventListeners() {
    console.log('Setting up event listeners...');

    // Navigation
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

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            const navLinksMenu = document.querySelector('.nav-links');
            navLinksMenu?.classList.toggle('active');
            
            // Toggle icon
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
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const navLinksMenu = document.querySelector('.nav-links');
            if (navLinksMenu && !navLinksMenu.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
                navLinksMenu.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    }

    // Command buttons
    const attachCommand = (id, func) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', func);
    };
    attachCommand('feed-now', feedNow);
    attachCommand('change-water-now', changeWaterNow);
    attachCommand('test-water-now', testWaterNow);

    // Refresh button
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const icon = refreshBtn.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            loadDashboardData().then(() => { if (icon) icon.classList.remove('fa-spin'); });
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                if (window.supabase) await supabase.auth.signOut();
                localStorage.clear();
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error logging out:', error);
                showNotification('Error', 'Failed to log out', 'error');
            }
        });
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    // Close modal on outside click
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // Water testing schedule modal
    const saveTestSchedule = document.getElementById('save-test-schedule');
    if (saveTestSchedule) {
        saveTestSchedule.addEventListener('click', () => {
            const frequency = document.getElementById('test-frequency')?.value;
            const time = document.getElementById('test-time')?.value;
            const notifications = document.getElementById('test-notifications')?.value;
            
            showNotification('Schedule Saved', `Water testing scheduled ${frequency} at ${time}. Notifications: ${notifications}`, 'success');
            closeModal('water-testing-schedule-modal');
        });
    }
    
    // Harvest planning modal
    const saveHarvestPlan = document.getElementById('save-harvest-plan');
    if (saveHarvestPlan) {
        saveHarvestPlan.addEventListener('click', () => {
            const targetSize = document.getElementById('target-size')?.value;
            const harvestDate = document.getElementById('harvest-date')?.value;
            const harvestMethod = document.getElementById('harvest-method')?.value;
            const marketPrice = document.getElementById('market-price')?.value;
            
            showNotification('Plan Saved', `Harvest plan saved: ${harvestMethod} harvest targeting ${targetSize}g by ${harvestDate}`, 'success');
            closeModal('harvest-planning-modal');
        });
    }
    
    // Record harvest modal
    const saveHarvestRecord = document.getElementById('save-harvest-record');
    if (saveHarvestRecord) {
        saveHarvestRecord.addEventListener('click', () => {
            const harvestDate = document.getElementById('harvest-date-record')?.value;
            const quantity = document.getElementById('harvest-quantity')?.value;
            const price = document.getElementById('harvest-price-record')?.value;
            const notes = document.getElementById('harvest-notes')?.value;
            
            if (harvestDate && quantity && price) {
                const revenue = (quantity * price).toFixed(2);
                showNotification('Harvest Recorded', `Harvest recorded: ${quantity}kg at ₱${price}/kg, Revenue: ₱${revenue}`, 'success');
                closeModal('record-harvest-modal');
            } else {
                showNotification('Error', 'Please fill all required fields', 'warning');
            }
        });
    }

    // Feed alert modal
    const saveFeedAlert = document.getElementById('save-feed-alert');
    if (saveFeedAlert) {
        saveFeedAlert.addEventListener('click', () => {
            const threshold = document.getElementById('alert-threshold')?.value;
            const alertType = document.getElementById('alert-type')?.value;
            
            showNotification('Alert Set', `Feed alert set at ${threshold}% with ${alertType} notifications`, 'success');
            closeModal('feed-alert-modal');
        });
    }

    // Settings save button
    const saveSettingsBtn = document.getElementById('save-settings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const farmName = document.getElementById('farm-name')?.value;
            const notificationEmail = document.getElementById('notification-email')?.value;
            const notificationPhone = document.getElementById('notification-phone')?.value;
            const measurementUnit = document.getElementById('measurement-unit')?.value;
            const alertFrequency = document.getElementById('alert-frequency')?.value;
            const waterTestingFrequency = document.getElementById('water-testing-frequency')?.value;
            
            // Save to localStorage
            localStorage.setItem('farmSettings', JSON.stringify({
                name: farmName,
                email: notificationEmail,
                phone: notificationPhone,
                unit: measurementUnit,
                alertFrequency: alertFrequency,
                waterTestingFrequency: waterTestingFrequency
            }));
            
            showNotification('Settings Saved', 'Farm settings have been updated successfully', 'success');
        });
    }

    // Knowledge base categories
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

    // Chat functionality
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
    
    console.log('Event listeners attached.');
}

// ========================================
// CHAT FUNCTIONALITY
// ========================================

function sendMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    
    const message = input.value.trim();
    
    if (message === '') return;
    
    // Add user message to chat
    addMessage(message, 'user');
    
    // Clear input
    input.value = '';
    
    // Generate response
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
    
    // Create message icon
    const iconDiv = document.createElement('div');
    iconDiv.classList.add('message-icon');
    if (sender === 'user') {
        iconDiv.innerHTML = '<i class="fas fa-user"></i>';
    } else {
        iconDiv.innerHTML = '<i class="fas fa-fish"></i>';
    }
    
    // Create message content
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.textContent = text;
    
    messageDiv.appendChild(iconDiv);
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add a subtle animation to the new message
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
    
    // Feeding-related responses
    if (lowerMessage.includes('feed') || lowerMessage.includes('food')) {
        if (lowerMessage.includes('schedule') || lowerMessage.includes('when')) {
            return "Your current feeding schedule is twice daily at 8:00 AM and 6:00 PM with 7.5g of juvenile pellets. Would you like to modify this schedule?";
        } else if (lowerMessage.includes('now') || lowerMessage.includes('immediate')) {
            return "I can help you feed the crayfish now. Would you like me to initiate the feeding process?";
        } else if (lowerMessage.includes('level') || lowerMessage.includes('amount')) {
            const percentage = Math.round((feedData.current / feedData.capacity) * 100);
            return `Your current feed level is ${percentage}%. This is considered ${percentage > 50 ? 'adequate' : percentage > 20 ? 'low' : 'critical'}.`;
        } else {
            return "I can help you with feeding! You can check feed levels, set up a feeding schedule, or feed manually. What would you like to do?";
        }
    }
    
    // Water change responses
    if (lowerMessage.includes('water') || lowerMessage.includes('change')) {
        if (lowerMessage.includes('schedule') || lowerMessage.includes('when')) {
            return "Your current water change schedule is weekly on Mondays at 9:00 AM with 50% water change. Would you like to modify this schedule?";
        } else if (lowerMessage.includes('now') || lowerMessage.includes('immediate')) {
            return "I can help you change the water now. Would you like me to initiate the water change process?";
        } else if (lowerMessage.includes('quality') || lowerMessage.includes('test')) {
            return `Current water quality: Temperature is ${hardwareData.temperature.toFixed(1)}°C (${hardwareData.temperature >= 20 && hardwareData.temperature <= 25 ? 'optimal' : 'needs attention'}) and pH is ${hardwareData.ph.toFixed(1)} (${hardwareData.ph >= 6.5 && hardwareData.ph <= 8.0 ? 'optimal' : 'needs attention'}).`;
        } else {
            return "Water changes are important! I can help you schedule automatic water changes or do it manually. What would you prefer?";
        }
    }
    
    // Sensor data responses
    if (lowerMessage.includes('temperature') || lowerMessage.includes('temp')) {
        const status = hardwareData.temperature >= 20 && hardwareData.temperature <= 25 ? 'optimal' : 
                      hardwareData.temperature > 25 && hardwareData.temperature <= 28 ? 'warning' : 'critical';
        return `The current water temperature is ${hardwareData.temperature.toFixed(1)}°C, which is ${status}. The optimal range is 20-25°C.`;
    }
    
    if (lowerMessage.includes('ph')) {
        const status = hardwareData.ph >= 6.5 && hardwareData.ph <= 8.0 ? 'optimal' : 
                      (hardwareData.ph > 6.0 && hardwareData.ph < 6.5) || (hardwareData.ph > 8.0 && hardwareData.ph <= 8.5) ? 'warning' : 'critical';
        return `The current pH level is ${hardwareData.ph.toFixed(1)}, which is ${status}. The optimal range is 6.5-8.0.`;
    }
    
    if (lowerMessage.includes('sensor') || lowerMessage.includes('data')) {
        return `Current sensor readings: Temperature ${hardwareData.temperature.toFixed(1)}°C, pH ${hardwareData.ph.toFixed(1)}, Population ${hardwareData.population}, Health ${hardwareData.healthStatus.toFixed(0)}%. All systems are ${isConnected ? 'connected' : 'in demo mode'}.`;
    }
    
    // Harvest-related responses
    if (lowerMessage.includes('harvest') || lowerMessage.includes('yield')) {
        return `Your crayfish are projected to be ready for harvest in ${hardwareData.daysToHarvest} days at an average weight of ${hardwareData.avgWeight.toFixed(1)}g. Current survival rate is 100%. Would you like to plan a harvest?`;
    }
    
    // Status check
    if (lowerMessage.includes('status') || lowerMessage.includes('how')) {
        const connectionStatus = isConnected ? 'connected to hardware' : 'running in demo mode';
        const waterStatus = hardwareData.temperature >= 20 && hardwareData.temperature <= 25 && hardwareData.ph >= 6.5 && hardwareData.ph <= 8.0 ? 'good' : 'needs attention';
        return `Your system is ${connectionStatus}. Water quality is ${waterStatus}. All crayfish appear healthy. Is there anything specific you'd like to check?`;
    }
    
    // Alerts/notifications
    if (lowerMessage.includes('alert') || lowerMessage.includes('notification')) {
        return "You can set up alerts for low feed levels, water quality issues, or system status. Would you like to configure any alerts?";
    }
    
    // Settings
    if (lowerMessage.includes('setting') || lowerMessage.includes('configure')) {
        return "You can adjust farm settings, measurement units, alert frequencies, and water testing schedules in the Settings section. Would you like to go there now?";
    }
    
    // Knowledge base
    if (lowerMessage.includes('help') || lowerMessage.includes('guide') || lowerMessage.includes('learn')) {
        return "I can help you with:\n• Feeding schedules and nutrition\n• Water quality management\n• Harvest planning\n• System settings\n• Troubleshooting issues\nWhat would you like to know more about?";
    }
    
    // Default response
    return "I'm your Crayfish Assistant! I can help with feeding schedules, water changes, sensor data, harvest planning, and system settings. What would you like to know?";
}

function toggleChat() {
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return;
    
    chatContainer.classList.toggle('minimized');
    
    const toggleIcon = document.querySelector('#chat-toggle i');
    if (toggleIcon) {
        if (chatContainer.classList.contains('minimized')) {
            toggleIcon.className = 'fas fa-chevron-up';
        } else {
            toggleIcon.className = 'fas fa-chevron-down';
        }
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
        // Set title based on category
        if (category === 'water-quality') {
            title.textContent = 'Water Quality Management';
        } else if (category === 'feeding') {
            title.textContent = 'Feeding & Nutrition';
        } else if (category === 'harvesting') {
            title.textContent = 'Harvesting Techniques';
        }
        
        // Set content
        content.innerHTML = knowledgeContent[category] || '<p>Content not found.</p>';
        
        // Show modal
        modal.style.display = 'block';
    }
}

// Knowledge base content
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
// MAIN ENTRY POINT
// ========================================

// Wait for Supabase to be ready, but don't depend on it.
// If the event fires, great. If not, we'll start anyway after DOM loads.
document.addEventListener('supabaseReady', initDashboard);

// Fallback initialization: If supabaseReady event doesn't fire in 2 seconds, initialize anyway.
setTimeout(initDashboard, 2000);

// Final setup once DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded. Finalizing setup.');
    
    // Load saved settings if they exist
    const farmSettings = localStorage.getItem('farmSettings');
    if (farmSettings) {
        const settings = JSON.parse(farmSettings);
        const farmNameInput = document.getElementById('farm-name');
        const emailInput = document.getElementById('notification-email');
        const phoneInput = document.getElementById('notification-phone');
        const unitInput = document.getElementById('measurement-unit');
        const alertFreqInput = document.getElementById('alert-frequency');
        const waterTestFreqInput = document.getElementById('water-testing-frequency');
        
        if (farmNameInput) farmNameInput.value = settings.name || 'My Crayfish Farm';
        if (emailInput) emailInput.value = settings.email || 'farmer@example.com';
        if (phoneInput) phoneInput.value = settings.phone || '+63 912 345 6789';
        if (unitInput) unitInput.value = settings.unit || 'metric';
        if (alertFreqInput) alertFreqInput.value = settings.alertFrequency || 'immediate';
        if (waterTestFreqInput) waterTestFreqInput.value = settings.waterTestingFrequency || 'twice-weekly';
    }
    
    // Generate ocean elements
    const oceanElements = document.querySelector('.ocean-elements');
    if (oceanElements) {
        const elementCount = 15;
        
        for (let i = 0; i < elementCount; i++) {
            const element = document.createElement('div');
            
            if (Math.random() > 0.7) {
                element.classList.add('ocean-element', 'ocean-jellyfish');
            } else {
                element.classList.add('ocean-element', 'ocean-bubble');
            }
            
            if (element.classList.contains('ocean-bubble')) {
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

    // Generate bioluminescent particles
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
    
    // Clean up intervals when page is unloaded
    window.addEventListener('beforeunload', () => {
        if (dataUpdateInterval) clearInterval(dataUpdateInterval);
        if (hardwareCheckInterval) clearInterval(hardwareCheckInterval);
    });
    
    // Handle orientation changes
    window.addEventListener('orientationchange', function() {
        // Adjust chart sizes after orientation change
        setTimeout(() => {
            if (window.chartManager) {
                Object.keys(window.chartManager.charts).forEach(chartId => {
                    window.chartManager.charts[chartId].resize();
                });
            }
        }, 200);
    });
    
    // Improve touch interactions for mobile
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
        
        // Add touch feedback to buttons
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.95)';
            });
            
            button.addEventListener('touchend', function() {
                this.style.transform = '';
            });
        });
    }
});