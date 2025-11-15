// database.js - COMPLETE VERSION WITH EMAIL NOTIFICATIONS
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
// DEVICE STATUS & CONNECTIVITY FUNCTIONS
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
            created_at: item.created_at,
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
// FEED DATA
// ========================================

async function saveFeedData(feedData) {
    try {
        const user = await ensureAuthenticated();
        
        // FIX: Round current to integer since database expects INTEGER type
        const currentAmount = Math.round(feedData.current || 375);
        const capacityAmount = Math.round(feedData.capacity || 500);
        
        const { data, error } = await window.supabase
            .from('feed_data')
            .upsert([{
                user_id: user.id,
                capacity: capacityAmount,
                current: currentAmount,
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
// FARM SETTINGS (WITH EMAIL SUPPORT)
// ========================================

async function saveFarmSettings(settings) {
    try {
        const user = await ensureAuthenticated();
        
        console.log('[Database] Saving farm settings:', settings);
        
        const { data, error } = await window.supabase
            .from('farm_settings')
            .upsert([{
                user_id: user.id,
                name: settings.name || 'My Crayfish Farm',
                email: settings.email || user.email || '',
                phone: settings.phone || '',
                unit: settings.unit || 'metric',
                alert_frequency: settings.alertFrequency || settings.alert_frequency || 'immediate',
                water_testing_frequency: settings.waterTestingFrequency || settings.water_testing_frequency || 'twice-weekly',
                email_alerts_enabled: settings.email_alerts_enabled !== false,
                low_feed_threshold: settings.low_feed_threshold || 20
            }], {
                onConflict: 'user_id'
            })
            .select();
            
        if (error) throw error;
        
        // Also store in localStorage for offline access
        localStorage.setItem('farmSettings', JSON.stringify(settings));
        
        console.log('[Database] ✓ Farm settings saved:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('[Database] Error saving farm settings:', error);
        // Fallback to localStorage only
        localStorage.setItem('farmSettings', JSON.stringify(settings));
        return { success: false, message: error.message };
    }
}

async function getFarmSettings() {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('farm_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
            return {
                name: data.name || 'My Crayfish Farm',
                email: data.email || '',
                phone: data.phone || '',
                unit: data.unit || 'metric',
                alertFrequency: data.alert_frequency || 'immediate',
                waterTestingFrequency: data.water_testing_frequency || 'twice-weekly',
                email_alerts_enabled: data.email_alerts_enabled !== false,
                low_feed_threshold: data.low_feed_threshold || 20
            };
        }
        
        // Fallback to localStorage
        const local = localStorage.getItem('farmSettings');
        return local ? JSON.parse(local) : null;
    } catch (error) {
        console.error('[Database] Error fetching farm settings:', error);
        // Fallback to localStorage
        const local = localStorage.getItem('farmSettings');
        return local ? JSON.parse(local) : null;
    }
}

// ========================================
// FEED HISTORY
// ========================================

async function saveFeedHistory(feedRecord) {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('feed_history')
            .insert([{
                user_id: user.id,
                amount: feedRecord.amount,
                food_type: feedRecord.food_type || 'juvenile-pellets',
                method: feedRecord.method || 'manual',
                created_at: new Date().toISOString()
            }])
            .select();
            
        if (error) throw error;
        
        console.log('✓ Feed history saved:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('Error saving feed history:', error);
        return { success: false, message: error.message };
    }
}

async function getFeedHistory(limit = 50) {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('feed_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);
            
        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Error fetching feed history:', error);
        return [];
    }
}

// ========================================
// WATER CHANGE HISTORY
// ========================================

async function saveWaterChangeHistory(changeRecord) {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('water_change_history')
            .insert([{
                user_id: user.id,
                change_type: changeRecord.change_type || 'manual',
                percentage: changeRecord.percentage || 50,
                temp_before: changeRecord.temp_before,
                ph_before: changeRecord.ph_before,
                temp_after: changeRecord.temp_after,
                ph_after: changeRecord.ph_after,
                status: changeRecord.status || 'completed',
                created_at: new Date().toISOString()
            }])
            .select();
            
        if (error) throw error;
        
        console.log('✓ Water change history saved:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('Error saving water change history:', error);
        return { success: false, message: error.message };
    }
}

async function getWaterChangeHistory(limit = 50) {
    try {
        const user = await ensureAuthenticated();
        
        const { data, error } = await window.supabase
            .from('water_change_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);
            
        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Error fetching water change history:', error);
        return [];
    }
}

// ================================================
// EMAIL NOTIFICATION SYSTEM
// ================================================

async function sendEmail(to, subject, html) {
    try {
        if (!window.supabase || !to) {
            console.warn('[Email] Cannot send email - missing requirements');
            return { success: false, reason: 'missing_requirements' };
        }

        console.log('[Email] Sending email to:', to);

        const { data, error } = await window.supabase.functions.invoke('send-email', {
            body: {
                to: to,
                subject: subject,
                html: html
            }
        });

        if (error) {
            console.error('[Email] Error sending email:', error);
            throw error;
        }

        console.log('[Email] ✓ Email sent successfully');
        return { success: true, data: data };
    } catch (error) {
        console.error('[Email] sendEmail error:', error);
        return { success: false, error: error.message };
    }
}

async function sendLowFeedAlert(userEmail, currentLevel, threshold) {
    const subject = '⚠️ Low Feed Alert - AquaVision Pro';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
            <div style="background: linear-gradient(135deg, #00d4ff, #0099cc); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">🐟 AquaVision Pro</h1>
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Crayfish Farm Monitoring System</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #e63946; margin-top: 0;">⚠️ Low Feed Alert</h2>
                
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                    Your crayfish feed level has dropped below the configured threshold.
                </p>
                
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                    <p style="margin: 0; font-size: 14px; color: #856404;">
                        <strong>Current Feed Level:</strong> ${currentLevel}%<br>
                        <strong>Alert Threshold:</strong> ${threshold}%
                    </p>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                    <strong>Recommended Actions:</strong>
                </p>
                <ul style="color: #333; line-height: 1.8;">
                    <li>Refill the feed container as soon as possible</li>
                    <li>Check the feeding schedule to ensure adequate supply</li>
                    <li>Monitor feed consumption patterns</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${window.location.origin}/dashboard.html" 
                       style="background: linear-gradient(135deg, #00d4ff, #0099cc); 
                              color: white; 
                              padding: 15px 30px; 
                              text-decoration: none; 
                              border-radius: 25px; 
                              font-weight: bold;
                              display: inline-block;">
                        View Dashboard
                    </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
                    This is an automated alert from AquaVision Pro.<br>
                    Sent on ${new Date().toLocaleString()}
                </p>
            </div>
        </div>
    `;

    return await sendEmail(userEmail, subject, html);
}

async function sendWaterChangeNotification(userEmail, changeType, percentage) {
    const subject = '💧 Water Change Completed - AquaVision Pro';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
            <div style="background: linear-gradient(135deg, #00d4ff, #0099cc); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">🐟 AquaVision Pro</h1>
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Crayfish Farm Monitoring System</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #00d4ff; margin-top: 0;">💧 Water Change Completed</h2>
                
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                    A water change has been successfully completed in your crayfish farm.
                </p>
                
                <div style="background: #d1ecf1; border-left: 4px solid #00d4ff; padding: 15px; margin: 20px 0; border-radius: 5px;">
                    <p style="margin: 0; font-size: 14px; color: #0c5460;">
                        <strong>Change Type:</strong> ${changeType === 'manual' ? 'Manual' : 'Scheduled'}<br>
                        <strong>Water Changed:</strong> ${percentage}%<br>
                        <strong>Completed At:</strong> ${new Date().toLocaleString()}
                    </p>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                    <strong>Next Steps:</strong>
                </p>
                <ul style="color: #333; line-height: 1.8;">
                    <li>Monitor water quality parameters (Temperature & pH)</li>
                    <li>Check crayfish behavior for any stress signs</li>
                    <li>Ensure proper aeration and filtration</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${window.location.origin}/dashboard.html" 
                       style="background: linear-gradient(135deg, #00d4ff, #0099cc); 
                              color: white; 
                              padding: 15px 30px; 
                              text-decoration: none; 
                              border-radius: 25px; 
                              font-weight: bold;
                              display: inline-block;">
                        View Dashboard
                    </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
                    This is an automated notification from AquaVision Pro.<br>
                    Sent on ${new Date().toLocaleString()}
                </p>
            </div>
        </div>
    `;

    return await sendEmail(userEmail, subject, html);
}

async function sendFeedingNotification(userEmail, amount, foodType) {
    const foodTypeMap = {
        'juvenile-pellets': 'Juvenile Pellets (40% protein)',
        'growth-pellets': 'Growth Pellets (35% protein)',
        'breeder-pellets': 'Breeder Pellets (30% protein)'
    };
    
    const subject = '🍽️ Feeding Completed - AquaVision Pro';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
            <div style="background: linear-gradient(135deg, #00d4ff, #0099cc); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">🐟 AquaVision Pro</h1>
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Crayfish Farm Monitoring System</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #00d4ff; margin-top: 0;">🍽️ Feeding Completed</h2>
                
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                    Your crayfish have been fed successfully.
                </p>
                
                <div style="background: #d1ecf1; border-left: 4px solid #00d4ff; padding: 15px; margin: 20px 0; border-radius: 5px;">
                    <p style="margin: 0; font-size: 14px; color: #0c5460;">
                        <strong>Amount:</strong> ${amount}g<br>
                        <strong>Food Type:</strong> ${foodTypeMap[foodType] || foodType}<br>
                        <strong>Time:</strong> ${new Date().toLocaleString()}
                    </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${window.location.origin}/dashboard.html" 
                       style="background: linear-gradient(135deg, #00d4ff, #0099cc); 
                              color: white; 
                              padding: 15px 30px; 
                              text-decoration: none; 
                              border-radius: 25px; 
                              font-weight: bold;
                              display: inline-block;">
                        View Dashboard
                    </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
                    This is an automated notification from AquaVision Pro.<br>
                    Sent on ${new Date().toLocaleString()}
                </p>
            </div>
        </div>
    `;

    return await sendEmail(userEmail, subject, html);
}

async function sendParameterViolationAlert(userEmail, parameter, currentValue, optimalRange) {
    const parameterName = parameter === 'temperature' ? 'Temperature' : 'pH Level';
    const unit = parameter === 'temperature' ? '°C' : '';
    
    let severity = 'Warning';
    if (parameter === 'temperature') {
        if (currentValue < 15 || currentValue > 30) severity = 'Critical';
    } else if (parameter === 'ph') {
        if (currentValue < 6.0 || currentValue > 8.5) severity = 'Critical';
    }
    
    const subject = `🚨 ${severity} Alert: ${parameterName} Out of Range - AquaVision Pro`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
            <div style="background: linear-gradient(135deg, #e63946, #d62828); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 28px;">🐟 AquaVision Pro</h1>
                <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Crayfish Farm Monitoring System</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #e63946; margin-top: 0;">🚨 ${severity} Water Quality Alert</h2>
                
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                    The ${parameterName.toLowerCase()} in your crayfish farm is <strong>outside the optimal range</strong>.
                </p>
                
                <div style="background: #f8d7da; border-left: 4px solid #e63946; padding: 15px; margin: 20px 0; border-radius: 5px;">
                    <p style="margin: 0; font-size: 14px; color: #721c24;">
                        <strong>Parameter:</strong> ${parameterName}<br>
                        <strong>Current Value:</strong> ${currentValue}${unit}<br>
                        <strong>Optimal Range:</strong> ${optimalRange.min}${unit} - ${optimalRange.max}${unit}<br>
                        <strong>Status:</strong> <span style="color: #e63946; font-weight: bold;">${severity}</span>
                    </p>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                    <strong>Immediate Actions Required:</strong>
                </p>
                <ul style="color: #333; line-height: 1.8;">
                    ${parameter === 'temperature' ? `
                        <li>Check water heater/chiller functionality</li>
                        <li>Ensure proper insulation of the tank</li>
                        <li>Adjust room temperature if necessary</li>
                        <li>Perform partial water change if temperature is critical</li>
                    ` : `
                        <li>Test pH using backup testing kit</li>
                        <li>Check aeration system functionality</li>
                        <li>Consider pH buffer solutions if needed</li>
                        <li>Perform partial water change to stabilize pH</li>
                    `}
                    <li>Monitor crayfish behavior closely</li>
                    <li>Continue monitoring until values normalize</li>
                </ul>
                
                <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
                    <p style="margin: 0; font-size: 14px; color: #856404;">
                        ⚠️ <strong>Warning:</strong> Prolonged exposure to non-optimal conditions can stress crayfish 
                        and affect their health, growth, and survival rate.
                    </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${window.location.origin}/dashboard.html" 
                       style="background: linear-gradient(135deg, #e63946, #d62828); 
                              color: white; 
                              padding: 15px 30px; 
                              text-decoration: none; 
                              border-radius: 25px; 
                              font-weight: bold;
                              display: inline-block;">
                        View Dashboard Now
                    </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
                    This is an automated critical alert from AquaVision Pro.<br>
                    Sent on ${new Date().toLocaleString()}
                </p>
            </div>
        </div>
    `;

    return await sendEmail(userEmail, subject, html);
}

// ========================================
// EXPORT ALL FUNCTIONS TO WINDOW
// ========================================

// Device connectivity functions
window.checkDeviceOnlineStatus = checkDeviceOnlineStatus;
window.getLatestReading = getLatestReading;
window.getHistoricalReadings = getHistoricalReadings;
window.subscribeToSensorData = subscribeToSensorData;

// Sensor readings
window.saveSensorReading = saveSensorReading;
window.getLatestSensorReading = getLatestSensorReading;
window.getHistoricalSensorData = getHistoricalSensorData;

// Feed management
window.saveFeedData = saveFeedData;
window.getFeedData = getFeedData;
window.saveFeedingSchedule = saveFeedingSchedule;
window.getFeedingSchedule = getFeedingSchedule;

// Water management
window.saveWaterSchedule = saveWaterSchedule;
window.getWaterSchedule = getWaterSchedule;

// Harvest records
window.saveHarvestRecord = saveHarvestRecord;
window.getHarvestRecords = getHarvestRecords;

// Water quality tests
window.saveWaterQualityTest = saveWaterQualityTest;
window.getWaterQualityTests = getWaterQualityTests;

// Device commands
window.sendDeviceCommand = sendDeviceCommand;
window.getPendingDeviceCommands = getPendingDeviceCommands;
window.markCommandProcessed = markCommandProcessed;
window.getDeviceStatus = getDeviceStatus;

// Farm settings
window.saveFarmSettings = saveFarmSettings;
window.getFarmSettings = getFarmSettings;

// Feed history
window.saveFeedHistory = saveFeedHistory;
window.getFeedHistory = getFeedHistory;

// Water change history
window.saveWaterChangeHistory = saveWaterChangeHistory;
window.getWaterChangeHistory = getWaterChangeHistory;

// Email functions
window.sendEmail = sendEmail;
window.sendLowFeedAlert = sendLowFeedAlert;
window.sendWaterChangeNotification = sendWaterChangeNotification;
window.sendFeedingNotification = sendFeedingNotification;
window.sendParameterViolationAlert = sendParameterViolationAlert;

console.log('[Database] ✓ All database functions loaded and exported (COMPLETE VERSION WITH EMAIL)');