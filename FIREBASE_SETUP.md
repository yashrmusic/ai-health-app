# Firebase Setup Guide

## Quick Setup

To use Firebase features, you need to configure Firebase in your environment.

### Option 1: Environment Variables (Recommended)

Set these global variables in your runtime environment:

```javascript
// Firebase Configuration
window.__firebase_config = JSON.stringify({
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
});

// Optional: Gemini API Key for prescription analysis
window.__gemini_api_key = "your-gemini-api-key";
```

### Option 2: Demo Mode

If Firebase is not configured, the app will run in **demo mode**:
- You can still use the app interface
- Data is stored in browser localStorage
- Some cloud features will be limited
- Perfect for local development and testing

### Getting Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Go to Project Settings (gear icon)
4. Scroll down to "Your apps"
5. Click on web app icon (</>) to add a web app
6. Copy the configuration object

### Enable Firebase Services

Make sure to enable these services in Firebase Console:

1. **Authentication**
   - Go to Authentication > Sign-in method
   - Enable Email/Password
   - Enable Google

2. **Firestore Database**
   - Go to Firestore Database
   - Create database in production mode (or test mode for development)
   - Set up security rules

3. **Storage**
   - Go to Storage
   - Get started
   - Set up security rules

### Security Rules Example

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Storage Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Testing

After setup, you can test by:
1. Opening the login page
2. If Firebase is configured, you'll see normal login
3. If not configured, you'll see a demo mode notice
4. In demo mode, you can still use the app with localStorage

### Troubleshooting

**Error: "Firebase not initialized"**
- Check that `__firebase_config` is set correctly
- Verify the config object is valid JSON
- Check browser console for detailed errors

**Google Sign-In not working**
- Make sure Google Sign-In is enabled in Firebase Console
- Check that OAuth consent screen is configured
- Verify authorized domains in Firebase Console

