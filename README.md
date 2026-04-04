# Anesthetic Case Log

Mobile-friendly web app for logging and searching anesthetic cases. Built with vanilla JS + Firebase Firestore + GitHub Pages.

## Setup

### 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (e.g. `anesthetic-case-log`)
3. In the project, go to **Firestore Database** → Create database → Start in **production mode** → choose a region
4. Go to **Project Settings** → **Your apps** → Add a **Web app**
5. Copy the `firebaseConfig` object

### 2. Paste your config

Open `firebase.js` and replace the placeholder `firebaseConfig` with your values:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### 3. Set Firestore security rules

In the Firebase Console → Firestore → Rules, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /cases/{caseId} {
      allow read, write: if true;
    }
  }
}
```

> Note: This allows open read/write — fine for a personal tool with no patient data. Add Firebase Auth later if you want to restrict access.

### 4. Run locally

Open `index.html` directly in a browser, or serve it with any static server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

### 5. Deploy to GitHub Pages

Push to a GitHub repo, then enable GitHub Pages from the `main` branch root.

## Stack

- Vanilla JS, no build step
- Firebase Firestore (offline persistence via IndexedDB)
- GitHub Pages hosting
- PWA manifest for Add to Home Screen on iOS/Android
