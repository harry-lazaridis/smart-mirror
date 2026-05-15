import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { auth, provider } from "../firebase";
import { useNavigate, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deviceId = searchParams.get("device");

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const linkDeviceIfPresent = async (user) => {
    if (!deviceId) return;
    const deviceRef = doc(db, "devices", deviceId);
    const deviceSnap = await getDoc(deviceRef);
    if (!deviceSnap.exists()) return;
    await setDoc(
      deviceRef,
      {
        uid: user.uid,
        linkedAt: serverTimestamp(),
        linkedBy: user.email || null,
      },
      { merge: true }
    );
  };

  const handleEmailAuth = async () => {
    try {
      let userCredential;

      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);

        await updateProfile(userCredential.user, {
          displayName: name,
        });
      }

      await createUserSnap(userCredential.user);
      await linkDeviceIfPresent(userCredential.user);
      if (deviceId) navigate(`/link?device=${encodeURIComponent(deviceId)}&status=success`);
      else navigate("/admin");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);

      await createUserSnap(result.user);
      await linkDeviceIfPresent(result.user);
      if (deviceId) navigate(`/link?device=${encodeURIComponent(deviceId)}&status=success`);
      else navigate("/admin");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const createUserSnap = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: user.displayName || "",
        email: user.email,
        createdAt: serverTimestamp(),

        settings: {
          theme: "dark",
        },

        widgets: {
          clock: true,
          calendar: true,
          sl: true,
          todo: true,
        },

        slRoute: [
          {
            from: "",
            to: "",
          },
        ],

        todos: [],
        newsSettings: {
          sources: ["svt", "sr_ekot"],
          limit: 8,
        },

        connectedToCalendar: false,
      });
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card settings-card">
        <div className="auth-brand-panel">
          <p className="auth-brand-eyebrow">BlackMirror Platform</p>
          <h2>Admin Panel</h2>
          <p>Configure widgets, news, calendar, and mirror layout from one place.</p>
        </div>

        <div className="auth-form-panel">
          <div className="auth-header">
            <p className="auth-kicker">BlackMirror Admin</p>
            <h1>{isLogin ? "Login" : "Create Account"}</h1>
            <p>Sign in to manage your Smart Mirror dashboard.</p>
          </div>

          {!isLogin && (
            <input
              className="settings-input"
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}

          <input
            className="settings-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="settings-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="btn-primary auth-btn" onClick={handleEmailAuth}>
            {isLogin ? "Login" : "Create Account"}
          </button>

          <button className="btn-secondary auth-btn" onClick={handleGoogle}>
            Continue with Google
          </button>

          <p className="auth-switch-text">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button className="auth-switch-link" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? " Sign up" : " Login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
