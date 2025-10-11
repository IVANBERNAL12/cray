// dashboard.js - FIXED VERSION
console.log('dashboard.js loaded');

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

let farmSettings = {
    name: 'My Crayfish Farm',
    email: 'farmer@example.com',
    phone: '+63 912 345 6789',
    unit: 'metric',
    alertFrequency: 'immediate',
    waterTestingFrequency: 'twice-weekly'
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

function loadFarmSettings() {
    const savedSettings = localStorage.getItem('farmSettings');
    if (savedSettings) {
        try {
            farmSettings = { ...farmSettings, ...JSON.parse(savedSettings) };
            updateFarmNameDisplay();
        } catch (error) {
            console.error('Error loading farm settings:', error);
        }
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
// AUTHENTICATION & INITIALIZATION
// ========================================

async function initDashboard() {
    try {
        console.log('Initializing dashboard...');
        
        loadFarmSettings();
        await loadDashboardData();
        setupEventListeners();
        startDataSimulation();

        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showNotification('Error', 'Failed to initialize dashboard: ' + error.message, 'error');
    }
}

// ========================================
// DATA HANDLING & UI UPDATES
// ========================================

async function loadDashboardData() {
    try {
        updateDashboardWithNewData(hardwareData);
        updateFeedLevelUI(feedData);
        
        const feedingSchedule = await getFeedingSchedule();
        updateFeedingScheduleList(feedingSchedule);

        const waterSchedule = await getWaterSchedule();
        updateWaterScheduleList(waterSchedule);
        
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error', 'Failed to load dashboard data.', 'error');
    }
}

async function getFeedingSchedule() {
    const saved = localStorage.getItem('feedingSchedule');
    return saved ? JSON.parse(saved) : { 
        frequency: 'twice-daily', 
        time: '08:00', 
        amount: 7.5, 
        type: 'juvenile-pellets' 
    };
}

async function getWaterSchedule() {
    const saved = localStorage.getItem('waterSchedule');
    return saved ? JSON.parse(saved) : { 
        frequency: 'weekly', 
        time: '09:00', 
        percentage: 50 
    };
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
    const day = dayOfWeek[1]; // Default to Monday
    
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
    
    setTimeout(() => {
        feedData.current = Math.max(0, feedData.current - 7.5);
        updateFeedLevelUI(feedData);
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const lastFeeding = document.getElementById('last-feeding');
        if (lastFeeding) lastFeeding.textContent = `Last fed: Today at ${timeString}`;
        
        const feedingStatusIndicator = document.getElementById('feeding-status-indicator');
        if (feedingStatusIndicator) feedingStatusIndicator.className = 'status-indicator good';
        
        showNotification('Feeding', 'Feeding command sent successfully.', 'success');
        
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
    
    setTimeout(() => {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const lastWaterChangeEl = document.getElementById('last-water-change');
        if(lastWaterChangeEl) lastWaterChangeEl.textContent = `Last changed: Today at ${timeString}`;
        
        const waterStatusIndicator = document.getElementById('water-status-indicator');
        if (waterStatusIndicator) waterStatusIndicator.className = 'status-indicator good';
        
        showNotification('Water Change', 'Water change command sent successfully.', 'success');
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Change Water Now';
        }
    }, 1000);
}

async function testWaterNow() {
    showNotification('Water Test', 'Testing water quality...', 'info');
    
    setTimeout(() => {
        loadDashboardData();
        showNotification('Water Test Results', 'Water test completed. Dashboard updated.', 'success');
    }, 3000);
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
            const feedingSchedule = localStorage.getItem('feedingSchedule');
            if (feedingSchedule) {
                const schedule = JSON.parse(feedingSchedule);
                const feedingTime = document.getElementById('feeding-time');
                const feedingFrequency = document.getElementById('feeding-frequency');
                const foodAmount = document.getElementById('food-amount');
                const foodType = document.getElementById('food-type');

                if (feedingTime) feedingTime.value = schedule.time || '';
                if (feedingFrequency) feedingFrequency.value = schedule.frequency || 'twice-daily';
                if (foodAmount) foodAmount.value = schedule.amount || '7.5';
                if (foodType) foodType.value = schedule.type || 'juvenile-pellets';
            }
        }
    }
}

function toggleWaterScheduleForm() {
    const form = document.getElementById('water-schedule-form');
    if (form) {
        const isShowing = form.classList.toggle('show');
        
        if (isShowing) {
            const waterSchedule = localStorage.getItem('waterSchedule');
            if (waterSchedule) {
                const schedule = JSON.parse(waterSchedule);
                const waterTime = document.getElementById('water-change-time');
                const waterFrequency = document.getElementById('water-frequency');
                const waterPercentage = document.getElementById('water-change-percentage');

                if (waterTime) waterTime.value = schedule.time || '';
                if (waterFrequency) waterFrequency.value = schedule.frequency || 'weekly';
                if (waterPercentage) waterPercentage.value = schedule.percentage || '50';
            }
        }
    }
}

function saveFeedingSchedule() {
    const feedingTime = document.getElementById('feeding-time')?.value;
    const feedingFrequency = document.getElementById('feeding-frequency')?.value;
    const foodAmount = document.getElementById('food-amount')?.value;
    const foodType = document.getElementById('food-type')?.value;
    
    if (feedingTime && foodAmount) {
        localStorage.setItem('feedingSchedule', JSON.stringify({
            time: feedingTime,
            frequency: feedingFrequency,
            amount: foodAmount,
            type: foodType
        }));
        
        updateFeedingScheduleList({ 
            frequency: feedingFrequency, 
            time: feedingTime, 
            amount: foodAmount, 
            type: foodType 
        });
        
        const form = document.getElementById('feeding-schedule-form');
        if (form) form.classList.remove('show');
        
        showNotification('Schedule Saved', 
            `Feeding scheduled for ${formatFrequency(feedingFrequency)} at ${feedingTime}`, 
            'success');
    } else {
        showNotification('Error', 'Please fill all required fields', 'warning');
    }
}

function saveWaterSchedule() {
    const waterTime = document.getElementById('water-change-time')?.value;
    const waterFrequency = document.getElementById('water-frequency')?.value;
    const waterPercentage = document.getElementById('water-change-percentage')?.value;
    
    if (waterTime) {
        localStorage.setItem('waterSchedule', JSON.stringify({
            time: waterTime,
            frequency: waterFrequency,
            percentage: waterPercentage
        }));
        
        updateWaterScheduleList({ 
            frequency: waterFrequency, 
            time: waterTime, 
            percentage: waterPercentage 
        });
        
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

function saveSettings() {
    const farmName = document.getElementById('farm-name')?.value;
    const notificationEmail = document.getElementById('notification-email')?.value;
    const notificationPhone = document.getElementById('notification-phone')?.value;
    const measurementUnit = document.getElementById('measurement-unit')?.value;
    const alertFrequency = document.getElementById('alert-frequency')?.value;
    const waterTestingFrequency = document.getElementById('water-testing-frequency')?.value;
    
    if (farmName) {
        farmSettings = {
            name: farmName,
            email: notificationEmail,
            phone: notificationPhone,
            unit: measurementUnit,
            alertFrequency: alertFrequency,
            waterTestingFrequency: waterTestingFrequency
        };
        
        localStorage.setItem('farmSettings', JSON.stringify(farmSettings));
        updateFarmNameDisplay();
        
        showNotification('Settings Saved', 'Farm settings have been updated successfully', 'success');
    } else {
        showNotification('Error', 'Farm name is required', 'warning');
    }
}

function refillFeed() {
    feedData.current = feedData.capacity;
    updateFeedLevelUI(feedData);
    showNotification('Feed Refilled', 'Feed container has been refilled to capacity', 'success');
}

// ========================================
// SIMULATION & DEMO MODE
// ========================================

function generateDemoData() {
    hardwareData.temperature += (Math.random() - 0.5) * 0.5;
    hardwareData.ph += (Math.random() - 0.5) * 0.1;
    hardwareData.temperature = Math.max(20, Math.min(30, hardwareData.temperature));
    hardwareData.ph = Math.max(6.5, Math.min(8.0, hardwareData.ph));
    if (Math.random() > 0.9) hardwareData.daysToHarvest = Math.max(0, hardwareData.daysToHarvest - 1);
    hardwareData.lastUpdated = new Date();
}

function startDataSimulation() {
    console.log('Starting data simulation...');
    updateDashboardWithNewData(hardwareData);
    dataUpdateInterval = setInterval(() => {
        generateDemoData();
        updateDashboardWithNewData(hardwareData);
    }, 5000);
}

// ========================================
// EVENT LISTENER SETUP
// ========================================

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

    // Command buttons
    const feedNowBtn = document.getElementById('feed-now');
    if (feedNowBtn) feedNowBtn.addEventListener('click', feedNow);
    
    const changeWaterNowBtn = document.getElementById('change-water-now');
    if (changeWaterNowBtn) changeWaterNowBtn.addEventListener('click', changeWaterNow);
    
    const testWaterNowBtn = document.getElementById('test-water-now');
    if (testWaterNowBtn) testWaterNowBtn.addEventListener('click', testWaterNow);

    // Refresh button
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

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
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

    // Schedule buttons
    const setFeedingScheduleBtn = document.getElementById('set-feeding-schedule');
    if (setFeedingScheduleBtn) {
        setFeedingScheduleBtn.addEventListener('click', toggleFeedingScheduleForm);
    }

    const setWaterScheduleBtn = document.getElementById('set-water-schedule');
    if (setWaterScheduleBtn) {
        setWaterScheduleBtn.addEventListener('click', toggleWaterScheduleForm);
    }
    
    // Save buttons
    const saveFeedingScheduleBtn = document.getElementById('save-feeding-schedule');
    if (saveFeedingScheduleBtn) {
        saveFeedingScheduleBtn.addEventListener('click', saveFeedingSchedule);
    }

    const saveWaterScheduleBtn = document.getElementById('save-water-schedule');
    if (saveWaterScheduleBtn) {
        saveWaterScheduleBtn.addEventListener('click', saveWaterSchedule);
    }
    
    // Cancel buttons
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

    // History and modal buttons
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

    // Modal save buttons
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

    // Notification close button
    const notificationClose = document.getElementById('notification-close');
    if (notificationClose) {
        notificationClose.addEventListener('click', () => {
            const notification = document.getElementById('notification');
            if (notification) notification.classList.remove('show');
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
            const feedingSchedule = localStorage.getItem('feedingSchedule');
            if (feedingSchedule) {
                const schedule = JSON.parse(feedingSchedule);
                return `Your current feeding schedule is ${formatFrequency(schedule.frequency)} at ${schedule.time} with ${schedule.amount}g of ${formatFoodType(schedule.type)}.`;
            }
            return "Your current feeding schedule is twice daily at 8:00 AM and 6:00 PM with 7.5g of juvenile pellets.";
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
// MAIN ENTRY POINT
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded. Initializing dashboard...');
    
    loadFarmSettings();
    
    // Set form values from saved settings
    const farmNameInput = document.getElementById('farm-name');
    const emailInput = document.getElementById('notification-email');
    const phoneInput = document.getElementById('notification-phone');
    const unitInput = document.getElementById('measurement-unit');
    const alertFreqInput = document.getElementById('alert-frequency');
    const waterTestFreqInput = document.getElementById('water-testing-frequency');
    
    if (farmNameInput) farmNameInput.value = farmSettings.name;
    if (emailInput) emailInput.value = farmSettings.email;
    if (phoneInput) phoneInput.value = farmSettings.phone;
    if (unitInput) unitInput.value = farmSettings.unit;
    if (alertFreqInput) alertFreqInput.value = farmSettings.alertFrequency;
    if (waterTestFreqInput) waterTestFreqInput.value = farmSettings.waterTestingFrequency;
    
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
    
    // Initialize dashboard
    initDashboard();
});