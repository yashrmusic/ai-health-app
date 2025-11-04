// Firebase Configuration and Setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut as firebaseSignOut,
    setPersistence,
    browserLocalPersistence,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

let app = null;
let auth = null;
let db = null;
let storage = null;

export async function initializeFirebase() {
    if (app) {
        return { app, auth, db, storage };
    }

    try {
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        
        if (!firebaseConfig.apiKey) {
            console.warn('Firebase config not available. Using mock mode.');
            return { app: null, auth: null, db: null, storage: null };
        }

        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        
        setLogLevel('error');
        await setPersistence(auth, browserLocalPersistence);
        
        return { app, auth, db, storage };
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return { app: null, auth: null, db: null, storage: null };
    }
}

export function signInWithEmail(auth, email, password) {
    if (!auth) {
        // Return a helpful error message instead of throwing
        throw new Error('Firebase not configured. Please set up Firebase or use demo mode. To configure: Set __firebase_config variable with your Firebase configuration.');
    }
    return signInWithEmailAndPassword(auth, email, password);
}

export function signUpWithEmail(auth, email, password) {
    if (!auth) {
        throw new Error('Firebase not initialized. Please check your configuration.');
    }
    return createUserWithEmailAndPassword(auth, email, password);
}

export function onAuthChange(callback) {
    if (auth) {
        return onAuthStateChanged(auth, callback);
    }
    return () => {};
}

export async function signOut() {
    if (auth) {
        await firebaseSignOut(auth);
    }
    localStorage.removeItem('user');
}

export async function signInWithGoogle(auth) {
    if (!auth) {
        throw new Error('Firebase not configured. Please set up Firebase to use Google Sign-In. To configure: Set __firebase_config variable with your Firebase configuration.');
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account'
    });
    
    try {
        // Try popup first, fallback to redirect
        return await signInWithPopup(auth, provider);
    } catch (error) {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
            // Fallback to redirect
            await signInWithRedirect(auth, provider);
            return null; // Will be handled by redirect
        }
        throw error;
    }
}

export async function getGoogleRedirectResult(auth) {
    if (!auth) return null;
    try {
        return await getRedirectResult(auth);
    } catch (error) {
        console.error('Google redirect error:', error);
        return null;
    }
}

export { auth, db, storage };

