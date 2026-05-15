import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { FiCheckCircle, FiCircle } from "react-icons/fi";
import Loader from "../common/Loader.jsx";

export default function TodoWidget() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = null;

    const subscribeToUserTodos = (uid) => {
      unsub = onSnapshot(doc(db, "users", uid), (snap) => {
        const list = snap.data()?.todos;
        setTodos(Array.isArray(list) ? list : []);
        setLoading(false);
      });
    };

    const init = async () => {
      const authUid = auth.currentUser?.uid;
      if (authUid) {
        subscribeToUserTodos(authUid);
        return;
      }

      const deviceId = localStorage.getItem("deviceId");
      if (!deviceId) {
        setLoading(false);
        return;
      }

      const deviceSnap = await getDoc(doc(db, "devices", deviceId));
      const uidFromDevice = deviceSnap.data()?.uid;
      if (!uidFromDevice) {
        setLoading(false);
        return;
      }

      subscribeToUserTodos(uidFromDevice);
    };

    init();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const sortedTodos = useMemo(() => {
    return [...todos].sort((a, b) => Number(a.done) - Number(b.done));
  }, [todos]);

  if (loading) return <div style={styles.wrapper}><Loader label="Loading todos..." dark compact /></div>;

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>Todo</h3>
      {sortedTodos.length === 0 && <p style={styles.empty}>No todos yet</p>}

      <div style={styles.list}>
        {sortedTodos.map((todo) => (
          <div key={todo.id} style={styles.row}>
            <span style={styles.bullet}>{todo.done ? <FiCheckCircle size={14} /> : <FiCircle size={14} />}</span>
            <span
              style={{
                ...styles.text,
                textDecoration: todo.done ? "line-through" : "none",
                opacity: todo.done ? 0.65 : 1,
              }}
            >
              {todo.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    height: "100%",
    color: "white",
    padding: "6cqi",
    overflowY: "auto",
    fontSize: "clamp(11px, 4.4cqi, 18px)",
  },
  title: {
    margin: "0 0 4cqi",
    fontSize: "clamp(13px, 6.5cqi, 26px)",
  },
  empty: {
    margin: 0,
    opacity: 0.7,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "2.5cqi",
  },
  row: {
    display: "flex",
    alignItems: "flex-start",
    gap: "2.2cqi",
    lineHeight: 1.25,
  },
  bullet: {
    width: "1.1em",
    flexShrink: 0,
    opacity: 0.9,
  },
  text: {
    wordBreak: "break-word",
  },
};
