// Authentication Module
import { initializeFirebase, signInWithEmail, signUpWithEmail } from './firebase-config.js';
import { navigateTo } from './router.js';

let auth = null;

export async function initAuth() {
    const { auth: firebaseAuth } = await initializeFirebase();
    auth = firebaseAuth;
    return auth;
}

export async function handleLogin(email, password) {
    try {
        const userCredential = await signInWithEmail(auth, email, password);
        console.log('Login successful:', userCredential.user);
        localStorage.setItem('user', JSON.stringify({
            uid: userCredential.user.uid,
            email: userCredential.user.email
        }));
        navigateTo('homepage.html');
        return userCredential.user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

export async function handleSignUp(email, password) {
    try {
        const userCredential = await signUpWithEmail(auth, email, password);
        console.log('Sign up successful:', userCredential.user);
        localStorage.setItem('user', JSON.stringify({
            uid: userCredential.user.uid,
            email: userCredential.user.email
        }));
        navigateTo('homepage.html');
        return userCredential.user;
    } catch (error) {
        console.error('Sign up error:', error);
        throw error;
    }
}

export function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

export async function logout() {
    const { signOut: firebaseSignOut } = await import('./firebase-config.js');
    await firebaseSignOut();
    localStorage.removeItem('user');
    navigateTo('login.html');
}

// Initialize login form
document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('login.html')) {
        await initAuth();
        const loginForm = document.getElementById('login-form');
        const errorDiv = document.getElementById('login-error');
        
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                errorDiv.classList.add('hidden');
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                try {
                    await handleLogin(email, password);
                } catch (error) {
                    errorDiv.textContent = error.message || 'Login failed. Please check your credentials.';
                    errorDiv.classList.remove('hidden');
                }
            });
        }
    }
});

