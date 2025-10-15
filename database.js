// database.js - COMPLETE VERSION WITH ALL MISSING FUNCTIONS
console.log('database.js loaded');

// Export all functions to window for global access
window.databaseFunctions = {};

// ========================================
// HELPER FUNCTIONS
// ========================================

async function ensureAuthenticated() {
    if (!window.supabase) {
        throw new Error('Supabase not initialized');
    }
    
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    
    return user;
}

// ========================================
// SENSOR READINGS
// ========================================

async function saveSensorReading(reading) {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('sensor_readings')
            .insert([{
                user_id: user.id,
                temperature: reading.temperature || 0,
                ph: reading.ph || 7.0,
                population: reading.population || 15,
                health_status: reading.health_status || reading.healthStatus || 100,
                avg_weight: reading.avg_weight || reading.avgWeight || 5.0,
                days_to_harvest: reading.days_to_harvest || reading.daysToHarvest || 120
            }])
            .select();
            
        if (error) throw error;
        
        console.log('✓ Sensor reading saved:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('Error saving sensor reading:', error);
        return { success: false, message: error.message };
    }
}

async function getLatestSensorReading() {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('sensor_readings')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
            return {
                temperature: data.temperature,
                ph: data.ph,
                population: data.population,
                healthStatus: data.health_status,
                avgWeight: data.avg_weight,
                daysToHarvest: data.days_to_harvest,
                lastUpdated: new Date(data.created_at)
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching sensor data:', error);
        return null;
    }
}

async function getHistoricalSensorData(days = 7) {
    try {
        const user = await ensureAuthenticated();
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const { data, error } = await window.supabase
            .from('sensor_readings')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        return data.map(item => ({
            timestamp: new Date(item.created_at),
            temperature: item.temperature,
            ph: item.ph,
            population: item.population,
            healthStatus: item.health_status,
            avgWeight: item.avg_weight,
            daysToHarvest: item.days_to_harvest
        }));
    } catch (error) {
        console.error('Error fetching historical data:', error);
        return [];
    }
}

// ========================================
// NEW: DEVICE STATUS & CONNECTIVITY FUNCTIONS
// ========================================

async function checkDeviceOnlineStatus(userId, minutesThreshold = 2) {
    try {
        if (!window.supabase) {
            console.warn('[Database] Supabase not initialized');
            return false;
        }

        const cutoffTime = new Date();
        cutoffTime.setMinutes(cutoffTime.getMinutes() - minutesThreshold);

        console.log('[Database] Checking for readings after:', cutoffTime.toISOString());

        const { data, error } = await window.supabase
            .from('sensor_readings')
            .select('id, created_at, temperature, ph')
            .eq('user_id', userId)
            .gte('created_at', cutoffTime.toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('[Database] Error checking device status:', error);
            return false;
        }

        const isOnline = data && data.length > 0;
        console.log('[Database] Device online:', isOnline, 'Recent readings:', data?.length || 0);
        
        return isOnline;
    } catch (error) {
        console.error('[Database] checkDeviceOnlineStatus error:', error);
        return false;
    }
}

async function getLatestReading(userId) {
    try {
        if (!window.supabase) {
            console.warn('[Database] Supabase not initialized');
            return null;
        }

        const { data, error } = await window.supabase
            .from('sensor_readings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[Database] Error fetching latest reading:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('[Database] getLatestReading error:', error);
        return null;
    }
}

async function getHistoricalReadings(userId, hours = 24) {
    try {
        if (!window.supabase) {
            console.warn('[Database] Supabase not initialized');
            return [];
        }

        const startTime = new Date();
        startTime.setHours(startTime.getHours() - hours);

        console.log('[Database] Fetching readings from:', startTime.toISOString());

        const { data, error } = await window.supabase
            .from('sensor_readings')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', startTime.toISOString())
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[Database] Error fetching historical readings:', error);
            return [];
        }

        console.log('[Database] Fetched', data?.length || 0, 'historical readings');
        return data || [];
    } catch (error) {
        console.error('[Database] getHistoricalReadings error:', error);
        return [];
    }
}

function subscribeToSensorData(userId, callback) {
    if (!window.supabase) {
        console.warn('[Database] Supabase not available for subscriptions');
        return null;
    }

    console.log('[Database] Setting up real-time subscription for user:', userId);

    const subscription = window.supabase
        .channel('sensor_readings_channel')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'sensor_readings',
                filter: `user_id=eq.${userId}`
            },
            (payload) => {
                console.log('[Database] 🔴 Real-time update received:', payload);
                if (callback && typeof callback === 'function') {
                    callback(payload.new);
                }
            }
        )
        .subscribe((status) => {
            console.log('[Database] Subscription status:', status);
        });

    return subscription;
}

// ========================================
// FEED DATA
// ========================================

async function saveFeedData(feedData) {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('feed_data')
            .upsert([{
                user_id: user.id,
                capacity: feedData.capacity || 500,
                current: feedData.current || 375,
                last_updated: new Date().toISOString()
            }], {
                onConflict: 'user_id'
            })
            .select();
            
        if (error) throw error;
        
        console.log('✓ Feed data saved:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('Error saving feed data:', error);
        return { success: false, message: error.message };
    }
}

async function getFeedData() {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('feed_data')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
            return {
                capacity: data.capacity,
                current: data.current,
                lastUpdated: new Date(data.last_updated)
            };
        }
        
        return {
            capacity: 500,
            current: 375,
            lastUpdated: new Date()
        };
    } catch (error) {
        console.error('Error fetching feed data:', error);
        return {
            capacity: 500,
            current: 375,
            lastUpdated: new Date()
        };
    }
}

// ========================================
// FEEDING SCHEDULE
// ========================================

async function saveFeedingSchedule(schedule) {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('feeding_schedule')
            .upsert([{
                user_id: user.id,
                time: schedule.time,
                frequency: schedule.frequency,
                amount: schedule.amount,
                type: schedule.type
            }], {
                onConflict: 'user_id'
            })
            .select();
            
        if (error) throw error;
        
        console.log('✓ Feeding schedule saved:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('Error saving feeding schedule:', error);
        return { success: false, message: error.message };
    }
}

async function getFeedingSchedule() {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('feeding_schedule')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error;
        
        return data;
    } catch (error) {
        console.error('Error fetching feeding schedule:', error);
        return null;
    }
}

// ========================================
// WATER SCHEDULE
// ========================================

async function saveWaterSchedule(schedule) {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('water_schedule')
            .upsert([{
                user_id: user.id,
                time: schedule.time,
                frequency: schedule.frequency,
                percentage: schedule.percentage
            }], {
                onConflict: 'user_id'
            })
            .select();
            
        if (error) throw error;
        
        console.log('✓ Water schedule saved:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('Error saving water schedule:', error);
        return { success: false, message: error.message };
    }
}

async function getWaterSchedule() {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('water_schedule')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error;
        
        return data;
    } catch (error) {
        console.error('Error fetching water schedule:', error);
        return null;
    }
}

// ========================================
// HARVEST RECORDS
// ========================================

async function saveHarvestRecord(record) {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('harvest_records')
            .insert([{
                user_id: user.id,
                harvest_date: record.date,
                quantity: record.quantity,
                price: record.price,
                notes: record.notes || ''
            }])
            .select();
            
        if (error) throw error;
        
        console.log('✓ Harvest record saved:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('Error saving harvest record:', error);
        return { success: false, message: error.message };
    }
}

async function getHarvestRecords() {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('harvest_records')
            .select('*')
            .eq('user_id', user.id)
            .order('harvest_date', { ascending: false });
            
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error fetching harvest records:', error);
        return [];
    }
}

// ========================================
// WATER QUALITY TESTS
// ========================================

async function saveWaterQualityTest(test) {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('water_quality_tests')
            .insert([{
                user_id: user.id,
                test_date: test.testDate || new Date().toISOString(),
                temperature: test.temperature,
                ph: test.ph,
                dissolved_oxygen: test.dissolvedOxygen || null,
                ammonia: test.ammonia || null,
                nitrites: test.nitrites || null,
                nitrates: test.nitrates || null,
                notes: test.notes || ''
            }])
            .select();
            
        if (error) throw error;
        
        console.log('✓ Water quality test saved:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('Error saving water quality test:', error);
        return { success: false, message: error.message };
    }
}

async function getWaterQualityTests(limit = 50) {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('water_quality_tests')
            .select('*')
            .eq('user_id', user.id)
            .order('test_date', { ascending: false })
            .limit(limit);
            
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error fetching water quality tests:', error);
        return [];
    }
}

// ========================================
// DEVICE COMMANDS
// ========================================

async function sendDeviceCommand(command) {
    try {
        const user = await ensureAuthenticated();
        
        console.log('Sending device command:', command);
        
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
        
        console.log('✓ Device command sent:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('Error sending device command:', error);
        return { success: false, message: error.message };
    }
}

async function getPendingDeviceCommands() {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('device_commands')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Error fetching pending commands:', error);
        return [];
    }
}

async function markCommandProcessed(commandId) {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('device_commands')
            .update({
                status: 'processed',
                processed_at: new Date().toISOString()
            })
            .eq('id', commandId)
            .eq('user_id', user.id)
            .select();
            
        if (error) throw error;
        
        console.log('✓ Command marked as processed:', commandId);
        return { success: true, data: data };
    } catch (error) {
        console.error('Error marking command as processed:', error);
        return { success: false, message: error.message };
    }
}

async function getDeviceStatus() {
    try {
        const user = await ensureAuthenticated();
        
        // Check if there are any recent sensor readings (within last 2 minutes)
        const twoMinutesAgo = new Date();
        twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);
        
        const { data, error } = await window.supabase
            .from('sensor_readings')
            .select('created_at')
            .eq('user_id', user.id)
            .gte('created_at', twoMinutesAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(1);
            
        if (error) throw error;
        
        const isOnline = data && data.length > 0;
        const lastUpdate = data && data.length > 0 ? new Date(data[0].created_at) : null;
        
        return {
            isOnline: isOnline,
            lastUpdate: lastUpdate,
            status: isOnline ? 'online' : 'offline'
        };
    } catch (error) {
        console.error('Error checking device status:', error);
        return {
            isOnline: false,
            lastUpdate: null,
            status: 'error'
        };
    }
}

// ========================================
// FARM SETTINGS
// ========================================

async function saveFarmSettings(settings) {
    try {
        const user = await ensureAuthenticated();
        
        // Store settings in a custom table or user metadata
        // For simplicity, we'll use localStorage + user profile
        const { data, error } = await window.supabase
            .from('users')
            .update({
                farm_name: settings.name,
                email: settings.email
            })
            .eq('id', user.id)
            .select();
            
        if (error) throw error;
        
        // Also store in localStorage for offline access
        localStorage.setItem('farmSettings', JSON.stringify(settings));
        
        console.log('✓ Farm settings saved:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('Error saving farm settings:', error);
        // Fallback to localStorage only
        localStorage.setItem('farmSettings', JSON.stringify(settings));
        return { success: false, message: error.message };
    }
}

async function getFarmSettings() {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('users')
            .select('farm_name, email, name')
            .eq('id', user.id)
            .single();
            
        if (error) throw error;
        
        if (data) {
            return {
                name: data.farm_name || data.name || 'My Crayfish Farm',
                email: data.email || ''
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching farm settings:', error);
        // Fallback to localStorage
        const local = localStorage.getItem('farmSettings');
        return local ? JSON.parse(local) : null;
    }
}

// ========================================
// EXPORT ALL FUNCTIONS
// ========================================

// Original exports
window.saveSensorReading = saveSensorReading;
window.getLatestSensorReading = getLatestSensorReading;
window.getHistoricalSensorData = getHistoricalSensorData;
window.saveFeedData = saveFeedData;
window.getFeedData = getFeedData;
window.saveFeedingSchedule = saveFeedingSchedule;
window.getFeedingSchedule = getFeedingSchedule;
window.saveWaterSchedule = saveWaterSchedule;
window.getWaterSchedule = getWaterSchedule;
window.saveHarvestRecord = saveHarvestRecord;
window.getHarvestRecords = getHarvestRecords;
window.saveWaterQualityTest = saveWaterQualityTest;
window.getWaterQualityTests = getWaterQualityTests;
window.sendDeviceCommand = sendDeviceCommand;
window.getPendingDeviceCommands = getPendingDeviceCommands;
window.markCommandProcessed = markCommandProcessed;
window.getDeviceStatus = getDeviceStatus;
window.saveFarmSettings = saveFarmSettings;
window.getFarmSettings = getFarmSettings;

// NEW: Export missing functions
window.checkDeviceOnlineStatus = checkDeviceOnlineStatus;
window.getLatestReading = getLatestReading;
window.getHistoricalReadings = getHistoricalReadings;
window.subscribeToSensorData = subscribeToSensorData;

console.log('[Database] All database functions loaded and exported (including device connectivity functions)');