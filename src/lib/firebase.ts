import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,

  // ─── CRITICAL FIX ────────────────────────────────────────────────────────────
  // authDomain MUST match the domain your app is actually served from.
  //
  // When set to the default "<project>.firebaseapp.com", Firebase's redirect
  // flow works like this on mobile:
  //   1. App redirects user to Google sign-in.
  //   2. Google redirects back to <project>.firebaseapp.com/__/auth/handler
  //   3. That page tries to postMessage the credential back to your app's
  //      window — but your app is at www.urbandhage.in, a DIFFERENT origin.
  //   4. The browser blocks the cross-origin postMessage.
  //   5. getRedirectResult() gets nothing → returns null → no account created.
  //
  // Setting authDomain to your actual custom domain fixes this because the
  // entire redirect loop stays on the same origin.
  //
  // You also need to add www.urbandhage.in to:
  //   Firebase Console → Authentication → Settings → Authorized domains
  // (Add it if it's not already there.)
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // ^ Keep using the env var — just change its VALUE in your .env / Vercel
  //   environment variables from:
  //     VITE_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
  //   to:
  //     VITE_FIREBASE_AUTH_DOMAIN=www.urbandhage.in
  // ─────────────────────────────────────────────────────────────────────────────

  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
