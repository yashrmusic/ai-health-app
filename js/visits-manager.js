// Visits Management
import { db } from './firebase-config.js';
import { collection, query, where, orderBy, limit, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function getRecentVisits(userId, limitCount = 5) {
    if (!db) {
        const visits = JSON.parse(localStorage.getItem(`visits_${userId}`) || '[]');
        return visits.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate)).slice(0, limitCount);
    }
    
    try {
        const q = query(
            collection(db, `users/${userId}/visits`),
            orderBy('visitDate', 'desc'),
            limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting recent visits:', error);
        return [];
    }
}

export async function getAllVisits(userId, category = null) {
    if (!db) {
        const visits = JSON.parse(localStorage.getItem(`visits_${userId}`) || '[]');
        let filtered = visits;
        if (category) {
            filtered = visits.filter(v => v.specialty === category);
        }
        return filtered.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
    }
    
    try {
        let q = query(
            collection(db, `users/${userId}/visits`),
            orderBy('visitDate', 'desc')
        );
        
        if (category) {
            q = query(
                collection(db, `users/${userId}/visits`),
                where('specialty', '==', category),
                orderBy('visitDate', 'desc')
            );
        }
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting visits:', error);
        return [];
    }
}

export async function getDoctorCategories(userId) {
    const visits = await getAllVisits(userId);
    const categories = {};
    
    visits.forEach(visit => {
        const specialty = visit.specialty || 'General';
        categories[specialty] = (categories[specialty] || 0) + 1;
    });
    
    return Object.entries(categories).map(([name, count]) => ({
        name,
        count
    })).sort((a, b) => b.count - a.count);
}

export async function saveVisit(userId, visitData) {
    if (!db) {
        const visits = JSON.parse(localStorage.getItem(`visits_${userId}`) || '[]');
        const newVisit = {
            id: Date.now().toString(),
            ...visitData,
            createdAt: new Date().toISOString()
        };
        visits.push(newVisit);
        localStorage.setItem(`visits_${userId}`, JSON.stringify(visits));
        return newVisit;
    }
    
    try {
        const visitRef = collection(db, `users/${userId}/visits`);
        const docRef = await addDoc(visitRef, {
            ...visitData,
            createdAt: new Date()
        });
        return { id: docRef.id, ...visitData };
    } catch (error) {
        console.error('Error saving visit:', error);
        throw error;
    }
}

export async function updateVisit(userId, visitId, updates) {
    if (!db) {
        const visits = JSON.parse(localStorage.getItem(`visits_${userId}`) || '[]');
        const index = visits.findIndex(v => v.id === visitId);
        if (index !== -1) {
            visits[index] = { ...visits[index], ...updates };
            localStorage.setItem(`visits_${userId}`, JSON.stringify(visits));
        }
        return;
    }
    
    try {
        const visitRef = doc(db, `users/${userId}/visits/${visitId}`);
        await updateDoc(visitRef, updates);
    } catch (error) {
        console.error('Error updating visit:', error);
        throw error;
    }
}

export async function deleteVisit(userId, visitId) {
    if (!db) {
        const visits = JSON.parse(localStorage.getItem(`visits_${userId}`) || '[]');
        const filtered = visits.filter(v => v.id !== visitId);
        localStorage.setItem(`visits_${userId}`, JSON.stringify(filtered));
        return;
    }
    
    try {
        const visitRef = doc(db, `users/${userId}/visits/${visitId}`);
        await deleteDoc(visitRef);
    } catch (error) {
        console.error('Error deleting visit:', error);
        throw error;
    }
}

export function subscribeToVisits(userId, callback) {
    if (!db) {
        // Fallback: poll localStorage
        const interval = setInterval(() => {
            const visits = JSON.parse(localStorage.getItem(`visits_${userId}`) || '[]');
            callback(visits);
        }, 1000);
        return () => clearInterval(interval);
    }
    
    try {
        const q = query(
            collection(db, `users/${userId}/visits`),
            orderBy('visitDate', 'desc')
        );
        
        return onSnapshot(q, (snapshot) => {
            const visits = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(visits);
        });
    } catch (error) {
        console.error('Error subscribing to visits:', error);
        return () => {};
    }
}

