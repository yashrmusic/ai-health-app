// Homepage Logic - Optimized with lazy loading
import { getCurrentUser } from './auth.js';
import { initializeFirebase } from './firebase-config.js';
import { calculateBMI, saveHealthMetric, getHealthMetrics } from './health-metrics.js';
import { getDoctorCategories, getRecentVisits } from './visits-manager.js';

let db = null;
let userId = null;
let healthSync = null;
let healthRecs = null;
let medicationReminders = null;
let dynamicCategories = null;

async function init() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    userId = user.uid;
    const { db: firestoreDb } = await initializeFirebase();
    db = firestoreDb;
    
    await loadDashboard();
    setupEventListeners();
    
    // Initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

async function loadDashboard() {
    // Load critical data first
    await Promise.all([
        loadHealthMetrics(),
        loadDoctorCategories(),
        loadRecentVisits()
    ]);
    
    // Lazy load heavy modules
    const [
        { HealthDataSync: HealthDataSyncClass },
        { HealthRecommendations: HealthRecommendationsClass },
        { MedicationReminders: MedicationRemindersClass },
        { DynamicCategories: DynamicCategoriesClass }
    ] = await Promise.all([
        import('./health-sync.js'),
        import('./health-recommendations.js'),
        import('./medication-reminders.js'),
        import('./dynamic-categories.js')
    ]);
    
    healthSync = new HealthDataSyncClass();
    healthRecs = new HealthRecommendationsClass();
    medicationReminders = new MedicationRemindersClass();
    dynamicCategories = new DynamicCategoriesClass();
    
    // Load secondary data
    await Promise.all([
        loadCurrentBodyHealth(),
        loadHealthRecommendations(),
        loadMedicationReminders(),
        loadCategoryProgress()
    ]);
    
    await loadHealthTrends();
}

async function loadHealthMetrics() {
    const metrics = await getHealthMetrics(userId);
    
    if (metrics.bmi) {
        document.getElementById('bmi-value').textContent = metrics.bmi.value.toFixed(1);
        document.getElementById('bmi-status').textContent = getBMIStatus(metrics.bmi.value);
    }
    
    if (metrics.weight) {
        document.getElementById('weight-value').textContent = `${metrics.weight.value} kg`;
        const trend = metrics.weight.trend || 'No change';
        document.getElementById('weight-trend').textContent = trend;
    }
}

function getBMIStatus(bmi) {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
}

async function loadDoctorCategories() {
    const categories = await getDoctorCategories(userId);
    const container = document.getElementById('doctor-categories');
    
    const categoryIcons = {
        'Psychiatry': 'brain',
        'Cardiology': 'heart',
        'Orthopedics': 'bone',
        'Dermatology': 'sparkles',
        'General': 'user-md',
        'Other': 'stethoscope'
    };
    
    container.innerHTML = categories.map(cat => {
        const icon = categoryIcons[cat.name] || 'stethoscope';
        return `
            <div class="glass-card p-4 text-center cursor-pointer hover:scale-105 transition-transform" onclick="navigateTo('visits.html?category=${cat.name}')">
                <i data-lucide="${icon}" class="w-8 h-8 mx-auto mb-2 text-blue-400"></i>
                <div class="text-sm font-semibold text-white">${cat.name}</div>
                <div class="text-xs text-gray-400 mt-1">${cat.count} visits</div>
            </div>
        `;
    }).join('');
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

async function loadRecentVisits() {
    const visits = await getRecentVisits(userId, 3);
    const container = document.getElementById('recent-visits');
    
    if (visits.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-8">No visits yet. Start by logging your first visit!</p>';
        return;
    }
    
    container.innerHTML = visits.map(visit => {
        const date = new Date(visit.visitDate).toLocaleDateString('en-IN', {
            dateStyle: 'medium'
        });
        
        return `
            <div class="glass-card p-4 flex justify-between items-center">
                <div>
                    <h3 class="text-lg font-semibold text-white">${visit.doctorName}</h3>
                    <p class="text-sm text-gray-400">${visit.specialty} • ${date}</p>
                </div>
                <button onclick="navigateTo('visits.html#${visit.id}')" class="btn-secondary text-sm">View</button>
            </div>
        `;
    }).join('');
}

async function loadCurrentBodyHealth() {
    if (!healthSync) return;
    const metrics = await healthSync.getCurrentHealthMetrics(userId);
    const container = document.getElementById('current-health-metrics');
    
    const metricCards = [
        { key: 'steps', label: 'Steps', icon: 'footprints', value: metrics.steps?.value || '--', unit: 'steps' },
        { key: 'heartRate', label: 'Heart Rate', icon: 'heart', value: metrics.heartRate?.value || '--', unit: 'bpm' },
        { key: 'sleep', label: 'Sleep', icon: 'moon', value: metrics.sleep?.value || '--', unit: 'hrs' },
        { key: 'bloodOxygen', label: 'Blood O2', icon: 'wind', value: metrics.bloodOxygen?.value || '--', unit: '%' },
        { key: 'weight', label: 'Weight', icon: 'weight', value: metrics.weight?.value || '--', unit: 'kg' }
    ];
    
    container.innerHTML = metricCards.map(metric => `
        <div class="glass-card p-4 text-center">
            <i data-lucide="${metric.icon}" class="w-6 h-6 mx-auto mb-2 text-blue-400"></i>
            <div class="text-2xl font-bold text-white">${metric.value}</div>
            <div class="text-xs text-gray-400">${metric.label}</div>
            ${metric.value !== '--' ? `<div class="text-xs text-gray-500 mt-1">${metric.unit}</div>` : ''}
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

async function loadHealthRecommendations() {
    if (!healthRecs) return;
    const recommendations = await healthRecs.getActiveRecommendations(userId);
    const container = document.getElementById('health-recommendations');
    
    if (recommendations.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">No active recommendations. Upload lab reports to get personalized health advice.</p>';
        return;
    }
    
    container.innerHTML = recommendations.slice(0, 3).map(rec => `
        <div class="glass-card p-4">
            <div class="flex items-start justify-between mb-2">
                <h4 class="font-semibold text-white">${rec.finding}</h4>
                <span class="text-xs px-2 py-1 rounded-full ${rec.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}">
                    ${rec.severity}
                </span>
            </div>
            <ul class="space-y-2 mt-3">
                ${rec.recommendations.slice(0, 3).map(r => `
                    <li class="text-sm text-gray-300 flex items-start">
                        <span class="text-blue-400 mr-2">•</span>
                        <span>${r.action}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');
}

async function loadMedicationReminders() {
    if (!medicationReminders) return;
    const reminders = await medicationReminders.getActiveReminders(userId);
    const container = document.getElementById('medication-reminders');
    
    if (reminders.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">No active medication reminders. Add prescriptions to enable reminders.</p>';
        return;
    }
    
    container.innerHTML = reminders.slice(0, 5).map(reminder => `
        <div class="glass-card p-3 flex items-center justify-between">
            <div>
                <div class="font-medium text-white">${reminder.medication}</div>
                <div class="text-xs text-gray-400">${reminder.dosage} • ${reminder.frequency}</div>
            </div>
            <button onclick="markMedicationTaken('${reminder.id}')" class="btn-secondary text-xs">
                Mark Taken
            </button>
        </div>
    `).join('');
}

async function loadCategoryProgress() {
    if (!dynamicCategories) return;
    const categories = await dynamicCategories.getUserCategories(userId);
    const container = document.getElementById('category-progress');
    
    if (categories.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">No health categories yet. Log doctor visits to track progress.</p>';
        return;
    }
    
    const progressData = await Promise.all(
        categories.map(cat => dynamicCategories.getCategoryProgress(userId, cat.name))
    );
    
    container.innerHTML = progressData.filter(p => p).map(progress => `
        <div class="glass-card p-4">
            <h4 class="font-semibold text-white mb-3">${progress.category}</h4>
            <div class="space-y-2">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-400">Total Visits</span>
                    <span class="text-white font-medium">${progress.totalVisits}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-green-400">Improved</span>
                    <span class="text-white font-medium">${progress.improvements}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-yellow-400">No Change</span>
                    <span class="text-white font-medium">${progress.same}</span>
                </div>
                <div class="mt-3">
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-gray-400">Improvement Rate</span>
                        <span class="text-white font-medium">${progress.improvementRate.toFixed(0)}%</span>
                    </div>
                    <div class="w-full bg-gray-700 rounded-full h-2">
                        <div class="bg-green-500 h-2 rounded-full" style="width: ${progress.improvementRate}%"></div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadHealthTrends() {
    const container = document.getElementById('health-trends');
    container.innerHTML = `
        <div class="glass-card p-4">
            <h3 class="text-lg font-semibold text-white mb-2">BMI Trend</h3>
            <p class="text-gray-400 text-sm">Track your BMI over time to monitor health changes.</p>
        </div>
        <div class="glass-card p-4">
            <h3 class="text-lg font-semibold text-white mb-2">Weight Trend</h3>
            <p class="text-gray-400 text-sm">Monitor your weight progress and improvements.</p>
        </div>
    `;
}

async function syncHealthData() {
    if (!healthSync) {
        const { HealthDataSync: HealthDataSyncClass } = await import('./health-sync.js');
        healthSync = new HealthDataSyncClass();
    }
    
    const button = event.target;
    button.disabled = true;
    button.innerHTML = '<span class="loading"></span> Syncing...';
    
    try {
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        const endDate = new Date();
        
        await Promise.all([
            healthSync.syncSteps(userId, startDate, endDate),
            healthSync.syncHeartRate(userId, startDate, endDate),
            healthSync.syncSleep(userId, startDate, endDate),
            healthSync.syncBloodOxygen(userId, startDate, endDate),
            healthSync.syncWeight(userId, startDate, endDate)
        ]);
        
        await loadCurrentBodyHealth();
        alert('Health data synced successfully!');
    } catch (error) {
        alert('Error syncing health data: ' + error.message);
    } finally {
        button.disabled = false;
        button.innerHTML = 'Sync Health Data';
    }
}

async function markMedicationTaken(reminderId) {
    if (!medicationReminders) {
        const { MedicationReminders: MedicationRemindersClass } = await import('./medication-reminders.js');
        medicationReminders = new MedicationRemindersClass();
    }
    await medicationReminders.markAsTaken(userId, reminderId);
    await loadMedicationReminders();
}

// Make functions globally available
window.syncHealthData = syncHealthData;
window.markMedicationTaken = markMedicationTaken;

function setupEventListeners() {
    // BMI Form
    const bmiForm = document.getElementById('bmi-form');
    if (bmiForm) {
        bmiForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const heightInput = document.getElementById('height-input');
            const weightInput = document.getElementById('weight-input');
            const errorDiv = document.getElementById('bmi-error');
            
            const height = parseFloat(heightInput.value);
            const weight = parseFloat(weightInput.value);
            
            // Validation
            if (!height || height < 50 || height > 300) {
                errorDiv.textContent = 'Please enter a valid height between 50-300 cm';
                errorDiv.classList.remove('hidden');
                errorDiv.style.display = 'block';
                heightInput.focus();
                return;
            }
            
            if (!weight || weight < 20 || weight > 500) {
                errorDiv.textContent = 'Please enter a valid weight between 20-500 kg';
                errorDiv.classList.remove('hidden');
                errorDiv.style.display = 'block';
                weightInput.focus();
                return;
            }
            
            // Hide error if validation passes
            errorDiv.classList.add('hidden');
            errorDiv.style.display = 'none';
            
            try {
                const bmi = calculateBMI(height, weight);
                
                await saveHealthMetric(userId, 'bmi', bmi);
                await saveHealthMetric(userId, 'weight', weight);
                
                closeBMIModal();
                await loadHealthMetrics();
            } catch (error) {
                errorDiv.textContent = 'Error saving BMI: ' + error.message;
                errorDiv.classList.remove('hidden');
                errorDiv.style.display = 'block';
            }
        });
    }
    
    // Weight Form
    const weightForm = document.getElementById('weight-form');
    if (weightForm) {
        weightForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const weightInput = document.getElementById('new-weight-input');
            const weight = parseFloat(weightInput.value);
            
            // Validation
            if (!weight || weight < 20 || weight > 500) {
                alert('Please enter a valid weight between 20-500 kg');
                weightInput.focus();
                return;
            }
            
            try {
                await saveHealthMetric(userId, 'weight', weight);
                closeWeightModal();
                await loadHealthMetrics();
            } catch (error) {
                alert('Error saving weight: ' + error.message);
            }
        });
    }
}

function closeBMIModal() {
    const modal = document.getElementById('bmi-modal');
    modal.classList.add('hidden');
    modal.style.display = 'none';
    // Reset form
    const form = document.getElementById('bmi-form');
    if (form) form.reset();
    const errorDiv = document.getElementById('bmi-error');
    if (errorDiv) {
        errorDiv.classList.add('hidden');
        errorDiv.style.display = 'none';
    }
}

function closeWeightModal() {
    const modal = document.getElementById('weight-modal');
    modal.classList.add('hidden');
    modal.style.display = 'none';
    // Reset form
    const form = document.getElementById('weight-form');
    if (form) form.reset();
}

// Make functions globally available
window.closeBMIModal = closeBMIModal;
window.closeWeightModal = closeWeightModal;
window.syncHealthData = syncHealthData;
window.markMedicationTaken = markMedicationTaken;

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

