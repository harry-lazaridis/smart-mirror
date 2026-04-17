import { onAuthStateChanged, updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../../firebase";

export default function UserManager() {
  const [user, setUser] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  const [status, setStatus] = useState({ message: "", type: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setName(u.displayName ?? "");
        setEmail(u.email ?? "");
      }
    });
    return () => unsub();
  }, []);

  const showStatus = (message, type = "success") => {
    setStatus({ message, type });
    setTimeout(() => setStatus({ message: "", type: "" }), 3000);
  };

  // Firebase requires recent login before sensitive changes
  const reauthenticate = async () => {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  };

  const handleUpdateName = async () => {
    setLoading(true);
    try {
      await updateProfile(user, { displayName: name });
      showStatus("Name updated!");
    } catch (err) {
      showStatus(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!currentPassword) {
      showStatus("Enter your current password to change email", "error");
      return;
    }
    setLoading(true);
    try {
      await reauthenticate();
      await updateEmail(user, email);
      showStatus("Email updated!");
    } catch (err) {
      showStatus(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      showStatus("Passwords don't match", "error");
      return;
    }
    if (newPassword.length < 6) {
      showStatus("Password must be at least 6 characters", "error");
      return;
    }
    if (!currentPassword) {
      showStatus("Enter your current password first", "error");
      return;
    }
    setLoading(true);
    try {
      await reauthenticate();
      await updatePassword(user, newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      showStatus("Password updated!");
    } catch (err) {
      showStatus(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Account settings</h2>

      {status.message && (
        <div style={styles.status(status.type)}>
          {status.message}
        </div>
      )}

      {/* Avatar */}
      <div style={styles.avatar}>
        {(name || email)?.[0]?.toUpperCase() ?? "?"}
      </div>

      {/* Display name */}
      <div style={styles.section}>
        <label style={styles.label}>Display name</label>
        <div style={styles.row}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            placeholder="Your name"
          />
          <button onClick={handleUpdateName} disabled={loading} style={styles.button}>
            Save
          </button>
        </div>
      </div>

      {/* Email */}
      <div style={styles.section}>
        <label style={styles.label}>Email</label>
        <div style={styles.row}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            placeholder="your@email.com"
          />
          <button onClick={handleUpdateEmail} disabled={loading} style={styles.button}>
            Save
          </button>
        </div>
      </div>

      {/* New password */}
      <div style={styles.section}>
        <label style={styles.label}>New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{ ...styles.input, marginBottom: 8 }}
          placeholder="New password"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={styles.input}
          placeholder="Confirm new password"
        />
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Current password <span style={{ color: "#64748b" }}>(required to change email or password)</span></label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          style={styles.input}
          placeholder="Your current password"
        />
      </div>

      <button onClick={handleUpdatePassword} disabled={loading} style={styles.primaryButton}>
        {loading ? "Updating..." : "Update password"}
      </button>
    </div>
  );
}

const styles = {
  page: { padding: 20, color: "white", maxWidth: 480 },
  title: { marginBottom: 20 },
  avatar: {
    width: 64, height: 64, borderRadius: "50%",
    background: "#3b82f6", display: "flex",
    alignItems: "center", justifyContent: "center",
    fontSize: 26, fontWeight: 600, marginBottom: 24,
  },
  section: { marginBottom: 20 },
  label: { display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 },
  row: { display: "flex", gap: 8 },
  input: {
    flex: 1, padding: "10px 12px", borderRadius: 8,
    background: "#0f172a", color: "white",
    border: "1px solid #334155", fontSize: 14,
    width: "100%", boxSizing: "border-box",
  },
  button: {
    padding: "10px 16px", background: "#1e40af",
    color: "white", border: "none", borderRadius: 8,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  primaryButton: {
    width: "100%", padding: "12px", background: "#3b82f6",
    color: "white", border: "none", borderRadius: 8,
    cursor: "pointer", fontSize: 15, marginTop: 8,
  },
  status: (type) => ({
    padding: "10px 14px", borderRadius: 8, marginBottom: 16,
    fontSize: 14,
    background: type === "error" ? "#450a0a" : "#052e16",
    color: type === "error" ? "#f87171" : "#4ade80",
    border: `1px solid ${type === "error" ? "#7f1d1d" : "#14532d"}`,
  }),
};