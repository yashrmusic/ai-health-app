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
        <div class="card text-center">
            <div class="card-body">
                <div style="font-size: 3rem; margin-bottom: 0.5rem;">${phaseEmoji[status.currentPhase] || '🌙'}</div>
                <div style="font-size: 1.125rem; font-weight: 600; color: var(--text-primary); text-transform: capitalize;">${status.currentPhase}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">Current Phase</div>
            </div>
        </div>
        <div class="card text-center">
            <div class="card-body">
                <div style="font-size: 2.5rem; font-weight: 700; color: var(--primary-red); margin-bottom: 0.5rem;">${status.daysUntilPeriod || '--'}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Days until period</div>
            </div>
        </div>
        <div class="card text-center">
            <div class="card-body">
                <div style="font-size: 2.5rem; font-weight: 700; color: var(--primary-red); margin-bottom: 0.5rem;">${status.daysUntilOvulation || '--'}</div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">Days until ovulation</div>
            </div>
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
            <div class="card text-center">
                <div class="card-body">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--primary-red); margin-bottom: 0.25rem;">${stats.averageCycleLength}</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Avg Cycle Length (days)</div>
                </div>
            </div>
            <div class="card text-center">
                <div class="card-body">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--primary-red); margin-bottom: 0.25rem;">${stats.averagePeriodDuration}</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Avg Period Duration (days)</div>
                </div>
            </div>
            <div class="card text-center">
                <div class="card-body">
                    <div style="font-size: 2rem; font-weight: 700; color: ${stats.regularity === 'regular' ? '#10b981' : '#f59e0b'}; margin-bottom: 0.25rem;">
                        ${stats.regularity === 'regular' ? '✓' : '~'}
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary); text-transform: capitalize;">${stats.regularity}</div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1 / -1; text-align: center; padding: 2rem 0;">Log at least 2 periods to see statistics.</p>';
    }
}

async function loadPeriodHistory() {
    const history = await periodTracker.getPeriodHistory(userId, 6);
    const container = document.getElementById('period-history');
    
    if (history.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem 0;">No period history yet. Log your first period!</p>';
        return;
    }
    
    container.innerHTML = history.map(period => {
        const startDate = new Date(period.startDate).toLocaleDateString();
        const endDate = period.endDate ? new Date(period.endDate).toLocaleDateString() : 'Ongoing';
        const duration = period.duration || '--';
        
        return `
            <div class="card">
                <div class="card-body" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">Cycle ${period.cycleNumber}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${startDate} - ${endDate}</div>
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 0.25rem;">Duration: ${duration} days</div>
                    </div>
                    ${!period.endDate ? `
                        <button onclick="endPeriod('${period.id}')" class="btn-secondary" style="font-size: 0.75rem; padding: 0.5rem 1rem;">
                            End Period
                        </button>
                    ` : ''}
                </div>
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
    const modal = document.getElementById('period-start-modal');
    document.getElementById('period-start-date').valueAsDate = new Date();
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function closePeriodStartModal() {
    const modal = document.getElementById('period-start-modal');
    modal.classList.add('hidden');
    modal.style.display = 'none';
    document.getElementById('period-start-form').reset();
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
    const modal = document.getElementById('symptoms-modal');
    document.getElementById('symptom-date').valueAsDate = new Date();
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function closeSymptomsModal() {
    const modal = document.getElementById('symptoms-modal');
    modal.classList.add('hidden');
    modal.style.display = 'none';
    document.getElementById('symptoms-form').reset();
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

