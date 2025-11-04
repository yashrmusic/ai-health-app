// Mood Tracking System
import { demoDataManager } from './demo-data.js';

export class MoodTracker {
    constructor() {
        this.moodOptions = [
            { value: 'excellent', label: '😄 Excellent', color: '#10b981' },
            { value: 'good', label: '🙂 Good', color: '#3b82f6' },
            { value: 'neutral', label: '😐 Neutral', color: '#f59e0b' },
            { value: 'bad', label: '😔 Bad', color: '#ef4444' },
            { value: 'terrible', label: '😢 Terrible', color: '#dc2626' }
        ];
        
        this.moodFactors = [
            'sleep_quality',
            'stress_level',
            'exercise',
            'social_interaction',
            'work_pressure',
            'weather',
            'health_condition'
        ];
    }

    // Log daily mood
    async logMood(userId, mood, factors = {}, notes = '') {
        const moodEntry = {
            id: `mood-${Date.now()}`,
            date: new Date().toISOString(),
            mood: mood,
            factors: factors,
            notes: notes,
            weather: await this.getCurrentWeather(),
            aqi: await this.getCurrentAQI(),
            createdAt: new Date().toISOString()
        };

        await this.saveMood(userId, moodEntry);
        return moodEntry;
    }

    // Get mood history
    async getMoodHistory(userId, days = 30) {
        const { db } = await import('./firebase-config.js');
        
        if (!db || demoDataManager.isDemoMode()) {
            const moods = JSON.parse(localStorage.getItem(`moods_${userId}`) || '[]');
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            return moods
                .filter(m => new Date(m.date) >= cutoffDate)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        try {
            const { collection, query, where, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const moodRef = collection(db, `users/${userId}/moods`);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            const q = query(
                moodRef,
                where('date', '>=', cutoffDate.toISOString()),
                orderBy('date', 'desc'),
                limit(100)
            );
            
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting mood history:', error);
            return [];
        }
    }

    // Get mood trends
    async getMoodTrends(userId, days = 30) {
        const moods = await this.getMoodHistory(userId, days);
        
        const moodValues = {
            'excellent': 5,
            'good': 4,
            'neutral': 3,
            'bad': 2,
            'terrible': 1
        };
        
        const trends = {
            average: 0,
            weeklyAverage: [],
            moodDistribution: {},
            correlations: {}
        };
        
        if (moods.length === 0) return trends;
        
        // Calculate average
        const total = moods.reduce((sum, mood) => sum + (moodValues[mood.mood] || 3), 0);
        trends.average = total / moods.length;
        
        // Weekly averages
        const weekGroups = {};
        moods.forEach(mood => {
            const date = new Date(mood.date);
            const week = `${date.getFullYear()}-W${this.getWeekNumber(date)}`;
            if (!weekGroups[week]) {
                weekGroups[week] = [];
            }
            weekGroups[week].push(moodValues[mood.mood] || 3);
        });
        
        trends.weeklyAverage = Object.keys(weekGroups).map(week => ({
            week,
            average: weekGroups[week].reduce((a, b) => a + b, 0) / weekGroups[week].length
        }));
        
        // Mood distribution
        moods.forEach(mood => {
            trends.moodDistribution[mood.mood] = (trends.moodDistribution[mood.mood] || 0) + 1;
        });
        
        // Factor correlations
        moods.forEach(mood => {
            if (mood.factors) {
                Object.keys(mood.factors).forEach(factor => {
                    if (!trends.correlations[factor]) {
                        trends.correlations[factor] = [];
                    }
                    trends.correlations[factor].push({
                        value: mood.factors[factor],
                        mood: moodValues[mood.mood] || 3
                    });
                });
            }
        });
        
        return trends;
    }

    // Get current weather
    async getCurrentWeather() {
        try {
            // Using OpenWeatherMap API (free tier)
            const apiKey = typeof window.__weather_api_key !== 'undefined' 
                ? window.__weather_api_key 
                : null;
            
            if (!apiKey) {
                // Fallback to demo data
                return {
                    temperature: 25,
                    condition: 'Partly Cloudy',
                    humidity: 65,
                    source: 'demo'
                };
            }
            
            // Get user location (would need permission)
            const position = await this.getUserLocation();
            
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${position.lat}&lon=${position.lon}&appid=${apiKey}&units=metric`
            );
            
            if (!response.ok) throw new Error('Weather API error');
            
            const data = await response.json();
            return {
                temperature: data.main.temp,
                condition: data.weather[0].main,
                humidity: data.main.humidity,
                windSpeed: data.wind.speed,
                source: 'openweathermap'
            };
        } catch (error) {
            console.warn('Could not fetch weather:', error);
            return {
                temperature: 25,
                condition: 'Unknown',
                source: 'fallback'
            };
        }
    }

    // Get current AQI
    async getCurrentAQI() {
        try {
            // Using AirVisual API or OpenAQ
            const apiKey = typeof window.__aqi_api_key !== 'undefined' 
                ? window.__aqi_api_key 
                : null;
            
            if (!apiKey) {
                // Fallback to demo data
                return {
                    aqi: 50,
                    level: 'Moderate',
                    source: 'demo'
                };
            }
            
            const position = await this.getUserLocation();
            
            const response = await fetch(
                `https://api.airvisual.com/v2/nearest_city?lat=${position.lat}&lon=${position.lon}&key=${apiKey}`
            );
            
            if (!response.ok) throw new Error('AQI API error');
            
            const data = await response.json();
            return {
                aqi: data.data.current.pollution.aqius,
                level: this.getAQILevel(data.data.current.pollution.aqius),
                source: 'airvisual'
            };
        } catch (error) {
            console.warn('Could not fetch AQI:', error);
            return {
                aqi: 50,
                level: 'Moderate',
                source: 'fallback'
            };
        }
    }

    getAQILevel(aqi) {
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Moderate';
        if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
        if (aqi <= 200) return 'Unhealthy';
        if (aqi <= 300) return 'Very Unhealthy';
        return 'Hazardous';
    }

    getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                position => resolve({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                }),
                error => {
                    console.warn('Location access denied, using default');
                    resolve({ lat: 28.6139, lon: 77.2090 }); // Default to Delhi
                }
            );
        });
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    async saveMood(userId, moodEntry) {
        const { db } = await import('./firebase-config.js');
        
        if (!db || demoDataManager.isDemoMode()) {
            const moods = JSON.parse(localStorage.getItem(`moods_${userId}`) || '[]');
            moods.push(moodEntry);
            localStorage.setItem(`moods_${userId}`, JSON.stringify(moods));
            return;
        }

        try {
            const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const moodRef = collection(db, `users/${userId}/moods`);
            await addDoc(moodRef, moodEntry);
        } catch (error) {
            console.error('Error saving mood:', error);
            throw error;
        }
    }
}

