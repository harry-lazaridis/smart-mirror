import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});


app.get("/api/alex/", (req, res) => {
  res.json({data: "Hello world"})
})

export default app;

/*




// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
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

//*/
