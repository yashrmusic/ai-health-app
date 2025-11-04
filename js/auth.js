// Authentication Module
import { initializeFirebase, signInWithEmail, signUpWithEmail, signInWithGoogle, getGoogleRedirectResult } from './firebase-config.js';
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

export async function handleGoogleLogin() {
    try {
        const { auth } = await initializeFirebase();
        const result = await signInWithGoogle(auth);
        
        if (result && result.user) {
            console.log('Google login successful:', result.user);
            localStorage.setItem('user', JSON.stringify({
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL
            }));
            navigateTo('homepage.html');
            return result.user;
        }
    } catch (error) {
        console.error('Google login error:', error);
        throw error;
    }
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
        const { auth } = await initializeFirebase();
        
        // Handle Google redirect result
        const redirectResult = await getGoogleRedirectResult(auth);
        if (redirectResult && redirectResult.user) {
            localStorage.setItem('user', JSON.stringify({
                uid: redirectResult.user.uid,
                email: redirectResult.user.email,
                displayName: redirectResult.user.displayName,
                photoURL: redirectResult.user.photoURL
            }));
            navigateTo('homepage.html');
            return;
        }
        
        await initAuth();
        const loginForm = document.getElementById('login-form');
        const errorDiv = document.getElementById('login-error');
        const googleLoginBtn = document.getElementById('google-login-btn');
        
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
        
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                errorDiv.classList.add('hidden');
                googleLoginBtn.disabled = true;
                googleLoginBtn.textContent = 'Signing in...';
                
                try {
                    await handleGoogleLogin();
                } catch (error) {
                    errorDiv.textContent = error.message || 'Google sign-in failed. Please try again.';
                    errorDiv.classList.remove('hidden');
                    googleLoginBtn.disabled = false;
                    googleLoginBtn.innerHTML = '<svg class="w-5 h-5 inline mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Continue with Google';
                }
            });
        }
    }
});

