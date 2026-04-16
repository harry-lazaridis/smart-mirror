import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { api } from "../api/client";

import Sidebar from "../components/admin/Sidebar";
import ProfileCard from "../components/admin/ProfileCard";
import CalendarSettings from "../components/admin/CalendarSettings";
import SLSettings from "../components/admin/SLSettings";
import WidgetManager from "../components/admin/WidgetManager";
import UserManager from "../components/admin/UserManager";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    return () => unsub();
  }, []);

  if (!user) {
    return (
      <div style={styles.center}>
        <h2>Please login to access admin panel</h2>
      </div>
    );
  }

  const test = async () => {
    try {
      //const token = user.uid

      const token = await auth.currentUser.getIdToken()

      const rest = await api.get("api/auth/google", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      alert(JSON.stringify(rest.data))
    } catch (error) {
      alert(error);
    }

  }

  return (
    <div style={styles.layout}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <button onClick={() => test()}>HALLÅ</button>
      <div style={styles.content}>
        {activeTab === "profile" && <ProfileCard user={user} />}
        {activeTab === "calendar" && <CalendarSettings user={user} />}
        {activeTab === "sl" && <SLSettings user={user} />}
        {activeTab === "widgets" && <WidgetManager user={user} />}
        {activeTab === "user" && <UserManager user={user} />}
      </div>
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    height: "100vh",
    fontFamily: "sans-serif",
  },
  content: {
    flex: 1,
    padding: 20,
    background: "#0f172a",
    color: "white",
  },
  center: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};