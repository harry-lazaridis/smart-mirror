import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";

export default function Link() {
  const [searchParams]      = useSearchParams();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const deviceId             = searchParams.get("device");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && status === "idle") linkDevice(user);
    });
    return () => unsub();
  }, []);

  const linkDevice = async (user) => {
    setStatus("loading");
    try {
      const deviceRef = doc(db, "devices", deviceId);
      const snap = await getDoc(deviceRef);

      if (!snap.exists()) {
        setStatus("error");
        setMessage("Enheten hittades inte. Försök igen.");
        return;
      }

      // Koppla uid permanent till enheten
      await setDoc(deviceRef, {
        uid: user.uid,
        linkedAt: serverTimestamp(),
        linkedBy: user.email,
      }, { merge: true });

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setMessage("Något gick fel: " + err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await linkDevice(result.user);
    } catch (err) {
      setStatus("error");
      setMessage("Inloggning misslyckades.");
    }
  };

  if (!deviceId) return (
    <div style={styles.page}><p style={styles.error}>Ogiltig länk.</p></div>
  );

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>BlackMirror</h1>

      {status === "idle" && (
        <>
          <p style={styles.subtitle}>Koppla spegeln till ditt konto</p>
          <button onClick={handleGoogleLogin} style={styles.googleBtn}>
            Logga in med Google
          </button>
        </>
      )}

      {status === "loading" && <p style={styles.subtitle}>Kopplar...</p>}

      {status === "success" && (
        <>
          <div style={{ fontSize: 56, color: "#4ade80" }}>✓</div>
          <h2 style={{ margin: 0 }}>Klart!</h2>
          <p style={styles.subtitle}>Spegeln startar automatiskt.</p>
          <p style={styles.subtitle}>Du kan stänga den här sidan.</p>
        </>
      )}

      {status === "error" && (
        <>
          <p style={styles.error}>{message}</p>
          <button onClick={() => setStatus("idle")} style={styles.retryBtn}>
            Försök igen
          </button>
        </>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "#0f172a", color: "white", gap: 20, padding: 20,
  },
  title: { fontSize: 32, fontWeight: 700, margin: 0, letterSpacing: 2 },
  subtitle: { fontSize: 15, color: "#94a3b8", margin: 0, textAlign: "center" },
  googleBtn: {
    padding: "12px 24px", background: "white", color: "#1e293b",
    border: "none", borderRadius: 8, fontSize: 15,
    cursor: "pointer", fontWeight: 600,
  },
  error: { color: "#f87171", textAlign: "center", margin: 0 },
  retryBtn: {
    padding: "10px 20px", background: "transparent", color: "#94a3b8",
    border: "1px solid #334155", borderRadius: 8, cursor: "pointer",
  },
};