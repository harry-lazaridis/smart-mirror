// src/routes/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import Loader from "../components/common/Loader.jsx";

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    return () => unsub();
  }, []);

  if (user === undefined) {
    return <Loader label="Loading..." compact />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
