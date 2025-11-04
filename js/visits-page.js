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
    
    stopBtn.addEventListener('click', () => {
        const audioBlob = audioRecorder.stopRecording();
        recordBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        document.getElementById('recording-status').classList.add('hidden');
        
        if (audioBlob) {
            const audioURL = URL.createObjectURL(audioBlob);
            const audioPlayback = document.getElementById('audio-playback');
            audioPlayback.src = audioURL;
            audioPlayback.classList.remove('hidden');
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
        
        // Reset form
        document.getElementById('visit-form').reset();
        document.getElementById('prescription-status').textContent = '';
        document.getElementById('prescription-status').className = 'text-sm text-gray-400';
        analyzedPrescriptionData = null;
        audioRecorder.reset();
        document.getElementById('audio-playback').classList.add('hidden');
        
        // Reload visits
        await loadVisits();
        
        alert('Visit saved successfully!');
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
            <li class="py-2 flex items-center justify-between">
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-100">${med.name}</p>
                    <p class="text-xs text-gray-400">${med.purpose}</p>
                    <p class="text-xs text-gray-500">${med.dosage}</p>
                </div>
                <a href="https://www.1mg.com/search/all?name=${encodeURIComponent(med.name)}" 
                   target="_blank" 
                   class="text-xs text-green-400 hover:text-green-300">
                    1mg
                </a>
            </li>
        `).join('');
    }
    
    const batchCartLink = visit.aiSummary && visit.aiSummary.medicines ? 
        create1mgBatchLink(visit.aiSummary.medicines) : null;
    
    return `
        <div class="glass-card p-6">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-xl font-semibold text-white">${visit.doctorName}</h3>
                    <span class="category-badge ${getCategoryClass(visit.specialty)}">${visit.specialty}</span>
                    <p class="text-sm text-gray-400 mt-2">${date}</p>
                    ${improvementBadge ? `<div class="mt-2">${improvementBadge}</div>` : ''}
                </div>
                <div class="flex gap-2">
                    ${batchCartLink ? `
                        <button onclick="addTo1mgCart('${visit.id}')" 
                                class="btn-secondary text-xs"
                                title="Add all medicines to 1mg">
                            <i data-lucide="shopping-cart" class="w-4 h-4"></i>
                        </button>
                    ` : ''}
                    <button onclick="shareVisitWithFamily('${visit.id}')" 
                            class="btn-secondary text-xs"
                            title="Share with family">
                        <i data-lucide="share-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteVisitCard('${visit.id}')" 
                            class="btn-secondary text-xs text-red-400"
                            title="Delete">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            
            ${visit.aiSummary ? `
                <div class="mb-4 p-4 bg-gray-800/50 rounded-lg">
                    <h4 class="font-medium text-gray-200 mb-2">AI Prescription Summary</h4>
                    <p class="text-sm text-gray-400 mb-3">${visit.aiSummary.summary || ''}</p>
                    <ul class="divide-y divide-gray-700">
                        ${medicinesHtml}
                    </ul>
                </div>
            ` : ''}
            
            ${visit.notes ? `
                <div class="mb-4">
                    <h4 class="font-medium text-gray-200 mb-2">Notes</h4>
                    <p class="text-sm text-gray-300 whitespace-pre-wrap">${visit.notes}</p>
                </div>
            ` : ''}
            
            ${visit.address ? `
                <div class="mb-4">
                    <h4 class="font-medium text-gray-200 mb-2">Location</h4>
                    <a href="https://maps.google.com/?q=${encodeURIComponent(visit.address)}" 
                       target="_blank" 
                       class="text-sm text-blue-400 hover:text-blue-300">
                        ${visit.address}
                    </a>
                </div>
            ` : ''}
            
            ${visit.paymentAmount ? `
                <div class="mb-4">
                    <h4 class="font-medium text-gray-200 mb-2">Payment</h4>
                    <p class="text-sm text-gray-300">₹${visit.paymentAmount}</p>
                </div>
            ` : ''}
            
            ${visit.audioRecording ? `
                <div class="mb-4">
                    <h4 class="font-medium text-gray-200 mb-2">Meeting Recording</h4>
                    <audio controls src="${visit.audioRecording}" class="w-full"></audio>
                </div>
            ` : ''}
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

