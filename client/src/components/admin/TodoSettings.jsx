/*import { useEffect, useState } from "react";
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

  if (loading) return <div className="settings-card"><Loader label="Loading settings..." compact /></div>;

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
}*/


import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { buildApiUrl } from "../../api/baseUrl";
import Loader from "../common/Loader.jsx";

const createTodo = (text) => ({
  id: crypto.randomUUID(),
  text: text.trim(),
  done: false,
  createdAt: Date.now(),
  source: "manual",
});

export default function TodoSettings() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ADD THIS
  const [syncingGoogleTasks, setSyncingGoogleTasks] = useState(false);
  const [googleTasksError, setGoogleTasksError] = useState("");

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

  const syncGoogleTasks = async () => {
    setSyncingGoogleTasks(true);
    setGoogleTasksError("");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();

      const res = await fetch(buildApiUrl("/api/auth/google/tasks"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 && data?.code === "GOOGLE_RECONNECT_REQUIRED") {
          const shouldReconnect = window.confirm(
            "Google Tasks permissions need to be refreshed. Reconnect Google now?"
          );
          if (shouldReconnect) {
            window.location.href = buildApiUrl(`/api/auth/google?token=${encodeURIComponent(token)}`);
            return;
          }
        }
        throw new Error(data?.error || "Failed to sync Google Tasks");
      }

      setTodos(data);
    } catch (err) {
      console.error("Google Tasks sync failed:", err);
      setGoogleTasksError(err.message);
    } finally {
      setSyncingGoogleTasks(false);
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

  if (loading) {
    return (
      <div className="settings-card">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Todo</h1>
        <p>Create tasks here and show them in your mirror Todo widget.</p>
      </div>

      {/* ADD THIS CARD */}
      <div className="settings-card">
        <h2>Google Tasks</h2>
        <p style={{ color: "#6b7280" }}>
          Sync tasks from your connected Google account into the mirror Todo widget.
        </p>

        <button
          className="btn-primary"
          onClick={syncGoogleTasks}
          disabled={syncingGoogleTasks}
        >
          {syncingGoogleTasks ? "Syncing..." : "Sync Google Tasks"}
        </button>

        {googleTasksError && (
          <p style={{ color: "#dc2626", marginTop: 12 }}>
            {googleTasksError}
          </p>
        )}
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

        {todos.length === 0 && (
          <p style={{ color: "#6b7280" }}>No todos yet.</p>
        )}

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

              {todo.source === "googleTasks" && (
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  Google
                </span>
              )}

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
