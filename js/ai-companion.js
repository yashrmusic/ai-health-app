// AI Health Companion - Intelligent Health Assistant
import { demoDataManager } from './demo-data.js';

export class AICompanion {
    constructor() {
        this.detectedConditions = [];
        this.healthInsights = [];
        this.dietRecommendations = [];
    }

    // Initialize AI Companion
    async initialize(userId) {
        await this.detectHealthConditions(userId);
        await this.generateHealthInsights(userId);
        await this.generateDietRecommendations(userId);
    }

    // Detect health conditions from visits, prescriptions, and reports
    async detectHealthConditions(userId) {
        const { getAllVisits } = await import('./visits-manager.js');
        const visits = await getAllVisits(userId);
        
        const conditions = new Set();
        
        // Analyze visits and prescriptions
        visits.forEach(visit => {
            if (visit.aiSummary && visit.aiSummary.medicines) {
                visit.aiSummary.medicines.forEach(med => {
                    // Detect conditions from medications
                    const medName = med.name.toLowerCase();
                    const purpose = med.purpose.toLowerCase();
                    
                    if (medName.includes('metformin') || medName.includes('insulin') || purpose.includes('diabetes') || purpose.includes('blood sugar')) {
                        conditions.add('diabetes');
                    }
                    if (medName.includes('atorvastatin') || medName.includes('statin') || purpose.includes('cholesterol')) {
                        conditions.add('high_cholesterol');
                    }
                    if (medName.includes('amlodipine') || medName.includes('lisinopril') || purpose.includes('blood pressure')) {
                        conditions.add('hypertension');
                    }
                    if (medName.includes('sertraline') || medName.includes('fluoxetine') || purpose.includes('depression') || purpose.includes('anxiety')) {
                        conditions.add('mental_health');
                    }
                    if (medName.includes('levothyroxine') || purpose.includes('thyroid')) {
                        conditions.add('thyroid');
                    }
                });
            }
            
            // Detect from specialty
            const specialty = visit.specialty.toLowerCase();
            if (specialty.includes('cardio')) {
                conditions.add('cardiovascular');
            }
            if (specialty.includes('psych') || specialty.includes('mental')) {
                conditions.add('mental_health');
            }
            if (specialty.includes('ortho')) {
                conditions.add('musculoskeletal');
            }
        });
        
        // Check recommendations for conditions
        const { HealthRecommendations } = await import('./health-recommendations.js');
        const healthRecs = new HealthRecommendations();
        const recommendations = await healthRecs.getActiveRecommendations(userId);
        
        recommendations.forEach(rec => {
            const finding = rec.finding.toLowerCase();
            if (finding.includes('diabetes') || finding.includes('glucose') || finding.includes('sugar')) {
                conditions.add('diabetes');
            }
            if (finding.includes('anemia') || finding.includes('hemoglobin')) {
                conditions.add('anemia');
            }
            if (finding.includes('cholesterol')) {
                conditions.add('high_cholesterol');
            }
        });
        
        this.detectedConditions = Array.from(conditions);
        
        // Save detected conditions
        localStorage.setItem(`ai_conditions_${userId}`, JSON.stringify(this.detectedConditions));
        
        return this.detectedConditions;
    }

    // Generate intelligent health insights
    async generateHealthInsights(userId) {
        const insights = [];
        
        // Get recent visit
        const { getRecentVisits } = await import('./visits-manager.js');
        const recentVisits = await getRecentVisits(userId, 1);
        
        if (recentVisits.length > 0) {
            const visit = recentVisits[0];
            
            // Combine prescription, report, and meeting data
            let insight = {
                type: 'visit_summary',
                title: `Update from ${visit.doctorName}`,
                date: visit.visitDate,
                priority: 'high',
                content: []
            };
            
            // Prescription analysis
            if (visit.aiSummary) {
                insight.content.push({
                    type: 'prescription',
                    text: visit.aiSummary.summary || 'Prescription reviewed'
                });
                
                // Check for specific conditions
                if (visit.aiSummary.medicines) {
                    const diabetesMeds = visit.aiSummary.medicines.filter(m => 
                        m.name.toLowerCase().includes('metformin') || 
                        m.name.toLowerCase().includes('insulin') ||
                        m.purpose.toLowerCase().includes('diabetes')
                    );
                    
                    if (diabetesMeds.length > 0) {
                        insight.content.push({
                            type: 'condition_alert',
                            text: 'Diabetes management: Medication prescribed to help control blood sugar levels.'
                        });
                    }
                }
            }
            
            // Meeting transcription insights
            if (visit.notes) {
                const notes = visit.notes.toLowerCase();
                
                // Extract key insights from notes
                if (notes.includes('sleep') || notes.includes('late')) {
                    insight.content.push({
                        type: 'lifestyle',
                        text: 'Doctor mentioned sleep patterns affecting health. Maintain consistent sleep schedule.'
                    });
                }
                
                if (notes.includes('sugar') || notes.includes('glucose') || notes.includes('diabetes')) {
                    insight.content.push({
                        type: 'condition_alert',
                        text: 'Blood sugar monitoring recommended. Continue tracking glucose levels.'
                    });
                }
                
                if (notes.includes('follow') || notes.includes('next')) {
                    const match = notes.match(/follow.*?(\d+).*?(week|month|day)/i);
                    if (match) {
                        insight.content.push({
                            type: 'reminder',
                            text: `Follow-up appointment recommended in ${match[1]} ${match[2]}s.`
                        });
                    }
                }
            }
            
            // Check improvement status
            if (visit.improvementStatus) {
                if (visit.improvementStatus === 'improved') {
                    insight.content.push({
                        type: 'positive',
                        text: 'Great progress! Health improvements observed. Continue current treatment plan.'
                    });
                } else if (visit.improvementStatus === 'worse') {
                    insight.content.push({
                        type: 'alert',
                        text: 'Health concerns noted. Please follow doctor recommendations closely.'
                    });
                }
            }
            
            insights.push(insight);
        }
        
        // Generate insights from health metrics
        const { getHealthMetrics } = await import('./health-metrics.js');
        const metrics = await getHealthMetrics(userId);
        
        if (metrics.bmi) {
            const bmi = metrics.bmi.value;
            if (bmi > 30) {
                insights.push({
                    type: 'metric_insight',
                    title: 'BMI Alert',
                    priority: 'high',
                    content: [{
                        type: 'alert',
                        text: `BMI is ${bmi.toFixed(1)} (Obese). Consider consulting a nutritionist and increasing physical activity.`
                    }]
                });
            } else if (bmi > 25) {
                insights.push({
                    type: 'metric_insight',
                    title: 'BMI Warning',
                    priority: 'medium',
                    content: [{
                        type: 'warning',
                        text: `BMI is ${bmi.toFixed(1)} (Overweight). Monitor diet and exercise regularly.`
                    }]
                });
            }
        }
        
        this.healthInsights = insights;
        localStorage.setItem(`ai_insights_${userId}`, JSON.stringify(insights));
        
        return insights;
    }

    // Generate smart reminders based on conditions
    async generateSmartReminders(userId) {
        const reminders = [];
        const conditions = await this.getDetectedConditions(userId);
        
        // Get upcoming visits
        const { getAllVisits } = await import('./visits-manager.js');
        const visits = await getAllVisits(userId);
        
        visits.forEach(visit => {
            const visitDate = new Date(visit.visitDate);
            const now = new Date();
            const daysDiff = Math.ceil((visitDate - now) / (1000 * 60 * 60 * 24));
            
            // Remind 3 days before appointment
            if (daysDiff > 0 && daysDiff <= 3) {
                reminders.push({
                    type: 'doctor_visit',
                    title: `Upcoming Appointment with ${visit.doctorName}`,
                    message: `Your appointment is in ${daysDiff} day(s). Don't forget to prepare your questions.`,
                    date: visit.visitDate,
                    priority: 'high'
                });
            }
        });
        
        // Diabetes-specific reminders
        if (conditions.includes('diabetes')) {
            reminders.push({
                type: 'condition',
                title: 'Diabetes Management',
                message: 'Remember to check blood sugar levels regularly. Keep your glucose monitor handy.',
                priority: 'high',
                frequency: 'daily'
            });
            
            reminders.push({
                type: 'diet',
                title: 'Meal Timing',
                message: 'Maintain consistent meal times to help stabilize blood sugar levels.',
                priority: 'medium',
                frequency: 'mealtime'
            });
        }
        
        // Medication reminders (from medication reminders module)
        const { MedicationReminders } = await import('./medication-reminders.js');
        const medReminders = new MedicationReminders();
        const activeReminders = await medReminders.getActiveReminders(userId);
        
        activeReminders.forEach(reminder => {
            reminders.push({
                type: 'medication',
                title: `Medication: ${reminder.medication}`,
                message: `Time to take ${reminder.medication}. ${reminder.dosage}`,
                priority: 'high',
                times: reminder.times,
                reminderId: reminder.id
            });
        });
        
        localStorage.setItem(`ai_reminders_${userId}`, JSON.stringify(reminders));
        
        return reminders;
    }

    // Generate diet recommendations based on BMI and conditions
    async generateDietRecommendations(userId) {
        const { getHealthMetrics } = await import('./health-metrics.js');
        const metrics = await getHealthMetrics(userId);
        const conditions = await this.getDetectedConditions(userId);
        
        const recommendations = [];
        
        // BMI-based recommendations
        if (metrics.bmi) {
            const bmi = metrics.bmi.value;
            
            if (bmi > 30) {
                recommendations.push({
                    meal: 'Breakfast',
                    suggestion: 'Oatmeal with berries and a boiled egg',
                    calories: 350,
                    reason: 'High fiber, low calorie, keeps you full longer',
                    macronutrients: { protein: '20g', carbs: '45g', fat: '10g' }
                });
                
                recommendations.push({
                    meal: 'Lunch',
                    suggestion: 'Grilled chicken salad with mixed vegetables',
                    calories: 400,
                    reason: 'Lean protein with nutrient-dense vegetables',
                    macronutrients: { protein: '35g', carbs: '25g', fat: '15g' }
                });
                
                recommendations.push({
                    meal: 'Dinner',
                    suggestion: 'Baked fish with quinoa and steamed broccoli',
                    calories: 450,
                    reason: 'Omega-3 rich fish with complete protein quinoa',
                    macronutrients: { protein: '40g', carbs: '50g', fat: '12g' }
                });
            } else if (bmi > 25) {
                recommendations.push({
                    meal: 'Breakfast',
                    suggestion: 'Greek yogurt with granola and fresh fruits',
                    calories: 300,
                    reason: 'Balanced macronutrients for sustained energy',
                    macronutrients: { protein: '15g', carbs: '40g', fat: '8g' }
                });
            }
        }
        
        // Condition-specific recommendations
        if (conditions.includes('diabetes')) {
            recommendations.push({
                meal: 'Snack',
                suggestion: 'Apple slices with almond butter',
                calories: 150,
                reason: 'Low glycemic index, helps maintain stable blood sugar',
                macronutrients: { protein: '5g', carbs: '20g', fat: '8g' },
                conditionSpecific: true
            });
            
            recommendations.push({
                meal: 'Breakfast',
                suggestion: 'Vegetable omelet with whole grain toast',
                calories: 320,
                reason: 'High protein, low carbs, helps control glucose spikes',
                macronutrients: { protein: '25g', carbs: '25g', fat: '12g' },
                conditionSpecific: true
            });
        }
        
        if (conditions.includes('high_cholesterol')) {
            recommendations.push({
                meal: 'Lunch',
                suggestion: 'Salmon with brown rice and green vegetables',
                calories: 480,
                reason: 'Omega-3 fatty acids help lower cholesterol',
                macronutrients: { protein: '35g', carbs: '45g', fat: '18g' },
                conditionSpecific: true
            });
        }
        
        if (conditions.includes('hypertension')) {
            recommendations.push({
                meal: 'Snack',
                suggestion: 'Banana with unsalted nuts',
                calories: 180,
                reason: 'Potassium-rich, low sodium snack',
                macronutrients: { protein: '6g', carbs: '25g', fat: '10g' },
                conditionSpecific: true
            });
        }
        
        if (conditions.includes('anemia')) {
            recommendations.push({
                meal: 'Lunch',
                suggestion: 'Spinach and lentil curry with brown rice',
                calories: 420,
                reason: 'Iron-rich foods to boost hemoglobin',
                macronutrients: { protein: '20g', carbs: '60g', fat: '8g' },
                conditionSpecific: true
            });
        }
        
        this.dietRecommendations = recommendations;
        localStorage.setItem(`ai_diet_recommendations_${userId}`, JSON.stringify(recommendations));
        
        return recommendations;
    }

    // Get detected conditions
    async getDetectedConditions(userId) {
        if (this.detectedConditions.length === 0) {
            const stored = localStorage.getItem(`ai_conditions_${userId}`);
            if (stored) {
                this.detectedConditions = JSON.parse(stored);
            } else {
                await this.detectHealthConditions(userId);
            }
        }
        return this.detectedConditions;
    }

    // Get health insights
    async getHealthInsights(userId) {
        if (this.healthInsights.length === 0) {
            const stored = localStorage.getItem(`ai_insights_${userId}`);
            if (stored) {
                this.healthInsights = JSON.parse(stored);
            } else {
                await this.generateHealthInsights(userId);
            }
        }
        return this.healthInsights;
    }

    // Get diet recommendations
    async getDietRecommendations(userId) {
        if (this.dietRecommendations.length === 0) {
            const stored = localStorage.getItem(`ai_diet_recommendations_${userId}`);
            if (stored) {
                this.dietRecommendations = JSON.parse(stored);
            } else {
                await this.generateDietRecommendations(userId);
            }
        }
        return this.dietRecommendations;
    }

    // Analyze meeting transcription
    async analyzeMeetingTranscription(userId, visitId, transcription) {
        const insights = [];
        
        // Use simple keyword analysis (can be enhanced with AI)
        const text = transcription.toLowerCase();
        
        // Extract key topics
        if (text.includes('sleep') || text.includes('rest')) {
            insights.push({
                type: 'lifestyle',
                topic: 'Sleep',
                insight: 'Sleep patterns discussed. Doctor emphasized importance of consistent sleep schedule.',
                actionItems: ['Maintain 7-8 hours of sleep', 'Avoid late night activities']
            });
        }
        
        if (text.includes('sugar') || text.includes('glucose') || text.includes('diabetes')) {
            insights.push({
                type: 'condition',
                topic: 'Blood Sugar',
                insight: 'Blood sugar levels discussed. Monitor glucose regularly.',
                actionItems: ['Check blood sugar before meals', 'Track readings in app']
            });
        }
        
        if (text.includes('diet') || text.includes('food') || text.includes('meal')) {
            insights.push({
                type: 'nutrition',
                topic: 'Diet',
                insight: 'Dietary recommendations provided. Follow meal plan as suggested.',
                actionItems: ['Follow recommended meal times', 'Track food intake']
            });
        }
        
        if (text.includes('exercise') || text.includes('activity') || text.includes('walk')) {
            insights.push({
                type: 'lifestyle',
                topic: 'Exercise',
                insight: 'Physical activity discussed. Regular exercise recommended.',
                actionItems: ['Aim for 30 minutes daily', 'Track steps and activity']
            });
        }
        
        // Save insights
        const visitInsights = JSON.parse(localStorage.getItem(`visit_insights_${visitId}`) || '[]');
        visitInsights.push(...insights);
        localStorage.setItem(`visit_insights_${visitId}`, JSON.stringify(visitInsights));
        
        return insights;
    }
}

