# My Health Vault - Complete Health Management App

A comprehensive, modern health management application with AI-powered prescription analysis, full body health tracking, and family sharing capabilities.

## 🚀 Features

### Core Features
- **User Authentication** - Secure login/signup with Firebase
- **Full Body Health Tracking** - BMI calculator, weight tracking, health metrics
- **Doctor Visit Management** - Log visits by category (Psychiatry, Cardiology, Orthopedics, etc.)
- **Improvement Tracking** - Track health improvements, no changes, or worsening conditions
- **Native Audio Recording** - Record doctor meetings directly in the browser
- **AI Prescription Analysis** - Automatic medicine extraction using Gemini AI
- **1mg Integration** - Batch add all medicines to 1mg cart in one click
- **Family Sharing** - Share health data with family members
- **File Management** - Upload prescriptions and test results

### Advanced Health Features
- **Health Data Sync** - Auto-retrieve data from Apple Health & Google Fit (steps, heart rate, sleep, blood oxygen, weight)
- **Current Body Health Dashboard** - Real-time view of your current health metrics when opening the app
- **Intelligent Health Recommendations** - AI-powered recommendations based on lab reports (e.g., low urea → drink more water, take supplements)
- **Prescription Compliance** - Medication reminders with notifications and compliance tracking
- **Dynamic Health Categories** - Auto-create categories based on doctor visits (Psych → Mental Health, Kidney → Neuro, Heart → Cardio)
- **Category Progress Tracking** - Track improvements/changes per health category with progress bars
- **Practo API Integration** - Download and save doctor profiles from Practo
- **Period Tracker** - Complete menstrual cycle tracking with predictions, ovulation tracking, symptom logging, and cycle statistics

### UI/UX
- **Modern Dark Theme** - CRED-inspired design with glassmorphism
- **Responsive Design** - Works on desktop and mobile
- **Fast Performance** - Optimized architecture with modular components
- **Real-time Updates** - Live data synchronization

## 📁 Project Structure

```
ai-health-app/
├── index.html              # Entry point (redirects to login/homepage)
├── login.html              # Login page
├── homepage.html           # Main dashboard with health overview
├── visits.html             # Doctor visits management page
├── period-tracker.html     # Period tracking page
├── recommendations.html    # Health recommendations page (future)
├── medications.html        # Medication management page (future)
├── css/
│   └── main.css           # Main stylesheet
├── js/
│   ├── auth.js                 # Authentication module
│   ├── firebase-config.js      # Firebase setup
│   ├── router.js               # Navigation router
│   ├── homepage.js             # Homepage logic
│   ├── visits-page.js          # Visits page logic
│   ├── visits-manager.js       # Visit CRUD operations
│   ├── health-metrics.js        # BMI and health tracking
│   ├── health-sync.js          # Apple Health & Google Fit sync
│   ├── health-recommendations.js # AI health recommendations
│   ├── medication-reminders.js  # Medication reminders & compliance
│   ├── dynamic-categories.js   # Dynamic health categories
│   ├── period-tracker.js       # Period tracking
│   ├── period-tracker-page.js  # Period tracker page logic
│   ├── practo-api.js          # Practo doctor profiles
│   ├── audio-recorder.js       # Native audio recording
│   ├── ai-prescription.js      # Gemini AI integration
│   ├── 1mg-cart.js            # 1mg batch cart
│   └── family-sharing.js       # Family sharing features
├── assets/
│   ├── images/            # Image assets
│   └── audio/             # Audio recordings
└── components/            # Reusable components (future)

```

## 🛠️ Setup

### Prerequisites
- Firebase project with Authentication, Firestore, and Storage enabled
- Gemini API key for prescription analysis

### Environment Variables
The app expects these global variables (injected by your runtime):
- `__firebase_config` - Firebase configuration JSON
- `__gemini_api_key` - Gemini API key for AI analysis
- `__app_id` - Application ID (optional)
- `__google_fit_client_id` - Google Fit OAuth client ID (optional, for health sync)
- `__practo_api_key` - Practo API key (optional, for doctor profiles)

### Installation
1. Clone the repository
2. Set up Firebase project
3. Configure environment variables
4. Serve the app using a local server:
   ```bash
   python3 -m http.server 8000
   ```
5. Open `http://localhost:8000` in your browser

## 📱 Usage

### Login
1. Navigate to `login.html`
2. Enter email and password
3. Click "Sign In" or "Sign Up" for new users

### Homepage
- View health metrics (BMI, Weight, etc.)
- See upcoming appointments
- Browse doctor categories
- View recent visits

### Log a Visit
1. Go to "Doctor Visits" page
2. Fill in doctor details
3. Select specialty/category
4. Record meeting (optional)
5. Upload prescription for AI analysis
6. Add test results
7. Select improvement status
8. Save visit

### Features
- **BMI Calculator**: Calculate and track BMI over time
- **Weight Tracking**: Log weight with trend analysis
- **Health Data Sync**: Sync steps, heart rate, sleep, blood oxygen from Apple Health/Google Fit
- **Current Body Health**: View real-time health metrics on app opening
- **Health Recommendations**: Get personalized recommendations based on lab reports
- **Medication Reminders**: Automatic reminders with browser notifications
- **Prescription Compliance**: Track medication adherence
- **Dynamic Categories**: Auto-create health categories (Mental Health, Cardiovascular, etc.)
- **Category Progress**: Track improvements per health category
- **Audio Recording**: Record doctor meetings natively
- **AI Analysis**: Upload prescription images for automatic medicine extraction
- **1mg Cart**: Add all medicines to 1mg cart in one click
- **Family Sharing**: Share visits and health data with family
- **Period Tracker**: Complete menstrual cycle tracking with predictions
- **Practo Integration**: Download doctor profiles automatically

## 🔧 Technical Details

### Architecture
- **Modular Design**: Separate modules for each feature
- **Firebase Integration**: Firestore for data, Storage for files
- **LocalStorage Fallback**: Works offline with localStorage
- **ES6 Modules**: Modern JavaScript with import/export

### Performance
- Lazy loading of modules
- Optimized Firebase queries
- Efficient file uploads
- Responsive design

### Security
- Firebase Authentication
- User-specific data isolation
- Secure file storage
- Environment-based configuration

## 🎨 Design System

### Colors
- Primary Blue: `#3b82f6`
- Primary Green: `#10b981`
- Dark Background: `#111827`
- Glass Cards: `rgba(31, 41, 55, 0.6)`

### Components
- Glassmorphism cards with backdrop blur
- Category badges with color coding
- Status indicators (improved/same/worse)
- Modern form inputs

## 📝 Future Enhancements
- Health trends visualization
- Medication reminders
- Appointment scheduling
- Export to PDF
- Multi-language support

## 🤝 Contributing
This is a personal health management app. For issues or suggestions, please create an issue.

## 📄 License
Private project - All rights reserved

