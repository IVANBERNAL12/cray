// dashboard.js
console.log('dashboard.js loaded');

// Performance optimization variables
let lastDataFetch = 0;
const DATA_FETCH_INTERVAL = 30000; // 30 seconds - matching ESP8266 interval

// Wait for Supabase to be ready
document.addEventListener('supabaseReady', function() {
    console.log('Supabase is ready, initializing dashboard...');
    initDashboard();
});

// Initialize dashboard
async function initDashboard() {
    try {
        // Check if user is authenticated
        const authResult = await checkAuth();
        if (!authResult.authenticated) {
            console.log('User not authenticated, redirecting to login...');
            window.location.href = 'index.html';
            return;
        }
        
        // Load initial data
        await loadDashboardData();
        
        // Set up real-time subscription
        setupRealtimeSubscription();
        
        // Set up periodic data refresh (as backup)
        setInterval(refreshDashboardData, 30000); // Refresh every 30 seconds
        
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showNotification('Error', 'Failed to initialize dashboard: ' + error.message, 'error');
    }
}

// Set up real-time subscription
function setupRealtimeSubscription() {
    const subscription = supabase
        .channel('sensor_readings')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'sensor_readings'
            }, 
            (payload) => {
                console.log('New data received:', payload.new);
                updateDashboardWithNewData(payload.new);
            }
        )
        .subscribe();
        
    console.log('Real-time subscription established');
}

// Update dashboard with new data from Supabase
function updateDashboardWithNewData(sensorData) {
    // Update temperature
    const tempValue = document.getElementById('temp-value');
    if (tempValue) tempValue.textContent = `${sensorData.temperature}°C`;
    
    const waterTempValue = document.getElementById('water-temp-value');
    if (waterTempValue) waterTempValue.textContent = `${sensorData.temperature}°C`;
    
    // Update pH
    const phValue = document.getElementById('ph-value');
    if (phValue) phValue.textContent = sensorData.ph;
    
    const waterPhValue = document.getElementById('water-ph-value');
    if (waterPhValue) waterPhValue.textContent = sensorData.ph;
    
    // Update other values
    const populationValue = document.getElementById('population-value');
    if (populationValue) populationValue.textContent = sensorData.population;
    
    const healthValue = document.getElementById('health-value');
    if (healthValue) healthValue.textContent = `${sensorData.health_status}%`;
    
    const weightValue = document.getElementById('weight-value');
    if (weightValue) weightValue.textContent = `${sensorData.avg_weight}g`;
    
    const harvestValue = document.getElementById('harvest-value');
    if (harvestValue) harvestValue.textContent = sensorData.days_to_harvest;
    
    const daysHarvestValue = document.getElementById('days-harvest-value');
    if (daysHarvestValue) daysHarvestValue.textContent = sensorData.days_to_harvest;
    
    // Update last updated timestamp
    updateLastUpdated();
    
    // Update charts if available
    if (window.chartManager) {
        const chartData = {
            created_at: sensorData.created_at,
            temperature: sensorData.temperature,
            ph: sensorData.ph
        };
        window.chartManager.updateAllChartsFromHistory([chartData]);
    }
    
    // Update water quality status
    updateWaterQualityStatus(sensorData.temperature, sensorData.ph);
    
    // Update harvest projections
    updateHarvestProjections(sensorData);
    
    console.log('Dashboard updated with new data:', sensorData);
}

// Optimized data fetching
async function fetchRealtimeData() {
    const now = Date.now();
    if (now - lastDataFetch < DATA_FETCH_INTERVAL) {
        return; // Skip if we fetched recently
    }
    
    lastDataFetch = now;
    
    try {
        const { data, error } = await supabase
            .from('sensor_readings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);
            
        if (error) throw error;
        
        if (data && data.length > 0) {
            updateDashboardWithNewData(data[0]);
        }
    } catch (error) {
        console.error('Error fetching realtime data:', error);
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load sensor data
        await loadSensorData();
        
        // Load feed data
        await loadFeedData();
        
        // Load feeding schedule
        await loadFeedingSchedule();
        
        // Load water schedule
        await loadWaterSchedule();
        
        // Load historical data for charts
        await loadHistoricalData();
        
        // Update last updated timestamp
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error', 'Failed to load dashboard data: ' + error.message, 'error');
    }
}

// Refresh dashboard data
async function refreshDashboardData() {
    try {
        await fetchRealtimeData();
        showNotification('Success', 'Dashboard data refreshed', 'success');
    } catch (error) {
        console.error('Error refreshing dashboard data:', error);
        showNotification('Error', 'Failed to refresh dashboard data: ' + error.message, 'error');
    }
}

// Load and display sensor data
async function loadSensorData() {
    try {
        const sensorData = await getLatestSensorReading();
        
        if (sensorData) {
            updateDashboardWithNewData(sensorData);
        }
    } catch (error) {
        console.error('Error loading sensor data:', error);
        throw error;
    }
}

// Load and display feed data
async function loadFeedData() {
    try {
        const feedData = await getFeedData();
        
        if (feedData) {
            // Calculate feed percentage
            const feedPercentage = Math.round((feedData.current / feedData.capacity) * 100);
            
            // Update feed level in dashboard
            const feedLevelValue = document.getElementById('feed-level-value');
            if (feedLevelValue) feedLevelValue.textContent = `${feedPercentage}%`;
            
            const feedingFeedLevelValue = document.getElementById('feeding-feed-level-value');
            if (feedingFeedLevelValue) feedingFeedLevelValue.textContent = `${feedPercentage}%`;
            
            // Update feed progress bar
            const feedProgressBar = document.getElementById('feeding-feed-level-progress');
            if (feedProgressBar) {
                feedProgressBar.style.width = `${feedPercentage}%`;
            }
            
            // Update feed status
            const feedStatusElement = document.getElementById('feed-status');
            const feedLevelStatusElement = document.getElementById('feed-level-status');
            
            let feedStatus = 'Adequate';
            let statusClass = 'adequate';
            
            if (feedPercentage < 20) {
                feedStatus = 'Critical';
                statusClass = 'critical';
            } else if (feedPercentage < 40) {
                feedStatus = 'Low';
                statusClass = 'low';
            }
            
            if (feedStatusElement) {
                feedStatusElement.textContent = feedStatus;
                feedStatusElement.className = `feed-status ${statusClass}`;
            }
            
            if (feedLevelStatusElement) {
                feedLevelStatusElement.textContent = feedStatus;
                feedLevelStatusElement.className = `feed-level-status ${statusClass}`;
            }
            
            // Update feed stats
            const feedCapacity = document.getElementById('feed-capacity');
            if (feedCapacity) feedCapacity.textContent = `${feedData.capacity}g`;
            
            const feedCurrent = document.getElementById('feed-current');
            if (feedCurrent) feedCurrent.textContent = `${feedData.current}g`;
            
            // Calculate estimated days left (assuming 7.5g per day)
            const dailyConsumption = 7.5;
            const daysLeft = Math.round(feedData.current / dailyConsumption);
            
            const feedDaysLeft = document.getElementById('feed-days-left');
            if (feedDaysLeft) feedDaysLeft.textContent = `${daysLeft} days`;
        }
    } catch (error) {
        console.error('Error loading feed data:', error);
        throw error;
    }
}

// Load and display feeding schedule
async function loadFeedingSchedule() {
    try {
        const schedule = await getFeedingSchedule();
        
        if (schedule) {
            // Update feeding schedule form
            const feedingTime = document.getElementById('feeding-time');
            if (feedingTime) feedingTime.value = schedule.time;
            
            const feedingFrequency = document.getElementById('feeding-frequency');
            if (feedingFrequency) feedingFrequency.value = schedule.frequency;
            
            const foodAmount = document.getElementById('food-amount');
            if (foodAmount) foodAmount.value = schedule.amount;
            
            const foodType = document.getElementById('food-type');
            if (foodType) foodType.value = schedule.type;
            
            // Update feeding schedule list
            updateFeedingScheduleList(schedule);
        }
    } catch (error) {
        console.error('Error loading feeding schedule:', error);
        throw error;
    }
}

// Load and display water schedule
async function loadWaterSchedule() {
    try {
        const schedule = await getWaterSchedule();
        
        if (schedule) {
            // Update water schedule form
            const waterChangeTime = document.getElementById('water-change-time');
            if (waterChangeTime) waterChangeTime.value = schedule.time;
            
            const waterFrequency = document.getElementById('water-frequency');
            if (waterFrequency) waterFrequency.value = schedule.frequency;
            
            const waterChangePercentage = document.getElementById('water-change-percentage');
            if (waterChangePercentage) waterChangePercentage.value = schedule.percentage;
            
            // Update water schedule list
            updateWaterScheduleList(schedule);
        }
    } catch (error) {
        console.error('Error loading water schedule:', error);
        throw error;
    }
}

// Load historical data for charts
async function loadHistoricalData() {
    try {
        const historicalData = await getHistoricalSensorData(7); // Get last 7 days
        
        if (historicalData && historicalData.length > 0) {
            // Update charts using the chart manager
            if (window.chartManager) {
                window.chartManager.updateAllChartsFromHistory(historicalData);
            }
        } else {
            // Use sample data if no historical data available
            if (window.chartManager && window.generateSampleData) {
                const sampleData = window.generateSampleData(7);
                window.chartManager.updateAllChartsFromHistory(sampleData);
            }
        }
    } catch (error) {
        console.error('Error loading historical data:', error);
        // Use sample data on error
        if (window.chartManager && window.generateSampleData) {
            const sampleData = window.generateSampleData(7);
            window.chartManager.updateAllChartsFromHistory(sampleData);
        }
    }
}

// Update water quality status based on sensor values
function updateWaterQualityStatus(temperature, ph) {
    // Temperature status
    const tempStatusElement = document.getElementById('water-temp-status');
    let tempStatus = 'Optimal';
    let tempStatusClass = 'optimal';
    
    if (temperature < 20 || temperature > 25) {
        tempStatus = 'Warning';
        tempStatusClass = 'warning';
    }
    
    if (temperature < 15 || temperature > 30) {
        tempStatus = 'Critical';
        tempStatusClass = 'critical';
    }
    
    if (tempStatusElement) {
        tempStatusElement.textContent = tempStatus;
        tempStatusElement.className = `parameter-status ${tempStatusClass}`;
    }
    
    // pH status
    const phStatusElement = document.getElementById('water-ph-status');
    let phStatus = 'Optimal';
    let phStatusClass = 'optimal';
    
    if (ph < 6.5 || ph > 8.0) {
        phStatus = 'Warning';
        phStatusClass = 'warning';
    }
    
    if (ph < 6.0 || ph > 8.5) {
        phStatus = 'Critical';
        phStatusClass = 'critical';
    }
    
    if (phStatusElement) {
        phStatusElement.textContent = phStatus;
        phStatusElement.className = `parameter-status ${phStatusClass}`;
    }
    
    // Update water status indicator
    const waterStatusIndicator = document.getElementById('water-status-indicator');
    const waterStatusText = document.querySelector('.water-info h3');
    
    if (waterStatusIndicator && waterStatusText) {
        if (tempStatus === 'Critical' || phStatus === 'Critical') {
            waterStatusIndicator.className = 'status-indicator critical';
            waterStatusText.textContent = 'Water Quality: Critical';
        } else if (tempStatus === 'Warning' || phStatus === 'Warning') {
            waterStatusIndicator.className = 'status-indicator warning';
            waterStatusText.textContent = 'Water Quality: Warning';
        } else {
            waterStatusIndicator.className = 'status-indicator good';
            waterStatusText.textContent = 'Water Quality: Good';
        }
    }
}

// Update harvest projections based on sensor data
function updateHarvestProjections(sensorData) {
    // Calculate projected harvest weight based on current weight and days to harvest
    const currentWeight = sensorData.avg_weight;
    const daysToHarvest = sensorData.days_to_harvest;
    const population = sensorData.population;
    
    // Estimate growth rate (assuming linear growth for simplicity)
    const marketSize = 40; // Target market size in grams
    const projectedWeight = Math.min(currentWeight + (daysToHarvest * 0.3), marketSize);
    
    // Update harvest projections
    const weightHarvestValue = document.getElementById('weight-harvest-value');
    if (weightHarvestValue) weightHarvestValue.textContent = `${projectedWeight}g`;
    
    // Calculate projected revenue
    const marketPrice = 150; // Price per kg in PHP
    const projectedWeightKg = (projectedWeight * population) / 1000;
    const projectedRevenue = Math.round(projectedWeightKg * marketPrice);
    
    const revenueHarvestValue = document.getElementById('revenue-harvest-value');
    if (revenueHarvestValue) revenueHarvestValue.textContent = `₱${projectedRevenue}`;
    
    // Update survival rate
    const healthStatus = sensorData.health_status;
    const survivalHarvestValue = document.getElementById('survival-harvest-value');
    if (survivalHarvestValue) survivalHarvestValue.textContent = `${healthStatus}%`;
    
    // Update progress bars
    const weightProgress = Math.min((projectedWeight / marketSize) * 100, 100);
    const weightProgressBar = document.querySelector('#harvest-management .harvest-progress-bar.progress-15');
    if (weightProgressBar) {
        weightProgressBar.style.width = `${weightProgress}%`;
    }
    
    const daysProgress = Math.max(0, 100 - (daysToHarvest / 180 * 100)); // Assuming 180 days total
    const daysProgressBar = document.querySelector('#harvest-management .harvest-progress-bar.progress-20');
    if (daysProgressBar) {
        daysProgressBar.style.width = `${daysProgress}%`;
    }
}

// Update feeding schedule list
function updateFeedingScheduleList(schedule) {
    const scheduleList = document.getElementById('feeding-schedule-list');
    
    if (scheduleList) {
        scheduleList.innerHTML = `
            <div class="schedule-item">
                <div class="schedule-info">
                    <div class="schedule-time">${formatFrequency(schedule.frequency)}</div>
                    <div class="schedule-details">${formatTime(schedule.frequency, schedule.time)} - ${schedule.amount}g of ${formatFoodType(schedule.type)}</div>
                </div>
                <div class="schedule-status active">Active</div>
            </div>
        `;
    }
}

// Update water schedule list
function updateWaterScheduleList(schedule) {
    const scheduleList = document.getElementById('water-schedule-list');
    
    if (scheduleList) {
        scheduleList.innerHTML = `
            <div class="schedule-item">
                <div class="schedule-info">
                    <div class="schedule-time">${formatFrequency(schedule.frequency)}</div>
                    <div class="schedule-details">${formatWaterSchedule(schedule.frequency, schedule.time, schedule.percentage)}</div>
                </div>
                <div class="schedule-status active">Active</div>
            </div>
        `;
    }
}

// Format frequency for display
function formatFrequency(frequency) {
    switch (frequency) {
        case 'twice-daily': return 'Twice Daily';
        case 'daily': return 'Daily';
        case 'every-other-day': return 'Every Other Day';
        case 'weekly': return 'Weekly';
        case 'biweekly': return 'Bi-weekly';
        case 'monthly': return 'Monthly';
        default: return frequency;
    }
}

// Format time based on frequency
function formatTime(frequency, time) {
    if (frequency === 'twice-daily') {
        return `8:00 AM and 6:00 PM`;
    } else {
        return `at ${time}`;
    }
}

// Format food type for display
function formatFoodType(type) {
    switch (type) {
        case 'juvenile-pellets': return 'Juvenile Pellets (40%)';
        case 'growth-pellets': return 'Growth Pellets (35%)';
        case 'breeder-pellets': return 'Breeder Pellets (30%)';
        default: return type;
    }
}

// Format water schedule for display
function formatWaterSchedule(frequency, time, percentage) {
    const dayOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const day = dayOfWeek[new Date(time).getDay()] || 'Monday';
    
    return `Every ${day} at ${time} - ${percentage}% water change`;
}

// Update last updated timestamp
function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        lastUpdatedElement.textContent = `Last updated: ${timeString}`;
    }
}

// Show notification function
function showNotification(title, message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationIcon = document.getElementById('notification-icon');
    const notificationTitle = document.getElementById('notification-title');
    const notificationMessage = document.getElementById('notification-message');
    
    if (notification && notificationIcon && notificationTitle && notificationMessage) {
        // Set notification content
        notificationTitle.textContent = title;
        notificationMessage.textContent = message;
        
        // Set notification icon and color based on type
        notificationIcon.className = 'notification-icon ' + type;
        
        switch (type) {
            case 'success':
                notificationIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
                break;
            case 'warning':
                notificationIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            case 'error':
                notificationIcon.innerHTML = '<i class="fas fa-times-circle"></i>';
                break;
            default:
                notificationIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
        }
        
        // Show notification
        notification.classList.add('show');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }
}

// Command functions
async function feedNow() {
    try {
        console.log('Initiating feeding...');
        
        const feedBtn = document.getElementById('feed-now');
        if (feedBtn) {
            feedBtn.disabled = true;
            feedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Feeding...';
        }
        
        // Send command to device via Supabase
        const result = await sendDeviceCommand('feed');
        
        if (result.success) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            const lastFeeding = document.getElementById('last-feeding');
            if (lastFeeding) lastFeeding.textContent = `Last fed: Today at ${timeString}`;
            
            const feedingStatusIndicator = document.getElementById('feeding-status-indicator');
            if (feedingStatusIndicator) feedingStatusIndicator.className = 'status-indicator good';
            
            showNotification('Feeding', 'Feeding command sent to device successfully', 'success');
            
            console.log('Feeding command sent successfully');
        } else {
            throw new Error(result.message || 'Failed to send feeding command');
        }
    } catch (error) {
        console.error('Error initiating feeding:', error);
        showNotification('Error', 'Failed to initiate feeding: ' + error.message, 'error');
    } finally {
        const feedBtn = document.getElementById('feed-now');
        if (feedBtn) {
            feedBtn.disabled = false;
            feedBtn.innerHTML = '<i class="fas fa-utensils"></i> Feed Now';
        }
    }
}

async function changeWaterNow() {
    try {
        console.log('Initiating water change...');
        
        const changeWaterBtn = document.getElementById('change-water-now');
        if (changeWaterBtn) {
            changeWaterBtn.disabled = true;
            changeWaterBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing Water...';
        }
        
        // Send command to device via Supabase
        const result = await sendDeviceCommand('change_water');
        
        if (result.success) {
            // Update UI
            const now = new Date();
            const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const dateString = now.toLocaleDateString();
            
            const lastWaterChange = document.getElementById('last-water-change');
            if (lastWaterChange) lastWaterChange.textContent = `Last changed: Today at ${timeString}`;
            
            // Update status indicator
            const waterStatusIndicator = document.getElementById('water-status-indicator');
            if (waterStatusIndicator) waterStatusIndicator.className = 'status-indicator good';
            
            // Show success notification
            showNotification('Water Change', 'Water change command sent to device successfully', 'success');
            
            console.log('Water change command sent successfully');
        } else {
            throw new Error(result.message || 'Failed to send water change command');
        }
    } catch (error) {
        console.error('Error initiating water change:', error);
        showNotification('Error', 'Failed to initiate water change: ' + error.message, 'error');
    } finally {
        // Restore button state
        const changeWaterBtn = document.getElementById('change-water-now');
        if (changeWaterBtn) {
            changeWaterBtn.disabled = false;
            changeWaterBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Change Water Now';
        }
    }
}

async function testWaterNow() {
    try {
        console.log('Initiating water test...');
        
        showNotification('Water Test', 'Water testing initiated. Results will be available shortly.', 'info');
        
        // Send command to device
        const result = await sendDeviceCommand('test_water');
        
        if (result.success) {
            // Simulate getting new data after a delay
            setTimeout(async () => {
                await loadDashboardData();
                showNotification('Water Test Results', 'Water test completed. Dashboard updated with latest readings.', 'success');
            }, 3000);
        } else {
            throw new Error(result.message || 'Failed to send water test command');
        }
    } catch (error) {
        console.error('Error initiating water test:', error);
        showNotification('Error', 'Failed to initiate water test: ' + error.message, 'error');
    }
}

// Modal functionality
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

// Close modal when clicking outside of it
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}
// Add this to dashboard.js
document.addEventListener('authStateChanged', function(event) {
    const { authenticated, user } = event.detail;
    
    if (!authenticated) {
        console.log('User not authenticated, redirecting to login...');
        window.location.href = 'index.html';
    } else {
        console.log('User authenticated:', user);
        // Continue with dashboard initialization
    }
});
// Event listeners for buttons
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up event listeners');
    
    // Add event listeners to command buttons
    const feedBtn = document.getElementById('feed-now');
    if (feedBtn) {
        feedBtn.addEventListener('click', function(e) {
            e.preventDefault();
            feedNow();
        });
        console.log('Feed button event listener attached');
    } else {
        console.warn('Feed button not found');
    }
    
    const changeWaterBtn = document.getElementById('change-water-now');
    if (changeWaterBtn) {
        changeWaterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            changeWaterNow();
        });
        console.log('Change water button event listener attached');
    } else {
        console.warn('Change water button not found');
    }
    
    const testWaterBtn = document.getElementById('test-water-now');
    if (testWaterBtn) {
        testWaterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            testWaterNow();
        });
        console.log('Test water button event listener attached');
    } else {
        console.warn('Test water button not found');
    }
    
    // Refresh data button
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const icon = this.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            
            refreshDashboardData().then(() => {
                if (icon) icon.classList.remove('fa-spin');
            });
        });
        console.log('Refresh button event listener attached');
    } else {
        console.warn('Refresh button not found');
    }
    
    // Logout function
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                await supabase.auth.signOut();
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userName');
                
                showNotification('Logout', 'You have been successfully logged out', 'info');
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } catch (error) {
                console.error('Error logging out:', error);
                showNotification('Error', 'Failed to log out', 'error');
            }
        });
        console.log('Logout button event listener attached');
    } else {
        console.warn('Logout button not found');
    }
    
    // Close notification button
    const notificationClose = document.getElementById('notification-close');
    if (notificationClose) {
        notificationClose.addEventListener('click', function(e) {
            e.preventDefault();
            const notification = document.getElementById('notification');
            if (notification) notification.classList.remove('show');
        });
        console.log('Notification close button event listener attached');
    } else {
        console.warn('Notification close button not found');
    }
    
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.modal-close');
    closeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = this.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    // Modal cancel buttons
    const cancelButtons = document.querySelectorAll('.modal-cancel');
    cancelButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = this.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    // Water testing schedule modal
    const saveTestSchedule = document.getElementById('save-test-schedule');
    if (saveTestSchedule) {
        saveTestSchedule.addEventListener('click', function(e) {
            e.preventDefault();
            const frequency = document.getElementById('test-frequency').value;
            const time = document.getElementById('test-time').value;
            const notifications = document.getElementById('test-notifications').value;
            
            showNotification('Schedule Saved', `Water testing scheduled ${frequency} at ${time}. Notifications: ${notifications}`, 'success');
            closeModal('water-testing-schedule-modal');
        });
    }
    
    // Harvest planning modal
    const saveHarvestPlan = document.getElementById('save-harvest-plan');
    if (saveHarvestPlan) {
        saveHarvestPlan.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSize = document.getElementById('target-size').value;
            const harvestDate = document.getElementById('harvest-date').value;
            const harvestMethod = document.getElementById('harvest-method').value;
            const marketPrice = document.getElementById('market-price').value;
            
            showNotification('Plan Saved', `Harvest plan saved: ${harvestMethod} harvest targeting ${targetSize}g by ${harvestDate}`, 'success');
            closeModal('harvest-planning-modal');
        });
    }
    
    // Record harvest modal
    const saveHarvestRecord = document.getElementById('save-harvest-record');
    if (saveHarvestRecord) {
        saveHarvestRecord.addEventListener('click', function(e) {
            e.preventDefault();
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
    }
    
    // Feed alert modal
    const saveFeedAlert = document.getElementById('save-feed-alert');
    if (saveFeedAlert) {
        saveFeedAlert.addEventListener('click', function(e) {
            e.preventDefault();
            const threshold = document.getElementById('alert-threshold').value;
            const alertType = document.getElementById('alert-type').value;
            
            showNotification('Alert Set', `Feed alert set at ${threshold}% with ${alertType} notifications`, 'success');
            closeModal('feed-alert-modal');
        });
    }
    
    console.log('All event listeners attached successfully');
});