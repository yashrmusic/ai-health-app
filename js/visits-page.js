// Visits Page Logic
import { getCurrentUser } from './auth.js';
import { initializeFirebase } from './firebase-config.js';
import { AudioRecorder } from './audio-recorder.js';
import { analyzePrescription } from './ai-prescription.js';
import { saveVisit, getAllVisits, deleteVisit } from './visits-manager.js';
import { addAllMedicinesTo1mgCart, create1mgBatchLink } from './1mg-cart.js';
import { shareVisit } from './family-sharing.js';
import { DynamicCategories } from './dynamic-categories.js';
import { MedicationReminders } from './medication-reminders.js';
import { HealthRecommendations } from './health-recommendations.js';
import { PractoAPI } from './practo-api.js';

let userId = null;
let db = null;
let storage = null;
let audioRecorder = null;
let analyzedPrescriptionData = null;
let currentCategory = '';
let dynamicCategories = null;
let medicationReminders = null;
let healthRecs = null;
let practoAPI = null;

async function init() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    userId = user.uid;
    const { db: firestoreDb, storage: firebaseStorage } = await initializeFirebase();
    db = firestoreDb;
    storage = firebaseStorage;
    
    audioRecorder = new AudioRecorder();
    dynamicCategories = new DynamicCategories();
    medicationReminders = new MedicationReminders();
    healthRecs = new HealthRecommendations();
    practoAPI = new PractoAPI();
    
    setupEventListeners();
    await loadVisits();
    
    // Initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Make loadVisits globally available
    window.loadVisits = loadVisits;
}

function setupEventListeners() {
    const form = document.getElementById('visit-form');
    const recordBtn = document.getElementById('record-btn');
    const stopBtn = document.getElementById('stop-btn');
    const prescriptionFile = document.getElementById('prescription-file');
    
    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSaveVisit();
    });
    
    // Audio recording
    recordBtn.addEventListener('click', async () => {
        try {
            await audioRecorder.startRecording();
            recordBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            document.getElementById('recording-status').classList.remove('hidden');
            updateRecordingTime();
        } catch (error) {
            alert(error.message);
        }
    });
    
    stopBtn.addEventListener('click', async () => {
        const audioBlob = audioRecorder.stopRecording();
        recordBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        document.getElementById('recording-status').classList.add('hidden');
        
        if (audioBlob) {
            const audioURL = URL.createObjectURL(audioBlob);
            const audioPlayback = document.getElementById('audio-playback');
            audioPlayback.src = audioURL;
            audioPlayback.classList.remove('hidden');
            
            // Optionally transcribe audio (would need speech-to-text API)
            // For now, we'll analyze notes when visit is saved
        }
    });
    
    // Prescription analysis
    prescriptionFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const spinner = document.getElementById('prescription-spinner');
        const status = document.getElementById('prescription-status');
        
        spinner.classList.remove('hidden');
        status.textContent = 'Analyzing prescription...';
        
        try {
            const apiKey = typeof __gemini_api_key !== 'undefined' ? __gemini_api_key : '';
            if (!apiKey) {
                throw new Error('API key not configured');
            }
            
            analyzedPrescriptionData = await analyzePrescription(file, apiKey);
            const count = analyzedPrescriptionData.medicines?.length || 0;
            status.textContent = `✓ Analysis complete: ${count} medicines found`;
            status.className = 'text-sm text-green-400';
        } catch (error) {
            status.textContent = 'AI analysis unavailable. You can still save the prescription.';
            status.className = 'text-sm text-yellow-400';
            analyzedPrescriptionData = null;
        } finally {
            spinner.classList.add('hidden');
        }
    });
}

async function handleSaveVisit() {
    const saveBtn = document.getElementById('save-btn');
    const saveBtnText = document.getElementById('save-btn-text');
    const saveSpinner = document.getElementById('save-spinner');
    
    saveBtn.disabled = true;
    saveBtnText.textContent = 'Saving...';
    saveSpinner.classList.remove('hidden');
    
    try {
        const visitData = {
            doctorName: document.getElementById('doctor-name').value,
            specialty: document.getElementById('specialty').value,
            visitDate: document.getElementById('visit-date').value,
            address: document.getElementById('address').value || null,
            paymentAmount: document.getElementById('payment').value || null,
            notes: document.getElementById('notes').value || null,
            improvementStatus: document.getElementById('improvement-status').value || null,
            aiSummary: analyzedPrescriptionData || null,
            createdAt: new Date().toISOString()
        };
        
        // Handle audio recording
        if (audioRecorder.audioBlob) {
            try {
                const audioURL = await audioRecorder.uploadToStorage(userId, 'temp', storage);
                visitData.audioRecording = audioURL;
            } catch (error) {
                console.error('Error uploading audio:', error);
            }
        }
        
        // Handle prescription file
        const prescriptionFile = document.getElementById('prescription-file').files[0];
        if (prescriptionFile) {
            // Upload prescription file
            visitData.prescriptionFile = true; // Will be uploaded separately
        }
        
        // Handle test files
        const testFiles = document.getElementById('test-files').files;
        if (testFiles.length > 0) {
            visitData.testFilesCount = testFiles.length;
        }
        
        const savedVisit = await saveVisit(userId, visitData);
        
        // Process dynamic category
        await dynamicCategories.processVisit(userId, savedVisit);
        
        // Create medication reminders from prescription
        if (analyzedPrescriptionData && analyzedPrescriptionData.medicines) {
            await medicationReminders.createFromPrescription(userId, analyzedPrescriptionData.medicines);
        }
        
        // Try to download doctor profile from Practo
        try {
            await practoAPI.downloadDoctorProfile(userId, visitData.doctorName, visitData.specialty);
        } catch (error) {
            console.log('Could not fetch doctor profile:', error);
        }
        
        // Analyze lab reports if test files uploaded
        if (testFiles.length > 0) {
            // Trigger lab report analysis (would need OCR or manual input)
            // For now, we'll prompt user to analyze
            setTimeout(() => {
                if (confirm('Would you like to analyze lab reports for health recommendations?')) {
                    window.location.href = 'recommendations.html';
                }
            }, 1000);
        }
        
        // Upload files if needed
        if (prescriptionFile || testFiles.length > 0) {
            await uploadFiles(savedVisit.id, prescriptionFile, Array.from(testFiles));
        }
        
        // Analyze meeting with AI Companion
        const { AICompanion } = await import('./ai-companion.js');
        const aiCompanion = new AICompanion();
        
        // Analyze notes/transcription for insights
        if (visitData.notes) {
            await aiCompanion.analyzeMeetingTranscription(userId, savedVisit.id, visitData.notes);
        }
        
        // Re-initialize AI companion to update insights
        await aiCompanion.initialize(userId);
        
        // Reset form
        document.getElementById('visit-form').reset();
        document.getElementById('prescription-status').textContent = '';
        document.getElementById('prescription-status').className = 'text-sm text-gray-400';
        analyzedPrescriptionData = null;
        audioRecorder.reset();
        document.getElementById('audio-playback').classList.add('hidden');
        
        // Reload visits
        await loadVisits();
        
        alert('Visit saved successfully! Your AI companion has updated health insights based on this visit.');
    } catch (error) {
        console.error('Error saving visit:', error);
        alert('Error saving visit: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtnText.textContent = 'Save Visit';
        saveSpinner.classList.add('hidden');
    }
}

async function uploadFiles(visitId, prescriptionFile, testFiles) {
    if (!storage) return;
    
    try {
        const { ref, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js");
        
        // Upload prescription
        if (prescriptionFile) {
            const prescRef = ref(storage, `users/${userId}/visits/${visitId}/prescription.${prescriptionFile.name.split('.').pop()}`);
            await uploadBytes(prescRef, prescriptionFile);
        }
        
        // Upload test files
        for (let i = 0; i < testFiles.length; i++) {
            const testRef = ref(storage, `users/${userId}/visits/${visitId}/test_${i}.${testFiles[i].name.split('.').pop()}`);
            await uploadBytes(testRef, testFiles[i]);
        }
    } catch (error) {
        console.error('Error uploading files:', error);
    }
}

async function loadVisits() {
    const category = window.currentCategory || currentCategory || '';
    const visits = await getAllVisits(userId, category || null);
    const container = document.getElementById('visits-list');
    
    if (visits.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-8">No visits found. Start by logging your first visit!</p>';
        return;
    }
    
    container.innerHTML = visits.map(visit => renderVisitCard(visit)).join('');
    
    // Reinitialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function renderVisitCard(visit) {
    const date = new Date(visit.visitDate).toLocaleDateString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'short'
    });
    
    const improvementBadge = visit.improvementStatus ? 
        `<span class="status-${visit.improvementStatus}">${getImprovementText(visit.improvementStatus)}</span>` : '';
    
    let medicinesHtml = '';
    if (visit.aiSummary && visit.aiSummary.medicines) {
        medicinesHtml = visit.aiSummary.medicines.map(med => `
            <li style="padding: 0.5rem 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-light);">
                <div style="flex: 1;">
                    <p style="font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">${med.name}</p>
                    <p style="font-size: 0.75rem; color: var(--text-secondary);">${med.purpose}</p>
                    <p style="font-size: 0.75rem; color: var(--text-tertiary);">${med.dosage}</p>
                </div>
                <a href="https://www.1mg.com/search/all?name=${encodeURIComponent(med.name)}" 
                   target="_blank" 
                   style="font-size: 0.75rem; color: var(--primary-red); text-decoration: none;">
                    1mg
                </a>
            </li>
        `).join('');
    }
    
    const batchCartLink = visit.aiSummary && visit.aiSummary.medicines ? 
        create1mgBatchLink(visit.aiSummary.medicines) : null;
    
    return `
        <div class="card">
            <div class="card-header">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">${visit.doctorName}</h3>
                        <span class="category-badge ${getCategoryClass(visit.specialty)}">${visit.specialty}</span>
                        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem;">${date}</p>
                        ${improvementBadge ? `<div style="margin-top: 0.5rem;">${improvementBadge}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        ${batchCartLink ? `
                            <button onclick="addTo1mgCart('${visit.id}')" 
                                    class="btn-secondary"
                                    style="font-size: 0.75rem; padding: 0.5rem;"
                                    title="Add all medicines to 1mg">
                                <i data-lucide="shopping-cart" style="width: 16px; height: 16px;"></i>
                            </button>
                        ` : ''}
                        <button onclick="shareVisitWithFamily('${visit.id}')" 
                                class="btn-secondary"
                                style="font-size: 0.75rem; padding: 0.5rem;"
                                title="Share with family">
                            <i data-lucide="share-2" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button onclick="deleteVisitCard('${visit.id}')" 
                                class="btn-secondary"
                                style="font-size: 0.75rem; padding: 0.5rem; color: #DC2626;"
                                title="Delete">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="card-body">
                ${visit.aiSummary ? `
                    <div style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-gray-50); border-radius: var(--radius-sm);">
                        <h4 style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">AI Prescription Summary</h4>
                        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.75rem;">${visit.aiSummary.summary || ''}</p>
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            ${medicinesHtml}
                        </ul>
                    </div>
                ` : ''}
                
                ${visit.notes ? `
                    <div style="margin-bottom: 1rem;">
                        <h4 style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">Notes</h4>
                        <p style="font-size: 0.875rem; color: var(--text-secondary); white-space: pre-wrap;">${visit.notes}</p>
                    </div>
                ` : ''}
                
                ${visit.address ? `
                    <div style="margin-bottom: 1rem;">
                        <h4 style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">Location</h4>
                        <a href="https://maps.google.com/?q=${encodeURIComponent(visit.address)}" 
                           target="_blank" 
                           style="font-size: 0.875rem; color: var(--primary-red); text-decoration: none;">
                            ${visit.address}
                        </a>
                    </div>
                ` : ''}
                
                ${visit.paymentAmount ? `
                    <div style="margin-bottom: 1rem;">
                        <h4 style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">Payment</h4>
                        <p style="font-size: 0.875rem; color: var(--text-secondary);">₹${visit.paymentAmount}</p>
                    </div>
                ` : ''}
                
                ${visit.audioRecording ? `
                    <div style="margin-bottom: 1rem;">
                        <h4 style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">Meeting Recording</h4>
                        <audio controls src="${visit.audioRecording}" style="width: 100%;"></audio>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function getImprovementText(status) {
    const texts = {
        'improved': '✅ Improved',
        'same': '➡️ No Change',
        'worse': '❌ Got Worse'
    };
    return texts[status] || '';
}

function getCategoryClass(category) {
    const classes = {
        'Psychiatry': 'psychiatry',
        'Cardiology': 'cardiology',
        'Orthopedics': 'orthopedics',
        'Dermatology': 'dermatology'
    };
    return classes[category] || '';
}

async function addTo1mgCart(visitId) {
    const visits = await getAllVisits(userId);
    const visit = visits.find(v => v.id === visitId);
    
    if (visit && visit.aiSummary && visit.aiSummary.medicines) {
        try {
            addAllMedicinesTo1mgCart(visit.aiSummary.medicines);
        } catch (error) {
            alert('Error adding to 1mg: ' + error.message);
        }
    }
}

async function shareVisitWithFamily(visitId) {
    const email = prompt('Enter family member email:');
    if (!email) return;
    
    try {
        await shareVisit(userId, visitId, email);
        alert('Visit shared successfully!');
    } catch (error) {
        alert('Error sharing: ' + error.message);
    }
}

async function deleteVisitCard(visitId) {
    if (!confirm('Are you sure you want to delete this visit?')) return;
    
    try {
        await deleteVisit(userId, visitId);
        await loadVisits();
    } catch (error) {
        alert('Error deleting visit: ' + error.message);
    }
}

// Make functions globally available
window.addTo1mgCart = addTo1mgCart;
window.shareVisitWithFamily = shareVisitWithFamily;
window.deleteVisitCard = deleteVisitCard;

// Update recording time
function updateRecordingTime() {
    if (!audioRecorder.isRecording) return;
    
    const startTime = Date.now();
    const updateInterval = setInterval(() => {
        if (!audioRecorder.isRecording) {
            clearInterval(updateInterval);
            return;
        }
        
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('recording-time').textContent = 
            `Recording: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// Initialize
document.addEventListener('DOMContentLoaded', init);

