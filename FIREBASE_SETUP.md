# Firebase Setup Guide for Album Tracker

This guide will help you set up Firebase to sync your Album Tracker data across multiple devices (PC and Android phone).

## Why Firebase?

Firebase provides real-time cloud synchronization, allowing you to:
- Access your album tracking data from any device
- Automatically sync changes across all connected devices
- Store your data securely in the cloud
- Use the app offline with local storage fallback

## Prerequisites

- A Google account
- Access to [Firebase Console](https://console.firebase.google.com/)

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "Album Tracker")
4. (Optional) Enable Google Analytics if you want usage tracking
5. Click "Create project"

## Step 2: Set Up Firestore Database

1. In your Firebase project, click on "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in production mode" or "Start in test mode"
   - **Test mode** is easier for getting started (allows read/write for 30 days)
   - **Production mode** requires setting up security rules (see below)
4. Choose a Firestore location close to you (e.g., `us-central` for US)
5. Click "Enable"

## Step 3: Set Up Authentication

1. Click on "Authentication" in the left sidebar
2. Click "Get started"
3. Click on "Sign-in method" tab
4. Enable "Anonymous" authentication
   - Click on "Anonymous"
   - Toggle the "Enable" switch
   - Click "Save"

## Step 4: Configure Security Rules

To secure your data, set up Firestore security rules:

1. Go to "Firestore Database" → "Rules" tab
2. Replace the existing rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /artifacts/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click "Publish"

## Step 5: Get Your Firebase Configuration

1. In the Firebase Console, click the gear icon (⚙️) next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (`</>`) to add a web app
5. Enter an app nickname (e.g., "Album Tracker Web")
6. (Optional) Check "Also set up Firebase Hosting" if you want to deploy online
7. Click "Register app"
8. Copy the Firebase configuration object that looks like this:

```javascript
{
  "apiKey": "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "123456789012",
  "appId": "1:123456789012:web:abcdef1234567890"
}
```

## Step 6: Connect Album Tracker to Firebase

### On Your PC:

1. Open Album Tracker in your web browser
2. Click on "Settings" in the sidebar
3. Scroll down to the "Cloud Sync (Optional)" section
4. Click "Connect Cloud"
5. Paste your Firebase configuration JSON (from Step 5)
6. Click OK

### On Your Android Phone:

1. Open Album Tracker on your phone's web browser
2. Follow the same steps as above (Settings → Cloud Sync → Connect Cloud)
3. Paste the same Firebase configuration JSON
4. Click OK

## Step 7: Verify Synchronization

1. Make a change on one device (e.g., add a task)
2. Open the app on another device
3. The change should appear automatically!

## Troubleshooting

### Connection Issues

- **"Permission denied" error**: Check that your Firestore security rules are set up correctly
- **"Auth error"**: Make sure Anonymous authentication is enabled
- **Data not syncing**: Refresh the page and check your internet connection

### Starting Fresh

If you want to disconnect from Firebase and use local storage again:

1. Go to Settings → Cloud Sync
2. Click "Disconnect"
3. Your local data will be preserved

### Data Migration

When you first connect to Firebase, your local data will NOT automatically upload. You'll start with a fresh cloud database. To migrate existing data:

1. Export your local data (if you have important data)
2. Connect to Firebase
3. Manually re-enter your data, or use the import feature if available

## Security Best Practices

1. **Never share your Firebase configuration publicly** if your project contains sensitive data
2. **Use production mode security rules** for better control
3. **Monitor your Firebase usage** in the Firebase Console
4. **Set up billing alerts** to avoid unexpected charges (Firebase has a generous free tier)

## Alternative to Firebase

While Firebase is the recommended solution, you can also:

1. **Use local storage only** (no cloud sync) - default mode
2. **Self-host a database** (requires technical setup)
3. **Use other cloud providers** (would require code changes)

## Need Help?

If you encounter issues:
1. Check the [Firebase Documentation](https://firebase.google.com/docs)
2. Review your browser console for error messages
3. Verify your Firebase project settings
4. Make sure you're using a modern browser

## Mobile-Friendly Tips

The Album Tracker is fully responsive and works great on mobile browsers:
- Use Chrome, Firefox, or Safari on your Android phone
- Add to Home Screen for a native app experience
- Works offline with local storage
- Syncs automatically when you have internet connection

---

**That's it!** Your Album Tracker is now set up for cross-platform access. Enjoy tracking your album progress from anywhere! 🎵
