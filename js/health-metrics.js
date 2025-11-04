// Health Metrics Management
import { db } from './firebase-config.js';
import { collection, addDoc, query, where, orderBy, limit, getDocs, getDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { demoDataManager } from './demo-data.js';

export function calculateBMI(heightCm, weightKg) {
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
}

export async function saveHealthMetric(userId, metricType, value) {
    if (!db) {
        // Fallback to localStorage
        const key = `health_${userId}_${metricType}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({
            value,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem(key, JSON.stringify(existing.slice(-30))); // Keep last 30
        return;
    }
    
    try {
        const metricRef = collection(db, `users/${userId}/healthMetrics`);
        await addDoc(metricRef, {
            type: metricType,
            value: value,
            timestamp: new Date().toISOString(),
            createdAt: new Date()
        });
        
        // Also update latest value
        const latestRef = doc(db, `users/${userId}/latestMetrics/${metricType}`);
        const previous = await getDoc(latestRef);
        let trend = 'No change';
        
        if (previous.exists()) {
            const prevValue = previous.data().value;
            if (value > prevValue) trend = 'Increased';
            else if (value < prevValue) trend = 'Decreased';
        }
        
        await setDoc(latestRef, {
            value: value,
            timestamp: new Date().toISOString(),
            trend: trend
        });
        
    } catch (error) {
        console.error('Error saving health metric:', error);
        throw error;
    }
}

export async function getHealthMetrics(userId) {
    if (!db || demoDataManager.isDemoMode()) {
        // Fallback to localStorage
        const bmiData = JSON.parse(localStorage.getItem(`health_${userId}_bmi`) || '[]');
        const weightData = JSON.parse(localStorage.getItem(`health_${userId}_weight`) || '[]');
        
        return {
            bmi: bmiData.length > 0 ? { value: bmiData[bmiData.length - 1].value } : null,
            weight: weightData.length > 0 ? { 
                value: weightData[weightData.length - 1].value,
                trend: weightData[weightData.length - 1].trend || 'No change'
            } : null
        };
    }
    
    try {
        const metrics = {
            bmi: null,
            weight: null
        };
        
        const latestRefs = ['bmi', 'weight'];
        for (const type of latestRefs) {
            const latestRef = doc(db, `users/${userId}/latestMetrics/${type}`);
            const snapshot = await getDoc(latestRef);
            if (snapshot.exists()) {
                metrics[type] = snapshot.data();
            }
        }
        
        return metrics;
    } catch (error) {
        console.error('Error getting health metrics:', error);
        return { bmi: null, weight: null };
    }
}

export async function getHealthMetricHistory(userId, metricType, limitCount = 30) {
    if (!db) {
        const key = `health_${userId}_${metricType}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    }
    
    try {
        const q = query(
            collection(db, `users/${userId}/healthMetrics`),
            where('type', '==', metricType),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).reverse();
    } catch (error) {
        console.error('Error getting health metric history:', error);
        return [];
    }
}

