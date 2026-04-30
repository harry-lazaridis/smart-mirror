import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const createTodo = (text) => ({
  id: crypto.randomUUID(),
  text: text.trim(),
  done: false,
  createdAt: Date.now(),
});

export default function TodoSettings() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadTodos = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const snap = await getDoc(doc(db, "users", uid));
        const data = snap.data();
        setTodos(Array.isArray(data?.todos) ? data.todos : []);
      } catch (err) {
        console.error("Failed to load todos:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTodos();
  }, []);

  const saveTodos = async (nextTodos) => {
    setSaving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      await setDoc(doc(db, "users", uid), { todos: nextTodos }, { merge: true });
      setTodos(nextTodos);
    } catch (err) {
      console.error("Failed to save todos:", err);
    } finally {
      setSaving(false);
    }
  };

  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) return;
    const next = [...todos, createTodo(text)];
    await saveTodos(next);
    setNewTodo("");
  };

  const toggleTodo = async (id) => {
    const next = todos.map((todo) =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    );
    await saveTodos(next);
  };

  const deleteTodo = async (id) => {
    const next = todos.filter((todo) => todo.id !== id);
    await saveTodos(next);
  };

  if (loading) return <div className="settings-card"><p>Loading...</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Todo</h1>
        <p>Create tasks here and show them in your mirror Todo widget.</p>
      </div>

      <div className="settings-card">
        <h2>Add task</h2>
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
      </div>

      <div className="settings-card">
        <h2>Tasks ({todos.length})</h2>
        {todos.length === 0 && <p style={{ color: "#6b7280" }}>No todos yet.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {todos.map((todo) => (
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
              <p
                style={{
                  margin: 0,
                  flex: 1,
                  color: "#111827",
                  textDecoration: todo.done ? "line-through" : "none",
                  opacity: todo.done ? 0.6 : 1,
                }}
              >
                {todo.text}
              </p>
              <button className="btn-danger" onClick={() => deleteTodo(todo.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
