import { useEffect, useState } from "react";
import { api } from "../api/client";
import { auth } from "../firebase";

export default function Mirror() {
  const [status, setStatus] = useState("");

  // Nyckel?
  useEffect(async () => {
    api.get("/health").then(res => {
      setStatus(res.data.status);
    });

    const token = await auth.currentUser.getIdToken();
    console.log(token);
  
  }, []);

  return (
    <div>
      Smart Mirror Status: {status}
    </div>
  );
}