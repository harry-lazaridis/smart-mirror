//Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDjY_VrwXKd37D17FhMRj0S8Bouu8qQU-k",
  authDomain: "magic-mirror-e5482.firebaseapp.com",
  projectId: "magic-mirror-e5482",
  storageBucket: "magic-mirror-e5482.firebasestorage.app",
  messagingSenderId: "733732733390",
  appId: "1:733732733390:web:851708d26e0316da13eb9f"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);