import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDsvRApt7LyLxo4LAlfQbwnDZazf6Sr3ZE",
  authDomain: "remindly-b4445.firebaseapp.com",
  projectId: "remindly-b4445",
  storageBucket: "remindly-b4445.firebasestorage.app",
  messagingSenderId: "402023992526",
  appId: "1:402023992526:web:1f6e182b101fa79e32d49f",
  measurementId: "G-C9NNRLJX2E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar');