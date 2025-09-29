// Hardware data simulation and real-time updates
let hardwareData = {
    temperature: 24.5,
    ph: 7.2,
    population: 15,
    healthStatus: 100,
    avgWeight: 5,
    daysToHarvest: 120,
    lastUpdated: new Date()
};

// Feed monitoring data
let feedData = {
    capacity: 500, // Total capacity in grams
    current: 375,  // Current amount in grams
    lastUpdated: new Date()
};

let tempChart, phChart;
let isConnected = false; // Initially set to false, will be checked on load
let hardwareCheckInterval;
let dataUpdateInterval;

// Function to check for hardware connection
async function checkHardwareConnection() {
    // In a real implementation, this would try to connect to your hardware
    // For now, we'll simulate a check that could succeed or fail
    
    return new Promise((resolve) => {
        // Simulate a network request to check hardware
        setTimeout(() => {
            // For demonstration, we'll randomly determine if hardware is connected
            // In a real implementation, you would replace this with actual hardware detection
            const hardwareConnected = Math.random() > 0.7; // 30% chance of being connected
            
            if (hardwareConnected) {
                console.log("Hardware connection detected");
                resolve(true);
            } else {
                console.log("No hardware connection detected, running in demo mode");
                resolve(false);
            }
        }, 1000); // Simulate 1 second delay for connection check
    });
}

// Function to fetch real data from hardware
async function fetchRealHardwareData() {
    // In a real implementation, this would fetch data from your hardware sensors
    // For now, we'll simulate fetching real data with slightly different values
    
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                temperature: 23 + Math.random() * 2, // Real hardware might have different range
                ph: 7.0 + Math.random() * 0.4,       // Real hardware might have different range
                population: 15,                       // This would come from hardware
                healthStatus: 98 + Math.random() * 2, // This would come from hardware
                avgWeight: 5.2 + Math.random() * 0.8, // This would come from hardware
                daysToHarvest: 118,                   // This would be calculated based on real data
                lastUpdated: new Date()
            });
        }, 800); // Simulate network delay
    });
}

// Function to update hardware data based on connection status
async function updateHardwareData() {
    if (isConnected) {
        try {
            // Fetch real data from hardware
            const realData = await fetchRealHardwareData();
            hardwareData = realData;
            console.log("Using real hardware data");
        } catch (error) {
            console.error("Error fetching hardware data:", error);
            // Fall back to demo mode if hardware fails
            isConnected = false;
            updateConnectionStatus();
            generateDemoData();
            showNotification('Hardware Error', 'Failed to fetch hardware data. Switched to demo mode.', 'warning');
        }
    } else {
        // Use demo data
        generateDemoData();
        console.log("Using demo data");
    }
    
    updateDashboard();
}

// Function to generate demo data
function generateDemoData() {
    // Simulate small fluctuations in sensor readings
    hardwareData.temperature += (Math.random() - 0.5) * 0.5;
    hardwareData.ph += (Math.random() - 0.5) * 0.1;
    
    // Keep values in realistic ranges
    hardwareData.temperature = Math.max(20, Math.min(30, hardwareData.temperature));
    hardwareData.ph = Math.max(6.5, Math.min(8.0, hardwareData.ph));
    
    // Update other values occasionally
    if (Math.random() > 0.7) {
        hardwareData.avgWeight += (Math.random() - 0.3) * 0.2;
        hardwareData.avgWeight = Math.max(4, Math.min(6, hardwareData.avgWeight));
    }
    
    if (Math.random() > 0.9) {
        hardwareData.daysToHarvest -= 1;
        hardwareData.daysToHarvest = Math.max(0, hardwareData.daysToHarvest);
    }
    
    hardwareData.lastUpdated = new Date();
}

// Function to update connection status display
function updateConnectionStatus() {
    const connectionStatus = document.getElementById('connection-status');
    const connectionText = document.getElementById('connection-text');
    
    if (isConnected) {
        connectionStatus.className = 'connection-status connected';
        connectionText.textContent = 'Connected to hardware';
        addAlert('success', 'Hardware Connected', 'Successfully connected to crayfish farm hardware. Displaying real-time data.');
    } else {
        connectionStatus.className = 'connection-status disconnected';
        connectionText.textContent = 'Demo mode - No hardware connected';
        addAlert('info', 'Demo Mode', 'Running in demo mode with simulated data. Connect actual hardware to see real sensor readings.');
    }
}

// Function to periodically check hardware connection
async function periodicallyCheckHardware() {
    const wasConnected = isConnected;
    const nowConnected = await checkHardwareConnection();
    
    if (wasConnected !== nowConnected) {
        isConnected = nowConnected;
        updateConnectionStatus();
        
        if (isConnected) {
            showNotification('Hardware Connected', 'Successfully connected to crayfish farm hardware.', 'success');
        } else {
            showNotification('Hardware Disconnected', 'Lost connection to hardware. Switched to demo mode.', 'warning');
        }
    }
}

// Modal functionality
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        
        // Set default date values for date inputs
        if (modalId === 'record-harvest-modal') {
            document.getElementById('harvest-date-record').valueAsDate = new Date();
        }
        
        if (modalId === 'harvest-planning-modal') {
            // Calculate estimated harvest date (120 days from now)
            const harvestDate = new Date();
            harvestDate.setDate(harvestDate.getDate() + 120);
            document.getElementById('harvest-date').valueAsDate = harvestDate;
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Initialize charts
function initCharts() {
    const tempCtx = document.getElementById('tempChart').getContext('2d');
    tempChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperature (°C)',
                data: [],
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    min: 15,
                    max: 30
                }
            }
        }
    });

    const phCtx = document.getElementById('phChart').getContext('2d');
    phChart = new Chart(phCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'pH Level',
                data: [],
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false,
                    min: 6,
                    max: 9
                }
            }
        }
    });
}

// Update dashboard with current data
function updateDashboard() {
    // Update stat cards
    document.getElementById('temp-value').textContent = `${hardwareData.temperature.toFixed(1)}°C`;
    document.getElementById('ph-value').textContent = hardwareData.ph.toFixed(1);
    document.getElementById('population-value').textContent = hardwareData.population;
    document.getElementById('health-value').textContent = `${hardwareData.healthStatus.toFixed(0)}%`;
    document.getElementById('weight-value').textContent = `${hardwareData.avgWeight.toFixed(1)}g`;
    document.getElementById('harvest-value').textContent = hardwareData.daysToHarvest;
    
    // Update water quality section
    document.getElementById('water-temp-value').textContent = `${hardwareData.temperature.toFixed(1)}°C`;
    document.getElementById('water-ph-value').textContent = hardwareData.ph.toFixed(1);
    
    // Update status indicators based on values
    updateStatusIndicators();
    
    // Update charts
    updateCharts();
    
    // Update last updated time
    const now = new Date();
    document.getElementById('last-updated').textContent = `Last updated: ${now.toLocaleTimeString()}`;
    
    // Update feed level
    updateFeedLevel();
}

// Update status indicators based on sensor values
function updateStatusIndicators() {
    // Temperature status
    const tempStatus = document.getElementById('water-temp-status');
    if (hardwareData.temperature >= 20 && hardwareData.temperature <= 25) {
        tempStatus.textContent = 'Optimal';
        tempStatus.className = 'parameter-status optimal';
    } else if (hardwareData.temperature > 25 && hardwareData.temperature <= 28) {
        tempStatus.textContent = 'Warning';
        tempStatus.className = 'parameter-status warning';
    } else {
        tempStatus.textContent = 'Critical';
        tempStatus.className = 'parameter-status critical';
    }
    
    // pH status
    const phStatus = document.getElementById('water-ph-status');
    if (hardwareData.ph >= 6.5 && hardwareData.ph <= 8.0) {
        phStatus.textContent = 'Optimal';
        phStatus.className = 'parameter-status optimal';
    } else if (hardwareData.ph > 6.0 && hardwareData.ph < 6.5 || hardwareData.ph > 8.0 && hardwareData.ph <= 8.5) {
        phStatus.textContent = 'Warning';
        phStatus.className = 'parameter-status warning';
    } else {
        phStatus.textContent = 'Critical';
        phStatus.className = 'parameter-status critical';
    }
    
    // Update feed level status
    const feedStatus = document.getElementById('feed-status');
    if (feedStatus) {
        const percentage = Math.round((feedData.current / feedData.capacity) * 100);
        let statusText = '';
        let statusClass = '';
        
        if (percentage > 50) {
            statusText = 'Adequate';
            statusClass = 'adequate';
        } else if (percentage > 20) {
            statusText = 'Low';
            statusClass = 'low';
        } else {
            statusText = 'Critical';
            statusClass = 'critical';
        }
        
        feedStatus.textContent = statusText;
        feedStatus.className = `feed-status ${statusClass}`;
    }
}

// Update charts with new data
function updateCharts() {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();
    
    // Add new data to temperature chart
    tempChart.data.labels.push(timeLabel);
    tempChart.data.datasets[0].data.push(hardwareData.temperature);
    
    // Keep only the last 10 data points
    if (tempChart.data.labels.length > 10) {
        tempChart.data.labels.shift();
        tempChart.data.datasets[0].data.shift();
    }
    
    tempChart.update();
    
    // Add new data to pH chart
    phChart.data.labels.push(timeLabel);
    phChart.data.datasets[0].data.push(hardwareData.ph);
    
    // Keep only the last 10 data points
    if (phChart.data.labels.length > 10) {
        phChart.data.labels.shift();
        phChart.data.datasets[0].data.shift();
    }
    
    phChart.update();
}

// Add alert to dashboard
function addAlert(type, title, message) {
    const alertsList = document.getElementById('alerts-list');
    const alertItem = document.createElement('div');
    alertItem.className = `alert-item ${type}`;
    
    const now = new Date();
    
    alertItem.innerHTML = `
        <div class="alert-icon">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        </div>
        <div class="alert-content">
            <div class="alert-title">${title}</div>
            <div class="alert-message">${message}</div>
        </div>
        <div class="alert-time">Just now</div>
    `;
    
    // Add to beginning of alerts list
    alertsList.insertBefore(alertItem, alertsList.firstChild);
    
    // Keep only the latest 5 alerts
    while (alertsList.children.length > 5) {
        alertsList.removeChild(alertsList.lastChild);
    }
}

// Simulate hardware command (for demo purposes)
function sendHardwareCommand(command, params = {}) {
    if (!isConnected) {
        // In demo mode, we'll simulate successful commands
        console.log('Demo mode: Simulating command:', command, params);
        return true;
    }
    
    // In a real implementation, this would send the command to your hardware
    console.log('Sending hardware command:', command, params);
    return true;
}

// Water Quality functions
function testWaterNow() {
    if (sendHardwareCommand('testWater')) {
        showNotification('Water Test', 'Water testing initiated. Results will be available shortly.', 'info');
        
        // Simulate getting new data after a delay
        setTimeout(() => {
            updateHardwareData();
            showNotification('Water Test Results', 'Water test completed. Dashboard updated with latest readings.', 'success');
        }, 2000);
    }
}

function setWaterTestingSchedule() {
    openModal('water-testing-schedule-modal');
}

function viewWaterHistory() {
    openModal('water-history-modal');
}

// Water Management functions
function changeWaterNow() {
    if (sendHardwareCommand('changeWater')) {
        // Simulate water change
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const dateString = now.toLocaleDateString();
        
        document.getElementById('last-water-change').textContent = `Last changed: Today at ${timeString}`;
        
        // Update status indicator
        document.getElementById('water-status-indicator').className = 'status-indicator good';
        
        // Show notification
        showNotification('Water Change', 'Water change initiated successfully', 'success');
        
        // Save to localStorage
        const lastChange = {
            date: dateString,
            time: timeString
        };
        localStorage.setItem('lastWaterChange', JSON.stringify(lastChange));
    }
}

function toggleWaterScheduleForm() {
    const form = document.getElementById('water-schedule-form');
    form.classList.toggle('show');
    
    // Load saved schedule if exists
    const waterSchedule = localStorage.getItem('waterSchedule');
    if (waterSchedule && form.classList.contains('show')) {
        const schedule = JSON.parse(waterSchedule);
        document.getElementById('water-change-time').value = schedule.time || '';
        document.getElementById('water-frequency').value = schedule.frequency || 'weekly';
        document.getElementById('water-change-percentage').value = schedule.percentage || '50';
    }
}

function saveWaterSchedule() {
    const waterTime = document.getElementById('water-change-time').value;
    const waterFrequency = document.getElementById('water-frequency').value;
    const waterPercentage = document.getElementById('water-change-percentage').value;
    
    if (waterTime) {
        // Save to localStorage
        localStorage.setItem('waterSchedule', JSON.stringify({
            time: waterTime,
            frequency: waterFrequency,
            percentage: waterPercentage
        }));
        
        // Update schedule list
        updateWaterScheduleList(waterFrequency, waterTime, waterPercentage);
        
        // Hide form
        document.getElementById('water-schedule-form').classList.remove('show');
        
        // Show notification
        const frequencyText = waterFrequency.charAt(0).toUpperCase() + waterFrequency.slice(1);
        showNotification('Schedule Saved', `Water change scheduled for ${frequencyText} at ${waterTime} - ${waterPercentage}% water change`, 'success');
    } else {
        showNotification('Error', 'Please select a time for water change', 'warning');
    }
}

function cancelWaterSchedule() {
    document.getElementById('water-schedule-form').classList.remove('show');
}

function updateWaterScheduleList(frequency, time, percentage) {
    const scheduleList = document.getElementById('water-schedule-list');
    
    // Clear existing schedules
    scheduleList.innerHTML = '';
    
    // Add new schedule
    const scheduleItem = document.createElement('div');
    scheduleItem.className = 'schedule-item';
    
    const frequencyText = frequency.charAt(0).toUpperCase() + frequency.slice(1);
    let dayText = '';
    
    if (frequency === 'daily') {
        dayText = 'Every day';
    } else if (frequency === 'weekly') {
        dayText = 'Every week';
    } else if (frequency === 'biweekly') {
        dayText = 'Every two weeks';
    } else if (frequency === 'monthly') {
        dayText = 'Every month';
    }
    
    scheduleItem.innerHTML = `
        <div class="schedule-info">
            <div class="schedule-time">${frequencyText}</div>
            <div class="schedule-details">${dayText} at ${time} - ${percentage}% water change</div>
        </div>
        <div class="schedule-status active">Active</div>
    `;
    
    scheduleList.appendChild(scheduleItem);
}

// Feed monitoring functions
function updateFeedLevel() {
    const percentage = Math.round((feedData.current / feedData.capacity) * 100);
    
    // Update dashboard stat card if it exists
    const feedLevelValue = document.getElementById('feed-level-value');
    if (feedLevelValue) {
        feedLevelValue.textContent = `${percentage}%`;
    }
    
    // Update feeding section
    const feedingFeedLevelValue = document.getElementById('feeding-feed-level-value');
    const feedingFeedLevelProgress = document.getElementById('feeding-feed-level-progress');
    const feedLevelStatus = document.getElementById('feed-level-status');
    
    if (feedingFeedLevelValue) {
        feedingFeedLevelValue.textContent = `${percentage}%`;
    }
    
    if (feedingFeedLevelProgress) {
        feedingFeedLevelProgress.style.width = `${percentage}%`;
    }
    
    if (feedLevelStatus) {
        let statusText = '';
        let statusClass = '';
        
        if (percentage > 50) {
            statusText = 'Adequate';
            statusClass = 'adequate';
        } else if (percentage > 20) {
            statusText = 'Low';
            statusClass = 'low';
        } else {
            statusText = 'Critical';
            statusClass = 'critical';
        }
        
        feedLevelStatus.textContent = statusText;
        feedLevelStatus.className = `feed-level-status ${statusClass}`;
    }
    
    // Update feed stats
    const feedCapacity = document.getElementById('feed-capacity');
    const feedCurrent = document.getElementById('feed-current');
    const feedDaysLeft = document.getElementById('feed-days-left');
    
    if (feedCapacity) feedCapacity.textContent = `${feedData.capacity}g`;
    if (feedCurrent) feedCurrent.textContent = `${feedData.current}g`;
    
    // Calculate estimated days left (assuming 7.5g per feeding, twice daily)
    if (feedDaysLeft) {
        const dailyConsumption = 15; // 7.5g * 2 feedings
        const daysLeft = Math.floor(feedData.current / dailyConsumption);
        feedDaysLeft.textContent = `${daysLeft} days`;
    }
    
    // Check for alerts
    checkFeedAlerts(percentage);
}

// Function to simulate feed consumption
function consumeFeed() {
    // Simulate consumption of 7.5g per feeding
    feedData.current -= 7.5;
    
    // Ensure it doesn't go below 0
    if (feedData.current < 0) {
        feedData.current = 0;
    }
    
    feedData.lastUpdated = new Date();
    updateFeedLevel();
}

// Function to refill feed
function refillFeed() {
    feedData.current = feedData.capacity;
    feedData.lastUpdated = new Date();
    updateFeedLevel();
    showNotification('Feed Refilled', 'Feed container has been refilled to 100%', 'success');
}

// Function to set feed alert
function setFeedAlert() {
    openModal('feed-alert-modal');
}

// Function to check for feed alerts
function checkFeedAlerts(percentage) {
    // Only add alert if percentage just crossed a threshold
    if (percentage <= 20 && percentage > 15) {
        addAlert('warning', 'Low Feed Level', 'Feed level is low. Consider refilling soon.');
    } else if (percentage <= 15 && percentage > 5) {
        addAlert('warning', 'Critical Feed Level', 'Feed level is critical. Refill immediately.');
    } else if (percentage <= 5) {
        addAlert('critical', 'Empty Feed Container', 'Feed container is almost empty. Crayfish cannot be fed until refilled.');
    }
}

// Feeding functions
function feedNow() {
    if (sendHardwareCommand('feed')) {
        // Simulate feeding
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const dateString = now.toLocaleDateString();
        
        document.getElementById('last-feeding').textContent = `Last fed: Today at ${timeString}`;
        
        // Update status indicator
        document.getElementById('feeding-status-indicator').className = 'status-indicator good';
        
        // Consume feed
        consumeFeed();
        
        // Show notification
        showNotification('Feeding', 'Crayfish fed successfully', 'success');
        
        // Save to localStorage
        const lastFeeding = {
            date: dateString,
            time: timeString
        };
        localStorage.setItem('lastFeeding', JSON.stringify(lastFeeding));
    }
}

function toggleFeedingScheduleForm() {
    const form = document.getElementById('feeding-schedule-form');
    form.classList.toggle('show');
    
    // Load saved schedule if exists
    const feedingSchedule = localStorage.getItem('feedingSchedule');
    if (feedingSchedule && form.classList.contains('show')) {
        const schedule = JSON.parse(feedingSchedule);
        document.getElementById('feeding-time').value = schedule.time || '';
        document.getElementById('feeding-frequency').value = schedule.frequency || 'twice-daily';
        document.getElementById('food-amount').value = schedule.amount || '7.5';
        document.getElementById('food-type').value = schedule.type || 'juvenile-pellets';
    }
}

function saveFeedingSchedule() {
    const feedingTime = document.getElementById('feeding-time').value;
    const feedingFrequency = document.getElementById('feeding-frequency').value;
    const foodAmount = document.getElementById('food-amount').value;
    const foodType = document.getElementById('food-type').value;
    
    if (feedingTime && foodAmount) {
        // Save to localStorage
        localStorage.setItem('feedingSchedule', JSON.stringify({
            time: feedingTime,
            frequency: feedingFrequency,
            amount: foodAmount,
            type: foodType
        }));
        
        // Update schedule list
        updateFeedingScheduleList(feedingFrequency, feedingTime, foodAmount, foodType);
        
        // Hide form
        document.getElementById('feeding-schedule-form').classList.remove('show');
        
        // Show notification
        const frequencyText = feedingFrequency.charAt(0).toUpperCase() + feedingFrequency.slice(1).replace('-', ' ');
        const foodTypeText = foodType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        showNotification('Schedule Saved', `Feeding scheduled for ${frequencyText} at ${feedingTime} - ${foodAmount}g of ${foodTypeText}`, 'success');
    } else {
        showNotification('Error', 'Please fill all required fields', 'warning');
    }
}

function cancelFeedingSchedule() {
    document.getElementById('feeding-schedule-form').classList.remove('show');
}

function updateFeedingScheduleList(frequency, time, amount, type) {
    const scheduleList = document.getElementById('feeding-schedule-list');
    
    // Clear existing schedules
    scheduleList.innerHTML = '';
    
    // Add new schedule
    const scheduleItem = document.createElement('div');
    scheduleItem.className = 'schedule-item';
    
    const frequencyText = frequency.charAt(0).toUpperCase() + frequency.slice(1).replace('-', ' ');
    const foodTypeText = type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    let timeText = '';
    if (frequency === 'twice-daily') {
        timeText = `8:00 AM and 6:00 PM`;
    } else {
        timeText = time;
    }
    
    scheduleItem.innerHTML = `
        <div class="schedule-info">
            <div class="schedule-time">${frequencyText}</div>
            <div class="schedule-details">${timeText} - ${amount}g of ${foodTypeText}</div>
        </div>
        <div class="schedule-status active">Active</div>
    `;
    
    scheduleList.appendChild(scheduleItem);
}

// Harvest Management functions
function planHarvest() {
    openModal('harvest-planning-modal');
}

function viewHarvestHistory() {
    openModal('harvest-history-modal');
}

function recordHarvest() {
    openModal('record-harvest-modal');
}

// Knowledge Base functions
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

// Settings functions
function saveSettings() {
    const farmName = document.getElementById('farm-name').value;
    const notificationEmail = document.getElementById('notification-email').value;
    const notificationPhone = document.getElementById('notification-phone').value;
    const measurementUnit = document.getElementById('measurement-unit').value;
    const alertFrequency = document.getElementById('alert-frequency').value;
    const waterTestingFrequency = document.getElementById('water-testing-frequency').value;
    
    // Save to localStorage (in a real app, this would be sent to a server)
    localStorage.setItem('farmSettings', JSON.stringify({
        name: farmName,
        email: notificationEmail,
        phone: notificationPhone,
        unit: measurementUnit,
        alertFrequency: alertFrequency,
        waterTestingFrequency: waterTestingFrequency
    }));
    
    // Show notification
    showNotification('Settings Saved', 'Farm settings have been updated successfully', 'success');
}

// Chart action functions
function expandChart(chartType) {
    showNotification('Chart Expanded', `${chartType} chart expanded to fullscreen`, 'info');
}

function downloadChart(chartType) {
    showNotification('Download Started', `${chartType} chart download started`, 'info');
}

// Notification functionality
function showNotification(title, message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationTitle = document.getElementById('notification-title');
    const notificationMessage = document.getElementById('notification-message');
    const notificationIcon = document.getElementById('notification-icon');
    
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    
    // Set icon based on type
    if (type === 'success') {
        notificationIcon.className = 'notification-icon success';
        notificationIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
    } else if (type === 'warning') {
        notificationIcon.className = 'notification-icon warning';
        notificationIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    } else if (type === 'error') {
        notificationIcon.className = 'notification-icon error';
        notificationIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
    } else if (type === 'info') {
        notificationIcon.className = 'notification-icon info';
        notificationIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
    }
    
    // Show notification
    notification.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Load saved settings on page load
function loadSettings() {
    const farmSettings = localStorage.getItem('farmSettings');
    if (farmSettings) {
        const settings = JSON.parse(farmSettings);
        document.getElementById('farm-name').value = settings.name || 'My Crayfish Farm';
        document.getElementById('notification-email').value = settings.email || 'farmer@example.com';
        document.getElementById('notification-phone').value = settings.phone || '+63 912 345 6789';
        document.getElementById('measurement-unit').value = settings.unit || 'metric';
        document.getElementById('alert-frequency').value = settings.alertFrequency || 'immediate';
        document.getElementById('water-testing-frequency').value = settings.waterTestingFrequency || 'twice-weekly';
    }
}

// Load water management data
function loadLastWaterChange() {
    const lastChange = localStorage.getItem('lastWaterChange');
    if (lastChange) {
        const changeData = JSON.parse(lastChange);
        const changeDate = new Date(changeData.date);
        const today = new Date();
        const diffTime = Math.abs(today - changeDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let timeAgoText = '';
        if (diffDays === 0) {
            timeAgoText = `Today at ${changeData.time}`;
        } else if (diffDays === 1) {
            timeAgoText = `Yesterday at ${changeData.time}`;
        } else {
            timeAgoText = `${diffDays} days ago at ${changeData.time}`;
        }
        
        document.getElementById('last-water-change').textContent = `Last changed: ${timeAgoText}`;
    }
    
    // Load water schedule if exists
    const waterSchedule = localStorage.getItem('waterSchedule');
    if (waterSchedule) {
        const schedule = JSON.parse(waterSchedule);
        updateWaterScheduleList(schedule.frequency, schedule.time, schedule.percentage);
    }
}

// Load feeding data
function loadLastFeeding() {
    const lastFeeding = localStorage.getItem('lastFeeding');
    if (lastFeeding) {
        const feedingData = JSON.parse(lastFeeding);
        const feedingDate = new Date(feedingData.date);
        const today = new Date();
        const diffTime = Math.abs(today - feedingDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let timeAgoText = '';
        if (diffDays === 0) {
            timeAgoText = `Today at ${feedingData.time}`;
        } else if (diffDays === 1) {
            timeAgoText = `Yesterday at ${feedingData.time}`;
        } else {
            timeAgoText = `${diffDays} days ago at ${feedingData.time}`;
        }
        
        document.getElementById('last-feeding').textContent = `Last fed: ${timeAgoText}`;
    }
    
    // Load feeding schedule if exists
    const feedingSchedule = localStorage.getItem('feedingSchedule');
    if (feedingSchedule) {
        const schedule = JSON.parse(feedingSchedule);
        updateFeedingScheduleList(schedule.frequency, schedule.time, schedule.amount, schedule.type);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    
    if (!isLoggedIn) {
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize charts
    initCharts();
    
    // Load settings and data
    loadSettings();
    loadLastWaterChange();
    loadLastFeeding();
    
    // Initialize feed level
    updateFeedLevel();
    
    // Generate ocean elements
    const oceanElements = document.querySelector('.ocean-elements');
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

    // Generate bioluminescent particles
    const bioluminescence = document.querySelector('.bioluminescence');
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

    // Navigation functionality
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.dashboard-section');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            sections.forEach(section => {
                section.classList.remove('active');
            });
            
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
            
            document.querySelector('.nav-links').classList.remove('active');
        });
    });

    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', function() {
        document.querySelector('.nav-links').classList.toggle('active');
    });

    // Notification close button
    document.getElementById('notification-close').addEventListener('click', function() {
        document.getElementById('notification').classList.remove('show');
    });

    // Refresh data button
    document.getElementById('refresh-data').addEventListener('click', function() {
        this.querySelector('i').classList.add('fa-spin');
        updateHardwareData();
        
        setTimeout(() => {
            this.querySelector('i').classList.remove('fa-spin');
        }, 1000);
    });

    // Logout function
    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('farmSettings');
        localStorage.removeItem('lastWaterChange');
        localStorage.removeItem('waterSchedule');
        localStorage.removeItem('lastFeeding');
        localStorage.removeItem('feedingSchedule');
        
        showNotification('Logout', 'You have been successfully logged out', 'info');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    });

    // Custom Crayfish Claw Cursor
    const cursor = document.getElementById('cursor');
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX - 20 + 'px';
        cursor.style.top = e.clientY - 20 + 'px';
    });
    
    document.addEventListener('mousedown', () => {
        cursor.classList.add('clicked');
    });
    
    document.addEventListener('mouseup', () => {
        cursor.classList.remove('clicked');
    });

    // Add event listeners to all modal close buttons
    const closeButtons = document.querySelectorAll('.modal-close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Add event listeners to all modal cancel buttons
    const cancelButtons = document.querySelectorAll('.modal-cancel');
    cancelButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Water testing schedule modal
    document.getElementById('save-test-schedule').addEventListener('click', function() {
        const frequency = document.getElementById('test-frequency').value;
        const time = document.getElementById('test-time').value;
        const notifications = document.getElementById('test-notifications').value;
        
        showNotification('Schedule Saved', `Water testing scheduled ${frequency} at ${time}. Notifications: ${notifications}`, 'success');
        closeModal('water-testing-schedule-modal');
    });
    
    // Water history modal
    document.getElementById('apply-history-filter').addEventListener('click', function() {
        const period = document.getElementById('history-period').value;
        const parameter = document.getElementById('history-parameter').value;
        
        // In a real implementation, this would fetch and display the actual history data
        showNotification('Filter Applied', `Showing ${parameter} data for the last ${period} days`, 'info');
        
        // Initialize history chart if it doesn't exist
        const historyChartCanvas = document.getElementById('historyChart');
        if (historyChartCanvas && !historyChartCanvas.chart) {
            const ctx = historyChartCanvas.getContext('2d');
            historyChartCanvas.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: []
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
        // Generate some sample data for the chart
        if (historyChartCanvas && historyChartCanvas.chart) {
            const labels = [];
            const tempData = [];
            const phData = [];
            
            const days = parseInt(period);
            for (let i = days; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString());
                
                // Generate sample data
                tempData.push(22 + Math.random() * 4);
                phData.push(6.8 + Math.random() * 0.8);
            }
            
            const datasets = [];
            if (parameter === 'temperature' || parameter === 'both') {
                datasets.push({
                    label: 'Temperature (°C)',
                    data: tempData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.4
                });
            }
            
            if (parameter === 'ph' || parameter === 'both') {
                datasets.push({
                    label: 'pH Level',
                    data: phData,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    tension: 0.4,
                    yAxisID: 'y1'
                });
            }
            
            historyChartCanvas.chart.data.labels = labels;
            historyChartCanvas.chart.data.datasets = datasets;
            
            // Configure axes if showing both parameters
            if (parameter === 'both') {
                historyChartCanvas.chart.options.scales = {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'pH Level'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                };
            } else {
                historyChartCanvas.chart.options.scales = {
                    y: {
                        type: 'linear',
                        display: true,
                        title: {
                            display: true,
                            text: parameter === 'temperature' ? 'Temperature (°C)' : 'pH Level'
                        }
                    }
                };
            }
            
            historyChartCanvas.chart.update();
        }
    });
    
    // Harvest planning modal
    document.getElementById('save-harvest-plan').addEventListener('click', function() {
        const targetSize = document.getElementById('target-size').value;
        const harvestDate = document.getElementById('harvest-date').value;
        const harvestMethod = document.getElementById('harvest-method').value;
        const marketPrice = document.getElementById('market-price').value;
        
        showNotification('Plan Saved', `Harvest plan saved: ${harvestMethod} harvest targeting ${targetSize}g by ${harvestDate}`, 'success');
        closeModal('harvest-planning-modal');
    });
    
    // Record harvest modal
    document.getElementById('save-harvest-record').addEventListener('click', function() {
        const harvestDate = document.getElementById('harvest-date-record').value;
        const quantity = document.getElementById('harvest-quantity').value;
        const price = document.getElementById('harvest-price-record').value;
        const notes = document.getElementById('harvest-notes').value;
        
        if (harvestDate && quantity && price) {
            const revenue = (quantity * price).toFixed(2);
            showNotification('Harvest Recorded', `Harvest recorded: ${quantity}kg at ₱${price}/kg, Revenue: ₱${revenue}`, 'success');
            closeModal('record-harvest-modal');
        } else {
            showNotification('Error', 'Please fill all required fields', 'warning');
        }
    });

    // Feed alert modal
    document.getElementById('save-feed-alert').addEventListener('click', function() {
        const threshold = document.getElementById('alert-threshold').value;
        const alertType = document.getElementById('alert-type').value;
        
        showNotification('Alert Set', `Feed alert set at ${threshold}% with ${alertType} notifications`, 'success');
        closeModal('feed-alert-modal');
    });

    // Check for hardware connection on load
    try {
        isConnected = await checkHardwareConnection();
        updateConnectionStatus();
    } catch (error) {
        console.error('Error checking hardware connection:', error);
        isConnected = false;
        updateConnectionStatus();
    }
    
    // Initialize dashboard with data
    updateHardwareData();
    
    // Set up periodic data updates
    dataUpdateInterval = setInterval(updateHardwareData, 5000); // Update every 5 seconds
    
    // Set up periodic hardware connection checks
    hardwareCheckInterval = setInterval(periodicallyCheckHardware, 30000); // Check every 30 seconds
    
    // Set up periodic feed level updates
    setInterval(updateFeedLevel, 30000); // Update every 30 seconds
    
    // Clean up intervals when page is unloaded
    window.addEventListener('beforeunload', () => {
        clearInterval(dataUpdateInterval);
        clearInterval(hardwareCheckInterval);
    });
});