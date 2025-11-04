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
        // Default Firebase config (can be overridden by environment variable)
        const defaultConfig = {
            apiKey: "AIzaSyArBZpVoj1xn8GLK4HaQduJlDYQeS4_qCI",
            authDomain: "health-966d9.firebaseapp.com",
            projectId: "health-966d9",
            storageBucket: "health-966d9.firebasestorage.app",
            messagingSenderId: "254735369131",
            appId: "1:254735369131:web:1cf85ba09a15dea95608ee",
            measurementId: "G-7WM8BMQ973"
        };
        
        // Use environment variable if provided, otherwise use default
        let firebaseConfig;
        if (typeof __firebase_config !== 'undefined' && __firebase_config) {
            try {
                firebaseConfig = JSON.parse(__firebase_config);
            } catch (e) {
                firebaseConfig = defaultConfig;
            }
        } else {
            firebaseConfig = defaultConfig;
        }
        
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
        
        console.log('Firebase initialized successfully');
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
    
    // Use redirect for better reliability (works across all browsers and devices)
    await signInWithRedirect(auth, provider);
    return null; // Will be handled by redirect result
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

