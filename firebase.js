import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  initializeFirestore,
  persistentLocalCache,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js";

// ─── Firebase Config ──────────────────────────────────────────────────────────
// TODO: Replace with your Firebase project config
// Create a project at https://console.firebase.google.com
// Enable Firestore, then copy the config from Project Settings > Your apps
const firebaseConfig = {
  apiKey: "AIzaSyBbzwFPZkdCdaI-Ik-6E9VYh1lwcC9YovQ",
  authDomain: "anesthetic-case-log.firebaseapp.com",
  projectId: "anesthetic-case-log",
  storageBucket: "anesthetic-case-log.firebasestorage.app",
  messagingSenderId: "504461040436",
  appId: "1:504461040436:web:28fd07d1b158761e8aa361"
};

// ─── Init ─────────────────────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);

// persistentLocalCache enables offline support via IndexedDB
// reads return cached data; writes are queued and sync when online
const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});

const storage = getStorage(app);

const casesCol = collection(db, 'cases');

// ─── Expose DB methods on window ──────────────────────────────────────────────
window.casesDB = {
  add(data) {
    return addDoc(casesCol, { ...data, createdAt: serverTimestamp() });
  },
  getAll() {
    return getDocs(query(casesCol, orderBy('createdAt', 'desc')));
  },
  getOne(id) {
    return getDoc(doc(db, 'cases', id));
  },
  update(id, data) {
    return updateDoc(doc(db, 'cases', id), data);
  },
  remove(id) {
    return deleteDoc(doc(db, 'cases', id));
  },
  async uploadImage(caseId, file) {
    const storageRef = ref(storage, `cases/${caseId}/${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  },
  async deleteImage(caseId, fileName) {
    try {
      const path = fileName ? `cases/${caseId}/${fileName}` : `cases/${caseId}/image`;
      await deleteObject(ref(storage, path));
    } catch (e) {
      // No image to delete — that's fine
    }
  }
};

// Notify app.js that Firebase is ready
if (typeof window.onCasesDBReady === 'function') {
  window.onCasesDBReady();
}
