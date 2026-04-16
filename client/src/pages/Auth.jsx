import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from "firebase/auth";
import { auth, provider } from "../firebase";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 *  TODO:
 *  [] Fix loading animation.
 */


export default function Auth() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailAuth = async () => {
    try {
      let userCredential;

      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);

        await updateProfile(userCredential.user, {
          displayName: name
        })
      }
      
      await createUserSnap(userCredential.user);
      navigate("/admin")
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
 
      await createUserSnap(result.user)

      navigate("/admin")  
    
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
          theme: "dark"
        },

        widgets: {
          clock: true,
          calendar: true,
          sl: true,
        },

        //Kolla hur det borde lagras igenkligen.
        slRoute: [{
          from: "",
          to: ""
        }]
      })
    }

  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>{isLogin ? "Login" : "Sign Up"}</h2>

		{!isLogin && (
			<input
				style={styles.input}
				type="text"
				placeholder="Name"
				value={name}
				onChange={(e) => setName(e.target.value)}
			/>
		)}

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