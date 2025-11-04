// Simple Router for Navigation
export function navigateTo(path) {
    window.location.href = path;
}

export function getCurrentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
}

