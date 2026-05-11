import { initializeApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Lazy singletons — Firebase services are only initialized when first used,
// not at module load time. This removes auth/iframe.js from the critical path.
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export const getAuthInstance = async (): Promise<Auth> => {
  if (!_auth) {
    const { getAuth } = await import("firebase/auth");
    _auth = getAuth(app);
  }
  return _auth;
};

export const getDbInstance = async (): Promise<Firestore> => {
  if (!_db) {
    const { getFirestore } = await import("firebase/firestore");
    _db = getFirestore(app);
  }
  return _db;
};

export const getStorageInstance = async (): Promise<FirebaseStorage> => {
  if (!_storage) {
    const { getStorage } = await import("firebase/storage");
    _storage = getStorage(app);
  }
  return _storage;
};
