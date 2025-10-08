// database.js
console.log('database.js loaded');

// Save sensor reading
async function saveSensorReading(reading) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
            .from('sensor_readings')
            .insert([
                { 
                    user_id: user.id,
                    temperature: reading.temperature,
                    ph: reading.ph,
                    population: reading.population,
                    health_status: reading.healthStatus,
                    avg_weight: reading.avgWeight,
                    days_to_harvest: reading.daysToHarvest
                }
            ]);
            
        if (error) throw error;
        
        return { success: true, data: data };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Get latest sensor reading
async function getLatestSensorReading() {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
            .from('sensor_readings')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
            
        if (error) throw error;
        
        if (data && data.length > 0) {
            return {
                temperature: data[0].temperature,
                ph: data[0].ph,
                population: data[0].population,
                health_status: data[0].health_status,
                avg_weight: data[0].avg_weight,
                days_to_harvest: data[0].days_to_harvest,
                lastUpdated: new Date(data[0].created_at)
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching sensor data:', error);
        return null;
    }
}

// Save feed data
async function saveFeedData(feedData) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
            .from('feed_data')
            .upsert([
                { 
                    user_id: user.id,
                    capacity: feedData.capacity,
                    current: feedData.current,
                    last_updated: new Date()
                }
            ], {
                onConflict: 'user_id'
            });
            
        if (error) throw error;
        
        return { success: true, data: data };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Get feed data
async function getFeedData() {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
            .from('feed_data')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
        
        if (data) {
            return {
                capacity: data.capacity,
                current: data.current,
                lastUpdated: new Date(data.last_updated)
            };
        }
        
        // Return default values if no data found
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

// Save feeding schedule
async function saveFeedingSchedule(schedule) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
            .from('feeding_schedule')
            .upsert([
                { 
                    user_id: user.id,
                    time: schedule.time,
                    frequency: schedule.frequency,
                    amount: schedule.amount,
                    type: schedule.type
                }
            ], {
                onConflict: 'user_id'
            });
            
        if (error) throw error;
        
        return { success: true, data: data };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Get feeding schedule
async function getFeedingSchedule() {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
            .from('feeding_schedule')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
        
        return data;
    } catch (error) {
        console.error('Error fetching feeding schedule:', error);
        return null;
    }
}

// Save water schedule
async function saveWaterSchedule(schedule) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
            .from('water_schedule')
            .upsert([
                { 
                    user_id: user.id,
                    time: schedule.time,
                    frequency: schedule.frequency,
                    percentage: schedule.percentage
                }
            ], {
                onConflict: 'user_id'
            });
            
        if (error) throw error;
        
        return { success: true, data: data };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Get water schedule
async function getWaterSchedule() {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
            .from('water_schedule')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
        
        return data;
    } catch (error) {
        console.error('Error fetching water schedule:', error);
        return null;
    }
}

// Get historical sensor data
async function getHistoricalSensorData(days = 7) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const { data, error } = await supabase
            .from('sensor_readings')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });
            
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error fetching historical data:', error);
        return [];
    }
}

// Save harvest record
async function saveHarvestRecord(record) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
            .from('harvest_records')
            .insert([
                { 
                    user_id: user.id,
                    harvest_date: record.harvestDate,
                    quantity: record.quantity,
                    price: record.price,
                    notes: record.notes
                }
            ]);
            
        if (error) throw error;
        
        return { success: true, data: data };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Get harvest records
async function getHarvestRecords() {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
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

// Save water quality test
async function saveWaterQualityTest(test) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
            .from('water_quality_tests')
            .insert([
                { 
                    user_id: user.id,
                    test_date: test.testDate,
                    temperature: test.temperature,
                    ph: test.ph,
                    dissolved_oxygen: test.dissolvedOxygen,
                    ammonia: test.ammonia,
                    nitrites: test.nitrites,
                    nitrates: test.nitrates,
                    notes: test.notes
                }
            ]);
            
        if (error) throw error;
        
        return { success: true, data: data };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Get water quality tests
async function getWaterQualityTests() {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('User not authenticated');
        
        const { data, error } = await supabase
            .from('water_quality_tests')
            .select('*')
            .eq('user_id', user.id)
            .order('test_date', { ascending: false });
            
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error fetching water quality tests:', error);
        return [];
    }
}