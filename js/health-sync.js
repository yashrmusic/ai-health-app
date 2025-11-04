// Health Data Sync - Apple Health & Google Fit Integration
export class HealthDataSync {
    constructor() {
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.isAndroid = /Android/.test(navigator.userAgent);
    }

    // Check if HealthKit is available (iOS)
    async checkHealthKitAvailability() {
        if (!this.isIOS) return false;
        
        // HealthKit requires a native app wrapper
        // For web, we'll use Health App export or manual entry
        return false; // Web apps can't directly access HealthKit
    }

    // Check if Google Fit is available (Android)
    async checkGoogleFitAvailability() {
        if (!this.isAndroid) return false;
        
        // Google Fit API requires OAuth
        // For web, we'll use manual import or Google Fit API
        return false;
    }

    // Sync steps data
    async syncSteps(userId, startDate, endDate) {
        const steps = await this.getStepsData(startDate, endDate);
        if (steps && steps.length > 0) {
            await this.saveHealthData(userId, 'steps', steps);
        }
        return steps;
    }

    // Sync heart rate
    async syncHeartRate(userId, startDate, endDate) {
        const heartRate = await this.getHeartRateData(startDate, endDate);
        if (heartRate && heartRate.length > 0) {
            await this.saveHealthData(userId, 'heartRate', heartRate);
        }
        return heartRate;
    }

    // Sync sleep data
    async syncSleep(userId, startDate, endDate) {
        const sleep = await this.getSleepData(startDate, endDate);
        if (sleep && sleep.length > 0) {
            await this.saveHealthData(userId, 'sleep', sleep);
        }
        return sleep;
    }

    // Sync blood oxygen
    async syncBloodOxygen(userId, startDate, endDate) {
        const bloodO2 = await this.getBloodOxygenData(startDate, endDate);
        if (bloodO2 && bloodO2.length > 0) {
            await this.saveHealthData(userId, 'bloodOxygen', bloodO2);
        }
        return bloodO2;
    }

    // Sync weight
    async syncWeight(userId, startDate, endDate) {
        const weight = await this.getWeightData(startDate, endDate);
        if (weight && weight.length > 0) {
            await this.saveHealthData(userId, 'weight', weight);
        }
        return weight;
    }

    // Get steps from health app (manual import or API)
    async getStepsData(startDate, endDate) {
        // For web: Use manual import or API
        // User can export from Health app and import CSV
        return this.importFromCSV('steps', startDate, endDate);
    }

    async getHeartRateData(startDate, endDate) {
        return this.importFromCSV('heartRate', startDate, endDate);
    }

    async getSleepData(startDate, endDate) {
        return this.importFromCSV('sleep', startDate, endDate);
    }

    async getBloodOxygenData(startDate, endDate) {
        return this.importFromCSV('bloodOxygen', startDate, endDate);
    }

    async getWeightData(startDate, endDate) {
        return this.importFromCSV('weight', startDate, endDate);
    }

    // Import from CSV (user uploads export from Health app)
    async importFromCSV(type, startDate, endDate) {
        // This would parse CSV file uploaded by user
        // For now, return mock data structure
        return [];
    }

    // Google Fit API integration
    async connectGoogleFit() {
        // OAuth flow for Google Fit
        const clientId = typeof __google_fit_client_id !== 'undefined' ? __google_fit_client_id : '';
        if (!clientId) {
            throw new Error('Google Fit client ID not configured');
        }

        // Redirect to Google OAuth
        const redirectUri = window.location.origin + '/google-fit-callback.html';
        const scope = 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.heart_rate.read';
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
        
        window.location.href = authUrl;
    }

    // Apple Health export parser
    parseAppleHealthExport(xmlData) {
        // Parse XML export from Apple Health
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlData, 'text/xml');
        const records = xml.getElementsByTagName('Record');
        
        const data = [];
        for (let record of records) {
            const type = record.getAttribute('type');
            const value = record.getAttribute('value');
            const startDate = record.getAttribute('startDate');
            const endDate = record.getAttribute('endDate');
            
            data.push({
                type,
                value: parseFloat(value),
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null
            });
        }
        
        return data;
    }

    // Save health data to Firestore
    async saveHealthData(userId, dataType, data) {
        const { db } = await import('./firebase-config.js');
        if (!db) {
            // Fallback to localStorage
            const key = `health_sync_${userId}_${dataType}`;
            localStorage.setItem(key, JSON.stringify(data));
            return;
        }

        try {
            const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const healthRef = collection(db, `users/${userId}/healthSync/${dataType}`);
            
            // Batch save
            for (const item of data) {
                await addDoc(healthRef, {
                    ...item,
                    syncedAt: new Date(),
                    source: this.isIOS ? 'apple-health' : 'google-fit'
                });
            }
        } catch (error) {
            console.error('Error saving health data:', error);
            throw error;
        }
    }

    // Get latest health metrics for dashboard
    async getCurrentHealthMetrics(userId) {
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        const metrics = {
            steps: await this.getLatestMetric(userId, 'steps', startDate),
            heartRate: await this.getLatestMetric(userId, 'heartRate', startDate),
            sleep: await this.getLatestMetric(userId, 'sleep', startDate),
            bloodOxygen: await this.getLatestMetric(userId, 'bloodOxygen', startDate),
            weight: await this.getLatestMetric(userId, 'weight', startDate)
        };
        
        return metrics;
    }

    async getLatestMetric(userId, type, startDate) {
        const { db } = await import('./firebase-config.js');
        if (!db) {
            const key = `health_sync_${userId}_${type}`;
            const data = JSON.parse(localStorage.getItem(key) || '[]');
            return data.filter(d => new Date(d.startDate) >= startDate)
                      .sort((a, b) => b.startDate - a.startDate)[0] || null;
        }

        try {
            const { collection, query, where, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const healthRef = collection(db, `users/${userId}/healthSync/${type}`);
            const q = query(
                healthRef,
                where('startDate', '>=', startDate),
                orderBy('startDate', 'desc'),
                limit(1)
            );
            
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            }
        } catch (error) {
            console.error(`Error getting latest ${type}:`, error);
        }
        
        return null;
    }
}

