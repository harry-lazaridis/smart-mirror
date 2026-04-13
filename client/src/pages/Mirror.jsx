import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Mirror() {
  const [status, setStatus] = useState("");

  useEffect(() => {
    api.get("/health").then(res => {
      setStatus(res.data.status);
    });
  }, []);

  return (
    <div>
      Smart Mirror Status: {status}
    </div>
  );
}