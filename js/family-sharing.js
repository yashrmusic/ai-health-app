// Family Sharing Module
import { db } from './firebase-config.js';
import { collection, addDoc, query, where, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function shareWithFamily(userId, familyMemberEmail, shareData) {
    if (!db) {
        // Fallback: store in localStorage
        const shares = JSON.parse(localStorage.getItem(`family_shares_${userId}`) || '[]');
        shares.push({
            email: familyMemberEmail,
            data: shareData,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem(`family_shares_${userId}`, JSON.stringify(shares));
        return { success: true };
    }

    try {
        const shareRef = collection(db, `users/${userId}/sharedWith`);
        await addDoc(shareRef, {
            email: familyMemberEmail,
            data: shareData,
            timestamp: new Date().toISOString(),
            createdAt: new Date()
        });
        return { success: true };
    } catch (error) {
        console.error('Error sharing with family:', error);
        throw error;
    }
}

export async function getSharedData(userId) {
    if (!db) {
        return JSON.parse(localStorage.getItem(`family_shares_${userId}`) || '[]');
    }

    try {
        const q = query(collection(db, `users/${userId}/sharedWith`));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting shared data:', error);
        return [];
    }
}

export async function shareVisit(userId, visitId, familyMemberEmail) {
    // Get visit data
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
    
    let visitData = null;
    if (db) {
        const visitRef = doc(db, `users/${userId}/visits/${visitId}`);
        const visitSnap = await getDoc(visitRef);
        if (visitSnap.exists()) {
            visitData = visitSnap.data();
        }
    } else {
        const visits = JSON.parse(localStorage.getItem(`visits_${userId}`) || '[]');
        visitData = visits.find(v => v.id === visitId);
    }

    if (!visitData) {
        throw new Error('Visit not found');
    }

    // Share the visit
    await shareWithFamily(userId, familyMemberEmail, {
        type: 'visit',
        visitId: visitId,
        visitData: visitData
    });

    return { success: true };
}

export async function shareHealthMetrics(userId, familyMemberEmail) {
    const { getHealthMetrics } = await import('./health-metrics.js');
    const metrics = await getHealthMetrics(userId);

    await shareWithFamily(userId, familyMemberEmail, {
        type: 'healthMetrics',
        metrics: metrics
    });

    return { success: true };
}

export function generateShareLink(userId, shareType, dataId) {
    // Generate a shareable link
    const baseUrl = window.location.origin;
    const shareToken = btoa(JSON.stringify({
        userId,
        type: shareType,
        id: dataId,
        timestamp: Date.now()
    }));
    
    return `${baseUrl}/shared?token=${shareToken}`;
}

