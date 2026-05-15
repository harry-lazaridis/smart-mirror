import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { FiCheckCircle } from "react-icons/fi";
import Loader from "../components/common/Loader.jsx";

export default function Link() {
  const [searchParams]      = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const deviceId             = searchParams.get("device");
  const successFromAuth = searchParams.get("status") === "success";

  useEffect(() => {
    if (!deviceId) return;
    if (successFromAuth) {
      setStatus("success");
      return;
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate(`/login?device=${encodeURIComponent(deviceId)}`, { replace: true });
        return;
      }
      if (status === "idle") linkDevice(user);
    });
    return () => unsub();
  }, [deviceId, successFromAuth]);

  const linkDevice = async (user) => {
    setStatus("loading");
    try {
      const deviceRef = doc(db, "devices", deviceId);
      const snap = await getDoc(deviceRef);

      if (!snap.exists()) {
        setStatus("error");
        setMessage("Device not found. Please try again.");
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
      setMessage("Something went wrong: " + err.message);
    }
  };

  if (!deviceId) return (
    <div style={styles.page}><p style={styles.error}>Invalid link.</p></div>
  );

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>BlackMirror</h1>

      {status === "idle" && <p style={styles.subtitle}>Preparing login...</p>}

      {status === "loading" && <Loader label="Connecting..." dark compact />}

      {status === "success" && (
        <>
          <div style={{ display: "inline-flex", color: "#4ade80" }}><FiCheckCircle size={56} /></div>
          <h2 style={{ margin: 0 }}>Done!</h2>
          <p style={styles.subtitle}>The mirror will start automatically.</p>
          <p style={styles.subtitle}>You can close this page.</p>
        </>
      )}

      {status === "error" && (
        <>
          <p style={styles.error}>{message}</p>
          <button onClick={() => setStatus("idle")} style={styles.retryBtn}>
            Try again
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
  error: { color: "#f87171", textAlign: "center", margin: 0 },
  retryBtn: {
    padding: "10px 20px", background: "transparent", color: "#94a3b8",
    border: "1px solid #334155", borderRadius: 8, cursor: "pointer",
  },
};
