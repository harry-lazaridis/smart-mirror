import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

const calculateEffectiveTier = (todo) => {
  if (!todo.tier) return null;
  if (!todo.deadline) return todo.tier;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const deadlineDate = new Date(todo.deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  if (todo.tier === 'B' && deadlineDate <= tomorrow) {
    return 'A';
  }
  if (todo.tier === 'C' && deadlineDate <= nextWeek) {
    return 'B';
  }
  
  return todo.tier;
};

export default function TodoWidget() {
  const [todos, setTodos] = useState([]);
  const [todoMode, setTodoMode] = useState("normal");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = null;

    const subscribeToUserTodos = (uid) => {
      unsub = onSnapshot(doc(db, "users", uid), (snap) => {
        const data = snap.data();
        const list = data?.todos;
        setTodos(Array.isArray(list) ? list : []);
        setTodoMode(data?.todoMode || "normal");
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

  const { visibleUndoneTodos, doneTodayTodos, activeTierTitle } = useMemo(() => {
    const isDoneToday = (todo) => {
      if (!todo.done || !todo.doneAt) return false;
      const date = new Date(todo.doneAt);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    };

    const undoneTodos = todos.filter((t) => !t.done);
    const doneToday = todos.filter((t) => isDoneToday(t));

    let visibleUndone = [...undoneTodos];
    let activeTierTitle = null;

    if (todoMode === "abc") {
      const hasA = undoneTodos.some(t => calculateEffectiveTier(t) === 'A');
      const hasB = undoneTodos.some(t => calculateEffectiveTier(t) === 'B');

      if (hasA) {
        visibleUndone = undoneTodos.filter(t => calculateEffectiveTier(t) === 'A');
        activeTierTitle = 'A';
      } else if (hasB) {
        visibleUndone = undoneTodos.filter(t => calculateEffectiveTier(t) === 'B');
        activeTierTitle = 'B';
      } else if (undoneTodos.length > 0) {
        visibleUndone = undoneTodos.filter(t => calculateEffectiveTier(t) === 'C');
        activeTierTitle = 'C';
      }
    }

    return { visibleUndoneTodos: visibleUndone, doneTodayTodos: doneToday, activeTierTitle };
  }, [todos, todoMode]);

  if (loading) return <div style={styles.wrapper}>Loading todos...</div>;

  const renderTodo = (todo) => {
    return (
      <div key={todo.id} style={styles.row}>
        <span style={styles.bullet}>{todo.done ? "✓" : "○"}</span>
        <div style={styles.textContainer}>
          <span
            style={{
              ...styles.text,
              textDecoration: todo.done ? "line-through" : "none",
              opacity: todo.done ? 0.65 : 1,
            }}
          >
            {todo.text}
          </span>
          {todo.deadline && !todo.done && (
            <span style={styles.deadline}>
              {new Date(todo.deadline).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    );
  };

  const getTierWord = (tier) => {
    if (tier === 'A') return { text: 'Akut', color: '#f87171' };
    if (tier === 'B') return { text: 'Bråttom', color: '#fbe83c' };
    if (tier === 'C') return { text: 'Senare', color: '#4ade80' };
    return { text: 'Todo', color: 'inherit' };
  };

  const titleInfo = activeTierTitle ? getTierWord(activeTierTitle) : { text: 'Todo', color: 'inherit' };

  return (
    <div style={styles.wrapper}>
      <h3 style={{ ...styles.title, color: titleInfo.color }}>{titleInfo.text}</h3>
      {visibleUndoneTodos.length === 0 && <p style={styles.empty}>No todos yet</p>}

      <div style={styles.list}>
        {visibleUndoneTodos.map(renderTodo)}
      </div>

      {doneTodayTodos.length > 0 && (
        <div style={{ ...styles.list, marginTop: '4cqi', paddingTop: '4cqi', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <h4 style={{ margin: 0, fontSize: '0.9em', opacity: 0.8 }}>Done Today</h4>
          {doneTodayTodos.map(renderTodo)}
        </div>
      )}
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
  textContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5cqi",
    flex: 1,
  },
  text: {
    wordBreak: "break-word",
  },
  deadline: {
    fontSize: "0.8em",
    opacity: 0.7,
  }
};
