// Dynamic Health Categories based on Doctor Visits
export class DynamicCategories {
    constructor() {
        this.categoryMapping = {
            'Psychiatry': 'Mental Health',
            'psych': 'Mental Health',
            'psychiatry': 'Mental Health',
            'mental': 'Mental Health',
            'psychologist': 'Mental Health',
            'Cardiology': 'Cardiovascular',
            'cardiac': 'Cardiovascular',
            'heart': 'Cardiovascular',
            'Nephrology': 'Kidney Health',
            'nephro': 'Kidney Health',
            'kidney': 'Kidney Health',
            'renal': 'Kidney Health',
            'Neurology': 'Neurological',
            'neuro': 'Neurological',
            'brain': 'Neurological',
            'Orthopedics': 'Musculoskeletal',
            'ortho': 'Musculoskeletal',
            'bone': 'Musculoskeletal',
            'Dermatology': 'Skin Health',
            'derma': 'Skin Health',
            'skin': 'Skin Health',
            'Endocrinology': 'Hormonal Health',
            'endocrine': 'Hormonal Health',
            'diabetes': 'Hormonal Health',
            'thyroid': 'Hormonal Health',
            'Gastroenterology': 'Digestive Health',
            'gastro': 'Digestive Health',
            'stomach': 'Digestive Health',
            'Pulmonology': 'Respiratory Health',
            'pulmo': 'Respiratory Health',
            'lung': 'Respiratory Health',
            'respiratory': 'Respiratory Health'
        };
    }

    // Get category from specialty
    getCategoryFromSpecialty(specialty) {
        const specialtyLower = specialty.toLowerCase();
        
        for (const [key, category] of Object.entries(this.categoryMapping)) {
            if (specialtyLower.includes(key.toLowerCase())) {
                return category;
            }
        }
        
        return 'General Health';
    }

    // Create or update category
    async createCategory(userId, categoryName, visitId) {
        const category = {
            id: categoryName.toLowerCase().replace(/\s+/g, '-'),
            name: categoryName,
            visits: [visitId],
            createdAt: new Date().toISOString(),
            lastVisit: new Date().toISOString()
        };

        await this.saveCategory(userId, category);
        return category;
    }

    // Update category with new visit
    async updateCategory(userId, categoryName, visitId) {
        const category = await this.getCategory(userId, categoryName);
        
        if (category) {
            category.visits.push(visitId);
            category.lastVisit = new Date().toISOString();
            await this.saveCategory(userId, category);
        } else {
            await this.createCategory(userId, categoryName, visitId);
        }
    }

    // Auto-create category from visit
    async processVisit(userId, visit) {
        const categoryName = this.getCategoryFromSpecialty(visit.specialty);
        await this.updateCategory(userId, categoryName, visit.id);
        return categoryName;
    }

    // Get all categories for user
    async getUserCategories(userId) {
        const { db } = await import('./firebase-config.js');
        if (!db) {
            return JSON.parse(localStorage.getItem(`categories_${userId}`) || '[]');
        }

        try {
            const { collection, query, orderBy, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const categoryRef = collection(db, `users/${userId}/categories`);
            const q = query(categoryRef, orderBy('lastVisit', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting categories:', error);
            return [];
        }
    }

    // Get category progress
    async getCategoryProgress(userId, categoryName) {
        const category = await this.getCategory(userId, categoryName);
        if (!category) return null;

        const visits = await this.getCategoryVisits(userId, category.visits);
        const improvements = visits.filter(v => v.improvementStatus === 'improved').length;
        const same = visits.filter(v => v.improvementStatus === 'same').length;
        const worse = visits.filter(v => v.improvementStatus === 'worse').length;

        return {
            category: categoryName,
            totalVisits: visits.length,
            improvements,
            same,
            worse,
            improvementRate: visits.length > 0 ? (improvements / visits.length) * 100 : 0,
            lastVisit: category.lastVisit
        };
    }

    async getCategoryVisits(userId, visitIds) {
        const { getAllVisits } = await import('./visits-manager.js');
        const allVisits = await getAllVisits(userId);
        return allVisits.filter(v => visitIds.includes(v.id));
    }

    async getCategory(userId, categoryName) {
        const categories = await this.getUserCategories(userId);
        return categories.find(c => c.name === categoryName);
    }

    async saveCategory(userId, category) {
        const { db } = await import('./firebase-config.js');
        if (!db) {
            const categories = JSON.parse(localStorage.getItem(`categories_${userId}`) || '[]');
            const index = categories.findIndex(c => c.id === category.id);
            if (index !== -1) {
                categories[index] = category;
            } else {
                categories.push(category);
            }
            localStorage.setItem(`categories_${userId}`, JSON.stringify(categories));
            return;
        }

        try {
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const categoryRef = doc(db, `users/${userId}/categories/${category.id}`);
            await setDoc(categoryRef, category);
        } catch (error) {
            console.error('Error saving category:', error);
        }
    }
}

