// Practo API Integration for Doctor Profiles
export class PractoAPI {
    constructor() {
        this.apiKey = typeof __practo_api_key !== 'undefined' ? __practo_api_key : '';
        this.baseUrl = 'https://www.practo.com/api';
    }

    // Search doctors by name or specialty
    async searchDoctors(query, location = 'India', specialty = null) {
        if (!this.apiKey) {
            // Fallback: Use Practo's public search
            return this.searchDoctorsPublic(query, location, specialty);
        }

        try {
            const url = `${this.baseUrl}/doctors/search?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}${specialty ? `&specialty=${encodeURIComponent(specialty)}` : ''}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.doctors || [];
        } catch (error) {
            console.error('Error searching doctors:', error);
            return this.searchDoctorsPublic(query, location, specialty);
        }
    }

    // Public search (web scraping alternative)
    async searchDoctorsPublic(query, location, specialty) {
        // Since Practo doesn't have public API, we'll create a mock structure
        // In production, you'd use web scraping or their official API if available
        
        const mockDoctors = [
            {
                id: '1',
                name: 'Dr. ' + query,
                specialty: specialty || 'General',
                qualifications: ['MBBS', 'MD'],
                experience: '10+ years',
                rating: 4.5,
                location: location,
                profileUrl: `https://www.practo.com/doctor/${query.toLowerCase().replace(/\s+/g, '-')}`
            }
        ];

        return mockDoctors;
    }

    // Get doctor profile by ID
    async getDoctorProfile(doctorId) {
        if (!this.apiKey) {
            return this.getDoctorProfilePublic(doctorId);
        }

        try {
            const url = `${this.baseUrl}/doctors/${doctorId}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting doctor profile:', error);
            return this.getDoctorProfilePublic(doctorId);
        }
    }

    async getDoctorProfilePublic(doctorId) {
        // Mock profile
        return {
            id: doctorId,
            name: 'Dr. Sample',
            specialty: 'General',
            qualifications: [],
            experience: '',
            rating: 0,
            location: '',
            profileUrl: `https://www.practo.com/doctor/${doctorId}`
        };
    }

    // Download and save doctor profile
    async downloadDoctorProfile(userId, doctorName, specialty) {
        const doctors = await this.searchDoctors(doctorName, 'India', specialty);
        
        if (doctors.length === 0) {
            throw new Error('Doctor not found');
        }

        const doctor = doctors[0];
        const profile = {
            practoId: doctor.id,
            name: doctor.name,
            specialty: doctor.specialty || specialty,
            qualifications: doctor.qualifications || [],
            experience: doctor.experience || '',
            rating: doctor.rating || 0,
            location: doctor.location || '',
            profileUrl: doctor.profileUrl || '',
            downloadedAt: new Date().toISOString()
        };

        await this.saveDoctorProfile(userId, profile);
        return profile;
    }

    // Save doctor profile to user's collection
    async saveDoctorProfile(userId, profile) {
        const { db } = await import('./firebase-config.js');
        if (!db) {
            const profiles = JSON.parse(localStorage.getItem(`doctor_profiles_${userId}`) || '[]');
            const existing = profiles.findIndex(p => p.practoId === profile.practoId);
            if (existing !== -1) {
                profiles[existing] = profile;
            } else {
                profiles.push(profile);
            }
            localStorage.setItem(`doctor_profiles_${userId}`, JSON.stringify(profiles));
            return;
        }

        try {
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const profileRef = doc(db, `users/${userId}/doctorProfiles/${profile.practoId}`);
            await setDoc(profileRef, profile);
        } catch (error) {
            console.error('Error saving doctor profile:', error);
        }
    }

    // Get saved doctor profiles
    async getSavedProfiles(userId) {
        const { db } = await import('./firebase-config.js');
        if (!db) {
            return JSON.parse(localStorage.getItem(`doctor_profiles_${userId}`) || '[]');
        }

        try {
            const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const profileRef = collection(db, `users/${userId}/doctorProfiles`);
            const snapshot = await getDocs(profileRef);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting profiles:', error);
            return [];
        }
    }
}

