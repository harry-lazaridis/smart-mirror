import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const NotificationContext = createContext(null);

const DEFAULT_NOTIFICATION_SETTINGS = {
  soundEnabled: true,
  voiceEnabled: true,
};

export function NotificationProvider({ children, expectedSources = [], uid }) {
  const [toast, setToast] = useState(null);
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);

  const settingsLoadedRef = useRef(false);
  const settingsRef = useRef(DEFAULT_NOTIFICATION_SETTINGS);
  const expectedSourcesRef = useRef(expectedSources);
  const apiStatusRef = useRef({});
  const hasAnnouncedStartupRef = useRef(false);

  useEffect(() => {
    expectedSourcesRef.current = expectedSources;
  }, [expectedSources]);

  useEffect(() => {
    hasAnnouncedStartupRef.current = false;
    apiStatusRef.current = {};
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;

    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      const data = snap.data() ?? {};
      const nextSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...(data.notificationSettings ?? {}),
      };

      settingsRef.current = nextSettings;
      settingsLoadedRef.current = true;
      setNotificationSettings(nextSettings);
    });

    return () => unsub();
  }, [uid]);

  const speak = useCallback((text) => {
    const settings = settingsRef.current;

    if (!text) return;
    if (!settingsLoadedRef.current) return;
    if (!settings.soundEnabled) return;
    if (!settings.voiceEnabled) return;
    if (!("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel();

      const message = new SpeechSynthesisUtterance(text);
      message.lang = "en-US";
      message.rate = 0.95;
      message.pitch = 1;
      message.volume = 1;

      window.speechSynthesis.speak(message);
    } catch (err) {
      console.error("Speech failed:", err);
    }
  }, []);

  const notify = useCallback(
    ({ text, voice = false }) => {
      if (!text) return;

      setToast(text);

      setTimeout(() => {
        setToast(null);
      }, 3500);

      if (voice) {
        speak(text);
      }
    },
    [speak]
  );

  const getRequiredSources = useCallback(() => {
    return expectedSourcesRef.current.filter((name) => name !== "sl");
  }, []);

  const tryStartupAnnouncement = useCallback(() => {
    if (!settingsLoadedRef.current) return;
    if (hasAnnouncedStartupRef.current) return;

    const requiredSources = getRequiredSources();

    const allReady =
      requiredSources.length > 0 &&
      requiredSources.every((name) => apiStatusRef.current[name] === "success");

    if (!allReady) return;

    hasAnnouncedStartupRef.current = true;

    notify({
      text: "Mirror is up to date.",
      voice: true,
    });
  }, [getRequiredSources, notify]);

  const reportApiStatus = useCallback(
    (source, status) => {
      if (!source || !status) return;

      const previous = apiStatusRef.current[source];
      apiStatusRef.current[source] = status;

      if (previous === "error" && status === "success" && source !== "sl") {
        notify({
          text: `${source} connection restored.`,
          voice: true,
        });
      }

      tryStartupAnnouncement();
    },
    [notify, tryStartupAnnouncement]
  );

  useEffect(() => {
    tryStartupAnnouncement();
  }, [tryStartupAnnouncement, notificationSettings]);

  const value = useMemo(
    () => ({
      notify,
      reportApiStatus,
      notificationSettings,
    }),
    [notify, reportApiStatus, notificationSettings]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {toast && (
        <div style={styles.toast}>
          {toast}
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifier() {
  return useContext(NotificationContext);
}

const styles = {
  toast: {
    position: "fixed",
    right: 20,
    bottom: 20,
    zIndex: 9999,
    background: "rgba(0,0,0,0.85)",
    color: "white",
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 14,
    pointerEvents: "none",
  },
};