import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

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
export const storage = getStorage(app);
export const provider = new GoogleAuthProvider();
// Read-only, events-only — the app only ever GETs /calendars/primary/events to
// import (CalendarPage.jsx's importGoogleEvents), it never writes back to Google
// Calendar. The full `calendar` scope would grant read/write on everything
// (calendars, ACLs, settings), which Google's OAuth verification review flags
// under the "narrowest scopes" requirement — and classifies as a heavier
// "restricted" scope requiring a security assessment, vs. this scope's lighter
// "sensitive" classification.
provider.addScope('https://www.googleapis.com/auth/calendar.events.readonly');