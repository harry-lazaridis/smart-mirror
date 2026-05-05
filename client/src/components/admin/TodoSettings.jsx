import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const createTodo = (text, tier = null, deadline = null) => ({
  id: crypto.randomUUID(),
  text: text.trim(),
  done: false,
  tier: tier, 
  createdAt: Date.now(),
  deadline: deadline,
  doneAt: null,
});

export const calculateEffectiveTier = (todo) => {
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

export default function TodoSettings() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [todoMode, setTodoMode] = useState("normal");
  const [newTier, setNewTier] = useState("A");
  const [newDeadline, setNewDeadline] = useState("");

  useEffect(() => {
    const loadTodos = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const snap = await getDoc(doc(db, "users", uid));
        const data = snap.data();
        setTodos(Array.isArray(data?.todos) ? data.todos : []);
        setTodoMode(data?.todoMode || "normal");
      } catch (err) {
        console.error("Failed to load todos:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTodos();
  }, []);

  const saveTodos = async (nextTodos, newMode = todoMode) => {
    setSaving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await setDoc(doc(db, "users", uid), { todos: nextTodos, todoMode: newMode }, { merge: true });
      setTodos(nextTodos);
      setTodoMode(newMode);
    } catch (err) {
      console.error("Failed to save todos:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleMode = async () => {
    const nextMode = todoMode === "normal" ? "abc" : "normal";
    await saveTodos(todos, nextMode);
  };

  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) return;
    
    // In ABC mode, always enforce a tier
    const tier = todoMode === "abc" ? newTier : null;
    const deadline = newDeadline ? new Date(newDeadline).getTime() : null;
    
    const next = [...todos, createTodo(text, tier, deadline)];
    await saveTodos(next, todoMode);
    setNewTodo("");
    setNewDeadline("");
  };

  const toggleTodo = async (id) => {
    const next = todos.map((todo) => {
      if (todo.id === id) {
        const isDone = !todo.done;
        return { ...todo, done: isDone, doneAt: isDone ? Date.now() : null };
      }
      return todo;
    });
    await saveTodos(next, todoMode);
  };

  const deleteTodo = async (id) => {
    const next = todos.filter((todo) => todo.id !== id);
    await saveTodos(next, todoMode);
  };

  if (loading) return <div className="settings-card"><p>Loading...</p></div>;

  const isDoneToday = (todo) => {
    if (!todo.done || !todo.doneAt) return false;
    const date = new Date(todo.doneAt);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const undoneTodos = todos.filter((t) => !t.done);
  const doneTodayTodos = todos.filter((t) => isDoneToday(t));

  let visibleUndoneTodos = [...undoneTodos];
  let activeTierTitle = null;

  if (todoMode === "abc") {
    const hasA = undoneTodos.some(t => calculateEffectiveTier(t) === 'A');
    const hasB = undoneTodos.some(t => calculateEffectiveTier(t) === 'B');

    if (hasA) {
      visibleUndoneTodos = undoneTodos.filter(t => calculateEffectiveTier(t) === 'A');
      activeTierTitle = 'A';
    } else if (hasB) {
      visibleUndoneTodos = undoneTodos.filter(t => calculateEffectiveTier(t) === 'B');
      activeTierTitle = 'B';
    } else if (undoneTodos.length > 0) {
      visibleUndoneTodos = undoneTodos.filter(t => calculateEffectiveTier(t) === 'C');
      activeTierTitle = 'C';
    }
  }

  const renderTodo = (todo) => {
    return (
      <div
        key={todo.id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "10px 12px",
        }}
      >
        <input
          type="checkbox"
          checked={Boolean(todo.done)}
          onChange={() => toggleTodo(todo.id)}
        />
        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: 0,
              color: "#111827",
              textDecoration: todo.done ? "line-through" : "none",
              opacity: todo.done ? 0.6 : 1,
            }}
          >
            {todo.text}
          </p>
          {todo.deadline && (
            <small style={{ color: "#6b7280", display: "block" }}>
              Deadline: {new Date(todo.deadline).toLocaleDateString()}
            </small>
          )}
        </div>
        <button className="btn-danger" onClick={() => deleteTodo(todo.id)}>
          Delete
        </button>
      </div>
    );
  };

  const getTierWord = (tier) => {
    if (tier === 'A') return { text: 'Akut', color: '#dc2626' };
    if (tier === 'B') return { text: 'Bråttom', color: '#eae30c' };
    if (tier === 'C') return { text: 'Senare', color: '#16a34a' };
    return { text: 'Tasks', color: 'inherit' };
  };

  const titleInfo = activeTierTitle ? getTierWord(activeTierTitle) : { text: 'Tasks', color: 'inherit' };

  return (
    <div>
      <div className="page-header">
        <h1>Todo</h1>
        <p>Create tasks here and show them in your mirror Todo widget.</p>
        <div style={{ marginTop: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={todoMode === "abc"} 
              onChange={toggleMode} 
              disabled={saving}
            />
            <strong>Enable ABC-list mode</strong>
          </label>
        </div>
      </div>

      <div className="settings-card">
        <h2>Add task</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="settings-input"
              placeholder="Buy milk, call mom, gym at 18:00..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTodo()}
            />
            <button className="btn-primary" onClick={addTodo} disabled={saving}>
              Add
            </button>
          </div>
          
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            {todoMode === "abc" && (
              <div style={{ display: "flex", gap: 12 }}>
                <label><input type="radio" name="tier" value="A" checked={newTier === "A"} onChange={(e) => setNewTier(e.target.value)} /> A - Akut</label>
                <label><input type="radio" name="tier" value="B" checked={newTier === "B"} onChange={(e) => setNewTier(e.target.value)} /> B - Bråttom</label>
                <label><input type="radio" name="tier" value="C" checked={newTier === "C"} onChange={(e) => setNewTier(e.target.value)} /> C - Senare</label>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: "0.9em", color: "#4b5563" }}>Deadline:</label>
              <input 
                type="date" 
                className="settings-input" 
                style={{ padding: "4px 8px" }}
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h2>{titleInfo.text} ({undoneTodos.length})</h2>
        {visibleUndoneTodos.length === 0 && <p style={{ color: "#6b7280" }}>No tasks to do.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visibleUndoneTodos.map(renderTodo)}
        </div>
      </div>

      {doneTodayTodos.length > 0 && (
        <div className="settings-card" style={{ marginTop: 20, backgroundColor: "#f9fafb" }}>
          <h2>Done Today ({doneTodayTodos.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {doneTodayTodos.map(renderTodo)}
          </div>
        </div>
      )}
    </div>
  );
}
