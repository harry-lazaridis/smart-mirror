import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";
import { auth, provider } from "../firebase";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailAuth = async () => {
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      alert("Success!");


    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
      alert("Google login success!");
 
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>{isLogin ? "Login" : "Sign Up"}</h2>

        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button style={styles.button} onClick={handleEmailAuth}>
          {isLogin ? "Login" : "Create Account"}
        </button>

        <button style={styles.googleButton} onClick={handleGoogle}>
          Continue with Google
        </button>

        <p style={{ marginTop: 10 }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span
            style={styles.link}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? " Sign up" : " Login"}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0f172a",
    color: "white"
  },
  card: {
    background: "#1e293b",
    padding: "2rem",
    borderRadius: "12px",
    width: "300px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
  },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "none",
    outline: "none"
  },
  button: {
    padding: "10px",
    borderRadius: "6px",
    border: "none",
    background: "#3b82f6",
    color: "white",
    cursor: "pointer"
  },
  googleButton: {
    padding: "10px",
    borderRadius: "6px",
    border: "none",
    background: "#ef4444",
    color: "white",
    cursor: "pointer"
  },
  link: {
    color: "#3b82f6",
    cursor: "pointer",
    marginLeft: "5px"
  }
};