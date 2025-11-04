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
        // Ensure auth is initialized
        if (!auth) {
            const { auth: firebaseAuth } = await initializeFirebase();
            auth = firebaseAuth;
        }
        
        // If Firebase not configured, use demo mode
        if (!auth) {
            console.warn('Firebase not configured. Using demo mode.');
            const userId = 'demo-user';
            localStorage.setItem('user', JSON.stringify({
                uid: userId,
                email: email,
                displayName: email.split('@')[0],
                isDemo: true
            }));
            
            // Initialize demo data
            const { demoDataManager } = await import('./demo-data.js');
            demoDataManager.initializeDemoData();
            
            navigateTo('homepage.html');
            return { uid: userId, email: email, isDemo: true };
        }
        
        const userCredential = await signInWithEmail(auth, email, password);
        console.log('Login successful:', userCredential.user);
        localStorage.setItem('user', JSON.stringify({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            photoURL: userCredential.user.photoURL
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
        // Ensure auth is initialized
        if (!auth) {
            const { auth: firebaseAuth } = await initializeFirebase();
            auth = firebaseAuth;
        }
        
        // If Firebase not configured, use demo mode
        if (!auth) {
            console.warn('Firebase not configured. Using demo mode.');
            const userId = 'demo-user-' + Date.now();
            localStorage.setItem('user', JSON.stringify({
                uid: userId,
                email: email,
                displayName: email.split('@')[0],
                isDemo: true
            }));
            
            // Initialize demo data
            const { demoDataManager } = await import('./demo-data.js');
            demoDataManager.initializeDemoData();
            
            navigateTo('homepage.html');
            return { uid: userId, email: email, isDemo: true };
        }
        
        const userCredential = await signUpWithEmail(auth, email, password);
        console.log('Sign up successful:', userCredential.user);
        localStorage.setItem('user', JSON.stringify({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName || email.split('@')[0],
            photoURL: userCredential.user.photoURL
        }));
        
        // Initialize demo data for new users
        const { demoDataManager } = await import('./demo-data.js');
        demoDataManager.initializeDemoData();
        
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
        const { auth: firebaseAuth } = await initializeFirebase();
        
        // If Firebase not configured, use demo mode
        if (!firebaseAuth) {
            console.warn('Firebase not configured. Using demo mode for Google Sign-In.');
            const userId = 'demo-user';
            localStorage.setItem('user', JSON.stringify({
                uid: userId,
                email: 'demo@example.com',
                displayName: 'Demo User',
                photoURL: null,
                isDemo: true
            }));
            
            // Initialize demo data
            const { demoDataManager } = await import('./demo-data.js');
            demoDataManager.initializeDemoData();
            
            alert('Demo mode: Firebase not configured. Please set up Firebase to use Google Sign-In.');
            navigateTo('homepage.html');
            return { uid: userId, email: 'demo@example.com', isDemo: true };
        }
        
        // Use redirect for Google Sign-In (more reliable than popup)
        const result = await signInWithGoogle(firebaseAuth);
        
        // If redirect was used, result will be null and we'll handle it on redirect
        if (result === null) {
            // Redirect is in progress, will be handled by getGoogleRedirectResult
            return null;
        }
        
        if (result && result.user) {
            console.log('Google login successful:', result.user);
            localStorage.setItem('user', JSON.stringify({
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                photoURL: result.user.photoURL
            }));
            
            // Initialize demo data for new users
            const { demoDataManager } = await import('./demo-data.js');
            demoDataManager.initializeDemoData();
            
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
        try {
            const { auth: firebaseAuth } = await initializeFirebase();
            
            // Handle Google redirect result only if Firebase is configured
            if (firebaseAuth) {
                const redirectResult = await getGoogleRedirectResult(firebaseAuth);
                if (redirectResult && redirectResult.user) {
                    console.log('Google redirect login successful:', redirectResult.user);
                    localStorage.setItem('user', JSON.stringify({
                        uid: redirectResult.user.uid,
                        email: redirectResult.user.email,
                        displayName: redirectResult.user.displayName,
                        photoURL: redirectResult.user.photoURL
                    }));
                    
                    // Initialize demo data for new users
                    const { demoDataManager } = await import('./demo-data.js');
                    demoDataManager.initializeDemoData();
                    
                    navigateTo('homepage.html');
                    return;
                }
            }
            
            await initAuth();
        } catch (error) {
            console.warn('Firebase initialization warning:', error);
            // Continue with demo mode
        }
        
        const loginForm = document.getElementById('login-form');
        const errorDiv = document.getElementById('login-error');
        const googleLoginBtn = document.getElementById('google-login-btn');
        
        // Show demo mode notice if Firebase not configured
        if (!auth) {
            const demoNotice = document.createElement('div');
            demoNotice.className = 'error-message';
            demoNotice.style.background = '#FEF3C7';
            demoNotice.style.borderColor = '#F59E0B';
            demoNotice.style.color = '#92400E';
            demoNotice.style.marginBottom = '1rem';
            demoNotice.innerHTML = '⚠️ Demo Mode: Firebase not configured. Some features may be limited.';
            if (loginForm) {
                loginForm.parentNode.insertBefore(demoNotice, loginForm);
            }
        }
        
        // Toggle between login and signup
        let isSignUpMode = false;
        const toggleAuth = document.getElementById('toggle-auth');
        const toggleText = document.getElementById('toggle-text');
        const submitBtn = document.getElementById('submit-btn');
        const passwordInput = document.getElementById('password');
        const passwordRequirements = document.getElementById('password-requirements');
        
        if (toggleAuth) {
            toggleAuth.addEventListener('click', (e) => {
                e.preventDefault();
                isSignUpMode = !isSignUpMode;
                
                if (isSignUpMode) {
                    toggleAuth.textContent = 'Sign In';
                    toggleText.textContent = 'Already have an account?';
                    submitBtn.textContent = 'Sign Up';
                    passwordRequirements.classList.remove('hidden');
                } else {
                    toggleAuth.textContent = 'Sign Up';
                    toggleText.textContent = 'Don\'t have an account?';
                    submitBtn.textContent = 'Sign In';
                    passwordRequirements.classList.add('hidden');
                }
            });
        }
        
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (errorDiv) errorDiv.classList.add('hidden');
                
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;
                
                // Validate password for signup
                if (isSignUpMode && password.length < 6) {
                    if (errorDiv) {
                        errorDiv.textContent = 'Password must be at least 6 characters long.';
                        errorDiv.classList.remove('hidden');
                    }
                    return;
                }
                
                try {
                    if (isSignUpMode) {
                        await handleSignUp(email, password);
                    } else {
                        await handleLogin(email, password);
                    }
                } catch (error) {
                    let errorMessage = error.message || 'Authentication failed. Please try again.';
                    
                    // User-friendly error messages
                    if (error.code === 'auth/email-already-in-use') {
                        errorMessage = 'This email is already registered. Please sign in instead.';
                    } else if (error.code === 'auth/invalid-email') {
                        errorMessage = 'Invalid email address. Please check and try again.';
                    } else if (error.code === 'auth/weak-password') {
                        errorMessage = 'Password is too weak. Please use at least 6 characters.';
                    } else if (error.code === 'auth/user-not-found') {
                        errorMessage = 'No account found with this email. Please sign up first.';
                    } else if (error.code === 'auth/wrong-password') {
                        errorMessage = 'Incorrect password. Please try again.';
                    }
                    
                    if (errorDiv) {
                        errorDiv.textContent = errorMessage;
                        errorDiv.classList.remove('hidden');
                    } else {
                        alert(errorMessage);
                    }
                }
            });
        }
        
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (errorDiv) errorDiv.classList.add('hidden');
                
                try {
                    const result = await handleGoogleLogin();
                    
                    // If redirect is happening, result will be null
                    // The page will redirect and come back with the result
                    if (result === null) {
                        // Redirect is in progress, show loading state
                        googleLoginBtn.disabled = true;
                        googleLoginBtn.innerHTML = '<span class="loading"></span> Redirecting to Google...';
                        // Don't try to restore button state as page will redirect
                        return;
                    }
                    
                    // If we get here, login was successful (shouldn't happen with redirect)
                    if (result && result.user) {
                        // Success - navigation handled by handleGoogleLogin
                    }
                } catch (error) {
                    console.error('Google login error:', error);
                    let errorMessage = error.message || 'Google sign-in failed. Please try again.';
                    
                    // User-friendly error messages
                    if (error.code === 'auth/popup-blocked') {
                        errorMessage = 'Popup was blocked. Please allow popups for this site or try again.';
                    } else if (error.code === 'auth/popup-closed-by-user') {
                        errorMessage = 'Sign-in was cancelled. Please try again.';
                    } else if (error.code === 'auth/unauthorized-domain') {
                        errorMessage = 'This domain is not authorized. Please contact support.';
                    }
                    
                    if (errorDiv) {
                        errorDiv.textContent = errorMessage;
                        errorDiv.classList.remove('hidden');
                    } else {
                        alert(errorMessage);
                    }
                    
                    // Restore button state
                    googleLoginBtn.disabled = false;
                    const googleIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="margin-right: 0.5rem;"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>';
                    googleLoginBtn.innerHTML = googleIcon + 'Continue with Google';
                }
            });
        }
    }
});

