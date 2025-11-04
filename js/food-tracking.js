// Food Delivery & Spending Tracking (Swiggy, Zomato)
export class FoodTracking {
    constructor() {
        this.categories = {
            'healthy': ['salad', 'soup', 'grilled', 'steamed', 'vegetables', 'fruits'],
            'fast_food': ['burger', 'pizza', 'fries', 'nuggets', 'wings'],
            'alcohol': ['beer', 'wine', 'whiskey', 'vodka', 'cocktail', 'alcohol'],
            'sweets': ['dessert', 'ice cream', 'cake', 'chocolate', 'candy'],
            'beverages': ['coffee', 'tea', 'juice', 'soda', 'soft drink']
        };
    }

    // Log food order manually (since APIs may not be available)
    async logFoodOrder(userId, orderData) {
        const order = {
            id: `order-${Date.now()}`,
            date: orderData.date || new Date().toISOString(),
            platform: orderData.platform, // 'swiggy', 'zomato', 'other'
            restaurant: orderData.restaurant,
            items: orderData.items || [],
            amount: parseFloat(orderData.amount),
            category: this.categorizeOrder(orderData.items || []),
            createdAt: new Date().toISOString()
        };

        await this.saveOrder(userId, order);
        return order;
    }

    // Import from Swiggy/Zomato (CSV export or manual)
    async importFoodData(file, userId, platform = 'swiggy') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n');
                    const headers = lines[0].split(',');
                    
                    const orders = [];
                    
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        
                        const values = lines[i].split(',');
                        const order = {};
                        headers.forEach((header, index) => {
                            order[header.trim()] = values[index]?.trim();
                        });
                        
                        const orderData = {
                            platform: platform,
                            restaurant: order.restaurant || order.Restaurant || order.restaurant_name || '',
                            items: (order.items || order.Items || order.item_name || '').split(';'),
                            amount: parseFloat(order.amount || order.Amount || order.total || 0),
                            date: order.date || order.Date || order.order_date || new Date().toISOString()
                        };
                        
                        orders.push(orderData);
                    }
                    
                    // Save all orders
                    for (const orderData of orders) {
                        await this.logFoodOrder(userId, orderData);
                    }
                    
                    resolve({ success: true, count: orders.length });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Categorize order items
    categorizeOrder(items) {
        const itemText = items.join(' ').toLowerCase();
        
        for (const [category, keywords] of Object.entries(this.categories)) {
            if (keywords.some(keyword => itemText.includes(keyword))) {
                return category;
            }
        }
        
        return 'other';
    }

    // Get food spending analysis
    async getFoodSpending(userId, days = 30) {
        const orders = await this.getOrderHistory(userId, days);
        
        const analysis = {
            totalSpent: 0,
            orderCount: orders.length,
            averageOrderValue: 0,
            spendingByCategory: {},
            spendingByPlatform: {},
            spendingByDay: {},
            unhealthySpending: 0,
            alcoholSpending: 0,
            recommendations: []
        };
        
        orders.forEach(order => {
            analysis.totalSpent += order.amount;
            
            // By category
            analysis.spendingByCategory[order.category] = 
                (analysis.spendingByCategory[order.category] || 0) + order.amount;
            
            // By platform
            analysis.spendingByPlatform[order.platform] = 
                (analysis.spendingByPlatform[order.platform] || 0) + order.amount;
            
            // By day
            const date = new Date(order.date).toISOString().split('T')[0];
            analysis.spendingByDay[date] = (analysis.spendingByDay[date] || 0) + order.amount;
            
            // Unhealthy spending
            if (order.category === 'fast_food' || order.category === 'sweets') {
                analysis.unhealthySpending += order.amount;
            }
            
            // Alcohol spending
            if (order.category === 'alcohol') {
                analysis.alcoholSpending += order.amount;
            }
        });
        
        analysis.averageOrderValue = analysis.totalSpent / (analysis.orderCount || 1);
        
        // Generate recommendations
        if (analysis.unhealthySpending > analysis.totalSpent * 0.5) {
            analysis.recommendations.push({
                type: 'health',
                message: 'High spending on fast food. Consider healthier meal options.',
                priority: 'high'
            });
        }
        
        if (analysis.alcoholSpending > 0) {
            analysis.recommendations.push({
                type: 'health',
                message: `₹${analysis.alcoholSpending.toFixed(0)} spent on alcohol this month. Monitor consumption.`,
                priority: 'medium'
            });
        }
        
        return analysis;
    }

    async getOrderHistory(userId, days = 30) {
        const { db } = await import('./firebase-config.js');
        const { demoDataManager } = await import('./demo-data.js');
        
        if (!db || demoDataManager.isDemoMode()) {
            const orders = JSON.parse(localStorage.getItem(`food_orders_${userId}`) || '[]');
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            return orders
                .filter(o => new Date(o.date) >= cutoffDate)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        try {
            const { collection, query, where, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const orderRef = collection(db, `users/${userId}/foodOrders`);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            const q = query(
                orderRef,
                where('date', '>=', cutoffDate.toISOString()),
                orderBy('date', 'desc'),
                limit(100)
            );
            
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting orders:', error);
            return [];
        }
    }

    async saveOrder(userId, order) {
        const { db } = await import('./firebase-config.js');
        const { demoDataManager } = await import('./demo-data.js');
        
        if (!db || demoDataManager.isDemoMode()) {
            const orders = JSON.parse(localStorage.getItem(`food_orders_${userId}`) || '[]');
            orders.push(order);
            localStorage.setItem(`food_orders_${userId}`, JSON.stringify(orders));
            return;
        }

        try {
            const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const orderRef = collection(db, `users/${userId}/foodOrders`);
            await addDoc(orderRef, order);
        } catch (error) {
            console.error('Error saving order:', error);
            throw error;
        }
    }
}

