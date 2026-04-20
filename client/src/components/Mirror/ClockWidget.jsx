import React from "react";

export default function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div style={styles.center}>
      <h2>{time.toLocaleTimeString()}</h2>
    </div>
  );
}