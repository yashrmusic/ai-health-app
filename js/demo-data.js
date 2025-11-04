// Demo Data Generator - Comprehensive Synthetic Data for Testing
export class DemoDataGenerator {
    constructor() {
        this.doctors = [
            { name: 'Dr. Priya Sharma', specialty: 'Psychiatry' },
            { name: 'Dr. Rajesh Kumar', specialty: 'Orthopedics' },
            { name: 'Dr. Anjali Patel', specialty: 'Cardiology' },
            { name: 'Dr. Vikram Singh', specialty: 'Dermatology' },
            { name: 'Dr. Meera Reddy', specialty: 'Psychiatry' },
            { name: 'Dr. Arjun Nair', specialty: 'General' }
        ];
        
        this.medicines = [
            { name: 'Sertraline 50mg', purpose: 'Antidepressant for mood stabilization', dosage: '1 tablet daily after breakfast' },
            { name: 'Clonazepam 0.5mg', purpose: 'Anxiolytic for anxiety management', dosage: 'Half tablet at bedtime as needed' },
            { name: 'Metformin 500mg', purpose: 'Blood sugar control for diabetes', dosage: '1 tablet twice daily with meals' },
            { name: 'Atorvastatin 20mg', purpose: 'Cholesterol management', dosage: '1 tablet at night' },
            { name: 'Amlodipine 5mg', purpose: 'Blood pressure control', dosage: '1 tablet daily in the morning' },
            { name: 'Levothyroxine 50mcg', purpose: 'Thyroid hormone replacement', dosage: '1 tablet on empty stomach' },
            { name: 'Paracetamol 500mg', purpose: 'Pain and fever relief', dosage: '1-2 tablets as needed' },
            { name: 'Multivitamin Complex', purpose: 'General health supplement', dosage: '1 tablet daily with meals' }
        ];
    }

    // Generate demo visits
    generateVisits(count = 10) {
        const visits = [];
        const now = new Date();
        
        for (let i = 0; i < count; i++) {
            const doctor = this.doctors[Math.floor(Math.random() * this.doctors.length)];
            const daysAgo = Math.floor(Math.random() * 180); // Last 6 months
            const visitDate = new Date(now);
            visitDate.setDate(visitDate.getDate() - daysAgo);
            visitDate.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
            
            const hasPrescription = Math.random() > 0.3; // 70% have prescriptions
            const medicines = hasPrescription ? this.getRandomMedicines(2 + Math.floor(Math.random() * 3)) : [];
            
            const visit = {
                id: `demo-visit-${i}`,
                doctorName: doctor.name,
                specialty: doctor.specialty,
                visitDate: visitDate.toISOString(),
                address: this.getRandomAddress(),
                paymentAmount: 500 + Math.floor(Math.random() * 2000),
                notes: this.getRandomNotes(doctor.specialty),
                improvementStatus: ['improved', 'same', 'worse'][Math.floor(Math.random() * 3)],
                createdAt: visitDate.toISOString(),
                prescriptionImageUrl: hasPrescription ? 'demo://prescription.jpg' : null,
                testResultUrls: Math.random() > 0.5 ? ['demo://test-result-1.pdf'] : [],
                aiSummary: hasPrescription ? {
                    summary: `Prescription contains ${medicines.length} medications for ${this.getConditionForSpecialty(doctor.specialty)}.`,
                    medicines: medicines
                } : null
            };
            
            visits.push(visit);
        }
        
        return visits.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
    }

    getRandomMedicines(count) {
        const shuffled = [...this.medicines].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    getRandomAddress() {
        const addresses = [
            'Apollo Hospital, Bangalore',
            'Fortis Hospital, Mumbai',
            'Max Healthcare, Delhi',
            'AIIMS, New Delhi',
            'Apollo Hospitals, Chennai',
            'Narayana Health, Bangalore'
        ];
        return addresses[Math.floor(Math.random() * addresses.length)];
    }

    getRandomNotes(specialty) {
        const notes = {
            'Psychiatry': [
                'Patient reported improved mood. Discussed medication adjustments. Follow-up in 2 weeks.',
                'Anxiety levels decreased. Continuing current medication. Recommended therapy sessions.',
                'Mood stable. Discussed sleep patterns. Review in 1 month.'
            ],
            'Cardiology': [
                'BP controlled. Heart rate normal. Continue current medication. Lifestyle modifications advised.',
                'ECG normal. Cholesterol levels improving. Regular exercise recommended.',
                'Heart function stable. Review in 3 months. Continue medication as prescribed.'
            ],
            'Orthopedics': [
                'Knee pain improved with physiotherapy. X-ray shows mild arthritis. Continue exercises.',
                'Back pain reduced. Recommended core strengthening exercises. Follow-up in 1 month.',
                'Joint mobility improved. Prescribed physical therapy. Review progress in 2 weeks.'
            ],
            'Dermatology': [
                'Skin condition improving. Prescribed topical cream. Follow hygiene routine.',
                'Rash cleared. Continue medication for 1 more week. Avoid triggers.',
                'Acne treatment showing results. Review in 2 weeks. Continue skincare routine.'
            ],
            'General': [
                'General health checkup. All vitals normal. Recommended routine tests.',
                'Follow-up visit. Symptoms improved. Continue current treatment.',
                'Annual health checkup. All parameters within normal range.'
            ]
        };
        
        const specialtyNotes = notes[specialty] || notes['General'];
        return specialtyNotes[Math.floor(Math.random() * specialtyNotes.length)];
    }

    getConditionForSpecialty(specialty) {
        const conditions = {
            'Psychiatry': 'mood stabilization and anxiety management',
            'Cardiology': 'cardiovascular health',
            'Orthopedics': 'musculoskeletal support',
            'Dermatology': 'skin health',
            'General': 'general wellness'
        };
        return conditions[specialty] || 'general wellness';
    }

    // Generate health metrics over time
    generateHealthMetrics(days = 90) {
        const metrics = {
            bmi: [],
            weight: [],
            steps: [],
            heartRate: [],
            sleep: [],
            bloodOxygen: []
        };
        
        const now = new Date();
        const baseWeight = 70;
        const baseBMI = 24.5;
        
        for (let i = days; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString();
            
            // Weight with slight variation
            const weight = baseWeight + (Math.random() - 0.5) * 3;
            metrics.weight.push({
                value: Math.round(weight * 10) / 10,
                startDate: dateStr,
                timestamp: dateStr
            });
            
            // BMI
            const height = 170; // cm
            const bmi = weight / Math.pow(height / 100, 2);
            metrics.bmi.push({
                value: Math.round(bmi * 10) / 10,
                startDate: dateStr,
                timestamp: dateStr
            });
            
            // Steps (more on weekdays)
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const steps = isWeekend ? 
                Math.floor(3000 + Math.random() * 5000) : 
                Math.floor(8000 + Math.random() * 7000);
            metrics.steps.push({
                value: steps,
                startDate: dateStr,
                timestamp: dateStr
            });
            
            // Heart rate
            metrics.heartRate.push({
                value: Math.floor(65 + Math.random() * 15),
                startDate: dateStr,
                timestamp: dateStr
            });
            
            // Sleep
            metrics.sleep.push({
                value: Math.round((6.5 + Math.random() * 2) * 10) / 10,
                startDate: dateStr,
                timestamp: dateStr
            });
            
            // Blood oxygen
            metrics.bloodOxygen.push({
                value: Math.floor(95 + Math.random() * 4),
                startDate: dateStr,
                timestamp: dateStr
            });
        }
        
        return metrics;
    }

    // Generate medication reminders
    generateMedicationReminders() {
        const reminders = [];
        const medicines = this.getRandomMedicines(4);
        
        medicines.forEach((med, index) => {
            const frequencies = ['daily', 'twice-daily', 'before-meal', 'after-meal'];
            const frequency = frequencies[Math.floor(Math.random() * frequencies.length)];
            
            reminders.push({
                id: `demo-reminder-${index}`,
                medication: med.name,
                dosage: med.dosage,
                frequency: frequency,
                times: this.parseFrequency(frequency),
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: null,
                status: 'active',
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            });
        });
        
        return reminders;
    }

    parseFrequency(frequency) {
        const times = {
            'daily': ['09:00'],
            'twice-daily': ['09:00', '21:00'],
            'thrice-daily': ['08:00', '14:00', '20:00'],
            'before-meal': ['08:00', '13:00', '19:00'],
            'after-meal': ['09:00', '14:00', '20:00']
        };
        return times[frequency] || ['09:00'];
    }

    // Generate health recommendations
    generateRecommendations() {
        return [
            {
                id: 'demo-rec-1',
                finding: 'Low Urea levels detected',
                severity: 'medium',
                recommendations: [
                    { type: 'hydration', action: 'Drink at least 8-10 glasses of water daily', priority: 'high' },
                    { type: 'diet', action: 'Increase protein intake from lean sources', priority: 'medium' }
                ],
                medications: [],
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active'
            },
            {
                id: 'demo-rec-2',
                finding: 'Low Hemoglobin (Anemia) detected',
                severity: 'high',
                recommendations: [
                    { type: 'diet', action: 'Increase iron-rich foods (spinach, lentils, red meat)', priority: 'high' },
                    { type: 'supplement', action: 'Take iron supplements as prescribed', priority: 'high' }
                ],
                medications: ['Iron supplements (Ferrous Sulfate or as prescribed)'],
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active'
            }
        ];
    }

    // Generate period history
    generatePeriodHistory(cycles = 6) {
        const periods = [];
        const now = new Date();
        
        for (let i = cycles - 1; i >= 0; i--) {
            const cycleLength = 26 + Math.floor(Math.random() * 6); // 26-31 days
            const periodLength = 4 + Math.floor(Math.random() * 3); // 4-6 days
            
            const startDate = new Date(now);
            startDate.setDate(startDate.getDate() - (i * cycleLength));
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + periodLength);
            
            periods.push({
                id: `demo-period-${i}`,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                duration: periodLength,
                cycleNumber: cycles - i,
                createdAt: startDate.toISOString()
            });
        }
        
        return periods.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    }

    // Get current health metrics (latest values)
    getCurrentMetrics(healthMetrics) {
        const latest = {};
        
        Object.keys(healthMetrics).forEach(key => {
            const data = healthMetrics[key];
            if (data && data.length > 0) {
                latest[key] = data[data.length - 1];
            }
        });
        
        return latest;
    }
}

// Demo Data Manager - Handles all demo data operations
export class DemoDataManager {
    constructor() {
        this.generator = new DemoDataGenerator();
        this.userId = 'demo-user';
        this.init();
    }

    init() {
        // Initialize demo data if not exists
        if (!localStorage.getItem('demo_data_initialized')) {
            this.initializeDemoData();
        }
    }

    initializeDemoData() {
        // Generate all demo data
        const visits = this.generator.generateVisits(12);
        const healthMetrics = this.generator.generateHealthMetrics(90);
        const reminders = this.generator.generateMedicationReminders();
        const recommendations = this.generator.generateRecommendations();
        const periods = this.generator.generatePeriodHistory(6);
        
        // Save to localStorage
        localStorage.setItem(`visits_${this.userId}`, JSON.stringify(visits));
        localStorage.setItem(`health_metrics_${this.userId}`, JSON.stringify(healthMetrics));
        localStorage.setItem(`medication_reminders_${this.userId}`, JSON.stringify(reminders));
        localStorage.setItem(`recommendations_${this.userId}`, JSON.stringify(recommendations));
        localStorage.setItem(`periods_${this.userId}`, JSON.stringify(periods));
        
        // Save latest metrics
        const currentMetrics = this.generator.getCurrentMetrics(healthMetrics);
        localStorage.setItem(`health_${this.userId}_bmi`, JSON.stringify([{
            value: currentMetrics.bmi?.value || 24.5,
            timestamp: new Date().toISOString()
        }]));
        localStorage.setItem(`health_${this.userId}_weight`, JSON.stringify([{
            value: currentMetrics.weight?.value || 70,
            timestamp: new Date().toISOString(),
            trend: 'No change'
        }]));
        
        // Save health metrics for sync
        localStorage.setItem(`health_metrics_${this.userId}`, JSON.stringify(healthMetrics));
        
        // Save health sync data (latest values for today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        Object.keys(healthMetrics).forEach(key => {
            const data = healthMetrics[key];
            if (data && data.length > 0) {
                const latest = data[data.length - 1];
                localStorage.setItem(`health_sync_${this.userId}_${key}`, JSON.stringify([latest]));
            }
        });
        
        // Mark as initialized
        localStorage.setItem('demo_data_initialized', 'true');
        localStorage.setItem('demo_mode', 'true');
        
        console.log('Demo data initialized with:', {
            visits: visits.length,
            healthMetrics: Object.keys(healthMetrics),
            reminders: reminders.length,
            recommendations: recommendations.length,
            periods: periods.length
        });
    }

    // Reset demo data
    resetDemoData() {
        localStorage.removeItem('demo_data_initialized');
        localStorage.removeItem('demo_mode');
        Object.keys(localStorage).forEach(key => {
            if (key.includes(this.userId) || key.includes('demo-')) {
                localStorage.removeItem(key);
            }
        });
        this.initializeDemoData();
    }

    // Check if demo mode is active
    isDemoMode() {
        return localStorage.getItem('demo_mode') === 'true';
    }
}

// Global demo data manager instance
export const demoDataManager = new DemoDataManager();

