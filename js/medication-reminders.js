// Medication Reminders and Prescription Compliance
export class MedicationReminders {
    constructor() {
        this.reminders = [];
    }

    // Create reminder from prescription
    async createReminder(userId, medication, dosage, frequency, startDate, endDate) {
        const reminder = {
            id: Date.now().toString(),
            medication,
            dosage,
            frequency, // 'daily', 'twice-daily', 'before-meal', 'after-meal', etc.
            times: this.parseFrequency(frequency),
            startDate,
            endDate,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        await this.saveReminder(userId, reminder);
        this.scheduleNotifications(reminder);
        
        return reminder;
    }

    // Parse frequency to specific times
    parseFrequency(frequency) {
        const times = {
            'daily': ['09:00'],
            'twice-daily': ['09:00', '21:00'],
            'thrice-daily': ['08:00', '14:00', '20:00'],
            'before-meal': ['08:00', '13:00', '19:00'],
            'after-meal': ['09:00', '14:00', '20:00'],
            'morning': ['08:00'],
            'evening': ['20:00'],
            'night': ['22:00']
        };
        
        return times[frequency] || ['09:00'];
    }

    // Schedule browser notifications
    scheduleNotifications(reminder) {
        if (!('Notification' in window)) {
            console.log('Browser does not support notifications');
            return;
        }

        // Request permission
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Schedule notifications for each time
        reminder.times.forEach(time => {
            const [hours, minutes] = time.split(':').map(Number);
            const now = new Date();
            const scheduledTime = new Date();
            scheduledTime.setHours(hours, minutes, 0, 0);
            
            // If time has passed today, schedule for tomorrow
            if (scheduledTime < now) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
            }

            const delay = scheduledTime.getTime() - now.getTime();
            
            setTimeout(() => {
                this.showNotification(reminder);
                // Schedule recurring notification
                this.scheduleRecurring(reminder, time);
            }, delay);
        });
    }

    scheduleRecurring(reminder, time) {
        setInterval(() => {
            const now = new Date();
            const [hours, minutes] = time.split(':').map(Number);
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const scheduledTime = hours * 60 + minutes;
            
            if (currentTime === scheduledTime) {
                this.showNotification(reminder);
            }
        }, 60000); // Check every minute
    }

    showNotification(reminder) {
        if (Notification.permission === 'granted') {
            new Notification('Medication Reminder', {
                body: `Time to take ${reminder.medication} - ${reminder.dosage}`,
                icon: '/assets/images/medication-icon.png',
                tag: reminder.id,
                requireInteraction: true
            });
        }
    }

    // Mark medication as taken
    async markAsTaken(userId, reminderId, timestamp = new Date()) {
        const { db } = await import('./firebase-config.js');
        
        const log = {
            reminderId,
            takenAt: timestamp.toISOString(),
            status: 'taken'
        };

        if (!db) {
            const logs = JSON.parse(localStorage.getItem(`medication_logs_${userId}`) || '[]');
            logs.push(log);
            localStorage.setItem(`medication_logs_${userId}`, JSON.stringify(logs));
            return;
        }

        try {
            const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const logRef = collection(db, `users/${userId}/medicationLogs`);
            await addDoc(logRef, log);
        } catch (error) {
            console.error('Error logging medication:', error);
        }
    }

    // Get compliance stats
    async getComplianceStats(userId, startDate, endDate) {
        const reminders = await this.getActiveReminders(userId);
        const logs = await this.getMedicationLogs(userId, startDate, endDate);
        
        const stats = reminders.map(reminder => {
            const expected = this.calculateExpectedDoses(reminder, startDate, endDate);
            const actual = logs.filter(log => log.reminderId === reminder.id).length;
            const compliance = expected > 0 ? (actual / expected) * 100 : 0;
            
            return {
                medication: reminder.medication,
                expected,
                actual,
                compliance: Math.round(compliance),
                status: compliance >= 80 ? 'good' : compliance >= 60 ? 'fair' : 'poor'
            };
        });
        
        return stats;
    }

    calculateExpectedDoses(reminder, startDate, endDate) {
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        return reminder.times.length * days;
    }

    // Save reminder
    async saveReminder(userId, reminder) {
        const { db } = await import('./firebase-config.js');
        if (!db) {
            const reminders = JSON.parse(localStorage.getItem(`medication_reminders_${userId}`) || '[]');
            reminders.push(reminder);
            localStorage.setItem(`medication_reminders_${userId}`, JSON.stringify(reminders));
            return;
        }

        try {
            const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const reminderRef = collection(db, `users/${userId}/medicationReminders`);
            await addDoc(reminderRef, reminder);
        } catch (error) {
            console.error('Error saving reminder:', error);
        }
    }

    // Get active reminders
    async getActiveReminders(userId) {
        const { db } = await import('./firebase-config.js');
        const { demoDataManager } = await import('./demo-data.js');
        if (!db || demoDataManager.isDemoMode()) {
            return JSON.parse(localStorage.getItem(`medication_reminders_${userId}`) || '[]')
                .filter(r => r.status === 'active');
        }

        try {
            const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const reminderRef = collection(db, `users/${userId}/medicationReminders`);
            const q = query(reminderRef, where('status', '==', 'active'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting reminders:', error);
            return [];
        }
    }

    // Get medication logs
    async getMedicationLogs(userId, startDate, endDate) {
        const { db } = await import('./firebase-config.js');
        if (!db) {
            const logs = JSON.parse(localStorage.getItem(`medication_logs_${userId}`) || '[]');
            return logs.filter(log => {
                const date = new Date(log.takenAt);
                return date >= startDate && date <= endDate;
            });
        }

        try {
            const { collection, query, where, orderBy, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const logRef = collection(db, `users/${userId}/medicationLogs`);
            const q = query(
                logRef,
                where('takenAt', '>=', startDate.toISOString()),
                where('takenAt', '<=', endDate.toISOString()),
                orderBy('takenAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting logs:', error);
            return [];
        }
    }

    // Create reminders from prescription medicines
    async createFromPrescription(userId, prescriptionMedicines) {
        const reminders = [];
        
        for (const med of prescriptionMedicines) {
            // Extract frequency from dosage
            const frequency = this.extractFrequency(med.dosage);
            const reminder = await this.createReminder(
                userId,
                med.name,
                med.dosage,
                frequency,
                new Date(),
                null // No end date
            );
            reminders.push(reminder);
        }
        
        return reminders;
    }

    extractFrequency(dosage) {
        const dosageLower = dosage.toLowerCase();
        if (dosageLower.includes('twice') || dosageLower.includes('2x')) return 'twice-daily';
        if (dosageLower.includes('thrice') || dosageLower.includes('3x')) return 'thrice-daily';
        if (dosageLower.includes('before meal')) return 'before-meal';
        if (dosageLower.includes('after meal')) return 'after-meal';
        if (dosageLower.includes('morning')) return 'morning';
        if (dosageLower.includes('evening')) return 'evening';
        if (dosageLower.includes('night') || dosageLower.includes('bedtime')) return 'night';
        return 'daily';
    }
}

