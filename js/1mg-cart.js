// 1mg Batch Cart Integration
export function addAllMedicinesTo1mgCart(medicines) {
    if (!medicines || medicines.length === 0) {
        throw new Error('No medicines to add');
    }

    // 1mg cart API endpoint (if available) or use search links
    // For now, we'll open multiple tabs with search links
    // In production, you'd use 1mg's cart API
    
    const baseUrl = 'https://www.1mg.com/search/all?name=';
    const cartUrl = 'https://www.1mg.com/cart/add';
    
    // Create a batch add URL or open individual searches
    const medicineNames = medicines.map(m => m.name).filter(Boolean);
    
    if (medicineNames.length === 0) {
        alert('No valid medicine names found');
        return;
    }

    // Option 1: Open search pages (for user to add manually)
    // Option 2: Use 1mg API if available
    
    // For now, create a combined search or individual searches
    const searchUrl = baseUrl + encodeURIComponent(medicineNames[0]);
    
    // Open in new window
    const newWindow = window.open(searchUrl, '_blank');
    
    // For remaining medicines, open in new tabs (limited by browser)
    medicineNames.slice(1, 5).forEach((name, index) => {
        setTimeout(() => {
            window.open(baseUrl + encodeURIComponent(name), '_blank');
        }, index * 500);
    });
    
    // Show notification
    showNotification(`Opening ${Math.min(medicineNames.length, 5)} medicine searches on 1mg`);
    
    return {
        success: true,
        count: medicineNames.length,
        message: `Opening searches for ${medicineNames.length} medicines`
    };
}

export function create1mgBatchLink(medicines) {
    const medicineNames = medicines.map(m => m.name).filter(Boolean);
    if (medicineNames.length === 0) return null;
    
    // Create a search URL with all medicine names
    const query = medicineNames.join(' OR ');
    return `https://www.1mg.com/search/all?name=${encodeURIComponent(query)}`;
}

export function showNotification(message, type = 'info') {
    // Create a toast notification
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 glass-card p-4 z-50 fade-in`;
    notification.style.cssText = `
        background: ${type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(59, 130, 246, 0.9)'};
        color: white;
        border-radius: 0.5rem;
        padding: 1rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

