// Bank Statement Analysis for Health Spending
export class BankAnalysis {
    constructor() {
        this.healthKeywords = {
            'hospital': ['hospital', 'clinic', 'medical', 'healthcare', 'pharmacy', 'apollo', 'fortis', 'max'],
            'medication': ['pharmacy', 'med', 'medicine', 'drug', 'chemist'],
            'doctor': ['doctor', 'dr.', 'consultation', 'physician'],
            'alcohol': ['bar', 'pub', 'wine', 'liquor', 'beer', 'tavern', 'alcohol'],
            'food': ['restaurant', 'cafe', 'food', 'swiggy', 'zomato', 'uber eats', 'dining'],
            'fitness': ['gym', 'fitness', 'yoga', 'pilates', 'workout'],
            'wellness': ['spa', 'massage', 'wellness', 'therapy']
        };
    }

    // Parse bank statement (CSV format)
    async parseBankStatement(file, userId) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                    
                    const transactions = [];
                    
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        
                        const values = lines[i].split(',');
                        const transaction = {};
                        
                        headers.forEach((header, index) => {
                            transaction[header] = values[index]?.trim();
                        });
                        
                        // Normalize transaction
                        const normalized = {
                            id: `txn-${Date.now()}-${i}`,
                            date: this.parseDate(transaction.date || transaction.transaction_date || transaction['date/time']),
                            description: transaction.description || transaction.merchant || transaction.narration || '',
                            amount: parseFloat(transaction.amount || transaction.debit || transaction.credit || 0),
                            type: transaction.type || transaction.transaction_type || 'debit',
                            category: this.categorizeTransaction(transaction),
                            createdAt: new Date().toISOString()
                        };
                        
                        transactions.push(normalized);
                    }
                    
                    // Save transactions
                    await this.saveTransactions(userId, transactions);
                    
                    // Generate analysis
                    const analysis = await this.analyzeSpending(userId, transactions);
                    
                    resolve({
                        success: true,
                        transactions: transactions.length,
                        analysis: analysis
                    });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Categorize transaction
    categorizeTransaction(transaction) {
        const description = (transaction.description || transaction.merchant || transaction.narration || '').toLowerCase();
        
        for (const [category, keywords] of Object.entries(this.healthKeywords)) {
            if (keywords.some(keyword => description.includes(keyword))) {
                return category;
            }
        }
        
        return 'other';
    }

    // Analyze spending patterns
    async analyzeSpending(userId, transactions) {
        const analysis = {
            totalHealthSpending: 0,
            totalAlcoholSpending: 0,
            totalFoodSpending: 0,
            spendingByCategory: {},
            spendingByMonth: {},
            alcoholFrequency: 0,
            healthVisits: 0,
            recommendations: []
        };
        
        transactions.forEach(txn => {
            const amount = Math.abs(txn.amount);
            
            if (txn.category === 'hospital' || txn.category === 'doctor' || txn.category === 'medication') {
                analysis.totalHealthSpending += amount;
                analysis.healthVisits++;
            }
            
            if (txn.category === 'alcohol') {
                analysis.totalAlcoholSpending += amount;
                analysis.alcoholFrequency++;
            }
            
            if (txn.category === 'food') {
                analysis.totalFoodSpending += amount;
            }
            
            // By category
            analysis.spendingByCategory[txn.category] = 
                (analysis.spendingByCategory[txn.category] || 0) + amount;
            
            // By month
            const month = new Date(txn.date).toISOString().substring(0, 7);
            if (!analysis.spendingByMonth[month]) {
                analysis.spendingByMonth[month] = {
                    health: 0,
                    alcohol: 0,
                    food: 0,
                    total: 0
                };
            }
            analysis.spendingByMonth[month].total += amount;
            if (txn.category === 'hospital' || txn.category === 'doctor' || txn.category === 'medication') {
                analysis.spendingByMonth[month].health += amount;
            }
            if (txn.category === 'alcohol') {
                analysis.spendingByMonth[month].alcohol += amount;
            }
            if (txn.category === 'food') {
                analysis.spendingByMonth[month].food += amount;
            }
        });
        
        // Generate recommendations
        if (analysis.totalAlcoholSpending > 5000) {
            analysis.recommendations.push({
                type: 'health',
                message: `₹${analysis.totalAlcoholSpending.toFixed(0)} spent on alcohol. Consider reducing consumption for better health.`,
                priority: 'high'
            });
        }
        
        if (analysis.alcoholFrequency > 10) {
            analysis.recommendations.push({
                type: 'frequency',
                message: `Alcohol purchases detected ${analysis.alcoholFrequency} times. Monitor consumption patterns.`,
                priority: 'medium'
            });
        }
        
        if (analysis.totalHealthSpending > 0) {
            analysis.recommendations.push({
                type: 'insight',
                message: `Total health spending: ₹${analysis.totalHealthSpending.toFixed(0)}. Track to monitor health costs.`,
                priority: 'low'
            });
        }
        
        return analysis;
    }

    parseDate(dateStr) {
        // Try various date formats
        const formats = [
            /(\d{2})\/(\d{2})\/(\d{4})/,
            /(\d{4})-(\d{2})-(\d{2})/,
            /(\d{2})-(\d{2})-(\d{4})/
        ];
        
        for (const format of formats) {
            const match = dateStr.match(format);
            if (match) {
                if (format.source.includes('\\d{4}')) {
                    return new Date(match[0]).toISOString();
                } else {
                    // DD/MM/YYYY or DD-MM-YYYY
                    return new Date(`${match[3]}-${match[2]}-${match[1]}`).toISOString();
                }
            }
        }
        
        // Fallback
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    }

    async saveTransactions(userId, transactions) {
        const { db } = await import('./firebase-config.js');
        const { demoDataManager } = await import('./demo-data.js');
        
        if (!db || demoDataManager.isDemoMode()) {
            const existing = JSON.parse(localStorage.getItem(`bank_transactions_${userId}`) || '[]');
            const combined = [...existing, ...transactions];
            localStorage.setItem(`bank_transactions_${userId}`, JSON.stringify(combined));
            return;
        }

        try {
            const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const txnRef = collection(db, `users/${userId}/bankTransactions`);
            
            for (const txn of transactions) {
                await addDoc(txnRef, txn);
            }
        } catch (error) {
            console.error('Error saving transactions:', error);
            throw error;
        }
    }

    async getSpendingAnalysis(userId, days = 90) {
        const { db } = await import('./firebase-config.js');
        const { demoDataManager } = await import('./demo-data.js');
        
        if (!db || demoDataManager.isDemoMode()) {
            const transactions = JSON.parse(localStorage.getItem(`bank_transactions_${userId}`) || '[]');
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            const filtered = transactions.filter(t => new Date(t.date) >= cutoffDate);
            return await this.analyzeSpending(userId, filtered);
        }

        try {
            const { collection, query, where, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const txnRef = collection(db, `users/${userId}/bankTransactions`);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            const q = query(
                txnRef,
                where('date', '>=', cutoffDate.toISOString()),
                orderBy('date', 'desc'),
                limit(500)
            );
            
            const snapshot = await getDocs(q);
            const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            return await this.analyzeSpending(userId, transactions);
        } catch (error) {
            console.error('Error getting spending analysis:', error);
            return await this.analyzeSpending(userId, []);
        }
    }
}

