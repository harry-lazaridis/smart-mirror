import { useEffect, useState } from "react";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom"
import {QRCodeSVG} from 'qrcode.react';
import { onSnapshot, serverTimestamp, doc, setDoc } from "firebase/firestore";

const getOrCreateDeviceId = () => {
    let id = localStorage.getItem("deviceId");
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("deviceId", id);
    }
    return id;
}

export default function Sync() {
    const [deviceId, setDeviceId] = useState(null);
    const [synced, setSynced] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const id = getOrCreateDeviceId();
        setDeviceId(id);

        const deviceRef = doc(db, "devices", id);

        setDoc(deviceRef, {createdAt: serverTimestamp() }, { merge: true })

        const unsub = onSnapshot(deviceRef, (snap) => {
            const data = snap.data();
            if (data?.uid) {
                setSynced(true);
                setTimeout(() => navigate("/mirror"), 2000);
            }
        });

        return () => unsub();
    }, [])

    const linkUrl = deviceId ? `${window.location.origin}/link?device=${deviceId}` : null;

  if (status === "synced") {
    return (
      <div style={styles.page}>
        <div style={styles.checkmark}>✓</div>
        <h2 style={styles.title}>Konto kopplat!</h2>
        <p style={styles.subtitle}>Startar spegeln...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Magic Mirror</h1>
      <p style={styles.subtitle}>Scan to connect your mirror!</p>

      <div style={styles.qrWrapper}>
        {linkUrl
          ? <QRCodeSVG value={linkUrl} size={220} bgColor="#0f172a" fgColor="#f8fafc" />
          : <p style={{ color: "#475569" }}>Genererar...</p>
        }
      </div>

      <p style={styles.hint}></p>
      <p style={styles.deviceId}>Enhet: {deviceId?.slice(0, 8)}...</p>
    </div>
  );
}

const styles = {
  page: {
    height: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "#0f172a", color: "white", gap: 16,
  },
  title: { fontSize: 36, fontWeight: 700, margin: 0, letterSpacing: 2 },
  subtitle: { fontSize: 16, color: "#94a3b8", margin: 0 },
  qrWrapper: {
    padding: 20, border: "1px solid #334155",
    borderRadius: 16, marginTop: 8,
  },
  hint: { fontSize: 13, color: "#475569", margin: 0 },
  deviceId: { fontSize: 11, color: "#1e293b", margin: 0 },
  checkmark: { fontSize: 64, color: "#4ade80" },
};