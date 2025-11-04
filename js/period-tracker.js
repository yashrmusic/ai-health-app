// Period Tracking for Women
export class PeriodTracker {
    constructor() {
        this.cycleLength = 28; // Default cycle length
        this.periodLength = 5; // Default period duration
    }

    // Log period start
    async logPeriodStart(userId, date = new Date()) {
        const period = {
            id: Date.now().toString(),
            startDate: date.toISOString(),
            endDate: null,
            createdAt: new Date().toISOString(),
            cycleNumber: await this.getNextCycleNumber(userId)
        };

        await this.savePeriod(userId, period);
        await this.updateUserSettings(userId, { lastPeriod: date.toISOString() });
        
        return period;
    }

    // Log period end
    async logPeriodEnd(userId, periodId, date = new Date()) {
        const period = await this.getPeriod(userId, periodId);
        if (period) {
            period.endDate = date.toISOString();
            period.duration = this.calculateDuration(period.startDate, period.endDate);
            await this.savePeriod(userId, period);
        }
    }

    // Predict next period
    async predictNextPeriod(userId) {
        const settings = await this.getUserSettings(userId);
        const lastPeriod = settings.lastPeriod ? new Date(settings.lastPeriod) : null;
        
        if (!lastPeriod) return null;

        const cycleLength = settings.cycleLength || this.cycleLength;
        const nextPeriod = new Date(lastPeriod);
        nextPeriod.setDate(nextPeriod.getDate() + cycleLength);
        
        return {
            predictedDate: nextPeriod,
            daysUntil: Math.ceil((nextPeriod - new Date()) / (1000 * 60 * 60 * 24)),
            cycleLength: cycleLength
        };
    }

    // Predict ovulation
    async predictOvulation(userId) {
        const prediction = await this.predictNextPeriod(userId);
        if (!prediction) return null;

        const ovulationDate = new Date(prediction.predictedDate);
        ovulationDate.setDate(ovulationDate.getDate() - 14); // Typically 14 days before period
        
        return {
            predictedDate: ovulationDate,
            fertileWindow: {
                start: new Date(ovulationDate.getTime() - 3 * 24 * 60 * 60 * 1000),
                end: new Date(ovulationDate.getTime() + 2 * 24 * 60 * 60 * 1000)
            },
            daysUntil: Math.ceil((ovulationDate - new Date()) / (1000 * 60 * 60 * 24))
        };
    }

    // Get current cycle status
    async getCurrentCycleStatus(userId) {
        const prediction = await this.predictNextPeriod(userId);
        const ovulation = await this.predictOvulation(userId);
        const recentPeriods = await this.getRecentPeriods(userId, 3);
        
        const today = new Date();
        const isPeriod = recentPeriods.some(p => {
            const start = new Date(p.startDate);
            const end = p.endDate ? new Date(p.endDate) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
            return today >= start && today <= end;
        });

        const isOvulating = ovulation && ovulation.fertileWindow && 
            today >= ovulation.fertileWindow.start && today <= ovulation.fertileWindow.end;

        return {
            isPeriod,
            isOvulating,
            daysUntilPeriod: prediction ? prediction.daysUntil : null,
            daysUntilOvulation: ovulation ? ovulation.daysUntil : null,
            currentPhase: isPeriod ? 'period' : isOvulating ? 'ovulation' : 'follicular'
        };
    }

    // Track symptoms
    async logSymptoms(userId, date, symptoms) {
        const log = {
            id: Date.now().toString(),
            date: date.toISOString(),
            symptoms: symptoms, // Array: ['cramps', 'bloating', 'mood_swings', etc.]
            severity: 'medium', // low, medium, high
            createdAt: new Date().toISOString()
        };

        await this.saveSymptomLog(userId, log);
        return log;
    }

    // Get period history
    async getPeriodHistory(userId, limit = 12) {
        const { db } = await import('./firebase-config.js');
        const { demoDataManager } = await import('./demo-data.js');
        if (!db || demoDataManager.isDemoMode()) {
            return JSON.parse(localStorage.getItem(`periods_${userId}`) || '[]')
                .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
                .slice(0, limit);
        }

        try {
            const { collection, query, orderBy, limit: firestoreLimit, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const periodRef = collection(db, `users/${userId}/periods`);
            const q = query(periodRef, orderBy('startDate', 'desc'), firestoreLimit(limit));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting period history:', error);
            return [];
        }
    }

    async getRecentPeriods(userId, count = 3) {
        return await this.getPeriodHistory(userId, count);
    }

    // Calculate cycle statistics
    async getCycleStats(userId) {
        const periods = await this.getPeriodHistory(userId, 6);
        if (periods.length < 2) return null;

        const cycles = [];
        for (let i = 0; i < periods.length - 1; i++) {
            const cycleLength = this.calculateCycleLength(periods[i + 1].startDate, periods[i].startDate);
            cycles.push(cycleLength);
        }

        const avgCycle = cycles.reduce((a, b) => a + b, 0) / cycles.length;
        const avgDuration = periods
            .filter(p => p.duration)
            .map(p => p.duration)
            .reduce((a, b) => a + b, 0) / periods.filter(p => p.duration).length;

        return {
            averageCycleLength: Math.round(avgCycle),
            averagePeriodDuration: Math.round(avgDuration),
            cycleVariation: Math.max(...cycles) - Math.min(...cycles),
            regularity: avgCycle < 35 && avgCycle > 21 ? 'regular' : 'irregular'
        };
    }

    calculateDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }

    calculateCycleLength(previousStart, currentStart) {
        const prev = new Date(previousStart);
        const curr = new Date(currentStart);
        return Math.ceil((curr - prev) / (1000 * 60 * 60 * 24));
    }

    async getNextCycleNumber(userId) {
        const periods = await this.getPeriodHistory(userId, 1);
        return periods.length > 0 ? periods[0].cycleNumber + 1 : 1;
    }

    async getPeriod(userId, periodId) {
        const periods = await this.getPeriodHistory(userId, 100);
        return periods.find(p => p.id === periodId);
    }

    async savePeriod(userId, period) {
        const { db } = await import('./firebase-config.js');
        if (!db) {
            const periods = JSON.parse(localStorage.getItem(`periods_${userId}`) || '[]');
            const index = periods.findIndex(p => p.id === period.id);
            if (index !== -1) {
                periods[index] = period;
            } else {
                periods.push(period);
            }
            localStorage.setItem(`periods_${userId}`, JSON.stringify(periods));
            return;
        }

        try {
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const periodRef = doc(db, `users/${userId}/periods/${period.id}`);
            await setDoc(periodRef, period);
        } catch (error) {
            console.error('Error saving period:', error);
        }
    }

    async saveSymptomLog(userId, log) {
        const { db } = await import('./firebase-config.js');
        if (!db) {
            const logs = JSON.parse(localStorage.getItem(`period_symptoms_${userId}`) || '[]');
            logs.push(log);
            localStorage.setItem(`period_symptoms_${userId}`, JSON.stringify(logs));
            return;
        }

        try {
            const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const symptomRef = collection(db, `users/${userId}/periodSymptoms`);
            await addDoc(symptomRef, log);
        } catch (error) {
            console.error('Error saving symptom log:', error);
        }
    }

    async getUserSettings(userId) {
        const { db } = await import('./firebase-config.js');
        if (!db) {
            return JSON.parse(localStorage.getItem(`period_settings_${userId}`) || '{}');
        }

        try {
            const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const settingsRef = doc(db, `users/${userId}/settings/period`);
            const snapshot = await getDoc(settingsRef);
            return snapshot.exists() ? snapshot.data() : {};
        } catch (error) {
            console.error('Error getting settings:', error);
            return {};
        }
    }

    async updateUserSettings(userId, updates) {
        const { db } = await import('./firebase-config.js');
        const current = await this.getUserSettings(userId);
        const updated = { ...current, ...updates };

        if (!db) {
            localStorage.setItem(`period_settings_${userId}`, JSON.stringify(updated));
            return;
        }

        try {
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const settingsRef = doc(db, `users/${userId}/settings/period`);
            await setDoc(settingsRef, updated, { merge: true });
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    }
}

