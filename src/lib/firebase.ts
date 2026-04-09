import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your Firebase config values
const firebaseConfig = {
  apiKey: "AIzaSyDzZdwwygghbnt-Ou3_4WnZwRvSOBUgUTA",
  authDomain: "urban-dhaga.firebaseapp.com",
  projectId: "urban-dhaga",
  storageBucket: "urban-dhaga.firebasestorage.app",
  messagingSenderId: "410493249439",
  appId: "1:410493249439:web:41327497ec83d745177faa",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
