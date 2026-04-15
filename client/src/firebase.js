//Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDatMgTz2NEeKvIqJ1khQD9KVsjeUmF1sU",
  authDomain: "blackmirror-ff202.firebaseapp.com",
  projectId: "blackmirror-ff202",
  storageBucket: "blackmirror-ff202.firebasestorage.app",
  messagingSenderId: "531172750499",
  appId: "1:531172750499:web:5143ad4e6343abe49b7b16",
  measurementId: "G-6KG52JEYHS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
