// Farm Management JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize farm management tabs
    initializeFarmManagementTabs();
    
    // Initialize mini charts
    initializeMiniCharts();
    
    // Initialize harvest calendar
    initializeHarvestCalendar();
});

// Farm Management Tabs
function initializeFarmManagementTabs() {
    const tabs = document.querySelectorAll('.farm-management-tabs .tab');
    const tabPanes = document.querySelectorAll('.farm-management-tabs .tab-pane');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // Remove active class from all tabs and panes
            tabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding pane
            tab.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Initialize Mini Charts
function initializeMiniCharts() {
    // Population Sparkline
    const populationSparkline = document.getElementById('populationSparkline');
    if (populationSparkline) {
        createSparkline(populationSparkline, [1000, 1050, 1100, 1150, 1200, 1250], '#3b82f6');
    }
    
    // Growth Mini Chart
    const growthMiniChart = document.getElementById('growthMiniChart');
    if (growthMiniChart) {
        createMiniChart(growthMiniChart, [10.2, 10.5, 10.8, 11.2, 11.8, 12.5], '#10b981');
    }
}

// Create Sparkline
function createSparkline(container, data, color) {
    const canvas = document.createElement('canvas');
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 5;
    
    // Find min and max values
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;
    
    // Calculate points
    const points = data.map((value, index) => {
        const x = padding + (index / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
        return { x, y };
    });
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Create gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '00');
    
    // Fill area under line
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.lineTo(points[0].x, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
}

// Create Mini Chart
function createMiniChart(container, data, color) {
    const canvas = document.createElement('canvas');
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 5;
    
    // Find min and max values
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;
    
    // Calculate points
    const points = data.map((value, index) => {
        const x = padding + (index / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
        return { x, y };
    });
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw points
    points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    });
}

// Initialize Harvest Calendar
function initializeHarvestCalendar() {
    // This would typically initialize a more interactive calendar
    // For now, we'll just add some basic interactivity to harvest dates
    
    const harvestCells = document.querySelectorAll('.day-cell.harvest');
    harvestCells.forEach(cell => {
        cell.addEventListener('click', () => {
            // Show harvest details for this date
            showHarvestDetails(cell.textContent);
        });
        
        // Add hover effect
        cell.style.cursor = 'pointer';
        cell.addEventListener('mouseenter', () => {
            cell.style.transform = 'scale(1.1)';
            cell.style.transition = 'transform 0.2s';
        });
        
        cell.addEventListener('mouseleave', () => {
            cell.style.transform = 'scale(1)';
        });
    });
}

// Show Harvest Details (mock function)
function showHarvestDetails(day) {
    // In a real application, this would show a modal with harvest details
    console.log(`Showing harvest details for day ${day}`);
    
    // For demonstration, we'll just show an alert
    alert(`Harvest scheduled for November ${day}. Click "Schedule Harvest" to view or edit details.`);
}

// Simulate real-time data updates
function updateFarmManagementData() {
    // Update population count
    const populationElement = document.getElementById('currentPopulation');
    if (populationElement) {
        const currentPopulation = parseInt(populationElement.textContent.replace(',', ''));
        const change = Math.floor(Math.random() * 10) - 5; // Random change between -5 and +5
        const newPopulation = Math.max(0, currentPopulation + change);
        populationElement.textContent = newPopulation.toLocaleString();
    }
    
    // Update next feeding time
    const feedingElement = document.getElementById('nextFeeding');
    if (feedingElement) {
        // This would normally calculate based on current time
        // For demo purposes, we'll just cycle through some times
        const times = ['8:00 AM', '2:00 PM', '8:00 PM'];
        const currentTime = feedingElement.textContent;
        const currentIndex = times.indexOf(currentTime);
        const nextIndex = (currentIndex + 1) % times.length;
        feedingElement.textContent = times[nextIndex];
    }
    
    // Update growth rate
    const growthElement = document.getElementById('growthRate');
    if (growthElement) {
        const currentGrowth = parseFloat(growthElement.textContent);
        const change = (Math.random() * 0.2) - 0.1; // Random change between -0.1 and +0.1
        const newGrowth = Math.max(0, currentGrowth + change);
        growthElement.textContent = newGrowth.toFixed(1) + 'cm';
    }
    
    // Update harvest count
    const harvestElement = document.getElementById('readyToHarvest');
    if (harvestElement) {
        const currentHarvest = parseInt(harvestElement.textContent);
        const change = Math.floor(Math.random() * 6) - 3; // Random change between -3 and +3
        const newHarvest = Math.max(0, currentHarvest + change);
        harvestElement.textContent = newHarvest;
    }
}

// Update data every 30 seconds
setInterval(updateFarmManagementData, 30000);

// Add feeding schedule functionality
document.addEventListener('DOMContentLoaded', function() {
    // Add feeding button functionality
    const addFeedingButtons = document.querySelectorAll('.btn-primary');
    addFeedingButtons.forEach(button => {
        if (button.textContent.includes('Add Feeding')) {
            button.addEventListener('click', () => {
                // In a real application, this would open a modal to add a new feeding
                alert('Add Feeding functionality would open a form to schedule a new feeding time.');
            });
        }
    });
    
    // Add health record functionality
    const addRecordButtons = document.querySelectorAll('.btn-primary');
    addRecordButtons.forEach(button => {
        if (button.textContent.includes('Add Record')) {
            button.addEventListener('click', () => {
                // In a real application, this would open a modal to add a health record
                alert('Add Health Record functionality would open a form to add a new health record.');
            });
        }
    });
    
    // Add harvest schedule functionality
    const scheduleHarvestButtons = document.querySelectorAll('.btn-primary');
    scheduleHarvestButtons.forEach(button => {
        if (button.textContent.includes('Schedule Harvest')) {
            button.addEventListener('click', () => {
                // In a real application, this would open a modal to schedule a harvest
                alert('Schedule Harvest functionality would open a form to schedule a new harvest.');
            });
        }
    });
});