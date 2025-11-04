// Intelligent Health Recommendations based on Lab Reports
export class HealthRecommendations {
    constructor() {
        this.recommendations = {
            'low_urea': {
                severity: 'medium',
                recommendations: [
                    { type: 'hydration', action: 'Drink at least 8-10 glasses of water daily', priority: 'high' },
                    { type: 'diet', action: 'Increase protein intake from lean sources', priority: 'medium' },
                    { type: 'supplement', action: 'Consider consulting doctor about protein supplements', priority: 'low' }
                ],
                medications: []
            },
            'high_urea': {
                severity: 'high',
                recommendations: [
                    { type: 'hydration', action: 'Increase water intake to help flush toxins', priority: 'high' },
                    { type: 'diet', action: 'Reduce protein intake, especially red meat', priority: 'high' },
                    { type: 'lifestyle', action: 'Avoid alcohol and reduce sodium intake', priority: 'high' },
                    { type: 'medication', action: 'Follow up with nephrologist if levels remain high', priority: 'high' }
                ],
                medications: ['Consult doctor for medication if needed']
            },
            'low_hemoglobin': {
                severity: 'high',
                recommendations: [
                    { type: 'diet', action: 'Increase iron-rich foods (spinach, lentils, red meat)', priority: 'high' },
                    { type: 'supplement', action: 'Take iron supplements as prescribed', priority: 'high' },
                    { type: 'diet', action: 'Include Vitamin C to enhance iron absorption', priority: 'medium' },
                    { type: 'lifestyle', action: 'Avoid tea/coffee with meals (reduces iron absorption)', priority: 'medium' }
                ],
                medications: ['Iron supplements (Ferrous Sulfate or as prescribed)']
            },
            'high_blood_pressure': {
                severity: 'high',
                recommendations: [
                    { type: 'diet', action: 'Reduce sodium intake to less than 2g per day', priority: 'high' },
                    { type: 'lifestyle', action: 'Exercise for 30 minutes daily', priority: 'high' },
                    { type: 'diet', action: 'Increase potassium-rich foods (bananas, oranges)', priority: 'medium' },
                    { type: 'lifestyle', action: 'Practice stress management and meditation', priority: 'medium' }
                ],
                medications: ['BP medications as prescribed by doctor']
            },
            'low_vitamin_d': {
                severity: 'medium',
                recommendations: [
                    { type: 'lifestyle', action: 'Get 15-20 minutes of sunlight daily', priority: 'high' },
                    { type: 'diet', action: 'Include fatty fish, egg yolks, fortified foods', priority: 'medium' },
                    { type: 'supplement', action: 'Take Vitamin D3 supplements as prescribed', priority: 'high' }
                ],
                medications: ['Vitamin D3 supplements (Cholecalciferol)']
            },
            'high_cholesterol': {
                severity: 'high',
                recommendations: [
                    { type: 'diet', action: 'Reduce saturated fats, increase omega-3 fatty acids', priority: 'high' },
                    { type: 'diet', action: 'Include more fiber-rich foods (oats, fruits)', priority: 'high' },
                    { type: 'lifestyle', action: 'Regular cardio exercise (30-45 min daily)', priority: 'high' },
                    { type: 'lifestyle', action: 'Maintain healthy weight', priority: 'medium' }
                ],
                medications: ['Statins (as prescribed by doctor)']
            },
            'diabetes': {
                severity: 'high',
                recommendations: [
                    { type: 'diet', action: 'Monitor carbohydrate intake, use glycemic index', priority: 'high' },
                    { type: 'lifestyle', action: 'Regular blood sugar monitoring', priority: 'high' },
                    { type: 'diet', action: 'Small, frequent meals to maintain stable glucose', priority: 'high' },
                    { type: 'lifestyle', action: 'Regular exercise (walking, cycling)', priority: 'high' }
                ],
                medications: ['Metformin or insulin as prescribed']
            },
            'thyroid_low': {
                severity: 'medium',
                recommendations: [
                    { type: 'medication', action: 'Take thyroid medication (Levothyroxine) on empty stomach', priority: 'high' },
                    { type: 'diet', action: 'Include iodine-rich foods (seaweed, fish)', priority: 'medium' },
                    { type: 'lifestyle', action: 'Regular follow-ups to monitor TSH levels', priority: 'high' }
                ],
                medications: ['Levothyroxine (as prescribed)']
            },
            'thyroid_high': {
                severity: 'high',
                recommendations: [
                    { type: 'medication', action: 'Take anti-thyroid medications as prescribed', priority: 'high' },
                    { type: 'diet', action: 'Avoid iodine-rich foods', priority: 'medium' },
                    { type: 'lifestyle', action: 'Manage stress and get adequate rest', priority: 'high' }
                ],
                medications: ['Methimazole or Propylthiouracil (as prescribed)']
            }
        };
    }

    // Analyze lab report and generate recommendations
    async analyzeLabReport(labReportText, labValues) {
        const findings = this.extractFindings(labReportText, labValues);
        const recommendations = [];
        
        for (const finding of findings) {
            const rec = this.recommendations[finding.key];
            if (rec) {
                recommendations.push({
                    finding: finding.description,
                    severity: rec.severity,
                    recommendations: rec.recommendations,
                    medications: rec.medications
                });
            }
        }
        
        return recommendations;
    }

    // Extract findings from lab report
    extractFindings(reportText, labValues) {
        const findings = [];
        const text = reportText.toLowerCase();
        
        // Check for common lab values
        if (labValues.urea && labValues.urea < 15) {
            findings.push({
                key: 'low_urea',
                description: 'Low Urea levels detected'
            });
        }
        
        if (labValues.urea && labValues.urea > 50) {
            findings.push({
                key: 'high_urea',
                description: 'High Urea levels detected'
            });
        }
        
        if (labValues.hemoglobin && labValues.hemoglobin < 12) {
            findings.push({
                key: 'low_hemoglobin',
                description: 'Low Hemoglobin (Anemia) detected'
            });
        }
        
        if (labValues.bloodPressure && (labValues.bloodPressure.systolic > 140 || labValues.bloodPressure.diastolic > 90)) {
            findings.push({
                key: 'high_blood_pressure',
                description: 'High Blood Pressure detected'
            });
        }
        
        if (labValues.vitaminD && labValues.vitaminD < 20) {
            findings.push({
                key: 'low_vitamin_d',
                description: 'Low Vitamin D levels detected'
            });
        }
        
        if (labValues.cholesterol && labValues.cholesterol.total > 200) {
            findings.push({
                key: 'high_cholesterol',
                description: 'High Cholesterol detected'
            });
        }
        
        if (labValues.bloodSugar && (labValues.bloodSugar.fasting > 100 || labValues.bloodSugar.hba1c > 6.5)) {
            findings.push({
                key: 'diabetes',
                description: 'Elevated Blood Sugar (Diabetes risk)'
            });
        }
        
        if (labValues.tsh && labValues.tsh > 4.5) {
            findings.push({
                key: 'thyroid_low',
                description: 'Low Thyroid function (Hypothyroidism)'
            });
        }
        
        if (labValues.tsh && labValues.tsh < 0.4) {
            findings.push({
                key: 'thyroid_high',
                description: 'High Thyroid function (Hyperthyroidism)'
            });
        }
        
        return findings;
    }

    // Save recommendations to user's profile
    async saveRecommendations(userId, recommendations) {
        const { db } = await import('./firebase-config.js');
        if (!db) {
            localStorage.setItem(`recommendations_${userId}`, JSON.stringify(recommendations));
            return;
        }

        try {
            const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const recRef = collection(db, `users/${userId}/recommendations`);
            await addDoc(recRef, {
                recommendations,
                createdAt: new Date(),
                status: 'active'
            });
        } catch (error) {
            console.error('Error saving recommendations:', error);
        }
    }

    // Get active recommendations for user
    async getActiveRecommendations(userId) {
        const { db } = await import('./firebase-config.js');
        const { demoDataManager } = await import('./demo-data.js');
        if (!db || demoDataManager.isDemoMode()) {
            const stored = JSON.parse(localStorage.getItem(`recommendations_${userId}`) || '[]');
            // Flatten nested recommendations if needed
            return Array.isArray(stored) && stored.length > 0 && Array.isArray(stored[0]) 
                ? stored[0] 
                : stored;
        }

        try {
            const { collection, query, where, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const recRef = collection(db, `users/${userId}/recommendations`);
            const q = query(
                recRef,
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                return snapshot.docs[0].data().recommendations;
            }
        } catch (error) {
            console.error('Error getting recommendations:', error);
        }
        
        return [];
    }
}

