// Health Data Import - Apple Health Export & Google Fit Integration
import { demoDataManager } from './demo-data.js';

export class HealthDataImporter {
    constructor() {
        this.supportedMetrics = ['steps', 'heartRate', 'sleep', 'bloodOxygen', 'weight', 'distance', 'activeEnergy'];
    }

    // Import Apple Health XML export
    async importAppleHealthXML(file, userId) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const xmlText = e.target.result;
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                    
                    // Check for parsing errors
                    const parserError = xmlDoc.querySelector('parsererror');
                    if (parserError) {
                        throw new Error('Invalid XML file');
                    }
                    
                    const healthData = this.parseAppleHealthXML(xmlDoc);
                    await this.saveHealthData(userId, healthData);
                    
                    resolve({
                        success: true,
                        metrics: Object.keys(healthData),
                        records: Object.values(healthData).reduce((sum, arr) => sum + arr.length, 0)
                    });
                } catch (error) {
                    console.error('Error importing Apple Health data:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Parse Apple Health XML
    parseAppleHealthXML(xmlDoc) {
        const healthData = {};
        const records = xmlDoc.querySelectorAll('Record');
        
        records.forEach(record => {
            const type = record.getAttribute('type');
            const sourceName = record.getAttribute('sourceName');
            const startDate = record.getAttribute('startDate');
            const endDate = record.getAttribute('endDate');
            const value = record.getAttribute('value');
            
            if (!type || !startDate || !value) return;
            
            // Map Apple Health types to our metrics
            const metricType = this.mapAppleHealthType(type);
            if (!metricType) return;
            
            if (!healthData[metricType]) {
                healthData[metricType] = [];
            }
            
            const date = new Date(startDate);
            const dataPoint = {
                value: parseFloat(value),
                startDate: date.toISOString(),
                timestamp: date.toISOString(),
                source: 'apple-health',
                sourceName: sourceName || 'Apple Health'
            };
            
            // Special handling for sleep (duration)
            if (metricType === 'sleep' && endDate) {
                const end = new Date(endDate);
                const duration = (end - date) / (1000 * 60 * 60); // hours
                dataPoint.value = duration;
            }
            
            // Special handling for steps (count)
            if (metricType === 'steps') {
                dataPoint.value = parseInt(value);
            }
            
            healthData[metricType].push(dataPoint);
        });
        
        // Group by date and aggregate
        Object.keys(healthData).forEach(metric => {
            healthData[metric] = this.aggregateByDate(healthData[metric], metric);
        });
        
        return healthData;
    }

    // Map Apple Health types to our metric types
    mapAppleHealthType(appleType) {
        const mapping = {
            'HKQuantityTypeIdentifierStepCount': 'steps',
            'HKQuantityTypeIdentifierHeartRate': 'heartRate',
            'HKCategoryTypeIdentifierSleepAnalysis': 'sleep',
            'HKQuantityTypeIdentifierOxygenSaturation': 'bloodOxygen',
            'HKQuantityTypeIdentifierBodyMass': 'weight',
            'HKQuantityTypeIdentifierDistanceWalkingRunning': 'distance',
            'HKQuantityTypeIdentifierActiveEnergyBurned': 'activeEnergy'
        };
        
        return mapping[appleType] || null;
    }

    // Aggregate data points by date
    aggregateByDate(dataPoints, metricType) {
        const grouped = {};
        
        dataPoints.forEach(point => {
            const date = new Date(point.startDate);
            const dateKey = date.toISOString().split('T')[0];
            
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(point);
        });
        
        // Aggregate each day
        const aggregated = [];
        Object.keys(grouped).forEach(dateKey => {
            const dayPoints = grouped[dateKey];
            
            if (metricType === 'steps') {
                // Sum steps
                const total = dayPoints.reduce((sum, p) => sum + (p.value || 0), 0);
                aggregated.push({
                    value: total,
                    startDate: `${dateKey}T00:00:00.000Z`,
                    timestamp: `${dateKey}T00:00:00.000Z`,
                    source: 'apple-health'
                });
            } else if (metricType === 'sleep') {
                // Sum sleep duration
                const total = dayPoints.reduce((sum, p) => sum + (p.value || 0), 0);
                aggregated.push({
                    value: total,
                    startDate: `${dateKey}T00:00:00.000Z`,
                    timestamp: `${dateKey}T00:00:00.000Z`,
                    source: 'apple-health'
                });
            } else {
                // Average for other metrics
                const avg = dayPoints.reduce((sum, p) => sum + (p.value || 0), 0) / dayPoints.length;
                aggregated.push({
                    value: Math.round(avg * 10) / 10,
                    startDate: `${dateKey}T00:00:00.000Z`,
                    timestamp: `${dateKey}T00:00:00.000Z`,
                    source: 'apple-health'
                });
            }
        });
        
        return aggregated.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    }

    // Import Google Fit data via API
    async importGoogleFit(userId, accessToken, startDate, endDate) {
        try {
            const healthData = {};
            
            // Fetch steps
            const steps = await this.fetchGoogleFitData(accessToken, 'derived:com.google.step_count.delta', startDate, endDate);
            if (steps && steps.length > 0) {
                healthData.steps = steps.map(point => ({
                    value: point.value,
                    startDate: point.startDate,
                    timestamp: point.startDate,
                    source: 'google-fit'
                }));
            }
            
            // Fetch heart rate
            const heartRate = await this.fetchGoogleFitData(accessToken, 'com.google.heart_rate.bpm', startDate, endDate);
            if (heartRate && heartRate.length > 0) {
                healthData.heartRate = heartRate.map(point => ({
                    value: point.value,
                    startDate: point.startDate,
                    timestamp: point.startDate,
                    source: 'google-fit'
                }));
            }
            
            // Fetch sleep
            const sleep = await this.fetchGoogleFitSleep(accessToken, startDate, endDate);
            if (sleep && sleep.length > 0) {
                healthData.sleep = sleep;
            }
            
            // Fetch weight
            const weight = await this.fetchGoogleFitData(accessToken, 'com.google.weight', startDate, endDate);
            if (weight && weight.length > 0) {
                healthData.weight = weight.map(point => ({
                    value: point.value,
                    startDate: point.startDate,
                    timestamp: point.startDate,
                    source: 'google-fit'
                }));
            }
            
            await this.saveHealthData(userId, healthData);
            
            return {
                success: true,
                metrics: Object.keys(healthData),
                records: Object.values(healthData).reduce((sum, arr) => sum + arr.length, 0)
            };
        } catch (error) {
            console.error('Error importing Google Fit data:', error);
            throw error;
        }
    }

    // Fetch Google Fit data
    async fetchGoogleFitData(accessToken, dataType, startDate, endDate) {
        const url = `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`;
        
        const requestBody = {
            aggregateBy: [{
                dataTypeName: dataType
            }],
            bucketByTime: {
                durationMillis: 86400000 // 1 day
            },
            startTimeMillis: startDate.getTime(),
            endTimeMillis: endDate.getTime()
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`Google Fit API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        const points = [];
        
        if (data.bucket) {
            data.bucket.forEach(bucket => {
                if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point) {
                    bucket.dataset[0].point.forEach(point => {
                        if (point.value && point.value[0]) {
                            points.push({
                                value: point.value[0].fpVal || point.value[0].intVal || 0,
                                startDate: new Date(parseInt(point.startTimeNanos) / 1000000).toISOString()
                            });
                        }
                    });
                }
            });
        }
        
        return points;
    }

    // Fetch Google Fit sleep data
    async fetchGoogleFitSleep(accessToken, startDate, endDate) {
        const url = `https://www.googleapis.com/fitness/v1/users/me/sessions`;
        const params = new URLSearchParams({
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            activityType: 72 // Sleep
        });
        
        const response = await fetch(`${url}?${params}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Google Fit API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        const sleepSessions = [];
        
        if (data.session) {
            data.session.forEach(session => {
                const duration = (parseInt(session.endTimeMillis) - parseInt(session.startTimeMillis)) / (1000 * 60 * 60);
                sleepSessions.push({
                    value: duration,
                    startDate: new Date(parseInt(session.startTimeMillis)).toISOString(),
                    timestamp: new Date(parseInt(session.startTimeMillis)).toISOString(),
                    source: 'google-fit'
                });
            });
        }
        
        return sleepSessions;
    }

    // Save imported health data
    async saveHealthData(userId, healthData) {
        const { db } = await import('./firebase-config.js');
        
        // Save to localStorage (works for demo mode and fallback)
        Object.keys(healthData).forEach(metric => {
            const key = `health_sync_${userId}_${metric}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const combined = [...existing, ...healthData[metric]];
            
            // Remove duplicates and sort by date
            const unique = combined.filter((item, index, self) => 
                index === self.findIndex(t => t.startDate === item.startDate)
            ).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            
            localStorage.setItem(key, JSON.stringify(unique));
        });
        
        // Also update health_metrics for demo mode compatibility
        const allMetrics = JSON.parse(localStorage.getItem(`health_metrics_${userId}`) || '{}');
        Object.keys(healthData).forEach(metric => {
            if (!allMetrics[metric]) {
                allMetrics[metric] = [];
            }
            allMetrics[metric] = [...allMetrics[metric], ...healthData[metric]];
            // Remove duplicates
            allMetrics[metric] = allMetrics[metric].filter((item, index, self) => 
                index === self.findIndex(t => t.startDate === item.startDate)
            ).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        });
        localStorage.setItem(`health_metrics_${userId}`, JSON.stringify(allMetrics));
        
        // Save to Firestore if available
        if (db && !demoDataManager.isDemoMode()) {
            try {
                const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
                
                for (const [metric, data] of Object.entries(healthData)) {
                    const healthRef = collection(db, `users/${userId}/healthSync/${metric}`);
                    for (const item of data) {
                        await addDoc(healthRef, {
                            ...item,
                            syncedAt: new Date(),
                            source: item.source || 'manual'
                        });
                    }
                }
            } catch (error) {
                console.error('Error saving to Firestore:', error);
            }
        }
    }

    // Manual data entry
    async addManualData(userId, metricType, value, date) {
        const dataPoint = {
            value: parseFloat(value),
            startDate: date.toISOString(),
            timestamp: date.toISOString(),
            source: 'manual'
        };
        
        await this.saveHealthData(userId, { [metricType]: [dataPoint] });
    }
}

// Google Fit OAuth Helper
export class GoogleFitAuth {
    constructor() {
        this.clientId = typeof window.__google_fit_client_id !== 'undefined' 
            ? window.__google_fit_client_id 
            : null;
        this.scopes = [
            'https://www.googleapis.com/auth/fitness.activity.read',
            'https://www.googleapis.com/auth/fitness.heart_rate.read',
            'https://www.googleapis.com/auth/fitness.sleep.read',
            'https://www.googleapis.com/auth/fitness.body.read'
        ].join(' ');
    }

    // Check if Google Fit is configured
    isConfigured() {
        return this.clientId !== null;
    }

    // Initiate Google Fit OAuth
    async authorize() {
        if (!this.clientId) {
            throw new Error('Google Fit Client ID not configured. Please set __google_fit_client_id.');
        }

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${encodeURIComponent(this.clientId)}&` +
            `redirect_uri=${encodeURIComponent(window.location.origin + '/google-fit-callback.html')}&` +
            `response_type=token&` +
            `scope=${encodeURIComponent(this.scopes)}&` +
            `access_type=offline`;

        window.location.href = authUrl;
    }

    // Get access token from callback
    getAccessTokenFromCallback() {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        return params.get('access_token');
    }

    // Store access token
    saveAccessToken(userId, token) {
        localStorage.setItem(`google_fit_token_${userId}`, token);
    }

    // Get stored access token
    getAccessToken(userId) {
        return localStorage.getItem(`google_fit_token_${userId}`);
    }
}

