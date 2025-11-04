// Period Tracker Page Logic
import { getCurrentUser } from './auth.js';
import { PeriodTracker } from './period-tracker.js';

let userId = null;
let periodTracker = null;

async function init() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    userId = user.uid;
    periodTracker = new PeriodTracker();
    
    await loadDashboard();
    setupEventListeners();
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

async function loadDashboard() {
    await loadCurrentStatus();
    await loadPredictions();
    await loadCycleStats();
    await loadPeriodHistory();
}

async function loadCurrentStatus() {
    const status = await periodTracker.getCurrentCycleStatus(userId);
    const container = document.getElementById('current-status');
    
    const phaseEmoji = {
        'period': '🩸',
        'ovulation': '🌸',
        'follicular': '🌱'
    };
    
    container.innerHTML = `
        <div class="glass-card p-4 text-center">
            <div class="text-4xl mb-2">${phaseEmoji[status.currentPhase] || '🌙'}</div>
            <div class="text-lg font-semibold text-white capitalize">${status.currentPhase}</div>
            <div class="text-sm text-gray-400 mt-1">Current Phase</div>
        </div>
        <div class="glass-card p-4 text-center">
            <div class="text-3xl font-bold text-white mb-2">${status.daysUntilPeriod || '--'}</div>
            <div class="text-sm text-gray-400">Days until period</div>
        </div>
        <div class="glass-card p-4 text-center">
            <div class="text-3xl font-bold text-white mb-2">${status.daysUntilOvulation || '--'}</div>
            <div class="text-sm text-gray-400">Days until ovulation</div>
        </div>
    `;
}

async function loadPredictions() {
    const nextPeriod = await periodTracker.predictNextPeriod(userId);
    const ovulation = await periodTracker.predictOvulation(userId);
    
    const nextPeriodContainer = document.getElementById('next-period');
    const ovulationContainer = document.getElementById('ovulation');
    
    if (nextPeriod) {
        nextPeriodContainer.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between">
                    <span class="text-gray-400">Predicted Date</span>
                    <span class="text-white font-medium">${new Date(nextPeriod.predictedDate).toLocaleDateString()}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Days Until</span>
                    <span class="text-white font-medium">${nextPeriod.daysUntil} days</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Cycle Length</span>
                    <span class="text-white font-medium">${nextPeriod.cycleLength} days</span>
                </div>
            </div>
        `;
    } else {
        nextPeriodContainer.innerHTML = '<p class="text-gray-400">Log your first period to get predictions.</p>';
    }
    
    if (ovulation) {
        ovulationContainer.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between">
                    <span class="text-gray-400">Predicted Date</span>
                    <span class="text-white font-medium">${new Date(ovulation.predictedDate).toLocaleDateString()}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Days Until</span>
                    <span class="text-white font-medium">${ovulation.daysUntil} days</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Fertile Window</span>
                    <span class="text-white font-medium text-xs">
                        ${new Date(ovulation.fertileWindow.start).toLocaleDateString()} - 
                        ${new Date(ovulation.fertileWindow.end).toLocaleDateString()}
                    </span>
                </div>
            </div>
        `;
    } else {
        ovulationContainer.innerHTML = '<p class="text-gray-400">Log your first period to get predictions.</p>';
    }
}

async function loadCycleStats() {
    const stats = await periodTracker.getCycleStats(userId);
    const container = document.getElementById('cycle-stats');
    
    if (stats) {
        container.innerHTML = `
            <div class="glass-card p-4 text-center">
                <div class="text-2xl font-bold text-blue-400 mb-1">${stats.averageCycleLength}</div>
                <div class="text-sm text-gray-400">Avg Cycle Length (days)</div>
            </div>
            <div class="glass-card p-4 text-center">
                <div class="text-2xl font-bold text-purple-400 mb-1">${stats.averagePeriodDuration}</div>
                <div class="text-sm text-gray-400">Avg Period Duration (days)</div>
            </div>
            <div class="glass-card p-4 text-center">
                <div class="text-2xl font-bold ${stats.regularity === 'regular' ? 'text-green-400' : 'text-yellow-400'} mb-1">
                    ${stats.regularity === 'regular' ? '✓' : '~'}
                </div>
                <div class="text-sm text-gray-400 capitalize">${stats.regularity}</div>
            </div>
        `;
    } else {
        container.innerHTML = '<p class="text-gray-400 col-span-3 text-center py-4">Log at least 2 periods to see statistics.</p>';
    }
}

async function loadPeriodHistory() {
    const history = await periodTracker.getPeriodHistory(userId, 6);
    const container = document.getElementById('period-history');
    
    if (history.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">No period history yet. Log your first period!</p>';
        return;
    }
    
    container.innerHTML = history.map(period => {
        const startDate = new Date(period.startDate).toLocaleDateString();
        const endDate = period.endDate ? new Date(period.endDate).toLocaleDateString() : 'Ongoing';
        const duration = period.duration || '--';
        
        return `
            <div class="glass-card p-4 flex justify-between items-center">
                <div>
                    <div class="font-semibold text-white">Cycle ${period.cycleNumber}</div>
                    <div class="text-sm text-gray-400">${startDate} - ${endDate}</div>
                    <div class="text-xs text-gray-500 mt-1">Duration: ${duration} days</div>
                </div>
                ${!period.endDate ? `
                    <button onclick="endPeriod('${period.id}')" class="btn-secondary text-xs">
                        End Period
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
}

function setupEventListeners() {
    const periodStartForm = document.getElementById('period-start-form');
    if (periodStartForm) {
        periodStartForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = new Date(document.getElementById('period-start-date').value);
            await periodTracker.logPeriodStart(userId, date);
            closePeriodStartModal();
            await loadDashboard();
        });
    }
    
    const symptomsForm = document.getElementById('symptoms-form');
    if (symptomsForm) {
        symptomsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = new Date(document.getElementById('symptom-date').value);
            const checkboxes = document.querySelectorAll('#symptoms-form input[type="checkbox"]:checked');
            const symptoms = Array.from(checkboxes).map(cb => cb.value);
            const severity = document.getElementById('symptom-severity').value;
            
            await periodTracker.logSymptoms(userId, date, symptoms);
            closeSymptomsModal();
            alert('Symptoms logged successfully!');
        });
    }
}

function logPeriodStart() {
    document.getElementById('period-start-date').valueAsDate = new Date();
    document.getElementById('period-start-modal').classList.remove('hidden');
    document.getElementById('period-start-modal').classList.add('flex');
}

function closePeriodStartModal() {
    document.getElementById('period-start-modal').classList.add('hidden');
    document.getElementById('period-start-modal').classList.remove('flex');
}

function logPeriodEnd() {
    // Find active period and end it
    periodTracker.getRecentPeriods(userId, 1).then(periods => {
        if (periods.length > 0 && !periods[0].endDate) {
            endPeriod(periods[0].id);
        } else {
            alert('No active period to end.');
        }
    });
}

async function endPeriod(periodId) {
    await periodTracker.logPeriodEnd(userId, periodId);
    await loadDashboard();
}

function logSymptoms() {
    document.getElementById('symptom-date').valueAsDate = new Date();
    document.getElementById('symptoms-modal').classList.remove('hidden');
    document.getElementById('symptoms-modal').classList.add('flex');
}

function closeSymptomsModal() {
    document.getElementById('symptoms-modal').classList.add('hidden');
    document.getElementById('symptoms-modal').classList.remove('flex');
}

// Make functions globally available
window.logPeriodStart = logPeriodStart;
window.logPeriodEnd = logPeriodEnd;
window.logSymptoms = logSymptoms;
window.closePeriodStartModal = closePeriodStartModal;
window.closeSymptomsModal = closeSymptomsModal;
window.endPeriod = endPeriod;

// Initialize
document.addEventListener('DOMContentLoaded', init);

