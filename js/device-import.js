// Multi-Device Health Data Import
export class DeviceImporter {
    constructor() {
        this.supportedDevices = [
            'samsung-health',
            'samsung-watch',
            'fitbit',
            'apple-watch',
            'sleep-apps',
            'google-fit',
            'apple-health'
        ];
    }

    // Import from Samsung Health
    async importSamsungHealth(file, userId) {
        // Samsung Health exports as CSV or JSON
        if (file.name.endsWith('.csv')) {
            return this.parseSamsungHealthCSV(file, userId);
        } else if (file.name.endsWith('.json')) {
            return this.parseSamsungHealthJSON(file, userId);
        }
        throw new Error('Unsupported file format. Please export as CSV or JSON from Samsung Health.');
    }

    async parseSamsungHealthCSV(file, userId) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n');
                    const headers = lines[0].split(',');
                    
                    const healthData = {
                        steps: [],
                        heartRate: [],
                        sleep: [],
                        calories: [],
                        distance: []
                    };
                    
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        
                        const values = lines[i].split(',');
                        const record = {};
                        headers.forEach((header, index) => {
                            record[header.trim()] = values[index]?.trim();
                        });
                        
                        // Map Samsung Health fields
                        if (record.type === 'steps' || record.Type === 'steps') {
                            healthData.steps.push({
                                value: parseInt(record.value || record.Value || 0),
                                startDate: this.parseSamsungDate(record.date || record.Date || record.timestamp),
                                timestamp: this.parseSamsungDate(record.date || record.Date || record.timestamp),
                                source: 'samsung-health'
                            });
                        }
                        
                        if (record.type === 'heart_rate' || record.Type === 'heart_rate') {
                            healthData.heartRate.push({
                                value: parseFloat(record.value || record.Value || 0),
                                startDate: this.parseSamsungDate(record.date || record.Date || record.timestamp),
                                timestamp: this.parseSamsungDate(record.date || record.Date || record.timestamp),
                                source: 'samsung-health'
                            });
                        }
                        
                        if (record.type === 'sleep' || record.Type === 'sleep') {
                            healthData.sleep.push({
                                value: parseFloat(record.value || record.Value || 0),
                                startDate: this.parseSamsungDate(record.date || record.Date || record.timestamp),
                                timestamp: this.parseSamsungDate(record.date || record.Date || record.timestamp),
                                source: 'samsung-health'
                            });
                        }
                    }
                    
                    await this.saveHealthData(userId, healthData);
                    resolve({ success: true, metrics: Object.keys(healthData) });
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }

    async parseSamsungHealthJSON(file, userId) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const healthData = {
                        steps: [],
                        heartRate: [],
                        sleep: [],
                        calories: [],
                        distance: []
                    };
                    
                    // Parse Samsung Health JSON structure
                    if (data.data) {
                        data.data.forEach(item => {
                            const type = item.type || item.dataType;
                            const date = new Date(item.startTime || item.date || item.timestamp);
                            
                            if (type === 'com.samsung.health.step_count' || type === 'steps') {
                                healthData.steps.push({
                                    value: item.value || item.count || 0,
                                    startDate: date.toISOString(),
                                    timestamp: date.toISOString(),
                                    source: 'samsung-health'
                                });
                            }
                            
                            if (type === 'com.samsung.health.heart_rate' || type === 'heart_rate') {
                                healthData.heartRate.push({
                                    value: item.value || item.bpm || 0,
                                    startDate: date.toISOString(),
                                    timestamp: date.toISOString(),
                                    source: 'samsung-health'
                                });
                            }
                            
                            if (type === 'com.samsung.health.sleep' || type === 'sleep') {
                                const duration = item.duration || item.value || 0;
                                healthData.sleep.push({
                                    value: duration / 3600000, // Convert ms to hours
                                    startDate: date.toISOString(),
                                    timestamp: date.toISOString(),
                                    source: 'samsung-health'
                                });
                            }
                        });
                    }
                    
                    await this.saveHealthData(userId, healthData);
                    resolve({ success: true, metrics: Object.keys(healthData) });
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }

    // Import from Fitbit
    async importFitbit(file, userId) {
        // Fitbit exports as CSV or JSON
        if (file.name.endsWith('.json')) {
            return this.parseFitbitJSON(file, userId);
        }
        throw new Error('Unsupported file format. Please export as JSON from Fitbit.');
    }

    async parseFitbitJSON(file, userId) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const healthData = {
                        steps: [],
                        heartRate: [],
                        sleep: [],
                        calories: [],
                        distance: []
                    };
                    
                    // Parse Fitbit data structure
                    if (Array.isArray(data)) {
                        data.forEach(item => {
                            const date = new Date(item.dateTime || item.date);
                            
                            if (item.steps !== undefined) {
                                healthData.steps.push({
                                    value: item.steps,
                                    startDate: date.toISOString(),
                                    timestamp: date.toISOString(),
                                    source: 'fitbit'
                                });
                            }
                            
                            if (item.heartRate) {
                                healthData.heartRate.push({
                                    value: item.heartRate,
                                    startDate: date.toISOString(),
                                    timestamp: date.toISOString(),
                                    source: 'fitbit'
                                });
                            }
                            
                            if (item.sleep || item.sleepMinutes) {
                                healthData.sleep.push({
                                    value: (item.sleep || item.sleepMinutes) / 60, // Convert to hours
                                    startDate: date.toISOString(),
                                    timestamp: date.toISOString(),
                                    source: 'fitbit'
                                });
                            }
                        });
                    }
                    
                    await this.saveHealthData(userId, healthData);
                    resolve({ success: true, metrics: Object.keys(healthData) });
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }

    // Import from Sleep Analysis Apps
    async importSleepApp(file, userId) {
        // Common sleep apps: Sleep Cycle, AutoSleep, Pillow, etc.
        if (file.name.endsWith('.csv')) {
            return this.parseSleepAppCSV(file, userId);
        } else if (file.name.endsWith('.json')) {
            return this.parseSleepAppJSON(file, userId);
        }
        throw new Error('Unsupported file format');
    }

    async parseSleepAppCSV(file, userId) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n');
                    const headers = lines[0].split(',');
                    
                    const healthData = { sleep: [] };
                    
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        
                        const values = lines[i].split(',');
                        const record = {};
                        headers.forEach((header, index) => {
                            record[header.trim()] = values[index]?.trim();
                        });
                        
                        const date = new Date(record.date || record.Date || record.startDate || record.timestamp);
                        const duration = parseFloat(record.duration || record.Duration || record.hours || record.Hours || 0);
                        
                        healthData.sleep.push({
                            value: duration,
                            startDate: date.toISOString(),
                            timestamp: date.toISOString(),
                            source: 'sleep-app'
                        });
                    }
                    
                    await this.saveHealthData(userId, healthData);
                    resolve({ success: true, metrics: ['sleep'] });
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }

    async parseSleepAppJSON(file, userId) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const healthData = { sleep: [] };
                    
                    const sleepData = Array.isArray(data) ? data : (data.sleep || data.sessions || []);
                    
                    sleepData.forEach(item => {
                        const date = new Date(item.date || item.startDate || item.dateTime || item.timestamp);
                        const duration = item.duration 
                            ? item.duration / 3600000 // Convert ms to hours
                            : (item.hours || item.totalSleepTime || 0);
                        
                        healthData.sleep.push({
                            value: duration,
                            startDate: date.toISOString(),
                            timestamp: date.toISOString(),
                            source: 'sleep-app'
                        });
                    });
                    
                    await this.saveHealthData(userId, healthData);
                    resolve({ success: true, metrics: ['sleep'] });
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }

    // Helper methods
    parseSamsungDate(dateStr) {
        // Handle various Samsung date formats
        let date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            // Try alternative formats
            date = new Date(dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
        }
        return date.toISOString();
    }

    async saveHealthData(userId, healthData) {
        const { HealthDataImporter } = await import('./health-import.js');
        const importer = new HealthDataImporter();
        await importer.saveHealthData(userId, healthData);
    }
}

